import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all roles with their priorities
    const roles = await query(`
      SELECT r.id, r.role_name, r.role_key, r.priority, r.created_at, r.updated_at
      FROM roles r
      ORDER BY r.priority ASC
    `)

    return NextResponse.json(roles)
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { role_name, role_key } = await request.json()

    if (!role_name || !role_key) {
      return NextResponse.json({ error: 'Role name and key are required' }, { status: 400 })
    }

    // Check if role_key already exists
    const existingRole = await query('SELECT id FROM roles WHERE role_key = ?', [role_key])
    if (existingRole.length > 0) {
      return NextResponse.json({ error: 'Role key already exists' }, { status: 400 })
    }

    // Get the highest priority and add 1
    const maxPriority = await query('SELECT MAX(priority) as max_priority FROM roles')
    const newPriority = (maxPriority[0].max_priority || 0) + 1

    const result = await query(
      'INSERT INTO roles (role_name, role_key, priority) VALUES (?, ?, ?)',
      [role_name, role_key, newPriority]
    )

    return NextResponse.json({
      id: result.insertId,
      role_name,
      role_key,
      priority: newPriority
    })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id, role_name, role_key } = await request.json()

    if (!id || !role_name || !role_key) {
      return NextResponse.json({ error: 'ID, role name and key are required' }, { status: 400 })
    }

    // Check if role_key already exists for another role
    const existingRole = await query('SELECT id FROM roles WHERE role_key = ? AND id != ?', [role_key, id])
    if (existingRole.length > 0) {
      return NextResponse.json({ error: 'Role key already exists' }, { status: 400 })
    }

    await query(
      'UPDATE roles SET role_name = ?, role_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [role_name, role_key, id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 })
    }

    // Get the role to be deleted
    const roleToDelete = await query('SELECT priority FROM roles WHERE id = ?', [id])
    if (roleToDelete.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    const deletedPriority = roleToDelete[0].priority

    // Delete the role
    await query('DELETE FROM roles WHERE id = ?', [id])

    // Update priorities for remaining roles
    await query('UPDATE roles SET priority = priority - 1 WHERE priority > ?', [deletedPriority])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}