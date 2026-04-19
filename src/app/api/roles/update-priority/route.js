import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { roles } = await request.json()

    if (!Array.isArray(roles)) {
      return NextResponse.json({ error: 'Roles array is required' }, { status: 400 })
    }

    // Update priorities for all roles
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i]
      await query(
        'UPDATE roles SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [i + 1, role.id]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating role priorities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}