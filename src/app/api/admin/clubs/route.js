import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/authOptions'
import { query } from '@/lib/db'
import { ROLES } from '@/lib/roles'
import { CLUB_CATEGORIES, CLUB_STATUSES } from '@/lib/clubConstants'
import { formatClubRow, stringifyJsonField } from '@/lib/clubUtils'
import { populateClubsWithPiDetails } from '@/lib/clubDbUtils'
import { resolveUniqueClubLoginId } from '@/lib/clubLoginId'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
}

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return { session: null, error: unauthorized() }
  }
  return { session, error: null }
}

function validateClubPayload(body, { requireAll = false } = {}) {
  const { name, email, category, status, description, patna_campus_pi, bihta_campus_pi } = body
  if (requireAll && (!name?.trim() || !email?.trim() || !category || !status)) {
    return 'Club name, email, category, and status are required'
  }
  if (requireAll && !description?.trim()) {
    return 'Club description is required'
  }
  if (requireAll && (!patna_campus_pi?.name?.trim() || !patna_campus_pi?.email?.trim())) {
    return 'Patna Campus PI name and email are required'
  }
  if (requireAll && (!bihta_campus_pi?.name?.trim() || !bihta_campus_pi?.email?.trim())) {
    return 'Bihta Campus PI name and email are required'
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Invalid club email format'
  }
  if (patna_campus_pi?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patna_campus_pi.email)) {
    return 'Invalid Patna Campus PI email format'
  }
  if (bihta_campus_pi?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bihta_campus_pi.email)) {
    return 'Invalid Bihta Campus PI email format'
  }
  if (category && !CLUB_CATEGORIES.includes(category)) {
    return 'Invalid category'
  }
  if (status && !CLUB_STATUSES.includes(status)) {
    return 'Invalid status'
  }
  return null
}

