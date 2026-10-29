import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { depList } from '@/lib/const'

// Parses "2025", "2024-2025" or "2025-2024" into { from, to } (from <= to).
// Returns null if not provided / unparsable.
function parseYearRange(raw) {
  if (!raw) return null
  const parts = raw
    .split('-')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n))

  if (parts.length === 0) return null
  if (parts.length === 1) return { from: parts[0], to: parts[0] }

  return { from: Math.min(parts[0], parts[1]), to: Math.max(parts[0], parts[1]) }
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

const escapeLike = (v) => String(v).replace(/[\\%_]/g, '\\$&')

const SEARCH_COLS = [
  't.title',
  't.authors',
  't.conference_name',
  't.location',
  't.doi',
  't.student_name',
  't.foreign_author_name',
]

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit')) || 20))
    const offset = (page - 1) * limit

    // ---- Filters (all applied in SQL, before LIMIT/OFFSET) -----------------
    const terms = parseSearchTerms((searchParams.get('search') || '').slice(0, 200))
    const yearFilter = parseYearRange(searchParams.get('year'))

    const indexingRaw = searchParams.get('indexing')
    const indexing = indexingRaw && indexingRaw !== 'all' ? indexingRaw.trim() : null

    const confTypeRaw = searchParams.get('conference_type')
    const conferenceType = confTypeRaw && confTypeRaw !== 'all' ? confTypeRaw.trim() : null

    // ---- Resolve department ------------------------------------------------
    let dept = null
    if (type === 'all') {
      dept = null
    } else if (depList.has(type)) {
      dept = depList.get(type)
    } else {
      return NextResponse.json({ message: 'Invalid type parameter' }, { status: 400 })
    }

    // ---- Build JOIN / WHERE ------------------------------------------------
    const conditions = []
    const params = []
    let join = ''

    if (dept) {
      join = 'JOIN user u ON u.email = t.email'
      conditions.push('u.department = ?')
      params.push(dept)
    }

    if (yearFilter) {
      conditions.push('CAST(t.conference_year AS UNSIGNED) BETWEEN ? AND ?')
      params.push(yearFilter.from, yearFilter.to)
    }

    if (indexing) {
      conditions.push('t.indexing LIKE ?')
      params.push(`%${escapeLike(indexing)}%`)
    }

    if (conferenceType) {
      conditions.push('t.conference_type = ?')
      params.push(conferenceType)
    }

    for (const term of terms) {
      conditions.push('(' + SEARCH_COLS.map((c) => `${c} LIKE ?`).join(' OR ') + ')')
      SEARCH_COLS.forEach(() => params.push(`%${term}%`))
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    // ---- Count (same filters as the data query) ----------------------------
    const countRes = await query(
      `SELECT COUNT(*) AS count FROM conference_papers t ${join} ${where}`,
      params
    )
    const total = Number(countRes[0].count)

    // ---- Page data ---------------------------------------------------------
    const rows = await query(
      `SELECT t.*${dept ? ', u.department' : ''}
       FROM conference_papers t
       ${join}
       ${where}
       ORDER BY t.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    )

    // Keep the original response keys so the frontend doesn't break:
    // type=all -> conference_papers, department -> conference_data
    const dataKey = type === 'all' ? 'conference_papers' : 'conference_data'

    return NextResponse.json({
      page,
      limit,
      offset,
      total,
      totalPages: Math.ceil(total / limit),
      [dataKey]: rows,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}