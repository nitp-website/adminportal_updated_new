export const administrationList = new Map([
  ['academics', 'Academics'],
  ['academicintranet', 'Intranet - Academic and Exam Notice'],
  ['genralintranet', 'Intranet - General Notice'],
  ['tender', 'Tender'],
  ['job', 'JOB'],
  ['bogminutes', 'BOG/FC/BWC Minutes'],
  ['senateminutes', 'Senate Minutes'],
  ['annualreport', 'Annual Reports'],
  ['newcampus', 'New Campus']
])

export const notice_sub_types = {
  "JOB": [
    ["regularteaching", "Regular Teaching"],
    ["nonregularteaching", "Non-Regular Teaching"],
    ["regularnonteaching", "Regular Non-Teaching"],
    ["nonregularnonteaching", "Non-Regular Non-Teaching"],
    ["jdrfsrf", "JDRF/SRF"]
  ]
}

export const depList = new Map([
  ['arch', 'Architecture'],
  ['che', 'Chemical Science and Technology'],
  ['ce', 'Civil Engineering'],
  ['cse', 'Computer Science and Engineering'],
  ['ee', 'Electrical Engineering'],
  ['ece', 'Electronics and Communication Engineering'],
  ['hss', 'Humanities & Social Sciences'],
  ['maths', 'Mathematics and Computing Technology'],
  ['me', 'Mechanical Engineering'],
  ['phy', 'Applied Physics and Material Engineering'],
  ['mae', 'Mechatronics and Automation Engineering'],
  ['mse', 'Materials Science and Engineering'],
  // ['chet', 'Chemical Engineering and Technology'],
  ['officers', 'Officers'],
  ['others', 'Other Employees']
])

export const officerDesignations = [
  'Registrar',
  'Joint Registrar (Exam)',
  'Joint Registrar (F & A)',
  'Deputy Registrar (Establishemnt)',
  'Assistant Registrar (R & C)',
  'Assistant Registrar (Academic)',
  'Assistant Registrar (Procurement)',
  'Assistant Registrar (Director\'s Office)',
  'Assistant Registrar',
  'Sr. Medical Officer',
  'Medical Officer',
  'Sr. Scientific & Technical Officer',
  'Assistant Librarian',
  'SAS Officer',
  'Maintenance Engineer (Elec)',
  'Maintenance Engineer (Civil)'
]


export const StaffdepList = new Map([
  ['arch', 'Architecture'],
  ['che', 'Chemical Science and Technology'],
  ['ce', 'Civil Engineering'],
  ['cse', 'Computer Science and Engineering'],
  ['ee', 'Electrical Engineering'],
  ['ece', 'Electronics and Communication Engineering'],
  ['hss', 'Humanities & Social Sciences'],
  ['maths', 'Mathematics and Computing Technology'],
  ['me', 'Mechanical Engineering'],
  ['phy', 'Applied Physics and Material Engineering'],
  ['mae', 'Mechatronics and Automation Engineering'],
  ['mse', 'Materials Science and Engineering'],
  ['sup', 'Supporting Staff'],
  ['min', 'Ministerial Staff'],
  ['ccis', 'CCIS'],
  ['mis', 'MIS'],
  ['esu', 'Estate Service Unit'],
  ['emu', 'Estate Maintenance  Unit'],
  ['acd', 'Academic Section'],
  ['est', 'Establishment Section'],
  ['sw', 'Student Welfare Section'],
  ['tnp', 'Training and Placement Section'],
  ['reg', 'Registrar Office Section'],
  ['dir', 'Director Office Section'],
  ['pro', 'Procurement Section'],
  ['exam', 'Exam Section'],
  ['acc', 'Account Section'],
  ['fac','Faculty Welfare Section'],
  [ 'rnc', 'Research and Consultancy Section'],
  ['pnd', 'Planning and Development Section'],
  ['erp', 'ERP Section']
])

export function getDeptFullName(code) {
  if (!code) return "";
  return StaffdepList.get(code.toLowerCase()) || code;
}

// validates an incoming department code before it's saved
export function isValidDeptCode(code) {
  return StaffdepList.has((code || "").toLowerCase());
}
// book_chapters
// conference_papers
// consultancy_projects
// department_activities
// edited_books
// education
// events
// faculty_image
// innovation
// institute_activities
// internships
// ipr
// journal_papers
// memberships
// news
// notices
// patents
// phd_candidates
// project_supervision
// sponsored_projects
// startups
// teaching_engagement
// textbooks
// user
// webteam
// work_experience
// workshops_conferences
export const facultyTables = [
  // Academic Information
  'phd_candidates',
  'journal_papers',
  'conference_papers',
  'textbooks',
  'edited_books',
  'book_chapters',
  "about_me",
  "talks_and_lectures",
  "conference_session_chairs",
  "international_journal_reviewers",
  
  // Projects and Research
  'sponsored_projects',
  'consultancy_projects',
  'ipr',
  'startups',
  'patents',
  
  // Teaching and Supervision
  'teaching_engagement',
  'project_supervision',
  
  // Professional Activities
  'workshops_conferences',
  'institute_activities',
  'department_activities',
  'memberships',
  
  // Background
  'education',
  'work_experience',
  'internships'

  
]

// For invalidating redis cache of publications
export const PUBLICATION_TYPES = [
  'journal_papers',
  'conference_papers',
  'textbooks',
  'book_chapters'
];