async function provisionClubAdminUser({ name, email, category, clubId, clubLoginId }) {
  const existing = await query('SELECT id FROM user WHERE email = ? LIMIT 1', [email])

  if (existing.length > 0) {
    await query(
      `UPDATE user SET name = ?, role = ?, department = ?, designation = ?, club_id = ?, is_deleted = 0
       WHERE email = ?`,
      [name, ROLES.CLUB_ADMIN, 'Student Clubs', `Club Admin - ${category}`, clubId, email]
    )
    return {
      created: false,
      clubLoginId,
      message: `Club saved. Login ID: ${clubLoginId} — sign in with Google using ${email}.`,
    }
  }

  await query(
    `INSERT INTO user (name, email, role, club_id, department, designation, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [name, email, ROLES.CLUB_ADMIN, clubId, 'Student Clubs', `Club Admin - ${category}`]
  )

  return {
    created: true,
    clubLoginId,
    message: `Club Admin created. Login ID: ${clubLoginId} — sign in with Google using ${email}.`,
  }
}

export async function GET(request) {
  try {
    const { error } = await requireSuperAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')?.trim()
    const email = searchParams.get('email')?.trim()
    const id = searchParams.get('id')

    if (id) {
      const rows = await query('SELECT * FROM clubs WHERE id = ? LIMIT 1', [id])
      if (!rows.length) {
        return NextResponse.json({ error: 'Club not found' }, { status: 404 })
      }
      const formatted = formatClubRow(rows[0])
      const populated = await populateClubsWithPiDetails(formatted)
      return NextResponse.json(populated)
    }

    let sql = 'SELECT * FROM clubs WHERE 1=1'
    const values = []
    if (name) {
      sql += ' AND name LIKE ?'
      values.push(`%${name}%`)
    }
    if (email) {
      sql += ' AND email LIKE ?'
      values.push(`%${email}%`)
    }
    sql += ' ORDER BY name ASC'

    const rows = await query(sql, values)
    const formatted = rows.map(formatClubRow)
    const populated = await populateClubsWithPiDetails(formatted)
    return NextResponse.json(populated)
  } catch (err) {
    console.error('GET /api/admin/clubs:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { error } = await requireSuperAdmin()
    if (error) return error

    const body = await request.json()
    const { name, email, category } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Club name is required' }, { status: 400 })
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Club email is required' }, { status: 400 })
    }
    if (!category) {
      return NextResponse.json({ error: 'Club category is required' }, { status: 400 })
    }
    if (category && !CLUB_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const validationError = validateClubPayload(body, { requireAll: false })
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const {
      club_login_id,
      status = 'Active',
      description,
      logo,
      about,
      pictures,
      patna_campus_pi,
      bihta_campus_pi,
      club_president,
      club_secretary,
    } = body

    const normalizedEmail = email.trim().toLowerCase()
    const duplicate = await query('SELECT id FROM clubs WHERE email = ?', [normalizedEmail])
    if (duplicate.length > 0) {
      return NextResponse.json({ error: 'A club with this email already exists' }, { status: 400 })
    }

    const existingUser = await query('SELECT role FROM user WHERE email = ? LIMIT 1', [normalizedEmail])
    if (existingUser.length > 0 && parseInt(existingUser[0].role) !== ROLES.CLUB_ADMIN) {
      return NextResponse.json(
        { error: 'This email is already registered to a user with a different role (e.g., Faculty, Admin).' },
        { status: 400 }
      )
    }

    const loginId = await resolveUniqueClubLoginId(name, club_login_id)

    const result = await query(
      `INSERT INTO clubs (
        club_login_id, name, email, category, status, logo, about,
        pictures, patna_campus_pi, bihta_campus_pi, club_president, club_secretary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loginId,
        name.trim(),
        normalizedEmail,
        category,
        status,
        logo || null,
        about || null,
        stringifyJsonField(pictures),
        stringifyJsonField(patna_campus_pi),
        stringifyJsonField(bihta_campus_pi),
        club_president || null,
        club_secretary || null,
      ]
    )

    const clubId = result.insertId
    const credentials = await provisionClubAdminUser({
      name: name.trim(),
      email: normalizedEmail,
      category,
      clubId,
      clubLoginId: loginId,
    })

    const created = await query('SELECT * FROM clubs WHERE id = ?', [clubId])
    const formatted = formatClubRow(created[0])
    const populated = await populateClubsWithPiDetails(formatted)
    return NextResponse.json({ club: populated, credentials })
  } catch (err) {
    console.error('POST /api/admin/clubs:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: err.message?.includes('Login ID') ? 400 : 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const { error } = await requireSuperAdmin()
    if (error) return error

    const body = await request.json()
    const { id, ...fields } = body
    if (!id) {
      return NextResponse.json({ error: 'Club ID is required' }, { status: 400 })
    }

    const validationError = validateClubPayload(fields)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const existing = await query('SELECT * FROM clubs WHERE id = ?', [id])
    if (!existing.length) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    const current = existing[0]
    if (fields.email && fields.email !== current.email) {
      const dup = await query('SELECT id FROM clubs WHERE email = ? AND id != ?', [
        fields.email,
        id,
      ])
      if (dup.length) {
        return NextResponse.json({ error: 'A club with this email already exists' }, { status: 400 })
      }

      const existingUser = await query('SELECT role FROM user WHERE email = ? LIMIT 1', [fields.email])
      if (existingUser.length > 0 && parseInt(existingUser[0].role) !== ROLES.CLUB_ADMIN) {
        return NextResponse.json(
          { error: 'This email is already registered to a user with a different role (e.g., Faculty, Admin).' },
          { status: 400 }
        )
      }
    }

    const name = fields.name?.trim() ?? current.name
    const email = fields.email?.trim().toLowerCase() ?? current.email
    const category = fields.category ?? current.category
    const status = fields.status ?? current.status
    const clubLoginId = await resolveUniqueClubLoginId(
      name,
      fields.club_login_id ?? current.club_login_id,
      id
    )

    await query(
      `UPDATE clubs SET
        club_login_id = ?, name = ?, email = ?, category = ?, status = ?,
        logo = ?, about = ?,
        pictures = ?, patna_campus_pi = ?, bihta_campus_pi = ?,
        club_president = ?, club_secretary = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        clubLoginId,
        name,
        email,
        category,
        status,
        fields.logo !== undefined ? fields.logo : current.logo,
        fields.about !== undefined ? fields.about : current.about,
        fields.pictures !== undefined
          ? stringifyJsonField(fields.pictures)
          : current.pictures,
        fields.patna_campus_pi !== undefined
          ? stringifyJsonField(fields.patna_campus_pi)
          : current.patna_campus_pi,
        fields.bihta_campus_pi !== undefined
          ? stringifyJsonField(fields.bihta_campus_pi)
          : current.bihta_campus_pi,
        fields.club_president !== undefined
          ? fields.club_president
          : current.club_president,
        fields.club_secretary !== undefined
          ? fields.club_secretary
          : current.club_secretary,
        id,
      ]
    )

    await query(
      `UPDATE user SET name = ?, email = ?, role = ?, department = ?, designation = ?, club_id = ?
       WHERE club_id = ? OR email = ?`,
      [
        name,
        email,
        ROLES.CLUB_ADMIN,
        'Student Clubs',
        `Club Admin - ${category}`,
        id,
        id,
        current.email,
      ]
    )

    const updated = await query('SELECT * FROM clubs WHERE id = ?', [id])
    const formatted = formatClubRow(updated[0])
    const populated = await populateClubsWithPiDetails(formatted)
    return NextResponse.json({ club: populated })
  } catch (err) {
    console.error('PUT /api/admin/clubs:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: err.message?.includes('Login ID') ? 400 : 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { error } = await requireSuperAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Club ID is required' }, { status: 400 })
    }

    const rows = await query('SELECT * FROM clubs WHERE id = ?', [id])
    if (!rows.length) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    await query('DELETE FROM clubs WHERE id = ?', [id])
    await query('UPDATE user SET is_deleted = 1, club_id = NULL WHERE club_id = ? OR email = ?', [
      id,
      rows[0].email,
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/admin/clubs:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
