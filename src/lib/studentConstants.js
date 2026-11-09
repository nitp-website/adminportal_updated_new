import { depList } from './const.js'

export const STANDARD_COURSES = [
  'All Courses',
  'Bachelor of Technology',
  'Master of Technology',
  'Master of Computer Applications',
  'Bachelor and Master of Technology',
]

// Helper to check if a course is Ph.D / Doctor of Philosophy (Ph.D is excluded from student management)
export function isPhdCourse(course) {
  if (!course) return false
  const lower = String(course).toLowerCase()
  return (
    lower.includes('phd') ||
    lower.includes('ph.d') ||
    lower.includes('doctor of philosophy') ||
    lower.includes('doctoral')
  )
}

// Normalizes course input variants to official designations
export function normalizeCourse(rawCourse) {
  if (!rawCourse || typeof rawCourse !== 'string') return ''
  const trimmed = rawCourse.trim()
  const lower = trimmed.toLowerCase()

  // Ph.D is strictly excluded from Student Management
  if (isPhdCourse(trimmed)) {
    return ''
  }

  // Bachelor and Master of Technology (Dual Degree) - check first before individual B.Tech/M.Tech
  if (
    lower.includes('bachelor and master') ||
    lower.includes('bachelore and master') ||
    lower.includes('dual degree') ||
    lower === 'dd' ||
    lower.includes('b.tech + m.tech') ||
    lower.includes('btech + mtech') ||
    lower.includes('b.tech and m.tech') ||
    lower.includes('integrated')
  ) {
    return 'Bachelor and Master of Technology'
  }

  // Bachelor of Technology
  if (
    lower === 'b.tech' ||
    lower === 'btech' ||
    lower === 'b tech' ||
    lower.includes('bachelor of technology') ||
    lower.includes('bachelore of technology') ||
    lower === 'b.e' ||
    lower === 'be'
  ) {
    return 'Bachelor of Technology'
  }

  // Master of Technology
  if (
    lower === 'm.tech' ||
    lower === 'mtech' ||
    lower === 'm tech' ||
    lower.includes('master of technology') ||
    lower === 'm.e' ||
    lower === 'me'
  ) {
    return 'Master of Technology'
  }

  // Master of Computer Applications
  if (
    lower === 'mca' ||
    lower.includes('master of computer application') ||
    lower.includes('master of computer applications')
  ) {
    return 'Master of Computer Applications'
  }

  // Preserve original title casing if it doesn't match a known shorthand
  return trimmed
}

// Extract joining/admission year from student Roll Number
// Examples:
//  - "2606002" -> 2026
//  - "2106042" -> 2021
//  - "2026042" -> 2026
export function getStudentAdmissionYear(rollNo) {
  if (!rollNo) return null
  const str = String(rollNo).trim()
  const match4 = str.match(/^(20\d{2})/)
  if (match4) return parseInt(match4[1], 10)
  const match2 = str.match(/^(\d{2})/)
  if (match2) {
    const yr = parseInt(match2[1], 10)
    return yr > 50 ? 1900 + yr : 2000 + yr
  }
  return null
}

// Returns program duration in years:
// - M.Tech / MCA: 2 Years
// - Dual Degree: 5 Years
// - Architecture and Planning (B.Arch): 5 Years
// - MnC (Mathematics and Computing Technology): 5 Years
// - CST (Chemical Science and Technology): 5 Years
// - Standard B.Tech (CSE, ECE, ME, CE, EE): 4 Years
export function getProgramDurationYears(course, department) {
  const normCourse = String(course || '').toLowerCase()
  const normDept = String(department || '').toLowerCase()

  // Dual Degree / Integrated (5 years)
  if (
    normCourse.includes('dual degree') ||
    normCourse.includes('bachelor and master') ||
    normCourse.includes('integrated')
  ) {
    return 5
  }

  // Architecture and Planning (5 years)
  if (
    normDept.includes('arch') ||
    normCourse.includes('b.arch') ||
    normCourse.includes('architecture')
  ) {
    return 5
  }

  // MnC (Mathematics and Computing Technology) - 5 years
  if (
    normDept.includes('math') ||
    normDept.includes('mnc')
  ) {
    return 5
  }

  // CST (Chemical Science and Technology) - 5 years
  if (
    normDept.includes('chem') ||
    normDept.includes('cst')
  ) {
    return 5
  }

  // M.Tech (2 years)
  if (normCourse.includes('master of technology') || normCourse === 'm.tech' || normCourse === 'mtech') {
    return 2
  }

  // MCA (2 years)
  if (normCourse.includes('master of computer applications') || normCourse === 'mca') {
    return 2
  }

  // Standard B.Tech (4 years)
  if (normCourse.includes('bachelor of technology') || normCourse.includes('b.tech') || normCourse.includes('btech')) {
    return 4
  }

  return 4
}

