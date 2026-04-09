import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { ROLES, hasAccess } from '@/lib/roles'
// import { authOptions } from '../auth/[...nextauth]/route'
import { authOptions } from '@/lib/authOptions'
import { notice_sub_types } from '@/lib/const';

export async function POST(request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json(
      { message: 'You are not authorized' },
      { status: 403 }
    )
  }

  try {
    const { type, ...params } = await request.json()
    
    if (type === 'notice') {
      console.log('DEBUG: Authorization check for notice creation')
      console.log('User role:', session.user.role)
      console.log('User department:', session.user.department)
      console.log('Notice department:', params.data.department)
      console.log('Notice type:', params.data.notice_type)
      
      const canCreateNotice = 
        session.user.role === 'SUPER_ADMIN' ||
        (session.user.role === 'DEPT_ADMIN' && params.data.department === session.user.department) ||
        session.user.role === 'ACADEMIC_ADMIN'
      
      console.log('Can create notice:', canCreateNotice)
      
      if (!canCreateNotice) {
        return NextResponse.json(
          { message: 'Not authorized to create notices' },
          { status: 403 }
        )
      }

      if (params.data.notice_type ) {
        const noticeTypeKey = params.data.notice_type.toUpperCase();
        if (notice_sub_types.hasOwnProperty(noticeTypeKey)) {
          if (
            !params.data.notice_sub_type ||
            !notice_sub_types[noticeTypeKey].some(
            ([_,upKey]) => upKey===params.data.notice_sub_type,
            )          ) {
            return NextResponse.json(
              {
                message:
                  "Invalid or missing notice_sub_type for notice_type: " +
                  params.data.notice_type,
              },
              { status: 400 },
            );
          }
        }
      }

      const noticeResult = await query(
        `INSERT INTO notices(
    id, title, timestamp, openDate, closeDate, important, isVisible, attachments, email, 
    isDept, notice_link, notice_type, updatedBy, updatedAt, department,notice_sub_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
  [
    params.data.id,
    params.data.title,
    new Date().getTime(),
    params.data.openDate,
    params.data.closeDate,
    params.data.important || 0,
    params.data.isVisible === undefined ? 1 : Number(params.data.isVisible),
    JSON.stringify(params.data.attachments),
    params.data.email,
    params.data.isDept || 0,
    params.data.notice_link || null,
    params.data.notice_type || null,
    session.user.email,    new Date().getTime(),
    params.data.department || null,
    params.data.notice_sub_type?.trim()?.toUpperCase()||null
  ]
      )
      return NextResponse.json(noticeResult)
    }

    // Super Admin only access
    if (session.user.role === 'SUPER_ADMIN') {
      console.log("Inside user management")
      switch (type) {
        case 'user':
          const userResult = await query(
            `INSERT INTO user(name, email, role, department, designation, ext_no, research_interest, academic_responsibility, is_retired, retirement_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              params.name,
              params.email,
              params.role,
              params.department,
              params.designation,
              params.ext_no,
              params.research_interest,
              params.academic_responsibility || null,
              params.is_retired || false,
              params.retirement_date || null
            ]
          )
          return NextResponse.json(userResult)

        case 'webteam':
          const webteamResult = await query(
            `INSERT INTO webteam(name, desg, image, interests, url, email, year, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              params.name,
              params.desg,
              params.image,
              params.interests,
              params.url,
              params.email,
              params.year,
              params.role
            ]
          )
          return NextResponse.json(webteamResult)

        case 'event':
          const eventResult = await query(
            `INSERT INTO events(id, title, timestamp, openDate, closeDate, venue, doclink, attachments, event_link, email, eventStartDate, eventEndDate, updatedBy, updatedAt, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              params.data.id,
              params.data.title,
              new Date().getTime(),
              params.data.openDate,
              params.data.closeDate,
              params.data.venue,
              params.data.doclink,
              JSON.stringify(params.data.attachments || []),
              JSON.stringify(params.data.event_link),
              params.data.email,
              params.data.eventStartDate,
              params.data.eventEndDate,
              session.user.email,
              new Date().getTime(),
              params.data.type || 'general'
              ]
          )
          return NextResponse.json(eventResult)

        case 'innovation':
          const innovationResult = await query(
            `INSERT INTO innovation(id, title, timestamp, openDate, closeDate, description, image, author, email, updatedBy, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              params.data.id,
              params.data.title,
              new Date().getTime(),
              params.data.openDate,
              params.data.closeDate,
              params.data.description,
              JSON.stringify(params.data.image),
              params.data.author,
              params.data.email,
              session.user.email,
              new Date().getTime()
            ]
          )
          return NextResponse.json(innovationResult)

        case 'news':
          const newsResult = await query(
            `INSERT INTO news(id, title, timestamp, openDate, closeDate, description, image, attachments, author, email, updatedBy, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              params.data.id,
              params.data.title,
              new Date().getTime(),
              params.data.openDate,
              params.data.closeDate,
              params.data.description,
              JSON.stringify(params.data.image),
              JSON.stringify(params.data.add_attach),
              params.data.author,
              params.data.email,
              session.user.email,
              new Date().getTime()
            ]
          )
          return NextResponse.json(newsResult)

         
      }
    }

    // User specific access (email matches)
    if (session.user.email === params.email) {
      console.log(session.user.role)
      // Faculty specific operations
      if (session.user.role === 'FACULTY' || 
          session.user.role === 'OFFICER' || 
          session.user.role === 'STAFF' || 
          session.user.role === 'ACADEMIC_ADMIN' || 
          session.user.role === 'DEPT_ADMIN' || 
          session.user.role === 'SUPER_ADMIN') {
        switch (type) {
          case 'phd_candidates':
            const phdResult = await query(
              `INSERT INTO phd_candidates(id, email, student_name, roll_no, registration_year,registration_date, registration_type, research_area, other_supervisors, current_status, completion_year,supervisor_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)`,
              [
                params.id,
                params.email,
                params.student_name,
                params.roll_no,
                new Date(params.registration_date).getFullYear(),
                params.registration_date,
                params.registration_type,
                params.research_area,
                params.other_supervisors,
                params.current_status,
                params.completion_year,
                params.supervisor_type
              ]
            )
            return NextResponse.json(phdResult)

          case 'journal_papers':
            const journalResult = await query(
              `INSERT INTO journal_papers(id, email, authors, title, journal_name, volume, publication_year, pages, journal_quartile, publication_date, student_involved, student_details, doi_url,indexing,foreign_author_details,nationality_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?)`,
              [
                params.id,
                params.email,
                params.authors,
                params.title,
                params.journal_name,
                params.volume,
                params.publication_year,
                params.pages,
                params.journal_quartile,
                params.publication_date,
                params.student_involved,
                params.student_details,
                params.doi_url,
                params.indexing,
                params.foreign_author_details,
                params.nationality_type
              ]
            )
            
            if (params.collaboraters && Array.isArray(params.collaboraters)) {
                for (const email of params.collaboraters) {
                    await query(
                        `INSERT INTO journal_paper_collaborater(journal_paper_id, email)
                         VALUES (?, ?)`,
                        [params.id, email]
                    );
                }
            }

            const papersWithCollaborators = await query(
                `SELECT jp.*, 
                        GROUP_CONCAT(jpc.email) AS collaboraters
                 FROM journal_papers jp
                 LEFT JOIN journal_paper_collaborater jpc
                 ON jp.id = jpc.journal_paper_id
                 GROUP BY jp.id
                 ORDER BY jp.publication_year DESC`
            );

            return NextResponse.json({ journalResult, papersWithCollaborators });

          case 'conference_papers':
            const conferenceResult = await query(
              `INSERT INTO conference_papers (
                  id, 
                  email, 
                  authors, 
                  title, 
                  conference_name, 
                  location, 
                  conference_year, 
                  conference_type,
                  student_name,
                  student_roll_no,
                  foreign_author_name,
                  foreign_author_country_name,
                  foreign_author_institute_name,
                  pages, 
                  indexing, 
                  foreign_author, 
                  student_involved, 
                  doi
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.authors,
                params.title,
                params.conference_name,
                params.location,
                params.conference_year,
                params.conference_type,
                params.student_name,
                params.student_roll_no,
                params.foreign_author_name,
                params.foreign_author_country_name,
                params.foreign_author_institute_name,
                params.pages,
                params.indexing,
                params.foreign_author_name ? "yes" : "no",
                params.student_name ? "yes" : "no",
                params.doi
              ]
            )
            if (params.collaboraters && Array.isArray(params.collaboraters)) {
              for (const email of params.collaboraters) {
                await query(
                  `INSERT INTO conference_papers_collaborater(conference_papers_id, email) VALUES (?, ?)`,
                  [params.id, email]
                )
              }
            }

            const conferencesWithCollaborators = await query(
              `SELECT cp.*, GROUP_CONCAT(cpc.email) AS collaboraters
               FROM conference_papers cp
               LEFT JOIN conference_papers_collaborater cpc
                 ON cp.id = cpc.conference_papers_id
               WHERE cp.id = ?
               GROUP BY cp.id`,
              [params.id]
            )

            return NextResponse.json({ conference: conferencesWithCollaborators[0] || null })


          case 'textbooks':
            const textbookResult = await query(
              `INSERT INTO textbooks(id, email, title, authors, publisher, isbn, year, scopus, doi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.title,
                params.authors,
                params.publisher,
                params.isbn,
                params.year,
                params.scopus,
                params.doi
              ]
            )
            if (params.collaboraters && Array.isArray(params.collaboraters)) {
              for (const email of params.collaboraters) {
                await query(
                  `INSERT INTO textbooks_collaborater(textbooks_id, email) VALUES (?, ?)`,
                  [params.id, email]
                )
              }
            }
            return NextResponse.json(textbookResult)

          case 'edited_books':
            const editedBookResult = await query(
              `INSERT INTO edited_books(id, email, title, editors, publisher, isbn, year, scopus, doi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.title,
                params.editors,
                params.publisher,
                params.isbn,
                params.year,
                params.scopus,
                params.doi
              ]
            )
            if (params.collaboraters && Array.isArray(params.collaboraters)) {
              for (const email of params.collaboraters) {
                await query(
                  `INSERT INTO edited_books_collaborater(edited_books_id, email) VALUES (?, ?)`,
                  [params.id, email]
                )
              }
            }
            const editedBooksWithCollaborators = await query(
              `SELECT eb.*, GROUP_CONCAT(ebc.email) AS collaboraters
               FROM edited_books eb
               LEFT JOIN edited_books_collaborater ebc
                 ON eb.id = ebc.edited_books_id
               WHERE eb.id = ?
               GROUP BY eb.id`,
              [params.id]
            )

            return NextResponse.json({ editedBook: editedBooksWithCollaborators[0] || null })

          case 'book_chapters':
            const chapterResult = await query(
              `INSERT INTO book_chapters(id, email, authors, chapter_title, book_title, pages, publisher, isbn, year, scopus, doi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.authors,
                params.chapter_title,
                params.book_title,
                params.pages,
                params.publisher,
                params.isbn,
                params.year,
                params.scopus,
                params.doi
              ]
            )
            if (params.collaboraters && Array.isArray(params.collaboraters)) {
              for (const email of params.collaboraters) {
                await query(
                  `INSERT INTO book_chapters_collaborater(book_chapters_id, email) VALUES (?, ?)`,
                  [params.id, email]
                )
              }
            }
            return NextResponse.json(chapterResult)

          case 'sponsored_projects':
            const sponsoredResult = await query(
              `INSERT INTO sponsored_projects(id, email, role, project_title, funding_agency, financial_outlay, start_date, end_date, investigators, pi_institute, status, funds_received) VALUES (?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.role,
                params.project_title,
                params.funding_agency,
                params.financial_outlay,
                params.start_date,
                params.end_date,
                params.investigators,
                params.pi_institute,
                params.status,
                params.funds_received
              ]
            )
            if (params.collaboraters && Array.isArray(params.collaboraters)) {
              for (const email of params.collaboraters) {
                await query(
                  `INSERT INTO sponsored_projects_collaborater(sponsored_project_id, email) VALUES (?, ?)`,
                  [params.id, email]
                )
              }
            }
            return NextResponse.json(sponsoredResult)

          case 'consultancy_projects':
            const consultancyResult = await query(
              `INSERT INTO consultancy_projects(id, email,role, project_title, funding_agency, financial_outlay, start_date, period_months, investigators, status) VALUES (?, ?, ?,?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.role,
                params.project_title,
                params.funding_agency,
                params.financial_outlay,
                params.start_date,
                params.period_months,
                params.investigators,
                params.status
              ]
            )
            if (params.collaboraters && Array.isArray(params.collaboraters)) {
              for (const email of params.collaboraters) {
                await query(
                  `INSERT INTO consultancy_projects_collaborater(consultancy_projects_id, email) VALUES (?, ?)`,
                  [params.id, email]
                )
              }
            }
            return NextResponse.json(consultancyResult)

          case 'teaching_engagement':
            const teachingResult = await query(
              `INSERT INTO teaching_engagement(id, email, semester, level, course_number, course_title, course_type, student_count, lectures, tutorials, practicals, total_theory, lab_hours, years_offered) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.semester,
                params.level,
                params.course_number,
                params.course_title,
                params.course_type,
                params.student_count,
                params.lectures,
                params.tutorials,
                params.practicals,
                params.total_theory,
                params.lab_hours,
                params.years_offered
              ]
            )
            return NextResponse.json(teachingResult)

            case 'memberships':
              const membershipResult = await query(
                `INSERT INTO memberships (id, email, membership_id, membership_society, start, end) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  params.id,
                  params.email,
                  params.membership_id,
                  params.membership_society,
                  params.start,
                  params.end
                ]
              );
              return NextResponse.json(membershipResult);

            case 'project_supervision':
              const supervisionResult = await query(
                  `INSERT INTO project_supervision(id, email, category, project_title, student_details, internal_supervisors, external_supervisors, start_date, end_date) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                      params.id,
                      params.email,
                      params.category,
                      params.project_title,
                      params.student_details,
                      params.internal_supervisors,
                      params.external_supervisors,
                      params.start_date, 
                      params.end_date 
                  ]
              );
              return NextResponse.json(supervisionResult);
      
            case 'workshops_conferences':
              // Debugging
              console.log('params:', params);
          
              // Ensure start_date and end_date are formatted as 'YYYY-MM-DD' (if they exist)
              const formattedStartDate = params.start_date ? new Date(params.start_date).toISOString().split('T')[0] : null;
              const formattedEndDate = params.end_date ? new Date(params.end_date).toISOString().split('T')[0] : null;
          
              const workshopResult = await query(
                  `INSERT INTO workshops_conferences(id, email, event_type, role, event_name, sponsored_by, start_date, end_date, participants_count) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                      params.id,               
                      params.email,           
                      params.event_type,       
                      params.role,             
                      params.event_name,      
                      params.sponsored_by,   
                      formattedStartDate,      
                      formattedEndDate,       
                      params.participants_count 
                  ]
              );
              if (params.collaboraters && Array.isArray(params.collaboraters)) {
                for (const email of params.collaboraters) {
                  await query(
                    `INSERT INTO workshops_conferences_collaborater(workshops_conferences_id, email) VALUES (?, ?)`,
                    [params.id, email]
                  )
                }
              }
              
              return NextResponse.json(workshopResult);
          
          case 'institute_activities':
            const instituteResult = await query(
              `INSERT INTO institute_activities(id, email,institute_name, role_position, start_date, end_date) VALUES (?,?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.institute_name,
                params.role_position,
                params.start_date,
                params.end_date
              ]
            )
            return NextResponse.json(instituteResult)

          case 'department_activities':
            const departmentResult = await query(
              `INSERT INTO department_activities(id, email, institute_name ,activity_description, start_date, end_date) VALUES (?, ?, ?, ?, ?,?)`,
              [
                params.id,
                params.email,
                params.institute_name,
                params.activity_description,
                params.start_date,
                params.end_date
              ]
            )
            return NextResponse.json(departmentResult)

          case 'work_experience':
            const workExpResult = await query(
              `INSERT INTO work_experience(id, email, designation, organization, from_date, to_date, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.designation,
                params.organization,
                params.from_date,
                params.to_date,
                params.description
              ]
            )
            return NextResponse.json(workExpResult)

            case 'ipr':
    try {
        // Validate required fields
        const { id, email, title, iprtype, registration_date, publication_date, grant_date, grant_no, applicant_name, inventors } = params;

        if (!id || !email || !title || !type) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // Insert the record into the database
        const iprResult = await query(
            `INSERT INTO ipr (
                id, email, title, type, registration_date, publication_date, grant_date, grant_no, applicant_name, inventors
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, email, title, iprtype, registration_date, publication_date, grant_date, grant_no, applicant_name, inventors]
        );
        if (params.collaboraters && Array.isArray(params.collaboraters)) {
          for (const email of params.collaboraters) {
            await query(`INSERT INTO ipr_collaborater(ipr_id, email) VALUES (?, ?)`, [id, email])
          }
        }

        return NextResponse.json({ message: 'Record created successfully', data: iprResult });
    } catch (error) {
        console.error('Error inserting IPR record:', error);
        return NextResponse.json({ message: 'Error creating record', error: error.message }, { status: 500 });
    }
          

          case 'startups':
            const startupResult = await query(
              `INSERT INTO startups(id, email, startup_name, incubation_place, registration_date, owners_founders, annual_income, pan_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.startup_name,
                params.incubation_place,
                params.registration_date,
                params.owners_founders,
                params.annual_income,
                params.pan_number
              ]
            )
            if (params.collaboraters && Array.isArray(params.collaboraters)) {
              for (const email of params.collaboraters) {
                await query(`INSERT INTO startups_collaborater(startups_id, email) VALUES (?, ?)`, [params.id, email])
              }
            }
            return NextResponse.json(startupResult)

            case 'patents':
              const patentResult = await query(
                `INSERT INTO patents(id, title, description, patent_date, email) VALUES (?, ?, ?, ?, ?)`,
                [
                  params.id,
                  params.title,
                  params.description,
                  params.patent_date,
                  params.email
                ]
              )
              return NextResponse.json(patentResult)

          case 'internships':
            const internshipResult = await query(
              `INSERT INTO internships(id, email, student_name, qualification, affiliation, project_title, start_date, end_date, student_type ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                params.id,
                params.email,
                params.student_name,
                params.qualification,
                params.affiliation,
                params.project_title,
                params.start_date,
                params.end_date,
                params.student_type
              ]
            )
            return NextResponse.json(internshipResult)

          case 'education':
            const educationResult = await query(
              
              `INSERT INTO education (email, certification, institution, passing_year,specialization) VALUES (?, ?, ?, ?,?)`,[
        params.email, 
        params.certification,
        params.institution,
        params.passing_year,
        params.specialization
      ]

            )
            return NextResponse.json(educationResult)
        }
      }

      // Profile updates for all roles
      switch (type) {
        case 'profile_image':
          const imageResult = await query(
            `UPDATE user SET image = ? WHERE email = ?`,
            [params.image_url, params.email]
          )
          return NextResponse.json(imageResult)

        case 'profile_cv':
          const cvResult = await query(
            `UPDATE user SET cv = ? WHERE email = ?`,
            [params.cv_url, params.email]
          )
          return NextResponse.json(cvResult)
      }
    }

    return NextResponse.json(
      { message: 'Could not find matching requests' },
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