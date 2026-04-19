import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import { depList } from '@/lib/const'
export async function GET(request) {
  
  try {
    // const session = await getServerSession(authOptions)
    // if (!session) {
    //   return NextResponse.json(
    //     { message: 'Unauthorized' },
    //     { status: 401 }
    //   )
    // }
    const type = request.nextUrl.searchParams.get('type') || 'all'
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
      "user"
    ];
    // Get counts for all tables
    const counts = {}


      if (depList.has(type)) {        
        for (const table of facultyTables) {
          const tableCount = await query(
            `SELECT COUNT(*) AS count FROM ${table} AS t 
             INNER JOIN user AS u ON t.email = u.email 
             WHERE u.department = ?`,
            [depList.get(type)]
          );          
          counts[table] = tableCount[0].count;
        }
      
        return NextResponse.json(counts);
      } else if (type === "all"){
    // Faculty counts (includes faculty, officers in Officers department, and staff)
    const facultyCount = await query(
      'SELECT COUNT(*) as count FROM user WHERE (role = 3 OR department = "Officers" OR role = 5) AND is_deleted = 0', // FACULTY, OFFICER (by department), STAFF
      []
    )
    counts.faculty = facultyCount[0].count

    // Publications counts
    const journalCount = await query(
      'SELECT COUNT(*) as count FROM journal_papers',
      []
    )
    counts.journalPapers = journalCount[0].count

    const conferenceCount = await query(
      'SELECT COUNT(*) as count FROM conference_papers',
      []
    )
    counts.conferencePapers = conferenceCount[0].count

    // Books counts
    const textbooksCount = await query(
      'SELECT COUNT(*) as count FROM textbooks',
      []
    )
    counts.textbooks = textbooksCount[0].count

    const editedBooksCount = await query(
      'SELECT COUNT(*) as count FROM edited_books',
      []
    )
    counts.editedBooks = editedBooksCount[0].count

    const bookChaptersCount = await query(
      'SELECT COUNT(*) as count FROM book_chapters',
      []
    )
    counts.bookChapters = bookChaptersCount[0].count

    // Projects counts
    const sponsoredCount = await query(
      'SELECT COUNT(*) as count FROM sponsored_projects',
      []
    )
    counts.sponsoredProjects = sponsoredCount[0].count

    const consultancyCount = await query(
      'SELECT COUNT(*) as count FROM consultancy_projects',
      []
    )
    counts.consultancyProjects = consultancyCount[0].count

    // IPR counts
    const patentsCount = await query(
      'SELECT COUNT(*) as count FROM patents',
      []
    )
    counts.patents = patentsCount[0].count

    const iprCount = await query(
      'SELECT COUNT(*) as count FROM ipr',
      []
    )
    counts.ipr = iprCount[0].count

    // Innovation and Startups
    const startupsCount = await query(
      'SELECT COUNT(*) as count FROM startups',
      []
    )
    counts.startups = startupsCount[0].count

    const innovationCount = await query(
      'SELECT COUNT(*) as count FROM innovation',
      []
    )
    counts.innovations = innovationCount[0].count

    // Activities
    const workshopsCount = await query(
      'SELECT COUNT(*) as count FROM workshops_conferences',
      []
    )
    counts.workshopsConferences = workshopsCount[0].count

    const instituteActivitiesCount = await query(
      'SELECT COUNT(*) as count FROM institute_activities',
      []
    )
    counts.instituteActivities = instituteActivitiesCount[0].count

    const departmentActivitiesCount = await query(
      'SELECT COUNT(*) as count FROM department_activities',
      []
    )
    counts.departmentActivities = departmentActivitiesCount[0].count

    // Education and Experience
    const educationCount = await query(
      'SELECT COUNT(*) as count FROM education',
      []
    )
    counts.education = educationCount[0].count

    const workExperienceCount = await query(
      'SELECT COUNT(*) as count FROM work_experience',
      []
    )
    counts.workExperience = workExperienceCount[0].count

    // If email is provided, get counts for specific faculty
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (email) {
      const facultyCounts = {}
      
      // Get all counts for specific faculty
      for (const table of [
        'journal_papers',
        'conference_papers',
        'textbooks',
        'edited_books',
        'book_chapters',
        'sponsored_projects',
        'consultancy_projects',
        'patents',
        'ipr',
        'startups',
        'workshops_conferences',
        'institute_activities',
        'department_activities',
        'education',
        'work_experience'
      ]) {
        const result = await query(
          `SELECT COUNT(*) as count FROM ${table} WHERE email = ?`,
          [email]
        )
        facultyCounts[table] = result[0].count
      }

      return NextResponse.json({
        total: counts,
        faculty: facultyCounts
      })
    }

    return NextResponse.json(counts)
  }
    else {
      return NextResponse.json(
        { message: 'Invalid type',type:type },
        { status: 400 }
      )
    }
      

  } catch (error) {
    console.error('Count API Error:', error)
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    )
  }
}