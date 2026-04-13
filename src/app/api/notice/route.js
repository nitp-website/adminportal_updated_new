import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { administrationList, depList } from '@/lib/const'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const now = new Date().getTime()

    let results
    switch (type) {
      case 'all':
        results = await query(
          `SELECT * FROM notices 
           ORDER BY timestamp DESC`
        )
        break

      case "tender":
        results=await query(
          `SELECT * FROM notices 
          where notice_type="tender"
           ORDER BY timestamp DESC`
        )
        break

      case 'whole':
        results = await query(
          `SELECT * FROM notices 
           ORDER BY openDate DESC`
        )
        break

      case 'active':
        results = await query(
          `SELECT * FROM notices 
           WHERE notice_type = 'general' 
           AND openDate < ? AND closeDate > ? 
           ORDER BY openDate DESC`,
          [now, now]
        )
        break

      case 'academics':
        results = await query(
          `SELECT * FROM notices 
           WHERE notice_type = 'academics'
           ORDER BY timestamp DESC`
        )
        break

      default:
        // Check if it's an administration notice type
        if (administrationList.has(type)) {
          results = await query(
            `SELECT * FROM notices 
             WHERE notice_type = ? 
             ORDER BY timestamp DESC`,
            [type]
          )
        }
        // Check if it's a department notice
        else if (depList.has(type)) {
          results = await query(
            `SELECT * FROM notices 
             WHERE notice_type = 'department' 
             AND department = ? 
             ORDER BY timestamp DESC`,
            [depList.get(type)]
          )
        }
        else {
          return NextResponse.json(
            { message: 'Invalid type parameter' },
            { status: 400 }
          )
        }
    }

    // Parse attachments JSON for each result
    const notices = JSON.parse(JSON.stringify(results))
    notices.forEach(notice => {
      if (notice.attachments) {
        notice.attachments = JSON.parse(notice.attachments)
      }
    })

    return NextResponse.json(notices)

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
    let { 
      type,
      start_date,
      end_date,
      department,
      notice_type,
      from,
      to,
      keyword = '',
    } = body
    
    // Ensure from and to are valid integers
    from = parseInt(from) || 0
    to = parseInt(to) || 15
    
    // Validate that from and to are valid
    if (from < 0) from = 0
    if (to <= from) to = from + 15
    
    let results

    // For ACADEMIC_ADMIN, always filter for academic notices
    if (notice_type === 'academics') {
      const limit = Math.max(1, Math.min(100, to - from))
      const offset = Math.max(0, from)
      console.log('DEBUG: Academic pagination params:', { offset, limit })
      
      results = await query(
        `SELECT * FROM notices 
         WHERE notice_type = ?
         ORDER BY openDate DESC 
         LIMIT ${limit} OFFSET ${offset}`,
        ['academics']
      )
    } 
    // For DEPT_ADMIN, filter for department notices of their department
    else if (notice_type === 'department' && department) {
      const limit = Math.max(1, Math.min(100, to - from))
      const offset = Math.max(0, from)
      console.log('DEBUG: Department pagination params:', { offset, limit, department })
      
      results = await query(
        `SELECT * FROM notices 
         WHERE notice_type = ? AND department = ?
         ORDER BY openDate DESC 
         LIMIT ${limit} OFFSET ${offset}`,
        ['department', department]
      )
    } else {
      switch (type) {
        case 'range':
          const rangeLimit = Math.max(1, Math.min(100, to - from))
          const rangeOffset = Math.max(0, from)
          
          if (!notice_type) {
            results = await query(
              `SELECT * FROM notices 
               WHERE title LIKE ? 
               ORDER BY openDate DESC 
               LIMIT ${rangeLimit} OFFSET ${rangeOffset}`,
              [`%${keyword}%`]
            )
          } else if (notice_type !== 'department') {
            results = await query(
              `SELECT * FROM notices 
               WHERE notice_type = ? 
               AND closeDate <= ? 
               AND openDate >= ? 
               AND title LIKE ? 
               ORDER BY openDate DESC 
               LIMIT ${rangeLimit} OFFSET ${rangeOffset}`,
              [notice_type, end_date, start_date, `%${keyword}%`]
            )
          } else {
            results = await query(
              `SELECT * FROM notices 
               WHERE closeDate <= ? 
               AND openDate >= ? 
               AND department = ? 
               AND title LIKE ? 
               ORDER BY openDate DESC 
               LIMIT ${rangeLimit} OFFSET ${rangeOffset}`,
              [end_date, start_date, department, `%${keyword}%`]
            )
          }
          break

        case 'between':
          const limit = Math.max(1, Math.min(100, to - from)) // Ensure limit is between 1 and 100
          const offset = Math.max(0, from) // Ensure offset is non-negative
          console.log('DEBUG: Pagination params:', { offset, limit, originalFrom: from, originalTo: to })
          
          // Try without prepared statements for LIMIT clause
          results = await query(
            `SELECT * FROM notices 
             ORDER BY openDate DESC 
             LIMIT ${limit} OFFSET ${offset}`
          )
          break

        default:
          return NextResponse.json(
            { message: 'Invalid type parameter' },
            { status: 400 }
          )
      }
    }

    // Parse attachments JSON for each result
    const notices = JSON.parse(JSON.stringify(results))
    notices.forEach(notice => {
      if (notice.attachments) {
        notice.attachments = JSON.parse(notice.attachments)
      }
    })

    return NextResponse.json(notices)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
} 