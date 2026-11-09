import { query } from './db.js'

// Re-export all pure constants and normalizers
export * from './studentConstants.js'

let tableEnsured = false

// Ensures students table exists in MySQL with optimal indexes (server-only)
export async function ensureStudentsTable() {
  if (tableEnsured) return
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
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_students_dept_course (department, course),
      INDEX idx_students_roll_no (roll_no),
      INDEX idx_students_name (name),
      INDEX idx_students_passing_year (passing_year)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `
  await query(createSql)

  // Ensure department column is VARCHAR(150)
  try {
    await query('ALTER TABLE students MODIFY COLUMN department VARCHAR(150) NOT NULL;')
  } catch (e) {}

  // Add admission_year and passing_year columns if not present
  try {
    await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_year INT NULL;')
  } catch (e) {
    try { await query('ALTER TABLE students ADD COLUMN admission_year INT NULL;') } catch (e2) {}
  }
  try {
    await query('ALTER TABLE students ADD COLUMN IF NOT EXISTS passing_year INT NULL;')
  } catch (e) {
    try { await query('ALTER TABLE students ADD COLUMN passing_year INT NULL;') } catch (e2) {}
  }

  // Remove any Ph.D records as Ph.D is not part of student management
  try {
    await query("DELETE FROM students WHERE course LIKE '%Doctor of Philosophy%' OR course LIKE '%Ph.D%' OR course LIKE '%PhD%'")
  } catch (e) {}

  tableEnsured = true
}
