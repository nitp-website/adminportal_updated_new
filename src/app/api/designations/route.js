import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

const allowedOrigins = [
  "https://adminportal-updated-new.vercel.app/",
  'http://localhost:3000',
  'https://faculty-performance-appraisal-performa.vercel.app/',
    "https://nitp.ac.in/",
]

// GET - Fetch all designations with priority order
export async function GET(request) {
  try {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      })
    }

    const results = await query(
      `SELECT id, designation, priority_order FROM designation_priorities ORDER BY priority_order ASC`
    )

    return NextResponse.json(results)

  } catch (error) {
    console.error('Designations API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new designation
export async function POST(request) {
  try {
    const { designation } = await request.json()

    if (!designation || designation.trim() === '') {
      return NextResponse.json(
        { error: 'Designation name is required' },
        { status: 400 }
      )
    }

    // Check if designation already exists
    const existing = await query(
      `SELECT id FROM designation_priorities WHERE designation = ?`,
      [designation.trim()]
    )

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Designation already exists' },
        { status: 400 }
      )
    }

    // Get the highest priority order and add 1
    const maxPriority = await query(
      `SELECT MAX(priority_order) as max_priority FROM designation_priorities`
    )

    const newPriority = (maxPriority[0].max_priority || 0) + 1

    // Insert new designation
    const result = await query(
      `INSERT INTO designation_priorities (designation, priority_order) VALUES (?, ?)`,
      [designation.trim(), newPriority]
    )

    return NextResponse.json({
      id: result.insertId,
      designation: designation.trim(),
      priority_order: newPriority
    })

  } catch (error) {
    console.error('Designations API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update designation (name or priority)
export async function PUT(request) {
  try {
    const { id, designation, priority_order } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Designation ID is required' },
        { status: 400 }
      )
    }

    let updateQuery = ''
    let updateValues = []

    if (designation !== undefined && designation.trim() !== '') {
      // Check if new designation name already exists (excluding current one)
      const existing = await query(
        `SELECT id FROM designation_priorities WHERE designation = ? AND id != ?`,
        [designation.trim(), id]
      )

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'Designation name already exists' },
          { status: 400 }
        )
      }

      updateQuery = `UPDATE designation_priorities SET designation = ? WHERE id = ?`
      updateValues = [designation.trim(), id]
    } else if (priority_order !== undefined) {
      updateQuery = `UPDATE designation_priorities SET priority_order = ? WHERE id = ?`
      updateValues = [priority_order, id]
    } else {
      return NextResponse.json(
        { error: 'Either designation name or priority_order must be provided' },
        { status: 400 }
      )
    }

    const result = await query(updateQuery, updateValues)

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Designation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Designations API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove designation
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Designation ID is required' },
        { status: 400 }
      )
    }

    // Check if designation exists
    const existing = await query(
      `SELECT id FROM designation_priorities WHERE id = ?`,
      [id]
    )

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Designation not found' },
        { status: 404 }
      )
    }

    // Delete the designation
    await query(`DELETE FROM designation_priorities WHERE id = ?`, [id])

    // Reorder remaining designations
    const remaining = await query(
      `SELECT id FROM designation_priorities ORDER BY priority_order ASC`
    )

    // Update priority orders
    for (let i = 0; i < remaining.length; i++) {
      await query(
        `UPDATE designation_priorities SET priority_order = ? WHERE id = ?`,
        [i + 1, remaining[i].id]
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Designations API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}