// Calculates expected passing/graduation year
export function getStudentPassingYear(rollNo, course, department) {
  const admissionYear = getStudentAdmissionYear(rollNo)
  if (!admissionYear) return null
  const duration = getProgramDurationYears(course, department)
  return admissionYear + duration
}

// Determines if a student has graduated as of a specific date (cutoff July 1st of passing year)
export function isStudentGraduated(student, asOfDate = new Date()) {
  if (!student || !student.roll_no) return false
  if (isPhdCourse(student.course)) return false // Ph.D is strictly ignored

  const admissionYear = getStudentAdmissionYear(student.roll_no)
  if (!admissionYear) return false
  const duration = getProgramDurationYears(student.course, student.department)
  const passingYear = admissionYear + duration

  const currentYear = asOfDate.getFullYear()
  const currentMonth = asOfDate.getMonth() + 1 // 1-12

  // Academic year concludes around June/July
  if (currentYear > passingYear) return true
  if (currentYear === passingYear && currentMonth >= 7) return true
  return false
}

export const OFFICIAL_DEPARTMENTS = [
  'Applied Physics and Material Engineering',
  'Architecture and Planning',
  'Chemical Science and Technology',
  'Civil Engineering',
  'Computer Science and Engineering',
  'Electrical Engineering',
  'Electronics and Communication Engineering',
  'Humanities & Social Sciences',
  'Materials Science and Engineering',
  'Mathematics and Computing Technology',
  'Mechanical Engineering',
  'Mechatronics and Automation Engineering',
]

export const DEPT_CODE_TO_NAME = {
  'arch': 'Architecture and Planning',
  'che': 'Chemical Science and Technology',
  'ce': 'Civil Engineering',
  'cse': 'Computer Science and Engineering',
  'ee': 'Electrical Engineering',
  'ece': 'Electronics and Communication Engineering',
  'hss': 'Humanities & Social Sciences',
  'maths': 'Mathematics and Computing Technology',
  'me': 'Mechanical Engineering',
  'phy': 'Applied Physics and Material Engineering',
  'mae': 'Mechatronics and Automation Engineering',
  'mse': 'Materials Science and Engineering',
}

export const DEPT_NAME_TO_CODE = {
  'Architecture and Planning': 'arch',
  'Architecture': 'arch',
  'Chemical Science and Technology': 'che',
  'Civil Engineering': 'ce',
  'Computer Science and Engineering': 'cse',
  'Electrical Engineering': 'ee',
  'Electronics and Communication Engineering': 'ece',
  'Humanities & Social Sciences': 'hss',
  'Mathematics and Computing Technology': 'maths',
  'Mechanical Engineering': 'me',
  'Applied Physics and Material Engineering': 'phy',
  'Mechatronics and Automation Engineering': 'mae',
  'Materials Science and Engineering': 'mse',
}

