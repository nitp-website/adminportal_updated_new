const path = require('path')
const envPath = path.resolve(process.cwd(), '.env.local')

console.log({ envPath })

require('dotenv').config({ path: envPath })

const mysql = require('serverless-mysql')

const db = mysql({
    config: {
        host: process.env.MYSQL_HOST,
        database: process.env.MYSQL_DATABASE,
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        port: process.env.MYSQL_PORT,
    },
    
})

async function query(q) {
    try {
        const results = await db.query(q)
        await db.end()
        return results
    } catch (e) {
        throw Error(e.message)
    }
}

// Create "entries" table if doesn't exist
async function migrate() {
    console.log('migration started')
    //Create notices table
    await query(`CREATE TABLE IF NOT EXISTS notices (
      id bigint NOT NULL,
      title varchar(1000),
      timestamp bigint,
      openDate bigint,
      closeDate bigint,
      important int,
      isVisible int,
      attachments varchar(1000),
      email varchar(50) NOT NULL,
      isDept int,
      notice_link varchar(1000),
      notice_type varchar(100),
      updatedBy varchar(50),
      updatedAt bigint,
      department varchar(1000),
      PRIMARY KEY (id)
    );`).catch((e) => console.log(e))


    // "about_me" 

    await query(`CREATE TABLE IF NOT EXISTS about_me (
      id BIGINT NOT NULL AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      content TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      PRIMARY KEY (id)
    );`).catch((e) => console.log(e));



//Create news table
    await query(`create table if not exists news (
                id bigint NOT NULL,
                title varchar(1000),
                timestamp bigint,
                openDate bigint,
                closeDate bigint,
                venue varchar(1000),
                image varchar(1000),
                description varchar(1000),
                attachments varchar(1000),
                author varchar(1000),
                email varchar(50) NOT NULL,
                updatedBy varchar(50),
                updatedAt bigint,
                PRIMARY KEY (id)
            )`).catch((e) => console.log(e))

//Create innovation table
    await query(`create table if not exists innovation (
                id bigint NOT NULL AUTO_INCREMENT ,
                title varchar(1000),
                timestamp bigint,
                openDate bigint,
                closeDate bigint,
                description varchar(1000),
                image varchar(1000),
                author varchar(1000),
                email varchar(50) NOT NULL,
                updatedBy varchar(50),
                updatedAt bigint,
                PRIMARY KEY (id)
            )`).catch((e) => console.log(e))

//Create faculty_image table
    await query(`create table if not exists faculty_image (
                email varchar(50),
                image varchar(1000),
                PRIMARY KEY(email),
                UNIQUE KEY(email)
            )`).catch((e) => console.log(e))



//Create education table
    await query(`CREATE TABLE if not exists education (
                id bigint NOT NULL,
                email varchar(100),
                certification varchar(10) NOT NULL,
                institution text NOT NULL,
                passing_year varchar(10) DEFAULT NULL,
                PRIMARY KEY(id)
            );`).catch((e) => console.log(e))
//Create events table
    await query(`create table if not exists events (
                id bigint NOT NULL,
                title varchar(1000),
                timestamp bigint,
                openDate bigint,
                closeDate bigint,
                venue varchar(1000),
                doclink varchar(500),
                attachments varchar(1000),
                email varchar(50) NOT NULL,
                event_link varchar(1000),
                eventStartDate bigint,
                eventEndDate bigint,
                updatedBy varchar(50),
                updatedAt bigint,
                type varchar(100),
                PRIMARY KEY (id))`).catch((e) => console.log(e))
//Create memberships table
    await query(`CREATE TABLE if not exists memberships (
                id bigint NOT NULL,
                email varchar(100),
                membership_id varchar(20) NOT NULL,
                membership_society text NOT NULL,
                start date,
                end date,
                PRIMARY KEY(id)
            );`).catch((e) => console.log(e))
// Create patents table
await query(`CREATE TABLE IF NOT EXISTS patents (
    id bigint NOT NULL AUTO_INCREMENT,
    title varchar(1000),
    description text,
    patent_date date,
    email varchar(50) NOT NULL,
    PRIMARY KEY (id)
);`).catch((e) => console.log(e));

// PhD Candidates
await query(`CREATE TABLE IF NOT EXISTS phd_candidates (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    student_name VARCHAR(255),
    roll_no VARCHAR(50),
    registration_year YEAR,
    registration_type VARCHAR(50),
    research_area VARCHAR(500),
    other_supervisors VARCHAR(500),
    current_status VARCHAR(50),
    completion_year VARCHAR(20)
);`).catch((e) => console.log(e));

// Journal Papers
await query(`CREATE TABLE IF NOT EXISTS journal_papers (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    authors VARCHAR(500),
    title VARCHAR(500),
    journal_name VARCHAR(255),
    volume VARCHAR(50),
    publication_year YEAR,
    pages VARCHAR(50),
    journal_quartile VARCHAR(10),
    publication_date DATE,
    student_involved BOOLEAN,
    student_details VARCHAR(255),
    doi_url VARCHAR(255)
);`).catch((e) => console.log(e));

// Conference Papers
await query(`CREATE TABLE IF NOT EXISTS conference_papers (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    authors VARCHAR(500),
    title VARCHAR(500),
    conference_name VARCHAR(255),
    location VARCHAR(255),
    conference_year YEAR,
    pages VARCHAR(50),
    indexing VARCHAR(255),
    foreign_author VARCHAR(255),
    student_involved VARCHAR(255),
    doi VARCHAR(255)
);`).catch((e) => console.log(e));

// Books - split into three tables
await query(`CREATE TABLE IF NOT EXISTS textbooks (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    title VARCHAR(500),
    authors VARCHAR(500),
    publisher VARCHAR(255),
    isbn VARCHAR(50),
    year YEAR,
    scopus VARCHAR(255),
    doi VARCHAR(255)
);`).catch((e) => console.log(e));

await query(`CREATE TABLE IF NOT EXISTS edited_books (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    title VARCHAR(500),
    editors VARCHAR(500),
    publisher VARCHAR(255),
    isbn VARCHAR(50),
    year YEAR,
    scopus VARCHAR(255),
    doi VARCHAR(255)
);`).catch((e) => console.log(e));

await query(`CREATE TABLE IF NOT EXISTS book_chapters (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    authors VARCHAR(500),
    chapter_title VARCHAR(500),
    book_title VARCHAR(500),
    pages VARCHAR(50),
    publisher VARCHAR(255),
    isbn VARCHAR(50),
    year YEAR,
    scopus VARCHAR(255),
    doi VARCHAR(255)
);`).catch((e) => console.log(e));

// Sponsored Projects
await query(`CREATE TABLE IF NOT EXISTS sponsored_projects (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    project_title VARCHAR(500),
    funding_agency VARCHAR(255),
    financial_outlay DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    investigators VARCHAR(500),
    pi_institute VARCHAR(255),
    status VARCHAR(50),
    funds_received DECIMAL(10,2)
);`).catch((e) => console.log(e));

// Consultancy Projects
await query(`CREATE TABLE IF NOT EXISTS consultancy_projects (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    project_title VARCHAR(500),
    funding_agency VARCHAR(255),
    financial_outlay DECIMAL(10,2),
    start_date DATE,
    period_months INT,
    investigators VARCHAR(500),
    status VARCHAR(50)
);`).catch((e) => console.log(e));
//ipr
await query(`
    CREATE TABLE IF NOT EXISTS ipr (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255),
        title VARCHAR(500),
        type VARCHAR(50),
        registration_date DATE,
        publication_date DATE,
        grant_date DATE,
        grant_no VARCHAR(100),
        applicant_name VARCHAR(255),
        inventors VARCHAR(500)
    );
`).catch((e) => console.error('Error creating table:', e));

// Startups
await query(`CREATE TABLE IF NOT EXISTS startups (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    startup_name VARCHAR(255),
    incubation_place VARCHAR(255),
    registration_date DATE,
    owners_founders VARCHAR(500),
    annual_income DECIMAL(10,2),
    pan_number VARCHAR(50)
);`).catch((e) => console.log(e));

// Internships
await query(`CREATE TABLE IF NOT EXISTS internships (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    student_name VARCHAR(255),
    qualification VARCHAR(50),
    affiliation VARCHAR(255),
    project_title VARCHAR(500),
    start_date DATE,
    end_date DATE,
    student_type VARCHAR(50)
);`).catch((e) => console.log(e));

// Workshops & Conferences
await query(`CREATE TABLE IF NOT EXISTS workshops_conferences (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    event_type VARCHAR(50),
    role VARCHAR(100),
    event_name VARCHAR(255),
    sponsored_by VARCHAR(255),
    start_date DATE,
    end_date DATE,
    participants_count INT
);`).catch((e) => console.log(e));

// Institute Level Activities
await query(`CREATE TABLE IF NOT EXISTS institute_activities (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    role_position VARCHAR(100),
    start_date DATE,
    end_date DATE
);`).catch((e) => console.log(e));

// Department Level Activities
await query(`CREATE TABLE IF NOT EXISTS department_activities (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    activity_description VARCHAR(500),
    start_date DATE,
    end_date DATE
);`).catch((e) => console.log(e));

// Teaching Engagement
await query(`CREATE TABLE IF NOT EXISTS teaching_engagement (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    semester VARCHAR(50),
    level VARCHAR(20),
    course_number VARCHAR(50),
    course_title VARCHAR(255),
    course_type VARCHAR(20),
    student_count INT,
    lectures INT,
    tutorials INT,
    practicals INT,
    total_theory INT,
    lab_hours INT,
    years_offered VARCHAR(50)
);`).catch((e) => console.log(e));

// Project Supervision
await query(`CREATE TABLE IF NOT EXISTS project_supervision (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    category VARCHAR(50),
    project_title VARCHAR(500),
    student_details VARCHAR(1000),
    internal_supervisors VARCHAR(500),
    external_supervisors VARCHAR(500)
);`).catch((e) => console.log(e));

// Work Experience
await query(`CREATE TABLE IF NOT EXISTS work_experience (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    work_experiences TEXT,
    institute VARCHAR(255),
    start_date DATE,
    end_date VARCHAR(50)
);`).catch((e) => console.log(e));

// Modified User Table
await query(`CREATE TABLE IF NOT EXISTS user (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    email VARCHAR(100),
    role INT,
    department VARCHAR(100),
    designation VARCHAR(100),
    ext_no TEXT,
    research_interest TEXT,
    academic_responsibility VARCHAR(255),
    image VARCHAR(1000),
    administration VARCHAR(1000),
    cv VARCHAR(1000),
    linkedin VARCHAR(1000),
    google_scholar VARCHAR(1000),
    personal_webpage VARCHAR(1000),
    scopus VARCHAR(1000),
    vidwan VARCHAR(1000),
    orcid VARCHAR(1000),
    is_retired BOOLEAN DEFAULT FALSE,
    retirement_date DATE
);`).catch((e) => console.log(e));

// Web Team Table
await query(`CREATE TABLE IF NOT EXISTS webteam (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    desg VARCHAR(1000),
    image VARCHAR(1000),
    interests VARCHAR(1000),
    url VARCHAR(1000),
    email VARCHAR(100),
    year INT,
    role VARCHAR(100)
);`).catch((e) => console.log(e));

// Students Directory Table
await query(`CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(50) NOT NULL,
    course VARCHAR(100) NOT NULL,
    email VARCHAR(255) NULL,
    specialization VARCHAR(150) NULL,
    enrollment_no VARCHAR(50) NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_students_dept_course (department, course),
    INDEX idx_students_roll_no (roll_no),
    INDEX idx_students_name (name)
);`).catch((e) => console.log(e));

    console.log('migration ran successfully')
}

