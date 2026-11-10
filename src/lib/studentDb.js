import { query } from './db.js'
import {
  getStudentAdmissionYear,
  getStudentPassingYear,
  isStudentGraduated,
} from './studentConstants.js'

// Re-export all pure constants and normalizers
export * from './studentConstants.js'

let tableEnsured = false
let tableEnsuringPromise = null
let isSyncing = false
let lastSyncTime = 0

// In-memory cache for available courses & admission years to eliminate redundant DISTINCT table scans
const metadataCache = new Map()
const METADATA_TTL_MS = 5 * 60 * 1000 // 5 minutes

export function invalidateStudentMetadataCache() {
  metadataCache.clear()
}

export async function getCachedAvailableCourses(departmentCandidates = null) {
  const cacheKey = departmentCandidates && departmentCandidates.length > 0
    ? `courses:${departmentCandidates.sort().join('|')}`
    : 'courses:all'

  const cached = metadataCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < METADATA_TTL_MS) {
    return cached.data
  }

  let coursesSql = 'SELECT DISTINCT course FROM students WHERE course IS NOT NULL AND course != "" AND (course NOT LIKE "%Doctor of Philosophy%" AND course NOT LIKE "%Ph.D%" AND course NOT LIKE "%PhD%")'
  const courseParams = []
  if (departmentCandidates && departmentCandidates.length > 0) {
    coursesSql += ` AND department IN (${departmentCandidates.map(() => '?').join(', ')})`
    courseParams.push(...departmentCandidates)
  }
  coursesSql += ' ORDER BY course ASC'

  const courseResults = await query(coursesSql, courseParams)
  const courses = (courseResults || []).map(r => r.course).filter(Boolean)
  metadataCache.set(cacheKey, { data: courses, timestamp: Date.now() })
  return courses
}

export async function getCachedAvailableYears(departmentCandidates = null) {
  const cacheKey = departmentCandidates && departmentCandidates.length > 0
    ? `years:${departmentCandidates.sort().join('|')}`
    : 'years:all'

  const cached = metadataCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < METADATA_TTL_MS) {
    return cached.data
  }

  let yearsSql = 'SELECT DISTINCT admission_year FROM students WHERE admission_year IS NOT NULL AND (course NOT LIKE "%Doctor of Philosophy%" AND course NOT LIKE "%Ph.D%" AND course NOT LIKE "%PhD%")'
  const yearParams = []
  if (departmentCandidates && departmentCandidates.length > 0) {
    yearsSql += ` AND department IN (${departmentCandidates.map(() => '?').join(', ')})`
    yearParams.push(...departmentCandidates)
  }
  yearsSql += ' ORDER BY admission_year DESC'

  const yearResults = await query(yearsSql, yearParams)
  const years = (yearResults || []).map(r => r.admission_year).filter(Boolean)
  metadataCache.set(cacheKey, { data: years, timestamp: Date.now() })
  return years
}

// Synchronizes active and graduated status based on academic duration and cutoff date (July 1st)
// Highly optimized for 10,000+ data rows with batching and bulk SQL statements.
export async function syncStudentGraduationStatus() {
  try {
    // 1. Synchronize / repair admission_year and passing_year ONLY for rows where they are missing (LIMIT 250 per pass)
    // Priority: Email -> Roll No (first 2 digits, e.g. 2001036 -> 2020, 202543 -> 2020) -> Enrollment No (first 2 digits)
    const unparsedRows = await query(`
      SELECT id, roll_no, email, enrollment_no, course, department, admission_year, passing_year
      FROM students
      WHERE (admission_year IS NULL OR passing_year IS NULL)
        AND (course NOT LIKE "%Doctor of Philosophy%" AND course NOT LIKE "%Ph.D%" AND course NOT LIKE "%PhD%")
      LIMIT 250
    `)

    if (unparsedRows && unparsedRows.length > 0) {
      for (const row of unparsedRows) {
        const correctAdm = getStudentAdmissionYear(row.roll_no, row.email, row.enrollment_no)
        const correctPass = getStudentPassingYear(row.roll_no, row.course, row.department, row.email, row.enrollment_no)
        if (correctAdm) {
          const isGrad = isStudentGraduated({ ...row, admission_year: correctAdm, passing_year: correctPass })
          await query(
            'UPDATE students SET admission_year = ?, passing_year = ?, active = ?, status = ? WHERE id = ?',
            [correctAdm, correctPass, isGrad ? 0 : 1, isGrad ? 'graduated' : 'active', row.id]
          )
        }
      }
    }

    // 2. Ensure MCA passing_year is admission_year + 3 (MCA is a 3-year program)
    await query(`
      UPDATE students
      SET passing_year = admission_year + 3
      WHERE admission_year IS NOT NULL
        AND (course LIKE '%Master of Computer Application%' OR course = 'MCA')
        AND passing_year != admission_year + 3
    `)

    // 3. Mark graduated students directly in MySQL using indexed passing_year (< 1-2 ms on 10,000 rows)
    await query(`
      UPDATE students
      SET active = 0, status = 'graduated'
      WHERE passing_year IS NOT NULL
        AND (passing_year < YEAR(CURRENT_DATE) OR (passing_year = YEAR(CURRENT_DATE) AND MONTH(CURRENT_DATE) >= 7))
        AND (active != 0 OR status != 'graduated')
    `)

    // 4. Mark current/active students directly in MySQL using indexed passing_year (< 1-2 ms on 10,000 rows)
    await query(`
      UPDATE students
      SET active = 1, status = 'active'
      WHERE passing_year IS NOT NULL
        AND (passing_year > YEAR(CURRENT_DATE) OR (passing_year = YEAR(CURRENT_DATE) AND MONTH(CURRENT_DATE) < 7))
        AND (active != 1 OR status != 'active')
        AND (course NOT LIKE '%Doctor of Philosophy%' AND course NOT LIKE '%Ph.D%' AND course NOT LIKE '%PhD%')
    `)
  } catch (err) {
    console.warn('syncStudentGraduationStatus warning:', err.message)
  }
}