const DEPT_ALIASES = {
  'cs': 'Computer Science and Engineering',
  'computer science': 'Computer Science and Engineering',
  'computer science and engineering': 'Computer Science and Engineering',
  'cse': 'Computer Science and Engineering',
  'ec': 'Electronics and Communication Engineering',
  'electronics': 'Electronics and Communication Engineering',
  'ece': 'Electronics and Communication Engineering',
  'electronics and communication engineering': 'Electronics and Communication Engineering',
  'electronics & communication engineering': 'Electronics and Communication Engineering',
  'electronics & communication': 'Electronics and Communication Engineering',
  'mech': 'Mechanical Engineering',
  'mechanical': 'Mechanical Engineering',
  'me': 'Mechanical Engineering',
  'mechanical engineering': 'Mechanical Engineering',
  'civil': 'Civil Engineering',
  'ce': 'Civil Engineering',
  'civil engineering': 'Civil Engineering',
  'electrical': 'Electrical Engineering',
  'ee': 'Electrical Engineering',
  'electrical engineering': 'Electrical Engineering',
  'arch': 'Architecture and Planning',
  'architecture': 'Architecture and Planning',
  'architecture and planning': 'Architecture and Planning',
  'architecture & planning': 'Architecture and Planning',
  'department of architecture and planning': 'Architecture and Planning',
  'planning': 'Architecture and Planning',
  'b.arch': 'Architecture and Planning',
  'm.plan': 'Architecture and Planning',
  'chemical': 'Chemical Science and Technology',
  'che': 'Chemical Science and Technology',
  'chemical science and technology': 'Chemical Science and Technology',
  'chemical engineering': 'Chemical Science and Technology',
  'maths': 'Mathematics and Computing Technology',
  'mathematics': 'Mathematics and Computing Technology',
  'mathematics and computing technology': 'Mathematics and Computing Technology',
  'phy': 'Applied Physics and Material Engineering',
  'physics': 'Applied Physics and Material Engineering',
  'applied physics': 'Applied Physics and Material Engineering',
  'applied physics and material engineering': 'Applied Physics and Material Engineering',
  'applied physics and materials engineering': 'Applied Physics and Material Engineering',
  'mae': 'Mechatronics and Automation Engineering',
  'mechatronics': 'Mechatronics and Automation Engineering',
  'mechatronics and automation engineering': 'Mechatronics and Automation Engineering',
  'mse': 'Materials Science and Engineering',
  'materials': 'Materials Science and Engineering',
  'material science': 'Materials Science and Engineering',
  'material science and engineering': 'Materials Science and Engineering',
  'materials science and engineering': 'Materials Science and Engineering',
  'material science & engineering': 'Materials Science and Engineering',
  'hss': 'Humanities & Social Sciences',
  'humanities': 'Humanities & Social Sciences',
  'humanities & social sciences': 'Humanities & Social Sciences',
  'humanities and social sciences': 'Humanities & Social Sciences'
}

export const DEPT_ALL_VARIANTS = {
  'arch': [
    'Architecture and Planning',
    'Architecture',
    'arch',
    'architecture and planning',
    'architecture & planning',
    'Department of Architecture and Planning',
  ],
  'che': [
    'Chemical Science and Technology',
    'Chemical Engineering',
    'che',
    'chemical science and technology',
    'chemical engineering',
  ],
  'ce': [
    'Civil Engineering',
    'ce',
    'civil engineering',
    'civil',
  ],
  'cse': [
    'Computer Science and Engineering',
    'cse',
    'computer science and engineering',
    'cs',
    'computer science',
  ],
  'ee': [
    'Electrical Engineering',
    'ee',
    'electrical engineering',
    'electrical',
  ],
  'ece': [
    'Electronics and Communication Engineering',
    'ece',
    'electronics and communication engineering',
    'electronics & communication engineering',
    'electronics & communication',
    'ec',
  ],
  'hss': [
    'Humanities & Social Sciences',
    'Humanities and Social Sciences',
    'hss',
    'humanities',
    'humanities & social sciences',
    'humanities and social sciences',
  ],
  'maths': [
    'Mathematics and Computing Technology',
    'Mathematics',
    'maths',
    'mathematics and computing technology',
    'mathematics',
  ],
  'me': [
    'Mechanical Engineering',
    'me',
    'mechanical engineering',
    'mech',
  ],
  'phy': [
    'Applied Physics and Material Engineering',
    'Applied Physics and Materials Engineering',
    'Applied Physics',
    'Physics',
    'phy',
    'applied physics and material engineering',
    'applied physics',
  ],
  'mae': [
    'Mechatronics and Automation Engineering',
    'Mechatronics',
    'mae',
    'mechatronics and automation engineering',
  ],
  'mse': [
    'Materials Science and Engineering',
    'Material Science and Engineering',
    'Material Science & Engineering',
    'Materials Science',
    'Material Science',
    'mse',
    'materials science and engineering',
    'material science and engineering',
  ],
}

