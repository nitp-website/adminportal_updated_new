import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const safeParseJson = (val) => {
  if (!val) return [];
  if (typeof val !== 'string') return Array.isArray(val) ? val : [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    return [];
  }
};

const formatToYMD = (val) => {
  if (!val) return null;
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  try {
    const parsed = parseInt(str, 10);
    const d = !isNaN(parsed) && String(parsed).length >= 10 ? new Date(parsed) : new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return str;
};

const formatTimestamp = (val) => {
  if (!val) return null;
  const str = String(val).trim();
  try {
    const num = parseInt(str, 10);
    const d = !isNaN(num) && str.length >= 10 ? new Date(num) : new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  } catch (e) {}
  return str;
};

const formatRow = (row) => {
  return {
    ...row,
    achievement_date: formatToYMD(row.achievement_date),
    createdAt: formatTimestamp(row.createdAt),
    updatedAt: formatTimestamp(row.updatedAt),
    attachments: safeParseJson(row.attachments),
  };
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const departmentParam = searchParams.get('department')?.trim().toLowerCase();
    const categoryParam = searchParams.get('category')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit'), 10) || 20));
    const offset = (page - 1) * limit;

    const sortBy = searchParams.get('sortBy') === 'createdAt' ? 'createdAt' : 'achievement_date';
    const sortOrder = searchParams.get('sortOrder')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // 1. Single achievement lookup
    if (idParam) {
      const rows = await query(
        `SELECT da.*, u.name AS creator_name
         FROM department_achievements da
         LEFT JOIN user u ON u.email = da.email
         WHERE da.id = ? LIMIT 1`,
        [idParam]
      );

      if (rows && rows.length > 0) {
        return NextResponse.json(formatRow(rows[0]));
      }
      return NextResponse.json({ message: 'Department achievement not found' }, { status: 404 });
    }

    // 2. Filtered list with pagination
    const conditions = [];
    const params = [];

    if (departmentParam && departmentParam !== 'all') {
      conditions.push('LOWER(da.department) = ?');
      params.push(departmentParam);
    }

    if (categoryParam && categoryParam !== 'all') {
      conditions.push('da.category = ?');
      params.push(categoryParam);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) as count FROM department_achievements da ${whereClause}`,
      params
    );
    const total = Number(countRes[0]?.count || 0);

    const listSql = `
      SELECT da.*, u.name AS creator_name
      FROM department_achievements da
      LEFT JOIN user u ON u.email = da.email
      ${whereClause}
      ORDER BY (CASE WHEN da.${sortBy} IS NULL OR da.${sortBy} = 0 THEN 1 ELSE 0 END), da.${sortBy} ${sortOrder}, da.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const results = await query(listSql, params);
    const formattedData = (results || []).map(formatRow);

    return NextResponse.json({
      page,
      limit,
      offset,
      total,
      totalPages: Math.ceil(total / limit),
      data: formattedData,
    });
  } catch (error) {
    console.error('[Department Achievements GET Error]:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
