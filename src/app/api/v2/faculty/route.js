import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { depList } from '@/lib/const'
import { connectRedis, isRedisDisabled } from '@/lib/redis'

const allowedOrigins = [
  "https://adminportal-updated-new.vercel.app/",
  'http://localhost:3000',
  'http://localhost:3001',
  'https://faculty-performance-appraisal-performa.vercel.app/',
]

// 5 minutes — list data changes infrequently but shouldn't be too stale
const CACHE_TTL = 5 * 60
const CACHE_PREFIX = 'v2:faculty:'

function cacheKey(type) {
  return `${CACHE_PREFIX}${type}`
}

/**
 * GET /api/v2/faculty
 *
 * Lightweight listing API — returns only fields needed for card display.
 *
 * Query params:
 *   ?type=all          → all faculty (excludes Officers / Other Employees)
 *   ?type=officers     → officers only (name, image, designation, email + priority order)
 *   ?type=<dept-key>   → faculty for a specific department (uses depList keys)
 */
// helper to get from cache safely
async function getCache(redis, key) {
  if (!redis) return null;
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error('[v2/faculty] Cache GET error:', err.message);
    return null;
  }
}

// helper to set cache safely
async function setCache(redis, key, data) {
  if (!redis) return;
  try {
    await redis.setex(key, CACHE_TTL, JSON.stringify(data));
  } catch (err) {
    console.error('[v2/faculty] Cache SET error:', err.message);
  }
}

const cardCountSubqueries = `
  (SELECT COUNT(DISTINCT jp.id) FROM journal_papers jp WHERE jp.email = u.email OR jp.id IN (SELECT journal_paper_id FROM journal_paper_collaborater WHERE email = u.email)) AS journal_papers_count,
  (SELECT COUNT(*) FROM conference_papers   WHERE email = u.email) AS conference_papers_count,
  (SELECT COUNT(*) FROM ipr                 WHERE email = u.email) AS ipr_count,
  (SELECT COUNT(DISTINCT sp.id) FROM sponsored_projects sp WHERE sp.email = u.email OR sp.id IN (SELECT sponsored_project_id FROM sponsored_projects_collaborater WHERE email = u.email)) AS sponsored_projects_count,
  (SELECT COUNT(*) FROM phd_candidates      WHERE email = u.email) AS phd_candidates_count
`

const cardUserFields = `
  u.id, u.name, u.image, u.designation, u.department,
  u.email, u.ext_no, u.research_interest, u.academic_responsibility,
  u.gender, u.is_retired, u.retirement_date, u.in_memoriam, u.service_end_date, u.date_of_joining
`

export async function GET(request) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  const origin = request.headers.get('origin')
  const corsHeaders = allowedOrigins.includes(origin)
    ? { 'Access-Control-Allow-Origin': origin }
    : {}

  try {
    // get redis client — will be null if disabled or unavailable
    const redis = isRedisDisabled() ? null : await connectRedis('v2/faculty API');

    let results

    if (type === 'all') {
      const cached = await getCache(redis, cacheKey('all'));
      if (cached) {
        console.log('[v2/faculty] Cache hit: all')
        return NextResponse.json(cached, {
          headers: { ...corsHeaders, 'X-Cache': 'HIT' },
        })
      }

      results = await query(
        `SELECT
          ${cardUserFields},
          ${cardCountSubqueries}
        FROM user u
        WHERE u.is_deleted = 0
          AND u.department NOT IN ('Officers', 'Other Employees', 'developer', 'Developer')
        ORDER BY u.name ASC`
      )

      await setCache(redis, cacheKey('all'), results);
      console.log('[v2/faculty] Cached: all')

    } else if (type && depList.has(type)) {
      const cached = await getCache(redis, cacheKey(type));
      if (cached) {
        console.log(`[v2/faculty] Cache hit: ${type}`)
        return NextResponse.json(cached, {
          headers: { ...corsHeaders, 'X-Cache': 'HIT' },
        })
      }

      results = await query(
        `SELECT
          ${cardUserFields},
          ${cardCountSubqueries}
        FROM user u
        WHERE u.department = ?
          AND u.is_deleted = 0
        ORDER BY u.name ASC`,
        [depList.get(type)]
      )

      await setCache(redis, cacheKey(type), results);
      console.log(`[v2/faculty] Cached: ${type}`)

    } else if (type === 'others') {
      const cached = await getCache(redis, cacheKey('others'));
      if (cached) {
        console.log('[v2/faculty] Cache hit: others')
        return NextResponse.json(cached, {
          headers: { ...corsHeaders, 'X-Cache': 'HIT' },
        })
      }

      results = await query(
        `SELECT u.id, u.name, u.image, u.designation, u.email, u.gender, u.is_retired
        FROM user u
        WHERE u.is_deleted = 0
          AND u.department = 'Other Employees'
        ORDER BY u.name ASC`
      )

      await setCache(redis, cacheKey('others'), results);
      console.log('[v2/faculty] Cached: others')

    } else if (type === 'officers') {
      const cached = await getCache(redis, cacheKey('officers'));
      if (cached) {
        console.log('[v2/faculty] Cache hit: officers')
        return NextResponse.json(cached, {
          headers: { ...corsHeaders, 'X-Cache': 'HIT' },
        })
      }

      results = await query(
        `SELECT
          u.id, u.name, u.image, u.designation, u.email, u.gender, u.is_retired
        FROM user u
        LEFT JOIN designation_priorities dp
          ON REPLACE(REPLACE(LOWER(u.designation), '&', ' & '), '.', '')
           = REPLACE(REPLACE(LOWER(dp.designation), '&', ' & '), '.', '')
        WHERE u.is_deleted = 0
          AND u.department = 'Officers'
        ORDER BY
          COALESCE(dp.priority_order, 999) ASC,
          u.name ASC`
      )

      await setCache(redis, cacheKey('officers'), results);
      console.log('[v2/faculty] Cached: officers')

    } else {
      return NextResponse.json(
        { error: 'Invalid or missing type parameter. Use type=all or a valid department key.' },
        { status: 400, headers: corsHeaders }
      )
    }

    return NextResponse.json(results, {
      headers: {
        ...corsHeaders,
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('[v2/faculty API] Error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
