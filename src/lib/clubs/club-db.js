import { query } from '@/lib/db'
import { ROLES } from '@/lib/roles'
import { CLUB_COLUMNS } from './club-constants'

const normalizeEmail = (email) => email?.trim().toLowerCase() ?? ''

export async function ensureClubTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS clubs (
      id BIGINT NOT NULL AUTO_INCREMENT,
      club_name VARCHAR(255) NOT NULL,
      club_email VARCHAR(255) NOT NULL,
      category VARCHAR(100) DEFAULT NULL,
      club_pi VARCHAR(255) DEFAULT NULL,
      club_president VARCHAR(255) DEFAULT NULL,
      club_secretary VARCHAR(255) DEFAULT NULL,
      status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      about TEXT DEFAULT NULL,
      description TEXT DEFAULT NULL,
      logo_url TEXT DEFAULT NULL,
      banners JSON DEFAULT NULL,
      patna_pi_name VARCHAR(255) DEFAULT NULL,
      patna_pi_email VARCHAR(255) DEFAULT NULL,
      patna_pi_phone VARCHAR(50) DEFAULT NULL,
      patna_pi_department VARCHAR(255) DEFAULT NULL,
      bihta_pi_name VARCHAR(255) DEFAULT NULL,
      bihta_pi_email VARCHAR(255) DEFAULT NULL,
      bihta_pi_phone VARCHAR(50) DEFAULT NULL,
      bihta_pi_department VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY unique_club_email (club_email)
    )
  `)

  const requiredColumns = [
    ['about', 'TEXT DEFAULT NULL'],
    ['description', 'TEXT DEFAULT NULL'],
    ['logo_url', 'TEXT DEFAULT NULL'],
    ['banners', 'JSON DEFAULT NULL'],
    ['patna_pi_name', 'VARCHAR(255) DEFAULT NULL'],
    ['patna_pi_email', 'VARCHAR(255) DEFAULT NULL'],
    ['patna_pi_phone', 'VARCHAR(50) DEFAULT NULL'],
    ['patna_pi_department', 'VARCHAR(255) DEFAULT NULL'],
    ['bihta_pi_name', 'VARCHAR(255) DEFAULT NULL'],
    ['bihta_pi_email', 'VARCHAR(255) DEFAULT NULL'],
    ['bihta_pi_phone', 'VARCHAR(50) DEFAULT NULL'],
    ['bihta_pi_department', 'VARCHAR(255) DEFAULT NULL'],
    ['created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'],
    ['updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'],
  ]

  const existingColumns = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'clubs'`
  )
  const existingColumnNames = new Set(existingColumns.map((column) => column.COLUMN_NAME))

  for (const [columnName, definition] of requiredColumns) {
    if (!existingColumnNames.has(columnName)) {
      await query(`ALTER TABLE clubs ADD COLUMN ${columnName} ${definition}`)
    }
  }
}

export function normalizeClub(row = {}) {
  let banners = row.banners || []

  if (typeof banners === 'string') {
    try {
      banners = JSON.parse(banners)
    } catch (error) {
      banners = []
    }
  }

  return {
    ...row,
    title: row.title || row.club_name || '',
    club_name: row.club_name || row.title || '',
    club_email: row.club_email || '',
    category: row.category || '',
    club_president: row.club_president || '',
    club_secretary: row.club_secretary || '',
    status: row.status || 'Active',
    about: row.about || '',
    description: row.description || '',
    logo_url: row.logo_url || '',
    banners: Array.isArray(banners) ? banners : [],
    patnaPiName: row.patnaPiName || row.patna_pi_name || '',
    patnaPiEmail: row.patnaPiEmail || row.patna_pi_email || '',
    patnaPiPhone: row.patnaPiPhone || row.patna_pi_phone || '',
    patnaPiDepartment: row.patnaPiDepartment || row.patna_pi_department || '',
    bihtaPiName: row.bihtaPiName || row.bihta_pi_name || '',
    bihtaPiEmail: row.bihtaPiEmail || row.bihta_pi_email || '',
    bihtaPiPhone: row.bihtaPiPhone || row.bihta_pi_phone || '',
    bihtaPiDepartment: row.bihtaPiDepartment || row.bihta_pi_department || '',
  }
}

export function prepareClubForDatabase(payload) {
  return {
    ...payload,
    club_email: normalizeEmail(payload.club_email),
    banners: JSON.stringify(payload.banners || []),
  }
}

export function canAccessClub(session, club) {
  if (session.user.role === 'SUPER_ADMIN') return true

  const sessionEmail = normalizeEmail(session.user.email)
  const administration = session.user.administration?.trim().toLowerCase()
  const clubEmail = normalizeEmail(club.club_email)
  const clubName = club.club_name?.trim().toLowerCase()

  return session.user.role === 'CLUB_ADMIN' && (
    clubEmail === sessionEmail ||
    (administration && administration === clubName)
  )
}

