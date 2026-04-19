import { NextResponse } from 'next/server'
import { query, parallel, batchQuery } from '@/lib/db'
import { depList, facultyTables } from '@/lib/const'
import { getCachedUserProfile, cacheUserProfile, refreshProfileCacheTTL } from '@/lib/profileCache';

const allowedOrigins = [
  "https://adminportal-updated-new.vercel.app/",  
  'http://localhost:3000',
  'https://faculty-performance-appraisal-performa.vercel.app/',
  // Add other allowed domains
]

export async function GET(request) {
  try {
    // Add CORS headers
    const response = NextResponse
    
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    let results

    const origin = request.headers.get('origin')
    const isAllowedOrigin = allowedOrigins.includes(origin)

     const facultyTables = [
      'about_me',
      'book_chapters',
      'conference_papers',
      'conference_session_chairs',
      'consultancy_projects',
      'department_activities',
      'edited_books',
      'education',
      'events',
      'faculty_image',
      'innovation',
      'institute_activities',
      'international_journal_reviewers',
      'internships',
      'ipr',
      'journal_papers',
      'memberships',
      'news',
      'notices',
      'patents',
      'phd_candidates',
      'project_supervision',
      'sponsored_projects',
      'startups',
      'talks_and_lectures',
      'teaching_engagement',
      'textbooks',
      'webteam',
      'work_experience',
      'workshops_conferences',
      "user",
      "honours_awards",
      "special_lectures",
      "visits_abroad",
      'editorial_boards',
      'mooc_courses'
    ];

    let subqueries = facultyTables.map(
            (table) => `(SELECT COUNT(*) FROM ${table} WHERE email = u.email) AS ${table}_count`
          );

    switch (type) {
      case 'all':
        results = await query(
          `SELECT 
            u.*, 
            CASE u.role 
              WHEN 1 THEN 'SUPER_ADMIN'
              WHEN 2 THEN 'ACADEMIC_ADMIN'
              WHEN 3 THEN 'FACULTY'
              WHEN 4 THEN 'OFFICER'
              WHEN 5 THEN 'STAFF'
              WHEN 6 THEN 'DEPT_ADMIN'
              WHEN 7 THEN 'TENDER_NOTICE_ADMIN'
            END as role_name,
            ${subqueries.join(',\n    ')}
              FROM user u 
              WHERE u.is_deleted = 0
              ORDER BY u.name ASC`
        )
        // Transform the results to include role name
        return NextResponse.json(results.map(user => ({
          ...user,
          role: user.role_name // Replace numeric role with string role
        })))

      case 'faculties':
        results = []
        const departments = [...depList.values()]
        
        // Fetch faculty from each department
        for (let i = 0; i < departments.length - 1; i++) {
          const data = await query(
            `SELECT * FROM user WHERE department = ? AND is_deleted = 0 ORDER BY name ASC`,
            [departments[i]]
          ).catch(e => console.error('Department query error:', e))
          
          if (data) {
            results = [...results, ...data]
          }
        }
        return NextResponse.json(results.sort())

      case 'count':
        const countResult = await query(
          `SELECT COUNT(*) as count FROM user WHERE is_deleted = 0`
        )
        return NextResponse.json({ 
          facultyCount: countResult[0].count 
        })

      default:
        // Check if it's a department query
        if (depList.has(type)) {
          results = await query(
            `SELECT 
            u.*, 
            ${subqueries.join(',\n    ')}
              FROM user u
              where department = ? AND u.is_deleted = 0`,
            [depList.get(type)]
          )
          return NextResponse.json(results)
        }

        // Individual faculty profile query - OPTIMIZED WITH CONNECTION POOLING
        console.log(`[Faculty API] Fetching data for: ${type}`)
        const startTime = Date.now()
        // FIRST CHECK CACHE
        let profileData = await getCachedUserProfile(type);
         if (profileData) {
          // Cache hit! Return immediately
          const cacheTime = Date.now() - startTime;
          console.log(`[Faculty API] Cache hit - returned in ${cacheTime}ms`);
           refreshProfileCacheTTL(type).catch(e => console.error('TTL refresh error:', e));
           return NextResponse.json(profileData, {
            headers: {
              'X-Cache': 'HIT',
              'X-Response-Time': `${cacheTime}ms`,
            }
          });
        }
        console.log(`[Faculty API] Cache miss for ${type}, fetching from database...`);
        // Get user profile data first
        const profileResult = await query(
            `SELECT * FROM user WHERE email = ? AND is_deleted = 0`,
          [type]
        )

        if (profileResult.length === 0) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        profileData = {
          profile: profileResult[0]
        }

        // Define all tables we need to query (excluding user which we already have)
        const dataQueries = [
          { table: 'about_me', query: 'SELECT * FROM about_me WHERE email = ?' },
          { table: 'education', query: 'SELECT * FROM education WHERE email = ?' },
          { table: 'work_experience', query: 'SELECT * FROM work_experience WHERE email = ?' },
          {
            table: 'journal_papers',
            query: `SELECT 
                      ANY_VALUE(jp.id) AS id,
                      ANY_VALUE(jp.email) AS email,
                      ANY_VALUE(jp.authors) AS authors,
                      ANY_VALUE(jp.title) AS title,
                      ANY_VALUE(jp.journal_name) AS journal_name,
                      ANY_VALUE(jp.volume) AS volume,
                      ANY_VALUE(jp.publication_year) AS publication_year,
                      ANY_VALUE(jp.pages) AS pages,
                      ANY_VALUE(jp.journal_quartile) AS journal_quartile,
                      ANY_VALUE(jp.publication_date) AS publication_date,
                      ANY_VALUE(jp.student_involved) AS student_involved,
                      ANY_VALUE(jp.student_details) AS student_details,
                      ANY_VALUE(jp.doi_url) AS doi_url,
                      ANY_VALUE(jp.indexing) AS indexing,
                      ANY_VALUE(jp.foreign_author_details) AS foreign_author_details,
                      ANY_VALUE(jp.nationality_type) AS nationality_type,
                      GROUP_CONCAT(jpc_all.email) AS collaboraters
                    FROM journal_papers jp
                    LEFT JOIN journal_paper_collaborater jpc_all
                          ON jp.id = jpc_all.journal_paper_id
                    WHERE jp.email = ? 
                      OR jp.id IN (
                          SELECT journal_paper_id FROM journal_paper_collaborater WHERE email = ?
                      )
                    GROUP BY jp.id
                    ORDER BY jp.publication_year DESC`
          },
          { 
            table: 'conference_papers', 
            query: `SELECT 
                cp.*,
                GROUP_CONCAT(cpc.email) as collaboraters
            FROM conference_papers cp
            LEFT JOIN conference_papers_collaborater cpc ON cp.id = cpc.conference_papers_id
            WHERE cp.email = ? OR cp.id IN (
                SELECT conference_papers_id FROM conference_papers_collaborater WHERE email = ?
            )
            GROUP BY cp.id` 
          },
          { table: 'book_chapters', query: `SELECT bc.* FROM book_chapters bc WHERE bc.email = ? OR bc.id IN (SELECT book_chapters_id FROM book_chapters_collaborater WHERE email = ?)` },
          { table: 'edited_books', query: `SELECT eb.* FROM edited_books eb WHERE eb.email = ? OR eb.id IN (SELECT edited_books_id FROM edited_books_collaborater WHERE email = ?)` },
          { table: 'textbooks', query: `SELECT tb.* FROM textbooks tb WHERE tb.email = ? OR tb.id IN (SELECT textbooks_id FROM textbooks_collaborater WHERE email = ?)` },
          { table: 'patents', query: 'SELECT * FROM ipr WHERE email = ? AND type = "Patent"' },
          { table: 'sponsored_projects', query: `SELECT sp.* FROM sponsored_projects sp WHERE sp.email = ? OR sp.id IN (SELECT sponsored_project_id FROM sponsored_projects_collaborater WHERE email = ?)` },
          { table: 'consultancy_projects', query: `SELECT cp.* FROM consultancy_projects cp WHERE cp.email = ? OR cp.id IN (SELECT consultancy_projects_id FROM consultancy_projects_collaborater WHERE email = ?)` },
          { table: 'project_supervision', query: 'SELECT * FROM project_supervision WHERE email = ?' },
          { table: 'phd_candidates', query: 'SELECT * FROM phd_candidates WHERE email = ?' },
          { table: 'internships', query: 'SELECT * FROM internships WHERE email = ?' },
          { table: 'teaching_engagement', query: 'SELECT * FROM teaching_engagement WHERE email = ?' },
          { table: 'workshops_conferences', query: `SELECT wc.* FROM workshops_conferences wc WHERE wc.email = ? OR wc.id IN (SELECT workshops_conferences_id FROM workshops_conferences_collaborater WHERE email = ?)` },
          { table: 'institute_activities', query: 'SELECT * FROM institute_activities WHERE email = ?' },
          { table: 'department_activities', query: 'SELECT * FROM department_activities WHERE email = ?' },
          { table: 'memberships', query: 'SELECT * FROM memberships WHERE email = ?' },
          { table: 'ipr', query: `SELECT i.* FROM ipr i WHERE i.email = ? OR i.id IN (SELECT ipr_id FROM ipr_collaborater WHERE email = ?)` },
          { table: 'startups', query: `SELECT s.* FROM startups s WHERE s.email = ? OR s.id IN (SELECT startups_id FROM startups_collaborater WHERE email = ?)` },
          { table: 'conference_session_chairs', query: 'SELECT * FROM conference_session_chairs WHERE email = ?' },
          { table: 'international_journal_reviewers', query: 'SELECT * FROM international_journal_reviewers WHERE email = ?' },
          { table: 'talks_and_lectures', query: 'SELECT * FROM talks_and_lectures WHERE email = ?' },

          {table:"honours_awards",query:"SELECT * FROM honours_awards WHERE email = ?"},
          {table:"special_lectures",query:"SELECT * FROM special_lectures WHERE email = ?"},
          {table:"visits_abroad",query:"SELECT * FROM visits_abroad WHERE email = ?"},
          {table:"editorial_boards",query:"SELECT * FROM editorial_boards WHERE email = ?"},
          {table:"mooc_courses",query:"SELECT * FROM mooc_courses WHERE email = ?"},
        ]

        try {
          // Execute ALL queries using a single connection from pool for better performance
          console.log(`[Faculty API] Executing ${dataQueries.length} queries with single connection...`)
          
          // Use the new batchQuery function from db.js (single connection)
          const collabTables = new Set(['journal_papers','book_chapters','edited_books','textbooks','sponsored_projects','consultancy_projects','workshops_conferences','ipr','startups','conference_papers']);
          const batchQueries = dataQueries.map(({ table, query: q }) => ({
            query: q,
            values: collabTables.has(table) ? [type, type] : [type],
          }));
          const results = await batchQuery(batchQueries)

          results.forEach((tableData, index) => {
            const table = dataQueries[index].table;
            if (table === 'journal_papers') {
              tableData.forEach(item => {
                item.collaboraters = item.collaboraters
                  ? item.collaboraters.split(',').map(s => s.trim())
                  : [];
              });
            }
          });

          // Map results back to table names
          dataQueries.forEach(({ table }, index) => {
            const tableData = results[index]
            if (tableData && tableData.length > 0) {
              // Special handling for publications that need JSON parsing
              if (table === 'publications' || table === 'journal_papers') {
                tableData.forEach(item => {
                  try {
                    if (item.publications) item.publications = JSON.parse(item.publications)
                    if (item.pub_pdf) item.pub_pdf = JSON.parse(item.pub_pdf)
                  } catch (e) {
                    // Skip JSON parsing errors
                  }
                })
              }
              profileData[table] = tableData
            } else {
              profileData[table] = []
            }
          })
          const collaboratorMappings = [
            { table: 'edited_books', collabTable: 'edited_books_collaborater', idField: 'edited_books_id' },
            { table: 'book_chapters', collabTable: 'book_chapters_collaborater', idField: 'book_chapters_id' },
            { table: 'textbooks', collabTable: 'textbooks_collaborater', idField: 'textbooks_id' },
            { table: 'sponsored_projects', collabTable: 'sponsored_projects_collaborater', idField: 'sponsored_project_id' },
            { table: 'consultancy_projects', collabTable: 'consultancy_projects_collaborater', idField: 'consultancy_projects_id' },
            { table: 'workshops_conferences', collabTable: 'workshops_conferences_collaborater', idField: 'workshops_conferences_id' },
            { table: 'ipr', collabTable: 'ipr_collaborater', idField: 'ipr_id' },
            { table: 'startups', collabTable: 'startups_collaborater', idField: 'startups_id' },
            { table: 'conference_papers', collabTable: 'conference_papers_collaborater', idField: 'conference_papers_id' }
          ];

          for (const map of collaboratorMappings) {
            const items = profileData[map.table];
            if (items && items.length > 0) {
              const ids = items.map(i => i.id).filter(Boolean);
              if (ids.length > 0) {
                const placeholders = ids.map(() => '?').join(',');
                const collabs = await query(
                  `SELECT * FROM ${map.collabTable} WHERE ${map.idField} IN (${placeholders})`,
                  ids
                ).catch(e => { console.error('Collaborator fetch error for', map.collabTable, e); return [] })

                items.forEach(item => {
                  const related = collabs.filter(c => String(c[map.idField]) === String(item.id)).map(r => r.email)
                  item.collaboraters = related
                })
              } else {
                items.forEach(item => { item.collaboraters = [] })
              }
            } else if (Array.isArray(items)) {
            } else {
              profileData[map.table] = []
            }
          }
          
          const dbTime = Date.now() - startTime;
          console.log(`[Faculty API] Database queries completed in ${dbTime}ms`);

          // CACHE THE RESULT
          console.log(`[Faculty API] Caching profile for ${type}...`);
          if (profileData?.profile) {
            cacheUserProfile(type, profileData).catch(console.error);
      }

          return NextResponse.json(profileData, {
            headers: {
              'X-Cache': 'MISS',
              'X-Response-Time': `${dbTime}ms`,
            }
          })
          
        } catch (error) {
          console.error('[Faculty API] Query error:', error)
          return NextResponse.json(
            { message: error.message },
            { status: 500 }
          )
        }
    }

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    )
  }
}

// Handle OPTIONS requests
export async function OPTIONS(request) {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
} 