import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import {
  ensureStudentsTable,
  normalizeCourse,
  normalizeDepartment,
  getDepartmentQueryCandidates,
  getCachedAvailableCourses,
  getCachedAvailableYears,
} from '@/lib/studentDb'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

const responseHeaders = {
  ...corsHeaders,
  'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export async function GET(request) {
  try {
    await ensureStudentsTable()

    const { searchParams } = new URL(request.url)
    const rawDept = searchParams.get('department')?.trim()
    const rawCourse = searchParams.get('course')?.trim()
    const rawYear = searchParams.get('year')?.trim() || searchParams.get('admission_year')?.trim()
    const rawActive = searchParams.get('active')?.trim()
    const search = searchParams.get('search')?.trim() || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const offset = (page - 1) * limit

    const isAllDept = !rawDept || rawDept.toLowerCase() === 'all'
    const departmentName = isAllDept ? 'All' : normalizeDepartment(rawDept)
    const course = rawCourse && rawCourse !== 'All' && rawCourse !== 'All Courses' ? normalizeCourse(rawCourse) : null

    // Build WHERE clause
    const conditions = [
      "(course NOT LIKE '%Doctor of Philosophy%' AND course NOT LIKE '%Ph.D%' AND course NOT LIKE '%PhD%')"
    ]
    const params = []

    // Active status filter: "1" = Active (default), "0" = Graduated / Archives, "all" = All
    if (rawActive === '0') {
      conditions.push('active = 0')
    } else if (rawActive === 'all') {
      // Do not filter by active
    } else {
      // Default to active students
      conditions.push('active = 1')
    }

    // Joining / Admission Year filter
    if (rawYear && rawYear !== 'All' && rawYear !== 'all') {
      const parsedYear = parseInt(rawYear, 10)
      if (!isNaN(parsedYear)) {
        conditions.push('admission_year = ?')
        params.push(parsedYear)
      }
    }

    const deptCandidates = !isAllDept ? getDepartmentQueryCandidates(rawDept) : []
    if (deptCandidates.length > 0) {
      conditions.push(`department IN (${deptCandidates.map(() => '?').join(', ')})`)
      params.push(...deptCandidates)
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
      SELECT id, roll_no, name, department, course, email, specialization, enrollment_no, admission_year, passing_year, active, status
      FROM students
      WHERE ${whereClause}
      ORDER BY department ASC, course ASC, roll_no ASC
      LIMIT ? OFFSET ?
    `

    // 2. Fetch total count
    const countSql = `SELECT COUNT(*) AS total FROM students WHERE ${whereClause}`

    // Execute queries in parallel using Promise.all and cached course/year metadata (< 10 ms execution time)
    const [students, countResult, availableCourses, availableYears] = await Promise.all([
      query(dataSql, [...params, limit, offset]),
      query(countSql, params),
      getCachedAvailableCourses(deptCandidates),
      getCachedAvailableYears(deptCandidates),
    ])

    const totalStudents = countResult[0]?.total || 0

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
          selectedYear: rawYear && rawYear !== 'All' ? parseInt(rawYear, 10) : 'All',
          selectedActive: rawActive === '0' ? 0 : (rawActive === 'all' ? 'all' : 1),
          availableCourses,
          availableYears,
        },
      },
      { headers: responseHeaders }
    )
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error while fetching students.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