export async function syncClubAdminUser(club) {
  const clubEmail = normalizeEmail(club.club_email)
  const existing = await query('SELECT email FROM user WHERE email = ?', [clubEmail])

  if (existing.length > 0) {
    await query(
      'UPDATE user SET role = ?, administration = ? WHERE email = ?',
      [ROLES.CLUB_ADMIN, club.club_name, clubEmail]
    )
    return
  }

  await query(
    'INSERT INTO user(name, email, role, administration) VALUES (?, ?, ?, ?)',
    [club.club_name, clubEmail, ROLES.CLUB_ADMIN, club.club_name]
  )
}

export async function deleteClubAdminUserByEmail(email) {
  return query('DELETE FROM user WHERE email = ?', [normalizeEmail(email)])
}

export async function findClubById(id) {
  const rows = await query(`SELECT ${CLUB_COLUMNS} FROM clubs WHERE id = ?`, [id])
  return rows.length ? normalizeClub(rows[0]) : null
}

export async function findClubByEmail(email) {
  const rows = await query(`SELECT ${CLUB_COLUMNS} FROM clubs WHERE club_email = ?`, [normalizeEmail(email)])
  return rows.length ? normalizeClub(rows[0]) : null
}

export async function findClubForSession(session) {
  const sessionEmail = normalizeEmail(session.user.email)
  const administration = session.user.administration?.trim().toLowerCase()
  const rows = await query(
    `SELECT ${CLUB_COLUMNS} FROM clubs WHERE club_email = ? OR LOWER(club_name) = ? LIMIT 1`,
    [sessionEmail, administration || '']
  )
  return rows.length ? normalizeClub(rows[0]) : null
}

export async function listClubs() {
  const clubs = await query(`SELECT ${CLUB_COLUMNS} FROM clubs ORDER BY club_name ASC`)
  return clubs.map(normalizeClub)
}

export async function hasClubEmail(email, exceptId) {
  const normalizedEmail = normalizeEmail(email)
  const rows = exceptId
    ? await query('SELECT id FROM clubs WHERE club_email = ? AND id != ?', [normalizedEmail, exceptId])
    : await query('SELECT id FROM clubs WHERE club_email = ?', [normalizedEmail])

  return rows.length > 0
}

export async function insertClub(payload) {
  const dbPayload = prepareClubForDatabase(payload)
  const result = await query(
    `INSERT INTO clubs (
      club_name, club_email, category, club_president, club_secretary,
        status, about, description, logo_url, banners,
        patna_pi_name, patna_pi_email, patna_pi_phone, patna_pi_department,
      bihta_pi_name, bihta_pi_email, bihta_pi_phone, bihta_pi_department
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dbPayload.club_name,
      dbPayload.club_email,
      dbPayload.category,
      dbPayload.club_president,
      dbPayload.club_secretary,
      dbPayload.status,
      dbPayload.about,
      dbPayload.description,
      dbPayload.logo_url,
      dbPayload.banners,
      dbPayload.patna_pi_name,
      dbPayload.patna_pi_email,
      dbPayload.patna_pi_phone,
      dbPayload.patna_pi_department,
      dbPayload.bihta_pi_name,
      dbPayload.bihta_pi_email,
      dbPayload.bihta_pi_phone,
      dbPayload.bihta_pi_department,
        // Removed extra parameters
    ]
  )

  return findClubById(result.insertId)
}

export async function updateClubById(id, payload) {
  const dbPayload = prepareClubForDatabase(payload)

  await query(
    `UPDATE clubs SET
      club_name = ?,
      club_email = ?,
      category = ?,
      club_president = ?,
      club_secretary = ?,
      status = ?,
      about = ?,
      description = ?,
      logo_url = ?,
      banners = ?,
      patna_pi_name = ?,
      patna_pi_email = ?,
      patna_pi_phone = ?,
      patna_pi_department = ?,
      bihta_pi_name = ?,
      bihta_pi_email = ?,
      bihta_pi_phone = ?,
      bihta_pi_department = ?
    WHERE id = ?`,
    [
      dbPayload.club_name,
      dbPayload.club_email,
      dbPayload.category,
      dbPayload.club_president,
      dbPayload.club_secretary,
      dbPayload.status,
      dbPayload.about,
      dbPayload.description,
      dbPayload.logo_url,
      dbPayload.banners,
      dbPayload.patna_pi_name,
      dbPayload.patna_pi_email,
      dbPayload.patna_pi_phone,
      dbPayload.patna_pi_department,
      dbPayload.bihta_pi_name,
      dbPayload.bihta_pi_email,
      dbPayload.bihta_pi_phone,
      dbPayload.bihta_pi_department,
      id,
    ]
  )

  return findClubById(id)
}

export async function deleteClubById(id) {
  return query('DELETE FROM clubs WHERE id = ?', [id])
}
