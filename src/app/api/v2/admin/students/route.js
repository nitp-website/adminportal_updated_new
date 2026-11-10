import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { ROLES } from '@/lib/roles'
import { query } from '@/lib/db'
import {
  ensureStudentsTable,
  normalizeDepartment,
  normalizeCourse,
  getDepartmentQueryCandidates,
  isStudentGraduated,
  isPhdCourse,
  getStudentAdmissionYear,
  getStudentPassingYear,
  syncStudentGraduationStatus,
  getCachedAvailableCourses,
  getCachedAvailableYears,
  invalidateStudentMetadataCache,
} from '@/lib/studentDb'

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


export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAuthorized(session)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await ensureStudentsTable()

    const { searchParams } = new URL(request.url)
    let department = searchParams.get('department')?.trim()
    const courseParam = searchParams.get('course')?.trim()
    const rawActive = searchParams.get('active')?.trim()
    const rawYear = searchParams.get('year')?.trim() || searchParams.get('admission_year')?.trim()
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    const isDeptAdminOnly = !isSuperOrAcademicAdmin(session)
    const userDept = session.user.department ? normalizeDepartment(session.user.department) : ''

    if (isDeptAdminOnly) {
      department = userDept
    }

    // Check if client is requesting a preview/count of graduated students
    if (searchParams.get('graduated_preview') === 'true') {
      let gradSql = `
        SELECT id, roll_no, name, department, course, admission_year, passing_year, active, status
        FROM students
        WHERE (course NOT LIKE '%Doctor of Philosophy%' AND course NOT LIKE '%Ph.D%' AND course NOT LIKE '%PhD%')
      `
      const gradParams = []
      if (isDeptAdminOnly) {
        gradSql += ' AND department = ?'
        gradParams.push(userDept)
      } else if (department && department !== 'All' && department !== 'all') {
        const candidates = getDepartmentQueryCandidates(department)
        gradSql += ` AND department IN (${candidates.map(() => '?').join(', ')})`
        gradParams.push(...candidates)
      }
      gradSql += ' ORDER BY department ASC, roll_no ASC'

      const allRows = await query(gradSql, gradParams)
      const graduated = allRows.filter(s => isStudentGraduated(s))
      return NextResponse.json({
        success: true,
        graduatedCount: graduated.length,
        graduatedStudents: graduated.slice(0, 20),
      })
    }

    const conditions = [
      '1=1',
      "(course NOT LIKE '%Doctor of Philosophy%' AND course NOT LIKE '%Ph.D%' AND course NOT LIKE '%PhD%')"
    ]
    const params = []

    // Active status filter: "1" = Active only, "0" = Graduated / Archives only, "all" = All (default)
    if (rawActive === '1') {
      conditions.push('active = 1')
    } else if (rawActive === '0') {
      conditions.push('active = 0')
    }

    // Joining / Admission Year filter
    if (rawYear && rawYear !== 'All' && rawYear !== 'all') {
      const parsedYear = parseInt(rawYear, 10)
      if (!isNaN(parsedYear)) {
        conditions.push('admission_year = ?')
        params.push(parsedYear)
      }
    }

    const isAllDept = !department || department.toLowerCase() === 'all'
    const deptCandidates = !isAllDept ? getDepartmentQueryCandidates(department) : []
    if (deptCandidates.length > 0) {
      conditions.push(`department IN (${deptCandidates.map(() => '?').join(', ')})`)
      params.push(...deptCandidates)
    }

    if (courseParam && courseParam !== 'All' && courseParam !== 'All Courses') {
      conditions.push('course = ?')
      params.push(normalizeCourse(courseParam))
    }

    if (search) {
      conditions.push('(name LIKE ? OR roll_no LIKE ? OR email LIKE ? OR enrollment_no LIKE ?)')
      const searchWildcard = `%${search}%`
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard)
    }

    const whereClause = conditions.join(' AND ')

    // 1. Fetch paginated data
    const dataSql = `
      SELECT id, roll_no, name, department, course, email, specialization, enrollment_no, admission_year, passing_year, active, status, updated_at
      FROM students
      WHERE ${whereClause}
      ORDER BY department ASC, course ASC, roll_no ASC
      LIMIT ? OFFSET ?
    `

    // 2. Fetch total count
    const countSql = `SELECT COUNT(*) AS total FROM students WHERE ${whereClause}`

    // Run parallel queries with caching for instant responses even with 10,000+ records
    const [students, countResult, availableCourses, availableYears] = await Promise.all([
      query(dataSql, [...params, limit, offset]),
      query(countSql, params),
      getCachedAvailableCourses(deptCandidates),
      getCachedAvailableYears(deptCandidates),
    ])

    const total = countResult[0]?.total || 0

    return NextResponse.json({
      success: true,
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        availableCourses,
        availableYears,
        department: isAllDept ? 'All' : department,
        selectedYear: rawYear && rawYear !== 'All' ? parseInt(rawYear, 10) : 'All',
        selectedActive: rawActive || 'all',
      },
    })
  } catch (error) {
    console.error('Admin GET students error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}


export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAuthorized(session)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await ensureStudentsTable()
    const body = await request.json()

    if (isPhdCourse(body.course)) {
      return NextResponse.json(
        { success: false, message: 'Ph.D scholars are not managed in the student directory.' },
        { status: 400 }
      )
    }

    const roll_no = body.roll_no?.trim()
    const name = body.name?.trim()
    let department = normalizeDepartment(body.department || '')
    const course = normalizeCourse(body.course || '')
    const email = body.email?.trim() || null
    const specialization = body.specialization?.trim() || null
    const enrollment_no = body.enrollment_no?.trim() || null
    const admission_year = getStudentAdmissionYear(roll_no, email, enrollment_no)
    const passing_year = getStudentPassingYear(roll_no, course, department, email, enrollment_no)
    const isGrad = isStudentGraduated({ roll_no, email, enrollment_no, course, department, admission_year, passing_year })
    const active = body.active !== undefined ? (body.active ? 1 : 0) : (isGrad ? 0 : 1)
    const status = isGrad ? 'graduated' : (body.status || 'active')

    if (!roll_no || !name || !department || !course) {
      return NextResponse.json(
        { success: false, message: 'Roll No, Name, Department, and Course are required.' },
        { status: 400 }
      )
    }

    // Role check for Dept Admin
    const isDeptAdminOnly = !isSuperOrAcademicAdmin(session)
    const userDept = session.user.department ? normalizeDepartment(session.user.department) : ''
    if (isDeptAdminOnly && department !== userDept) {
      return NextResponse.json(
        { success: false, message: `Permission Denied: You can only add records for '${userDept}'` },
        { status: 403 }
      )
    }

    const insertSql = `
      INSERT INTO students (roll_no, name, department, course, email, specialization, enrollment_no, admission_year, passing_year, active, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    await query(insertSql, [roll_no, name, department, course, email, specialization, enrollment_no, admission_year, passing_year, active, status])
    invalidateStudentMetadataCache()

    return NextResponse.json({
      success: true,
      message: `Student '${roll_no}' saved successfully.`,
    })
  } catch (error) {
    console.error('Admin POST student error:', error)
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAuthorized(session)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await ensureStudentsTable()
    const body = await request.json()
    const { id, roll_no, name, department, course, email, specialization, enrollment_no, active: reqActive, status: reqStatus } = body

    if (!id && !roll_no) {
      return NextResponse.json({ success: false, message: 'Student id or roll_no is required.' }, { status: 400 })
    }

    // Check existing record
    const existing = await query('SELECT * FROM students WHERE id = ? OR roll_no = ? LIMIT 1', [id || null, roll_no || null])
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, message: 'Student not found.' }, { status: 404 })
    }

    const current = existing[0]
    const isDeptAdminOnly = !isSuperOrAcademicAdmin(session)
    const userDept = session.user.department ? normalizeDepartment(session.user.department) : ''

    if (isDeptAdminOnly && current.department !== userDept) {
      return NextResponse.json({ success: false, message: 'Permission Denied.' }, { status: 403 })
    }

    const updatedDept = department ? normalizeDepartment(department) : current.department
    const updatedCourse = course ? normalizeCourse(course) : current.course
    const effectiveRoll = roll_no?.trim() || current.roll_no
    const effectiveEmail = email !== undefined ? (email?.trim() || null) : current.email
    const effectiveEnrollment = enrollment_no !== undefined ? (enrollment_no?.trim() || null) : current.enrollment_no
    const admission_year = getStudentAdmissionYear(effectiveRoll, effectiveEmail, effectiveEnrollment)
    const passing_year = getStudentPassingYear(effectiveRoll, updatedCourse, updatedDept, effectiveEmail, effectiveEnrollment)
    const isGrad = isStudentGraduated({ roll_no: effectiveRoll, email: effectiveEmail, enrollment_no: effectiveEnrollment, course: updatedCourse, department: updatedDept, admission_year, passing_year })
    const active = reqActive !== undefined ? (reqActive ? 1 : 0) : (isGrad ? 0 : 1)
    const status = reqStatus || (isGrad ? 'graduated' : (current.status || 'active'))

    const updateSql = `
      UPDATE students
      SET
        roll_no = ?,
        name = ?,
        department = ?,
        course = ?,
        email = ?,
        specialization = ?,
        enrollment_no = ?,
        admission_year = ?,
        passing_year = ?,
        active = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    await query(updateSql, [
      effectiveRoll,
      name?.trim() || current.name,
      updatedDept,
      updatedCourse,
      effectiveEmail,
      specialization !== undefined ? (specialization?.trim() || null) : current.specialization,
      enrollment_no !== undefined ? (enrollment_no?.trim() || null) : current.enrollment_no,
      admission_year,
      passing_year,
      active,
      status,
      current.id,
    ])
    invalidateStudentMetadataCache()

    return NextResponse.json({ success: true, message: 'Student record updated successfully.' })
  } catch (error) {
    console.error('Admin PUT student error:', error)
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 })
  }
}