migrate().then(() => process.exit())


// -- 11. Honours and Awards
// CREATE TABLE honours_awards (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     email VARCHAR(255) NOT NULL,
//     honour_award VARCHAR(500) NOT NULL,
//     start_date DATE NOT NULL,
//     end_date DATE
// );

// -- 14. Special Lectures
// CREATE TABLE special_lectures (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     email VARCHAR(255) NOT NULL,
//     topic VARCHAR(500) NOT NULL,
//     institute_name VARCHAR(500) NOT NULL,
//     start_date DATE NOT NULL,
//     end_date DATE,
//     financed_by VARCHAR(255)
// );

// -- 15. Visits Abroad
// CREATE TABLE visits_abroad (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     email VARCHAR(255) NOT NULL,
//     country VARCHAR(255) NOT NULL,
//     start_date DATE NOT NULL,  -- Date of leaving India
//     end_date DATE,             -- Date of returning India
//     purpose VARCHAR(500),
//     funded_by VARCHAR(255)
// );

// -- 17. Editorial Boards of Journals
// CREATE TABLE editorial_boards (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     email VARCHAR(255) NOT NULL,
//     position VARCHAR(255) NOT NULL, -- Editor/Member
//     journal_name VARCHAR(500) NOT NULL,
//     start_date DATE NOT NULL,
//     end_date DATE
// );

// -- 20. MOOC/NPTEL Courses
// CREATE TABLE mooc_courses (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     email VARCHAR(255) NOT NULL,
//     course_code VARCHAR(100) NOT NULL,
//     course_name VARCHAR(500) NOT NULL,
//     start_date DATE NOT NULL,
//     end_date DATE,
//     status ENUM('Completed','Floated') NOT NULL
// );
