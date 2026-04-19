import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

const allowedOrigins = [
  'https://adminportal-updated-new.vercel.app',
  'http://localhost:3000',
  'https://faculty-performance-appraisal-performa.vercel.app',
  'https://nitp.ac.in',
]

function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// ✅ Handle preflight
export async function OPTIONS(request) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, {
    headers: getCorsHeaders(origin),
  })
}

export async function GET(request) {
  const origin = request.headers.get('origin')

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    let condition = ''

    switch (type) {
      case 'all':
        condition = `AND (u.department = 'Officers' OR r.role_key = 'STAFF')`
        break

      case 'officers':
        condition = `AND u.department = 'Officers'`
        break

      case 'staff':
        condition = `AND r.role_key = 'STAFF'`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400, headers: getCorsHeaders(origin) }
        )
    }

    const results = await query(`
      SELECT
        u.*,
        r.role_key AS role_name,
        COALESCE(r.priority, 999) AS role_priority,
        COALESCE(dp.priority_order, 999) AS designation_priority
      FROM user u
      LEFT JOIN roles r ON u.role = r.id
      LEFT JOIN designation_priorities dp 
        ON REPLACE(REPLACE(LOWER(u.designation), '&', ' & '), '.', '') 
         = REPLACE(REPLACE(LOWER(dp.designation), '&', ' & '), '.', '')
      WHERE u.is_deleted = 0
      ${condition}
      ORDER BY 
        dp.priority_order ASC,   -- ✅ PRIMARY SORT (your requirement)
        r.priority ASC,          -- ✅ secondary
        u.name ASC
    `)

    const formatted = results.map(user => ({
      ...user,
      role: user.role_name,
    }))

    return NextResponse.json(formatted, {
      headers: getCorsHeaders(origin),
    })

  } catch (error) {
    console.error('Staff API Error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: getCorsHeaders(origin) }
    )
  }
}