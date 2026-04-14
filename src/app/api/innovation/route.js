import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

const safeParse = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const now = new Date().getTime()

    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 20)
    const offset = (page - 1) * limit

    let results = []
    let total = 0
    switch (type) {
      case 'all':
        const allCount = await query(`SELECT COUNT(*) as count FROM innovation`)
        total = allCount[0].count

        results = await query(
          `SELECT * FROM innovation ORDER BY COALESCE(openDate, 0) DESC, id DESC LIMIT ${limit} OFFSET ${offset}`
        )
        break

      case 'active':

        const activeCount = await query(
          `SELECT COUNT(*) as count FROM innovation 
           WHERE openDate < ? AND closeDate > ?`,
          [now, now]
        )
        total = activeCount[0].count

        results = await query(
          `SELECT * FROM innovation 
           WHERE openDate < ? AND closeDate > ? 
           ORDER BY COALESCE(openDate, 0) DESC, id DESC
           LIMIT ${limit} OFFSET ${offset}`,
          [now, now]
        )
        break

      case 'count':
        const countResult = await query(
          `SELECT COUNT(*) as count FROM innovation`
        )
        return NextResponse.json({ 
          count: countResult[0].count 
        })

      default:
        // If type is an ID, fetch specific innovation
        if (type) {
          results = await query(
            `SELECT * FROM innovation WHERE id = ?`,
            [type]
          )

          total = results.length
        } else {
          return NextResponse.json(
            { message: 'Invalid type parameter' },
            { status: 400 }
          )
        }
    }

    // Parse image JSON for each result
    const innovations = results.map(item => ({
      ...item,
      image: item.image ? safeParse(item.image) : []
    }))

    return NextResponse.json({
      page,
      limit,
      offset,
      total,
      totalPages : Math.ceil(total/limit),
      data : innovations
    })


  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { type } = body
    
    let { from, to} = body
    from = parseInt(from) || 0
    to = parseInt(to) || 20

    if (from < 0) from = 0
    if (to <= from) to = from + 10

    const limit = Math.max(1, Math.min(50, to - from))
    const offset = Math.max(0, from)
    const page = Math.floor(offset / limit) + 1

    let results
    let total = 0
    switch (type) {
      case 'range':
        const { start_date, end_date } = body
        const rangeCount = await query(
          `SELECT COUNT(*) as count FROM innovation 
           WHERE closeDate <= ? AND openDate >= ?`,
          [end_date, start_date]
        )
        total = rangeCount[0].count

        results = await query(
          `SELECT * FROM innovation 
           WHERE closeDate <= ? AND openDate >= ? 
           ORDER BY COALESCE(openDate, 0) DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
          [end_date, start_date]
        )
        break

      case 'between':
        const betweenCount = await query(
          `SELECT COUNT(*) as count FROM innovation`
        )
        total = betweenCount[0].count

        results = await query(
          `SELECT * FROM innovation 
            ORDER BY COALESCE(openDate, 0) DESC, id DESC 
           LIMIT ${limit} OFFSET ${offset}`
        )
        break

      default:
        return NextResponse.json(
          { message: 'Invalid type parameter' },
          { status: 400 }
        )
    }

    // Parse image JSON for each result
    const innovations = results.map(item => ({
      ...item,
      image: item.image ? safeParse(item.image) : []
    }))

    return NextResponse.json({
      page,
      limit,
      offset,
      total,
      totalPages : Math.ceil(total/limit),
      data : innovations
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
} 