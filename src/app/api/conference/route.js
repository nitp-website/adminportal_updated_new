import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { depList } from '@/lib/const'
import { off } from 'node:cluster'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 20)
    const offset = (page - 1) * limit

    let results = []
    let total = 0
    switch (type) {
      case 'all':

        const allCount = await query(
          `SELECT COUNT(*) as count FROM conference_papers`
        )
        total = Number(allCount[0].count)

        const conference_papers = await query(
          `SELECT * FROM conference_papers ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`
        );
        return NextResponse.json({
            page,
            limit,
            offset,
            total,
            totalPages: Math.ceil(total / limit),
            conference_papers})

      default:
        if (depList.has(type)) {
          const deptCount = await query(
            `SELECT COUNT(*) as count 
             FROM user u 
             JOIN conference_papers t 
             ON u.email = t.email 
             WHERE u.department = ?`,
            [depList.get(type)]
          )
          total = Number(deptCount[0].count)

          const conference_data = await query(
            `SELECT t.*, u.department 
             FROM user u 
             JOIN conference_papers t 
             ON u.email = t.email 
             WHERE u.department = ?
             ORDER BY t.id DESC
             LIMIT ${limit} OFFSET ${offset}`,
            [depList.get(type)]
          );
          return NextResponse.json({
            page,
            limit,
            offset,
            total,
            totalPages: Math.ceil(total/limit),
            conference_data});
        } else {
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