export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAuthorized(session)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await ensureStudentsTable()
    await syncStudentGraduationStatus()

    return NextResponse.json({
      success: true,
      message: 'Graduation status and active flags synchronized successfully.',
    })
  } catch (error) {
    console.error('Admin PATCH student error:', error)
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 })
  }
}


export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAuthorized(session)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await ensureStudentsTable()

    const { searchParams } = new URL(request.url)
    const roll_no = searchParams.get('roll_no')?.trim()
    const id = searchParams.get('id')
    const deleteAll = searchParams.get('all') === 'true'
    const deleteGraduated = searchParams.get('graduated') === 'true'
    const archiveGraduated = searchParams.get('archive_graduated') === 'true'
    let department = searchParams.get('department')?.trim()
    const courseParam = searchParams.get('course')?.trim()

    const isDeptAdminOnly = !isSuperOrAcademicAdmin(session)
    const userDept = session.user.department ? normalizeDepartment(session.user.department) : ''

    // 0. Wipe entire table if super admin requests
    if (deleteAll && !isDeptAdminOnly) {
      await query('DELETE FROM students')
      invalidateStudentMetadataCache()
      return NextResponse.json({ success: true, message: 'All student records cleared successfully.' })
    }

    // 0.25. Archive graduated students (set active = 0)
    if (archiveGraduated) {
      await syncStudentGraduationStatus()
      invalidateStudentMetadataCache()
      return NextResponse.json({
        success: true,
        message: 'All graduated student records have been archived (active = 0).',
      })
    }

    // 0.5. Hard delete all graduated students based on their course and department academic duration
    if (deleteGraduated) {
      // First ensure graduation flags are synchronized
      await syncStudentGraduationStatus()

      let delGradSql = `
        DELETE FROM students
        WHERE active = 0
          AND (course NOT LIKE '%Doctor of Philosophy%' AND course NOT LIKE '%Ph.D%' AND course NOT LIKE '%PhD%')
      `
      const delGradParams = []
      if (isDeptAdminOnly) {
        delGradSql += ' AND department = ?'
        delGradParams.push(userDept)
      } else if (department && department !== 'All' && department !== 'all') {
        const candidates = getDepartmentQueryCandidates(department)
        delGradSql += ` AND department IN (${candidates.map(() => '?').join(', ')})`
        delGradParams.push(...candidates)
      }

      const result = await query(delGradSql, delGradParams)
      invalidateStudentMetadataCache()

      return NextResponse.json({
        success: true,
        message: `Successfully hard-deleted graduated student record(s).`,
        deletedCount: result?.affectedRows || 0,
      })
    }

    // 1. Delete single student
    if (roll_no || id) {
      const existing = await query('SELECT department FROM students WHERE roll_no = ? OR id = ? LIMIT 1', [roll_no || null, id || null])
      if (!existing.length) {
        return NextResponse.json({ success: false, message: 'Student not found.' }, { status: 404 })
      }
      if (isDeptAdminOnly && existing[0].department !== userDept) {
        return NextResponse.json({ success: false, message: 'Permission Denied.' }, { status: 403 })
      }

      await query('DELETE FROM students WHERE roll_no = ? OR id = ?', [roll_no || null, id || null])
      invalidateStudentMetadataCache()
      return NextResponse.json({ success: true, message: `Student deleted successfully.` })
    }

    // 2. Bulk delete by department and optional course
    if (!department) {
      return NextResponse.json(
        { success: false, message: 'Provide `roll_no`, or `department` (and optional `course`) to delete.' },
        { status: 400 }
      )
    }

    const normDept = normalizeDepartment(department)
    if (isDeptAdminOnly && normDept !== userDept) {
      return NextResponse.json({ success: false, message: 'Permission Denied.' }, { status: 403 })
    }

    const candidates = getDepartmentQueryCandidates(department)
    const placeholders = candidates.map(() => '?').join(', ')

    if (courseParam) {
      const course = normalizeCourse(courseParam)
      await query(`DELETE FROM students WHERE department IN (${placeholders}) AND course = ?`, [...candidates, course])
      invalidateStudentMetadataCache()
      return NextResponse.json({
        success: true,
        message: `Successfully deleted student records for ${normDept} - ${course}.`,
      })
    } else {
      await query(`DELETE FROM students WHERE department IN (${placeholders})`, candidates)
      invalidateStudentMetadataCache()
      return NextResponse.json({
        success: true,
        message: `Successfully deleted all student records for ${normDept}.`,
      })
    }
  } catch (error) {
    console.error('Admin DELETE students error:', error)
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 })
  }
}