// Normalizes any department input to official full department name
export function normalizeDepartment(rawDept) {
  if (!rawDept || typeof rawDept !== 'string') return ''
  const trimmed = rawDept.trim()
  const lower = trimmed.toLowerCase()

  if (DEPT_ALIASES[lower]) {
    return DEPT_ALIASES[lower]
  }

  if (DEPT_CODE_TO_NAME[lower]) {
    return DEPT_CODE_TO_NAME[lower]
  }

  for (const name of Object.values(DEPT_CODE_TO_NAME)) {
    if (name.toLowerCase() === lower) {
      return name
    }
  }

  // Direct map check in depList values
  for (const name of depList.values()) {
    if (name.toLowerCase() === lower) {
      return name
    }
  }

  return trimmed
}

// Resolves a department string to its short code (e.g., 'phy', 'cse', 'arch')
export function getDepartmentCode(rawDept) {
  if (!rawDept) return ''
  const trimmed = rawDept.trim()
  const lower = trimmed.toLowerCase()
  if (DEPT_NAME_TO_CODE[trimmed]) return DEPT_NAME_TO_CODE[trimmed]
  if (DEPT_CODE_TO_NAME[lower]) return lower
  const fullName = normalizeDepartment(trimmed)
  if (DEPT_NAME_TO_CODE[fullName]) return DEPT_NAME_TO_CODE[fullName]
  if (lower === 'arch' || lower.includes('architect') || lower.includes('planning')) return 'arch'
  if (lower === 'cse' || lower.includes('computer')) return 'cse'
  if (lower === 'ece' || lower.includes('electronic')) return 'ece'
  if (lower === 'ee' || lower.includes('electric')) return 'ee'
  if (lower === 'me' || lower.includes('mechanic')) return 'me'
  if (lower === 'ce' || lower.includes('civil')) return 'ce'
  if (lower === 'che' || lower.includes('chemic')) return 'che'
  if (lower === 'phy' || lower.includes('physic')) return 'phy'
  if (lower === 'maths' || lower.includes('math')) return 'maths'
  if (lower === 'mae' || lower.includes('mechatronic')) return 'mae'
  if (lower === 'mse' || lower.includes('material')) return 'mse'
  if (lower === 'hss' || lower.includes('humanit')) return 'hss'
  return lower
}

// Returns candidate values for SQL matching (e.g. ['Applied Physics and Material Engineering', 'phy'])
export function getDepartmentQueryCandidates(rawDept) {
  if (!rawDept || rawDept === 'All' || rawDept === 'all') return []
  const trimmed = rawDept.trim()
  const fullName = normalizeDepartment(trimmed)
  const code = getDepartmentCode(trimmed)
  const variants = DEPT_ALL_VARIANTS[code] || []
  const set = new Set([trimmed, fullName, code, ...variants].filter(Boolean))
  return Array.from(set)
}

// Normalizes raw spreadsheet row object to standard student fields
export function normalizeStudentRow(rawRow) {
  const row = {}
  for (const [key, value] of Object.entries(rawRow || {})) {
    if (!key) continue
    const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    let strVal = typeof value === 'string' ? value.trim() : (value !== null && value !== undefined ? String(value).trim() : '')
    // Handle Excel integer float conversion quirk (e.g. 2106001.0 -> 2106001)
    if (/^\d+\.0$/.test(strVal)) {
      strVal = strVal.slice(0, -2)
    }
    row[cleanKey] = strVal
  }

  let roll_no = row['rollno'] || row['rollnumber'] || row['roll'] || ''
  if (/^\d+\.0$/.test(roll_no)) roll_no = roll_no.slice(0, -2)

  let enrollment_no = row['enrollmentnumber'] || row['enrollmentno'] || row['regno'] || row['registrationnumber'] || ''
  if (/^\d+\.0$/.test(enrollment_no)) enrollment_no = enrollment_no.slice(0, -2)

  const name = row['name'] || row['studentname'] || row['fullname'] || ''
  const department = normalizeDepartment(row['department'] || row['dept'] || '')
  const course = normalizeCourse(row['course'] || row['program'] || row['degree'] || '')
  const email = row['nitpemail'] || row['email'] || row['instituteemail'] || ''
  const specialization = row['specialization'] || row['spec'] || ''
  const admission_year = getStudentAdmissionYear(roll_no)
  const passing_year = getStudentPassingYear(roll_no, course, department)

  return {
    roll_no,
    name,
    department,
    course,
    email: email || null,
    specialization: specialization || null,
    enrollment_no: enrollment_no || null,
    admission_year,
    passing_year,
  }
}

