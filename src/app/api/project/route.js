import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { depList } from '@/lib/const'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 20)
    const offset = (page - 1) * limit

    let total = 0

    switch (type) {
      case 'all': {
        const count = await query(`
          SELECT 
            (SELECT COUNT(*) FROM sponsored_projects) +
            (SELECT COUNT(*) FROM consultancy_projects) AS count
        `)

        total = count[0].count

        const results = await query(`
          SELECT * FROM (
            SELECT 
              id,
              email,
              project_title,
              funding_agency,
              start_date,
              end_date,
              'sponsored' AS project_type,
              end_date AS sort_date
            FROM sponsored_projects

            UNION ALL

            SELECT 
              id,
              email,
              project_title,
              funding_agency,
              start_date,
              NULL AS end_date,   -- 🔥 FIX (if not present)
              'consultancy' AS project_type,
              start_date AS sort_date
            FROM consultancy_projects
          ) AS combined
          ORDER BY sort_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `)

        return NextResponse.json({
          page,
          limit,
          offset,
          total,
          totalPages: Math.ceil(total / limit),
          data: results
        })
      }

      case 'count': {
        const count = await query(`
          SELECT 
            (SELECT COUNT(*) FROM sponsored_projects) +
            (SELECT COUNT(*) FROM consultancy_projects) AS count
        `)

        return NextResponse.json({ projectCount: count[0].count })
      }

      default: {
        if (depList.has(type)) {
          const dept = depList.get(type)

          const count = await query(`
            SELECT 
              (SELECT COUNT(*) FROM sponsored_projects sp 
               JOIN user u ON u.email = sp.email 
               WHERE u.department = ?) +
              (SELECT COUNT(*) FROM consultancy_projects cp 
               JOIN user u ON u.email = cp.email 
               WHERE u.department = ?) AS count
          `, [dept, dept])

          total = count[0].count

          const results = await query(`
            SELECT * FROM (
              SELECT 
                sp.id,
                sp.email,
                sp.project_title,
                sp.funding_agency,
                sp.start_date,
                sp.end_date,
                'sponsored' AS project_type,
                sp.end_date AS sort_date
              FROM sponsored_projects sp
              JOIN user u ON u.email = sp.email
              WHERE u.department = ?

              UNION ALL

              SELECT 
                cp.id,
                cp.email,
                cp.project_title,
                cp.funding_agency,
                cp.start_date,
                NULL AS end_date,   -- 🔥 FIX
                'consultancy' AS project_type,
                cp.start_date AS sort_date
              FROM consultancy_projects cp
              JOIN user u ON u.email = cp.email
              WHERE u.department = ?
            ) AS combined
            ORDER BY sort_date DESC
            LIMIT ${limit} OFFSET ${offset}
          `, [dept, dept])

          return NextResponse.json({
            page,
            limit,
            offset,
            total,
            totalPages: Math.ceil(total / limit),
            data: results
          })
        }

        return NextResponse.json(
          { message: 'Invalid type parameter' },
          { status: 400 }
        )
      }
    }

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
}