// Ensures students table exists in MySQL with optimal indexes (server-only)
// Introspects MySQL schema via information_schema to prevent duplicate column/index errors completely.
export async function ensureStudentsTable() {
  if (tableEnsured) {
    triggerBackgroundGraduationSync()
    return
  }

  if (tableEnsuringPromise) {
    return tableEnsuringPromise
  }

  tableEnsuringPromise = (async () => {
    try {
      const createSql = `
        CREATE TABLE IF NOT EXISTS students (
          id INT AUTO_INCREMENT PRIMARY KEY,
          roll_no VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          department VARCHAR(150) NOT NULL,
          course VARCHAR(100) NOT NULL,
          email VARCHAR(255) NULL,
          specialization VARCHAR(150) NULL,
          enrollment_no VARCHAR(50) NULL,
          admission_year INT NULL,
          passing_year INT NULL,
          active TINYINT(1) NOT NULL DEFAULT 1,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_students_dept_course (department, course),
          INDEX idx_students_dept_active (department, active),
          INDEX idx_students_dept_active_year (department, active, admission_year),
          INDEX idx_students_dept_course_active (department, course, active),
          INDEX idx_students_roll_no (roll_no),
          INDEX idx_students_name (name),
          INDEX idx_students_passing_year (passing_year),
          INDEX idx_students_admission_year (admission_year),
          INDEX idx_students_active_year (active, admission_year),
          INDEX idx_students_active_pass (active, passing_year)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `
      await query(createSql)

      // Query existing column and index definitions from information_schema
      // This is standard across MySQL 5.7, 8.0+ and MariaDB, taking < 1 ms and avoiding any ALTER errors
      const [existingCols, existingIndexes] = await Promise.all([
        query(
          "SELECT COLUMN_NAME, CHARACTER_MAXIMUM_LENGTH FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students'"
        ),
        query(
          "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'students'"
        ),
      ])

      const colMap = new Map((existingCols || []).map(c => [c.COLUMN_NAME.toLowerCase(), c]))
      const indexSet = new Set((existingIndexes || []).map(i => i.INDEX_NAME.toLowerCase()))

      // Ensure department column is VARCHAR(150) if needed
      const deptCol = colMap.get('department')
      if (deptCol && (deptCol.CHARACTER_MAXIMUM_LENGTH || 0) < 150) {
        await query('ALTER TABLE students MODIFY COLUMN department VARCHAR(150) NOT NULL;')
      }

      // Add missing columns cleanly without throwing Duplicate column errors
      if (!colMap.has('admission_year')) {
        await query('ALTER TABLE students ADD COLUMN admission_year INT NULL;')
      }
      if (!colMap.has('passing_year')) {
        await query('ALTER TABLE students ADD COLUMN passing_year INT NULL;')
      }
      if (!colMap.has('active')) {
        await query('ALTER TABLE students ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1;')
      }

      // Add missing indexes cleanly without throwing Duplicate key name errors
      if (!indexSet.has('idx_students_dept_active')) {
        await query('ALTER TABLE students ADD INDEX idx_students_dept_active (department, active);')
      }
      if (!indexSet.has('idx_students_dept_active_year')) {
        await query('ALTER TABLE students ADD INDEX idx_students_dept_active_year (department, active, admission_year);')
      }
      if (!indexSet.has('idx_students_dept_course_active')) {
        await query('ALTER TABLE students ADD INDEX idx_students_dept_course_active (department, course, active);')
      }
      if (!indexSet.has('idx_students_active_year')) {
        await query('ALTER TABLE students ADD INDEX idx_students_active_year (active, admission_year);')
      }
      if (!indexSet.has('idx_students_admission_year')) {
        await query('ALTER TABLE students ADD INDEX idx_students_admission_year (admission_year);')
      }
      if (!indexSet.has('idx_students_active_pass')) {
        await query('ALTER TABLE students ADD INDEX idx_students_active_pass (active, passing_year);')
      }

      // Remove any Ph.D records as Ph.D is not part of student management
      try {
        await query("DELETE FROM students WHERE course LIKE '%Doctor of Philosophy%' OR course LIKE '%Ph.D%' OR course LIKE '%PhD%'")
      } catch (e) {}

      tableEnsured = true
    } catch (err) {
      console.warn('ensureStudentsTable warning:', err.message)
    } finally {
      tableEnsuringPromise = null
    }

    triggerBackgroundGraduationSync()
  })()

  return tableEnsuringPromise
}

function triggerBackgroundGraduationSync() {
  const now = Date.now()
  if (!isSyncing && now - lastSyncTime > 15 * 60 * 1000) {
    lastSyncTime = now
    isSyncing = true
    syncStudentGraduationStatus()
      .catch(err => console.warn('Background sync warning:', err.message))
      .finally(() => {
        isSyncing = false
      })
  }
}
