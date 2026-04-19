import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

const allowedOrigins = [
  "https://adminportal-updated-new.vercel.app/",
  'http://localhost:3000',
  'https://faculty-performance-appraisal-performa.vercel.app/',
    "https://nitp.ac.in/",
]

export async function POST(request) {
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

    const { priorities } = await request.json()

    if (!Array.isArray(priorities)) {
      return NextResponse.json(
        { error: 'Priorities must be an array' },
        { status: 400 }
      )
    }

    // Update priority orders in batch
    for (let i = 0; i < priorities.length; i++) {
      const { id, priority_order } = priorities[i]

      if (!id || !priority_order) {
        return NextResponse.json(
          { error: 'Each priority item must have id and priority_order' },
          { status: 400 }
        )
      }

      await query(
        `UPDATE designation_priorities SET priority_order = ? WHERE id = ?`,
        [priority_order, id]
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Update Priority API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}