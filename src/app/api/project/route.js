import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { depList } from '@/lib/const'

// Parses "2024-2025" into a July 1 2024 – June 30 2025 date range, matching
// the frontend's getAcademicYear() logic (month >= 7 belongs to the year
// that starts that July).
// Also accepts multi-year ranges like "2023-2026" (July 1 2023 – June 30 2026)
// and reversed input like "2025-2024".
function parseAcademicYearRange(raw) {
  if (!raw) return null
  const match = raw.trim().match(/^(\d{4})\s*-\s*(\d{4})$/)
  if (!match) return null

  const a = parseInt(match[1], 10)
  const b = parseInt(match[2], 10)
  const startYear = Math.min(a, b)
  const endYear = Math.max(a, b)
  if (startYear === endYear) return null

  return {
    from: `${startYear}-07-01`,
    to: `${endYear}-06-30`,
  }
}

// Splits the search string into up to 5 terms and escapes LIKE wildcards.
// Every term must match at least one column.
function parseSearchTerms(raw) {
  if (!raw) return []
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((t) => t.replace(/[\\%_]/g, '\\$&'))
}

// Builds WHERE conditions + params for one source table (sponsored_projects or
// consultancy_projects), supporting email, department, academic year, status, and search.
//
// Academic year filter:
//   - hasEndDate = true  (sponsored): a project matches if its duration OVERLAPS the
//     selected range, i.e. start_date <= range.to AND (end_date IS NULL OR end_date >= range.from).
//     So searching 2024-2025 also returns a project that runs 2023-2027.
//   - hasEndDate = false (consultancy): there is no end date, so it matches when
//     start_date falls inside the range.
function buildProjectClause({
  tableAlias,
  collabTable,
  collabIdCol,
  emailParam,
  dept,
  academicYearRange,
  status,
  terms,
  hasEndDate,
}) {
  const conditions = []
  const params = []

  if (emailParam) {
    conditions.push(`(${tableAlias}.email = ? OR ${tableAlias}.id IN (SELECT ${collabIdCol} FROM ${collabTable} WHERE email = ?))`)
    params.push(emailParam, emailParam)
  }

  if (dept) {
    conditions.push(`(${tableAlias}.email IN (SELECT email FROM user WHERE department = ?) OR ${tableAlias}.id IN (SELECT ${collabIdCol} FROM ${collabTable} spc JOIN user u2 ON u2.email = spc.email WHERE u2.department = ?))`)
    params.push(dept, dept)
  }

  if (academicYearRange) {
    if (hasEndDate) {
      conditions.push(`(${tableAlias}.start_date <= ? AND (${tableAlias}.end_date IS NULL OR ${tableAlias}.end_date >= ?))`)
      params.push(academicYearRange.to, academicYearRange.from)
    } else {
      conditions.push(`${tableAlias}.start_date BETWEEN ? AND ?`)
      params.push(academicYearRange.from, academicYearRange.to)
    }
  }

  if (status) {
    conditions.push(`${tableAlias}.status = ?`)
    params.push(status)
  }

  for (const t of terms) {
    const term = `%${t}%`
    conditions.push(`(
      ${tableAlias}.project_title LIKE ? OR
      ${tableAlias}.funding_agency LIKE ? OR
      ${tableAlias}.investigators LIKE ? OR
      ${tableAlias}.email LIKE ? OR
      ${tableAlias}.email IN (SELECT email FROM user WHERE name LIKE ?)
    )`)
    params.push(term, term, term, term, term)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  return { where, params }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type')
    const emailParam = searchParams.get('email')
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit')) || 20))
    const offset = (page - 1) * limit

    const academicYearRange = parseAcademicYearRange(searchParams.get('academic_year'))
    const statusRaw = searchParams.get('status')
    const status = statusRaw && statusRaw !== 'all' ? statusRaw : null
    const terms = parseSearchTerms((searchParams.get('search') || '').slice(0, 200))

    if (type === 'count') {
      const count = await query(`
        SELECT 
          (SELECT COUNT(*) FROM sponsored_projects) +
          (SELECT COUNT(*) FROM consultancy_projects) AS count
      `)
      return NextResponse.json({ projectCount: count[0].count })
    }

    let dept = null
    if (type && type !== 'all' && depList.has(type)) {
      dept = depList.get(type)
    } else if (type && type !== 'all' && !emailParam) {
      return NextResponse.json(
        { message: 'Invalid type parameter' },
        { status: 400 }
      )
    }

    const spClause = buildProjectClause({
      tableAlias: 'sp',
      collabTable: 'sponsored_projects_collaborater',
      collabIdCol: 'sponsored_project_id',
      emailParam,
      dept,
      academicYearRange,
      status,
      terms,
      hasEndDate: true,
    })

    const cpClause = buildProjectClause({
      tableAlias: 'cp',
      collabTable: 'consultancy_projects_collaborater',
      collabIdCol: 'consultancy_projects_id',
      emailParam,
      dept,
      academicYearRange,
      status,
      terms,
      hasEndDate: false,
    })

    const countRes = await query(
      `SELECT
        (SELECT COUNT(DISTINCT sp.id) FROM sponsored_projects sp ${spClause.where}) +
        (SELECT COUNT(DISTINCT cp.id) FROM consultancy_projects cp ${cpClause.where}) AS count`,
      [...spClause.params, ...cpClause.params]
    )
    const total = Number(countRes[0].count)

    const results = await query(`
      SELECT * FROM (
        SELECT 
          u.name, u.department, u.designation, u.ext_no, u.research_interest,
          u.academic_responsibility, u.image, u.administration, u.cv,
          u.linkedin, u.google_scholar, u.personal_webpage, u.scopus,
          u.vidwan, u.orcid, u.is_retired, u.retirement_date, u.is_deleted,
          sp.id, sp.email, sp.project_title, sp.funding_agency,
          sp.financial_outlay, sp.investigators, sp.pi_institute,
          sp.status, sp.funds_received, sp.role,
          sp.start_date, sp.end_date,
          GROUP_CONCAT(DISTINCT spc.email) AS collaboraters,
          'sponsored' AS project_type, sp.end_date AS sort_date
        FROM sponsored_projects sp
        LEFT JOIN user u ON u.email = sp.email
        LEFT JOIN sponsored_projects_collaborater spc ON sp.id = spc.sponsored_project_id
        ${spClause.where}
        GROUP BY sp.id

        UNION ALL

        SELECT 
          u.name, u.department, u.designation, u.ext_no, u.research_interest,
          u.academic_responsibility, u.image, u.administration, u.cv,
          u.linkedin, u.google_scholar, u.personal_webpage, u.scopus,
          u.vidwan, u.orcid, u.is_retired, u.retirement_date, u.is_deleted,
          cp.id, cp.email, cp.project_title, cp.funding_agency,
          cp.financial_outlay, cp.investigators, NULL AS pi_institute,
          cp.status, NULL AS funds_received, cp.role,
          cp.start_date, NULL AS end_date,
          GROUP_CONCAT(DISTINCT cpc.email) AS collaboraters,
          'consultancy' AS project_type, cp.start_date AS sort_date
        FROM consultancy_projects cp
        LEFT JOIN user u ON u.email = cp.email
        LEFT JOIN consultancy_projects_collaborater cpc ON cp.id = cpc.consultancy_projects_id
        ${cpClause.where}
        GROUP BY cp.id
      ) AS combined
      ORDER BY sort_date DESC, project_type ASC, id DESC
      LIMIT ${limit} OFFSET ${offset}`,
      [...spClause.params, ...cpClause.params]
    )

    const dataWithCollaborators = results.map(row => ({
      ...row,
      collaboraters: row.collaboraters ? row.collaboraters.split(',').map(s => s.trim()).filter(Boolean) : []
    }))

    return NextResponse.json({
      page,
      limit,
      offset,
      total,
      totalPages: Math.ceil(total / limit),
      data: dataWithCollaborators
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
}