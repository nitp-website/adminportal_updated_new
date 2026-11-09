import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ensureStudentsTable, normalizeCourse, normalizeDepartment, getDepartmentQueryCandidates } from '@/lib/studentDb'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

/**
 * GET /api/v2/students
 * Public API to fetch students for a department, filtered by course and search keyword.
 *
 * Query Parameters:
 *  - department (required): e.g. "cse", "ece", "me"
 *  - course (optional): e.g. "Bachelor of Technology", "Master of Technology"
 *  - search (optional): keyword matching name or roll_no
 *  - page (optional, default: 1)
 *  - limit (optional, default: 50, max: 200)
 */
export async function GET(request) {
  try {
    await ensureStudentsTable()

    const { searchParams } = new URL(request.url)
    const rawDept = searchParams.get('department')?.trim()
    const rawCourse = searchParams.get('course')?.trim()
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    const isAllDept = !rawDept || rawDept.toLowerCase() === 'all'
    const departmentName = isAllDept ? 'All' : normalizeDepartment(rawDept)
    const course = rawCourse && rawCourse !== 'All' && rawCourse !== 'All Courses' ? normalizeCourse(rawCourse) : null

    // Build WHERE clause
    const conditions = [
      'status = "active"',
      "(course NOT LIKE '%Doctor of Philosophy%' AND course NOT LIKE '%Ph.D%' AND course NOT LIKE '%PhD%')"
    ]
    const params = []

    if (!isAllDept) {
      const candidates = getDepartmentQueryCandidates(rawDept)
      if (candidates.length > 0) {
        conditions.push(`department IN (${candidates.map(() => '?').join(', ')})`)
        params.push(...candidates)
      }
    }

    if (course) {
      conditions.push('course = ?')
      params.push(course)
    }

    if (search) {
      conditions.push('(name LIKE ? OR roll_no LIKE ? OR email LIKE ? OR enrollment_no LIKE ?)')
      const searchWildcard = `%${search}%`
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard)
    }

    const whereClause = conditions.join(' AND ')

    // 1. Fetch paginated student list
    const dataSql = `
      SELECT id, roll_no, name, department, course, email, specialization, enrollment_no
      FROM students
      WHERE ${whereClause}
      ORDER BY department ASC, course ASC, roll_no ASC
      LIMIT ? OFFSET ?
    `
    const students = await query(dataSql, [...params, limit, offset])

    // 2. Fetch total count
    const countSql = `SELECT COUNT(*) AS total FROM students WHERE ${whereClause}`
    const countResult = await query(countSql, params)
    const totalStudents = countResult[0]?.total || 0

    // 3. Fetch distinct available courses for this department (excluding Ph.D)
    let coursesSql = 'SELECT DISTINCT course FROM students WHERE status = "active" AND course IS NOT NULL AND course != "" AND (course NOT LIKE "%Doctor of Philosophy%" AND course NOT LIKE "%Ph.D%" AND course NOT LIKE "%PhD%")'
    const courseParams = []
    if (!isAllDept) {
      const candidates = getDepartmentQueryCandidates(rawDept)
      if (candidates.length > 0) {
        coursesSql += ` AND department IN (${candidates.map(() => '?').join(', ')})`
        courseParams.push(...candidates)
      }
    }
    coursesSql += ' ORDER BY course ASC'
    const courseResults = await query(coursesSql, courseParams)
    const availableCourses = courseResults.map(r => r.course).filter(Boolean)

    return NextResponse.json(
      {
        success: true,
        data: students,
        meta: {
          totalStudents,
          currentPage: page,
          totalPages: Math.ceil(totalStudents / limit) || 1,
          limit,
          department: departmentName,
          selectedCourse: course || 'All',
          availableCourses,
        },
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error while fetching students.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

