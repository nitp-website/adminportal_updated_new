import { query } from '@/lib/db';

export const PERMISSION_CONFIG = [
  { key: 'admissions', label: 'Admissions Notices', color: '#1976d2' },
  { key: 'job', label: 'Recruitment (Job) Notices', color: '#2e7d32' },
];

/**
 * Retrieves the list of all faculty special permissions from the database.
 */
export async function getAllSpecialPermissions() {
  try {
    const rows = await query(
      `SELECT id, email, permissions, updated_at FROM faculty_notice_permissions ORDER BY email ASC`
    );
    if (!rows || rows.length === 0) return [];

    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      permissions: typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.error('[SpecialPermissions] Error fetching permissions from database:', err);
    return [];
  }
}

/**
 * Gets specific permissions for a user email from the database.
 */
export async function getFacultySpecialPermissions(email) {
  if (!email) return [];
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const rows = await query(
      `SELECT permissions FROM faculty_notice_permissions WHERE LOWER(email) = ? LIMIT 1`,
      [normalizedEmail]
    );

    if (rows && rows.length > 0) {
      const perms = typeof rows[0].permissions === 'string'
        ? JSON.parse(rows[0].permissions)
        : rows[0].permissions;
      return Array.isArray(perms) ? perms : [];
    }
  } catch (err) {
    console.error('[SpecialPermissions] Error querying email permissions:', err);
  }

  return [];
}

/**
 * Saves or updates permissions for an email in the database.
 */
export async function saveFacultySpecialPermissions(email, permissions) {
  if (!email) throw new Error('Email is required');
  const normalizedEmail = email.toLowerCase().trim();
  const permsArray = Array.isArray(permissions) ? permissions : [];
  const permsJson = JSON.stringify(permsArray);

  await query(
    `INSERT INTO faculty_notice_permissions (email, permissions) 
     VALUES (?, ?) 
     ON DUPLICATE KEY UPDATE permissions = ?`,
    [normalizedEmail, permsJson, permsJson]
  );

  return { email: normalizedEmail, permissions: permsArray };
}

/**
 * Deletes permissions for an email from the database.
 */
export async function deleteFacultySpecialPermissions(email) {
  if (!email) return;
  const normalizedEmail = email.toLowerCase().trim();
  await query(`DELETE FROM faculty_notice_permissions WHERE LOWER(email) = ?`, [normalizedEmail]);
}

/**
 * Synchronous check helper for a known list of permissions and a notice type.
 */
export function hasNoticePermission(permissions, noticeType) {
  if (!permissions || !Array.isArray(permissions) || !noticeType) return false;
  const normalizedType = noticeType.toLowerCase().trim();
  return permissions.includes(normalizedType);
}
