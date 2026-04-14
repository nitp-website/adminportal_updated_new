import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { depList } from '@/lib/const'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    const type = searchParams.get('type')
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1)
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit')) || 10))
    const offset = (page - 1) * limit

    const unionQuery = (whereClause = '') => `
      SELECT * FROM (
        SELECT
          cp.id,
          cp.email,
          cp.authors,
          cp.title,
          cp.conference_name,
          cp.location,
          cp.conference_year AS year,
          cp.conference_year,
          cp.conference_type,
          cp.pages,
          cp.indexing,
          cp.foreign_author,
          cp.student_involved,
          cp.doi,
          cp.student_name,
          cp.student_roll_no,
          cp.foreign_author_name,
          cp.foreign_author_country_name,
          cp.foreign_author_institute_name,
          NULL AS journal_name,
          NULL AS journal_quartile,
          NULL AS volume,
          NULL AS publication_year,
          NULL AS publication_date,
          NULL AS chapter_title,
          NULL AS book_title,
          NULL AS publisher,
          NULL AS isbn,
          NULL AS doi_url,
          NULL AS student_details,
          NULL AS nationality_type,
          NULL AS foreign_author_details,
          NULL AS scopus,
          'conference' AS type
        FROM conference_papers cp
        ${whereClause ? `JOIN user u ON u.email = cp.email WHERE u.department = ?` : ''}

        UNION ALL

        SELECT
          jp.id,
          jp.email,
          jp.authors,
          jp.title,
          NULL AS conference_name,
          NULL AS location,
          jp.publication_date AS year,
          NULL AS conference_year,
          NULL AS conference_type,
          jp.pages,
          jp.indexing,
          NULL AS foreign_author,
          jp.student_involved,
          NULL AS doi,
          NULL AS student_name,
          NULL AS student_roll_no,
          NULL AS foreign_author_name,
          NULL AS foreign_author_country_name,
          NULL AS foreign_author_institute_name,
          jp.journal_name,
          jp.journal_quartile,
          jp.volume,
          jp.publication_year,
          jp.publication_date,
          NULL AS chapter_title,
          NULL AS book_title,
          NULL AS publisher,
          NULL AS isbn,
          jp.doi_url,
          jp.student_details,
          jp.nationality_type,
          jp.foreign_author_details,
          NULL AS scopus,
          'journal' AS type
        FROM journal_papers jp
        ${whereClause ? `JOIN user u ON u.email = jp.email WHERE u.department = ?` : ''}

        UNION ALL

        SELECT
          bc.id,
          bc.email,
          bc.authors,
          bc.chapter_title AS title,        
          NULL AS conference_name,
          NULL AS location,
          bc.year,
          NULL AS conference_year,
          NULL AS conference_type,
          bc.pages,
          NULL AS indexing,
          NULL AS foreign_author,
          NULL AS student_involved,
          bc.doi,
          NULL AS student_name,
          NULL AS student_roll_no,
          NULL AS foreign_author_name,
          NULL AS foreign_author_country_name,
          NULL AS foreign_author_institute_name,
          NULL AS journal_name,
          NULL AS journal_quartile,
          NULL AS volume,
          bc.year AS publication_year,
          NULL AS publication_date,
          bc.chapter_title,
          bc.book_title,
          bc.publisher,
          bc.isbn,
          NULL AS doi_url,
          NULL AS student_details,
          NULL AS nationality_type,
          NULL AS foreign_author_details,
          bc.scopus,
          'book_chapter' AS type
        FROM book_chapters bc
        ${whereClause ? `JOIN user u ON u.email = bc.email WHERE u.department = ?` : ''}

        UNION ALL

        SELECT
          t.id,
          t.email,
          t.authors,
          t.title,
          NULL AS conference_name,
          NULL AS location,
          t.year,
          NULL AS conference_year,
          NULL AS conference_type,
          NULL AS pages,
          NULL AS indexing,
          NULL AS foreign_author,
          NULL AS student_involved,
          t.doi,
          NULL AS student_name,
          NULL AS student_roll_no,
          NULL AS foreign_author_name,
          NULL AS foreign_author_country_name,
          NULL AS foreign_author_institute_name,
          NULL AS journal_name,
          NULL AS journal_quartile,
          NULL AS volume,
          t.year AS publication_year,
          NULL AS publication_date,
          NULL AS chapter_title,
          t.title AS book_title,
          t.publisher,
          t.isbn,
          NULL AS doi_url,
          NULL AS student_details,
          NULL AS nationality_type,
          NULL AS foreign_author_details,
          t.scopus,
          'textbook' AS type
        FROM textbooks t
        ${whereClause ? `JOIN user u ON u.email = t.email WHERE u.department = ?` : ''}

      ) AS combined
      ORDER BY year DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    //all publications
    if (type === 'all') {
      const countRes = await query(`
        SELECT 
          (SELECT COUNT(*) FROM conference_papers) +
          (SELECT COUNT(*) FROM textbooks) +
          (SELECT COUNT(*) FROM journal_papers) +
          (SELECT COUNT(*) FROM book_chapters) AS count
      `)

      const total = Number(countRes[0].count)
      const results = await query(unionQuery())

      return NextResponse.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: results
      })
    }

    //  DEPARTMENT FILTER
    if (depList.has(type)) {
      const dept = depList.get(type)

      const countRes = await query(
        `SELECT 
          (SELECT COUNT(*) FROM conference_papers cp JOIN user u ON u.email = cp.email WHERE u.department = ?) +
          (SELECT COUNT(*) FROM textbooks t JOIN user u ON u.email = t.email WHERE u.department = ?) +
          (SELECT COUNT(*) FROM journal_papers jp JOIN user u ON u.email = jp.email WHERE u.department = ?) +
          (SELECT COUNT(*) FROM book_chapters bc JOIN user u ON u.email = bc.email WHERE u.department = ?) AS count
        `,
        [dept, dept, dept, dept]
      )

      const total = Number(countRes[0].count)
      const results = await query(unionQuery(true), [dept, dept, dept, dept])

      return NextResponse.json({
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: results
      })
    }

    return NextResponse.json(
      { message: 'Invalid type parameter' },
      { status: 400 }
    )

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
}