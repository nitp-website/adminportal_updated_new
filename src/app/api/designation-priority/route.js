import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

const allowedOrigins = [
  "https://adminportal-updated-new.vercel.app/",
  'http://localhost:3000',
  'https://faculty-performance-appraisal-performa.vercel.app/',
  "https://nitp.ac.in/",
]

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

    // Get current designation priorities
    let results = await query(
      `SELECT designation, priority_order FROM designation_priorities ORDER BY priority_order ASC`
    )

    // If no data exists, initialize with default order
    if (!results || results.length === 0) {
      const defaultDesignations = [
        'Registrar',
        'Joint Registrar (Exam)',
        'Joint Registrar (F & A)',
        'Deputy Registrar (Establishemnt)',
        'Assistant Registrar (R & C)',
        'Assistant Registrar (Academic)',
        'Assistant Registrar (Procurement)',
        'Assistant Registrar (Director\'s Office)',
        'Assistant Registrar',
        'Sr. Medical Officer',
        'Medical Officer',
        'Sr. Scientific & Technical Officer',
        'Assistant Librarian',
        'SAS Officer',
        'Maintenance Engineer (Elec)',
        'Maintenance Engineer (Civil)'
      ]

      // Insert default priorities
      const values = defaultDesignations.map((designation, index) =>
        `('${designation}', ${index + 1})`
      ).join(', ')

      await query(
        `INSERT INTO designation_priorities (designation, priority_order) VALUES ${values}`
      )

      // Fetch the inserted data
      results = await query(
        `SELECT designation, priority_order FROM designation_priorities ORDER BY priority_order ASC`
      )
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Designation Priority API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { priorities } = await request.json()

    // First, clear existing priorities
    await query(`DELETE FROM designation_priorities`)

    // Insert new priorities
    const values = priorities.map((designation, index) =>
      `('${designation}', ${index + 1})`
    ).join(', ')

    await query(
      `INSERT INTO designation_priorities (designation, priority_order) VALUES ${values}`
    )

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Designation Priority API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}