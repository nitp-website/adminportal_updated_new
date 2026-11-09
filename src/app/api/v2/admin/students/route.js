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

/**
 * GET /api/v2/admin/students
 * Admin view of students with filtering and pagination.
 */
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
        SELECT id, roll_no, name, department, course, admission_year, passing_year
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

    const isAllDept = !department || department.toLowerCase() === 'all'
    if (!isAllDept) {
      const candidates = getDepartmentQueryCandidates(department)
      if (candidates.length > 0) {
        conditions.push(`department IN (${candidates.map(() => '?').join(', ')})`)
        params.push(...candidates)
      }
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
      SELECT id, roll_no, name, department, course, email, specialization, enrollment_no, status, updated_at
      FROM students
      WHERE ${whereClause}
      ORDER BY department ASC, course ASC, roll_no ASC
      LIMIT ? OFFSET ?
    `
    const students = await query(dataSql, [...params, limit, offset])

    // 2. Fetch total count
    const countSql = `SELECT COUNT(*) AS total FROM students WHERE ${whereClause}`
    const countResult = await query(countSql, params)
    const total = countResult[0]?.total || 0

    // 3. Fetch distinct courses available (excluding Ph.D)
    let courseSql = 'SELECT DISTINCT course FROM students WHERE course IS NOT NULL AND course != "" AND (course NOT LIKE "%Doctor of Philosophy%" AND course NOT LIKE "%Ph.D%" AND course NOT LIKE "%PhD%")'
    const courseParams = []
    if (!isAllDept) {
      const candidates = getDepartmentQueryCandidates(department)
      if (candidates.length > 0) {
        courseSql += ` AND department IN (${candidates.map(() => '?').join(', ')})`
        courseParams.push(...candidates)
      }
    }
    courseSql += ' ORDER BY course ASC'
    const courseResults = await query(courseSql, courseParams)
    const availableCourses = courseResults.map(r => r.course).filter(Boolean)

    return NextResponse.json({
      success: true,
      data: students,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
        availableCourses,
        department: isAllDept ? 'All' : department,
      },
    })
  } catch (error) {
    console.error('Admin GET students error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/v2/admin/students
 * Add a single student record manually.
 */
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
    const admission_year = getStudentAdmissionYear(roll_no)
    const passing_year = getStudentPassingYear(roll_no, course, department)

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
      INSERT INTO students (roll_no, name, department, course, email, specialization, enrollment_no, admission_year, passing_year, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        department = VALUES(department),
        course = VALUES(course),
        email = VALUES(email),
        specialization = VALUES(specialization),
        enrollment_no = VALUES(enrollment_no),
        admission_year = VALUES(admission_year),
        passing_year = VALUES(passing_year),
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
    `
    await query(insertSql, [roll_no, name, department, course, email, specialization, enrollment_no, admission_year, passing_year])

    return NextResponse.json({
      success: true,
      message: `Student '${roll_no}' saved successfully.`,
    })
  } catch (error) {
    console.error('Admin POST student error:', error)
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 })
  }
}

/**
 * PUT /api/v2/admin/students
 * Update an existing student record.
 */
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!isAuthorized(session)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await ensureStudentsTable()
    const body = await request.json()
    const { id, roll_no, name, department, course, email, specialization, enrollment_no, status } = body

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
    const admission_year = getStudentAdmissionYear(effectiveRoll)
    const passing_year = getStudentPassingYear(effectiveRoll, updatedCourse, updatedDept)

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
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `
    await query(updateSql, [
      effectiveRoll,
      name?.trim() || current.name,
      updatedDept,
      updatedCourse,
      email !== undefined ? (email?.trim() || null) : current.email,
      specialization !== undefined ? (specialization?.trim() || null) : current.specialization,
      enrollment_no !== undefined ? (enrollment_no?.trim() || null) : current.enrollment_no,
      admission_year,
      passing_year,
      status || current.status,
      current.id,
    ])

    return NextResponse.json({ success: true, message: 'Student record updated successfully.' })
  } catch (error) {
    console.error('Admin PUT student error:', error)
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/v2/admin/students
 * Supports deleting:
 *  - Single student by `roll_no` or `id`
 *  - Course batch by `department` + `course`
 *  - Entire department student list by `department`
 */
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
    let department = searchParams.get('department')?.trim()
    const courseParam = searchParams.get('course')?.trim()

    const isDeptAdminOnly = !isSuperOrAcademicAdmin(session)
    const userDept = session.user.department ? normalizeDepartment(session.user.department) : ''

    // 0. Wipe entire table if super admin requests
    if (deleteAll && !isDeptAdminOnly) {
      await query('DELETE FROM students')
      return NextResponse.json({ success: true, message: 'All student records cleared successfully.' })
    }

    // 0.5. Hard delete all graduated students based on their course and department academic duration
    if (deleteGraduated) {
      let gradSql = `
        SELECT id, roll_no, department, course, admission_year, passing_year
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

      const allRows = await query(gradSql, gradParams)
      const toDelete = allRows.filter(s => isStudentGraduated(s))

      if (toDelete.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No graduated student records found to delete.',
          deletedCount: 0,
        })
      }

      // Hard delete in chunks of 150
      const rollNos = toDelete.map(s => s.roll_no)
      const CHUNK_SIZE = 150
      for (let i = 0; i < rollNos.length; i += CHUNK_SIZE) {
        const chunk = rollNos.slice(i, i + CHUNK_SIZE)
        const placeholders = chunk.map(() => '?').join(', ')
        await query(`DELETE FROM students WHERE roll_no IN (${placeholders})`, chunk)
      }

      return NextResponse.json({
        success: true,
        message: `Successfully hard-deleted ${rollNos.length} graduated student record(s).`,
        deletedCount: rollNos.length,
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
      return NextResponse.json({
        success: true,
        message: `Successfully deleted student records for ${normDept} - ${course}.`,
      })
    } else {
      await query(`DELETE FROM students WHERE department IN (${placeholders})`, candidates)
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

