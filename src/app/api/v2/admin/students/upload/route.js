import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ROLES } from '@/lib/roles'
import { query } from '@/lib/db'
import {
  ensureStudentsTable,
  normalizeStudentRow,
  normalizeDepartment,
  normalizeCourse,
  isPhdCourse,
  invalidateStudentMetadataCache,
} from '@/lib/studentDb'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

function isAuthorized(session) {
  if (!session?.user) return false
  const role = session.user.role
  return (
    role === 'SUPER_ADMIN' ||
    role === ROLES.SUPER_ADMIN ||
    role === 'ACADEMIC_ADMIN' ||
    role === ROLES.ACADEMIC_ADMIN ||
    role === 'DEPT_ADMIN' ||
    role === ROLES.DEPT_ADMIN
  )
}

function isSuperOrAcademicAdmin(session) {
  const role = session?.user?.role
  return (
    role === 'SUPER_ADMIN' ||
    role === ROLES.SUPER_ADMIN ||
    role === 'ACADEMIC_ADMIN' ||
    role === ROLES.ACADEMIC_ADMIN
  )
}

/**
 * POST /api/v2/admin/students/upload
 * Bulk uploads student batches from CSV.
 * Supports standard NIT Patna Excel/CSV columns:
 *   - Department
 *   - Course
 *   - Specialization
 *   - Enrollment Number
 *   - Roll No
 *   - Nitp Email
 *   - Name
 */
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAuthorized(session)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Admin access required.' },
        { status: 401 }
      )
    }

    await ensureStudentsTable()

    const formData = await request.formData()
    const file = formData.get('file')
    const deptOverride = formData.get('department')?.toString()?.trim()
    const mode = formData.get('mode') || 'upsert' // 'upsert' or 'replace_course'
    const headerRowsParam = formData.get('headerRows')?.toString()?.trim()

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'No file provided. Please upload an .xlsx, .xls, or .csv file.' },
        { status: 400 }
      )
    }

    const fileName = (file.name || '').toLowerCase()
    let aoa = []

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        return NextResponse.json(
          { success: false, message: 'The uploaded Excel file contains no worksheets.' },
          { status: 400 }
        )
      }
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      aoa = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' })
    } else {
      // Read CSV as array of arrays
      const csvContent = await file.text()
      const PapaParser = Papa.default || Papa
      const parsed = PapaParser.parse(csvContent, {
        header: false,
        skipEmptyLines: 'greedy',
      })
      aoa = parsed.data || []
    }

    if (!aoa || aoa.length === 0) {
      return NextResponse.json(
        { success: false, message: 'The uploaded file is empty or could not be parsed.' },
        { status: 400 }
      )
    }

    // Determine number of header rows to exclude
    let headerRows = headerRowsParam ? parseInt(headerRowsParam, 10) : 0
    if (isNaN(headerRows)) headerRows = 0

    // Auto-detect header rows if set to 0 (or fallback)
    if (headerRows === 0) {
      if (aoa.length >= 2) {
        const row1Text = (aoa[1] || []).map(c => String(c || '').toLowerCase()).join(' ')
        const isRow2Header = ['roll', 'name', 'department', 'course', 'email', 'enrollment'].some(kw => row1Text.includes(kw))
        const row2HasEmail = (aoa[1] || []).some(c => String(c || '').includes('@'))
        headerRows = isRow2Header && !row2HasEmail ? 2 : 1
      } else {
        headerRows = 1
      }
    }

    // Safety guard: If headerRows >= 2, but row 1 (0-indexed 2nd row) is actually a student record (contains email or student roll), automatically set to 1
    if (headerRows >= 2 && aoa.length >= 2) {
      const row1Cells = (aoa[1] || []).map(c => String(c != null ? c : '').trim().toLowerCase())
      const hasEmail = row1Cells.some(c => c.includes('@'))
      const isHeaderKw = ['roll no', 'roll number', 'student name', 'candidate name', 'department', 'specialization', 'enrollment no', 'enrollment number'].some(kw =>
        row1Cells.some(c => c === kw || c.startsWith(kw))
      )
      if (hasEmail || (!isHeaderKw && row1Cells.some(c => /^\d{5,}$/.test(c)))) {
        headerRows = 1
      }
    }

    // Intelligent column-to-field mapping from header rows
    const FIELD_KEYWORDS = {
      department: ['department', 'dept'],
      course: ['course', 'program', 'degree'],
      specialization: ['specialization', 'spec', 'branch'],
      enrollment_no: ['enrollment number', 'enrollment no', 'enrollment', 'reg no', 'registration'],
      roll_no: ['roll no', 'roll number', 'rollno', 'roll'],
      email: ['nitp email', 'email', 'institute email', 'mail'],
      name: ['name', 'student name', 'candidate name', 'fullname']
    }

    const colMapping = {}
    const maxCols = Math.max(...aoa.slice(0, 3).map(r => r ? r.length : 0))

    // Search header rows (row 0 and row 1)
    for (let c = 0; c < maxCols; c++) {
      const cell0 = (aoa[0] && aoa[0][c] != null ? String(aoa[0][c]).trim().toLowerCase() : '')
      const cell1 = (aoa[1] && aoa[1][c] != null ? String(aoa[1][c]).trim().toLowerCase() : '')

      for (const [fieldName, keywords] of Object.entries(FIELD_KEYWORDS)) {
        if (colMapping[c]) continue
        if (keywords.some(kw => cell0 === kw || cell0.includes(kw) || (cell1 === kw || cell1.includes(kw) && !cell1.includes('@')))) {
          colMapping[c] = fieldName
        }
      }
    }

    // Default fallback to standard institute column order:
    // 0: department, 1: course, 2: specialization, 3: enrollment_no, 4: roll_no, 5: email, 6: name
    const defaultOrder = ['department', 'course', 'specialization', 'enrollment_no', 'roll_no', 'email', 'name']
    defaultOrder.forEach((f, idx) => {
      if (!colMapping[idx]) colMapping[idx] = f
    })

    const dataAOA = aoa.slice(headerRows)

    if (dataAOA.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No student data rows found after excluding the header rows.' },
        { status: 400 }
      )
    }

    const errors = []
    const validRows = []
    const seenRollNos = new Set()
    const userDept = session.user.department ? normalizeDepartment(session.user.department) : ''
    const isDeptAdminOnly = !isSuperOrAcademicAdmin(session)

    dataAOA.forEach((rowArr, idx) => {
      const rowNumber = idx + headerRows + 1 // 1-indexed exact row number in Excel/CSV

      // Skip completely blank rows
      if (!rowArr || rowArr.length === 0 || rowArr.every(cell => cell == null || String(cell).trim() === '')) {
        return
      }

      const rawRow = {}
      Object.entries(colMapping).forEach(([colIdx, field]) => {
        rawRow[field] = rowArr[colIdx] != null ? rowArr[colIdx] : ''
      })

      // Safeguard: Check if this row is accidentally an extra duplicate header row
      const rollCheck = String(rawRow.roll_no || '').toLowerCase().trim()
      const nameCheck = String(rawRow.name || '').toLowerCase().trim()
      const deptCheck = String(rawRow.department || '').toLowerCase().trim()
      if (
        rollCheck === 'roll no' ||
        rollCheck === 'roll number' ||
        nameCheck === 'name' ||
        nameCheck === 'student name' ||
        deptCheck === 'department'
      ) {
        return
      }

      // Exclude Ph.D / Doctoral scholars as they are not managed in student directory
      if (isPhdCourse(rawRow.course || rawRow.program || rawRow.degree)) {
        return
      }

      const normalized = normalizeStudentRow(rawRow)

      // Fallback to department override only if row itself is missing a department
      if (!normalized.department && deptOverride && deptOverride !== 'All' && deptOverride !== 'all') {
        normalized.department = normalizeDepartment(deptOverride)
      }

      // 1. Mandatory field checks
      if (!normalized.roll_no) {
        errors.push({ row: rowNumber, roll_no: '', error: 'Missing Roll No' })
        return
      }
      if (!normalized.name) {
        errors.push({ row: rowNumber, roll_no: normalized.roll_no, error: 'Missing Student Name' })
        return
      }
      if (!normalized.department) {
        errors.push({ row: rowNumber, roll_no: normalized.roll_no, error: 'Missing Department' })
        return
      }
      if (!normalized.course) {
        errors.push({ row: rowNumber, roll_no: normalized.roll_no, error: 'Missing Course (e.g. Bachelor of Technology, Master of Technology)' })
        return
      }

      // 2. Department Admin permission boundary check
      if (isDeptAdminOnly && normalized.department !== userDept) {
        errors.push({
          row: rowNumber,
          roll_no: normalized.roll_no,
          error: `Permission Denied: Your account can only upload records for department '${userDept}'. Found: '${normalized.department}'.`,
        })
        return
      }

      // 3. Duplicate roll_no within same CSV check
      const lowerRoll = normalized.roll_no.toLowerCase()
      if (seenRollNos.has(lowerRoll)) {
        errors.push({
          row: rowNumber,
          roll_no: normalized.roll_no,
          error: `Duplicate Roll No '${normalized.roll_no}' found within the same CSV upload.`,
        })
        return
      }
      seenRollNos.add(lowerRoll)

      validRows.push(normalized)
    })

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Validation failed on ${errors.length} row(s). Please review the errors and re-upload.`,
          errors: errors.slice(0, 100), // Return up to first 100 errors
        },
        { status: 400 }
      )
    }

    // If mode is 'replace_course', clean up existing records for matching (department, course) combinations
    if (mode === 'replace_course') {
      const deptCourseCombos = new Map()
      for (const row of validRows) {
        const key = `${row.department}:::${row.course}`
        deptCourseCombos.set(key, { department: row.department, course: row.course })
      }

      for (const { department, course } of deptCourseCombos.values()) {
        await query('DELETE FROM students WHERE department = ? AND course = ?', [department, course])
      }
    }

    // Perform batch upsert in chunks of 150 rows
    const CHUNK_SIZE = 150
    let processedCount = 0
    const coursesDetected = new Set()
    const departmentsDetected = new Set()

    for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + CHUNK_SIZE)
      const values = []
      const placeholders = chunk.map(r => {
        values.push(
          r.roll_no,
          r.name,
          r.department,
          r.course,
          r.email,
          r.specialization,
          r.enrollment_no,
          r.admission_year || null,
          r.passing_year || null,
          r.active !== undefined ? r.active : 1,
          r.status || 'active'
        )
        coursesDetected.add(r.course)
        departmentsDetected.add(r.department)
        return '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      }).join(', ')

      const upsertSql = `
        INSERT INTO students (roll_no, name, department, course, email, specialization, enrollment_no, admission_year, passing_year, active, status)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          department = VALUES(department),
          course = VALUES(course),
          email = VALUES(email),
          specialization = VALUES(specialization),
          enrollment_no = VALUES(enrollment_no),
          admission_year = VALUES(admission_year),
          passing_year = VALUES(passing_year),
          active = VALUES(active),
          status = VALUES(status),
          updated_at = CURRENT_TIMESTAMP
      `

      await query(upsertSql, values)
      processedCount += chunk.length
    }

    invalidateStudentMetadataCache()

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedCount} student record(s).`,
      summary: {
        totalRows: validRows.length,
        processed: processedCount,
        departments: Array.from(departmentsDetected),
        courses: Array.from(coursesDetected),
      },
    })
  } catch (error) {
    console.error('Student CSV Upload API error:', error)
    return NextResponse.json(
      { success: false, message: `Upload failed: ${error.message || 'Internal server error.'}` },
      { status: 500 }
    )
  }
}

