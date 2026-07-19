import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { isValidDeptCode } from "@/lib/const";


// EDUCATION HELPERS (keyed by email)
async function syncEducation(email, education) {
  if (!email) return;

  await query("DELETE FROM education WHERE email = ?", [email]);

  if (Array.isArray(education) && education.length > 0) {
    const values = [];
    const placeholders = education
      .map((edu) => {
        values.push(
          email,
          edu.certification ?? null,
          edu.institution ?? null,
          edu.passing_year ?? null,
          edu.specialization ?? null,
        );
        return "(?, ?, ?, ?, ?)";
      })
      .join(", ");

    await query(
      `
      INSERT INTO education
        (email, certification, institution, passing_year, specialization)
      VALUES ${placeholders}
      `,
      values,
    );
  }
}

async function getEducationByEmail(email) {
  if (!email) return [];
  return query(
    `
    SELECT id, certification, institution, passing_year, specialization
    FROM education
    WHERE email = ?
    ORDER BY passing_year DESC
    `,
    [email],
  );
}


// WORK EXPERIENCE HELPERS (keyed by email)
// (id column is a varchar PK, not auto-increment, so we generate one per row)

async function syncWorkExperience(email, workExperience) {
  if (!email) return;

  await query("DELETE FROM work_experience WHERE email = ?", [email]);

  if (Array.isArray(workExperience) && workExperience.length > 0) {
    const values = [];
    const placeholders = workExperience
      .map((we) => {
        values.push(
          randomUUID(),
          email,
          we.work_experiences ?? null,
          we.institute ?? null,
          we.start_date ?? null,
          we.end_date ?? null,
        );
        return "(?, ?, ?, ?, ?, ?)";
      })
      .join(", ");

    await query(
      `
      INSERT INTO work_experience
        (id, email, work_experiences, institute, start_date, end_date)
      VALUES ${placeholders}
      `,
      values,
    );
  }
}

async function getWorkExperienceByEmail(email) {
  if (!email) return [];
  return query(
    `
    SELECT id, work_experiences, institute, start_date, end_date
    FROM work_experience
    WHERE email = ?
    ORDER BY start_date DESC
    `,
    [email],
  );
}

// LABS HELPERS (keyed by staff_id, has a real FK back to staff)
async function syncLabs(staffId, labs) {
  if (!staffId) return;

  await query("DELETE FROM labs WHERE staff_id = ?", [staffId]);

  if (Array.isArray(labs) && labs.length > 0) {
    const values = [];
    const placeholders = labs
      .map((lab) => {
        values.push(
          staffId,
          lab.lab_name ?? null,
          lab.course_code ?? null,
          lab.level ?? null,
          lab.start_date ?? null,
          lab.end_date ?? null,
          lab.batch ?? null,
          lab.semester ?? null,
          lab.no_of_students ?? null,
        );
        return "(?, ?, ?, ?, ?, ?, ?, ?, ?)";
      })
      .join(", ");

    await query(
      `
      INSERT INTO labs
        (staff_id, lab_name, course_code, level, start_date, end_date, batch, semester, no_of_students)
      VALUES ${placeholders}
      `,
      values,
    );
  }
}

async function getLabsByStaffId(staffId) {
  if (!staffId) return [];
  return query(
    `
    SELECT id, lab_name, course_code, level, start_date, end_date, batch, semester, no_of_students
    FROM labs
    WHERE staff_id = ?
    ORDER BY start_date DESC
    `,
    [staffId],
  );
}

// Fetch all related record sets for a single staff row in parallel
async function getRelatedRecords(email, staffId) {
  const [education, work_experience, labs] = await Promise.all([
    getEducationByEmail(email),
    getWorkExperienceByEmail(email),
    getLabsByStaffId(staffId),
  ]);
  return { education, work_experience, labs };
}

const STAFF_SELECT = `
  SELECT
    s.*,
    u.name,
    u.email,
    u.image,
    u.cv,
    u.gender,
    u.category,
    u.research_interest,
    u.ext_no AS mobile_number
  FROM staff s
  INNER JOIN user u
    ON s.user_id = u.id
`;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
    const limit = Math.min(50, parseInt(searchParams.get("limit")) || 20);
    const offset = (page - 1) * limit;

    const user_id = searchParams.get("user_id");
    const employee_code = searchParams.get("employee_code");

    // Search Filters
    const name = searchParams.get("name") || "";
    const department = searchParams.get("department") || "";

    // GET SINGLE STAFF BY USER ID
    if (user_id) {
      const result = await query(`${STAFF_SELECT} WHERE s.user_id = ?`, [
        user_id,
      ]);

      if (result.length === 0) {
        return NextResponse.json(
          { message: "Staff not found" },
          { status: 404 },
        );
      }

      const related = await getRelatedRecords(result[0].email, result[0].id);

      return NextResponse.json({ ...result[0], ...related }, { status: 200 });
    }

    const email = searchParams.get("email");

    // GET SINGLE STAFF BY EMAIL
    if (email) {
      const result = await query(`${STAFF_SELECT} WHERE u.email = ?`, [
        email,
      ]);

      if (result.length === 0) {
        return NextResponse.json(
          { message: "Staff not found" },
          { status: 404 },
        );
      }

      const related = await getRelatedRecords(result[0].email, result[0].id);

      return NextResponse.json({ ...result[0], ...related }, { status: 200 });
    }

    // GET SINGLE STAFF BY EMPLOYEE CODE
    if (employee_code) {
      const result = await query(
        `${STAFF_SELECT} WHERE s.employee_code = ?`,
        [employee_code],
      );

      if (result.length === 0) {
        return NextResponse.json(
          { message: "Staff not found" },
          { status: 404 },
        );
      }

      const related = await getRelatedRecords(result[0].email, result[0].id);

      return NextResponse.json({ ...result[0], ...related }, { status: 200 });
    }

    // COUNT
    const deptCode = department.toLowerCase();
    const countResult = await query(
      `
      SELECT COUNT(*) AS count
      FROM staff s
      INNER JOIN user u
        ON s.user_id = u.id
      WHERE
        u.is_deleted = 0
        AND u.name LIKE ?
        AND (? = '' OR s.department = ?)
      `,
      [`%${name}%`, deptCode, deptCode],
    );

    const total = Number(countResult[0].count);

    // GET ALL STAFF
    const data = await query(
      `
      ${STAFF_SELECT}
      WHERE
        u.is_deleted = 0
        AND u.name LIKE ?
        AND (? = '' OR s.department = ?)
      ORDER BY u.name ASC
      LIMIT ${limit} OFFSET ${offset}
      `,
      [`%${name}%`, deptCode, deptCode],
    );

    const emails = [...new Set(data.map((row) => row.email).filter(Boolean))];
    const staffIds = [...new Set(data.map((row) => row.id).filter(Boolean))];

    let educationByEmail = {};
    let workExperienceByEmail = {};
    let labsByStaffId = {};

    if (emails.length > 0) {
      const emailPlaceholders = emails.map(() => "?").join(", ");

      const [educationRows, workExperienceRows] = await Promise.all([
        query(
          `
          SELECT id, email, certification, institution, passing_year, specialization
          FROM education
          WHERE email IN (${emailPlaceholders})
          ORDER BY passing_year DESC
          `,
          emails,
        ),
        query(
          `
          SELECT id, email, work_experiences, institute, start_date, end_date
          FROM work_experience
          WHERE email IN (${emailPlaceholders})
          ORDER BY start_date DESC
          `,
          emails,
        ),
      ]);

      educationByEmail = educationRows.reduce((acc, row) => {
        acc[row.email] = acc[row.email] || [];
        acc[row.email].push(row);
        return acc;
      }, {});

      workExperienceByEmail = workExperienceRows.reduce((acc, row) => {
        acc[row.email] = acc[row.email] || [];
        acc[row.email].push(row);
        return acc;
      }, {});
    }

    if (staffIds.length > 0) {
      const staffPlaceholders = staffIds.map(() => "?").join(", ");

      const labsRows = await query(
        `
        SELECT id, staff_id, lab_name,course_code, level, start_date, end_date, batch, semester, no_of_students
        FROM labs
        WHERE staff_id IN (${staffPlaceholders})
        ORDER BY start_date DESC
        `,
        staffIds,
      );

      labsByStaffId = labsRows.reduce((acc, row) => {
        acc[row.staff_id] = acc[row.staff_id] || [];
        acc[row.staff_id].push(row);
        return acc;
      }, {});
    }

    const dataWithRelated = data.map((row) => ({
      ...row,
      education: educationByEmail[row.email] || [],
      work_experience: workExperienceByEmail[row.email] || [],
      labs: labsByStaffId[row.id] || [],
    }));

    return NextResponse.json({
      page,
      limit,
      offset,
      total,
      totalPages: Math.ceil(total / limit),
      data: dataWithRelated,
    });
  } catch (error) {
    console.error("Staff API Error:", error);

    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const {
      id, // staff.id (present only when updating)
      user_id, // present only when updating an existing user
      name,
      email,
      gender,
      category,
      research_interest,
      role,
      employee_code,
      date_of_joining,
      date_of_birth,
      cadre,
      department,
      designation,
      pay_level,
      current_address,
      permanent_address,
      education,
      work_experience,
      labs,
    } = body;

    const staffExists = id
      ? await query("SELECT id, user_id FROM staff WHERE id = ?", [id])
      : [];

    let action;
    let returnedId = id;
    let resolvedUserId = user_id;

    if (id && staffExists.length > 0) {
      // UPDATE existing staff + user
      resolvedUserId = staffExists[0].user_id;

      await query(
        `
        UPDATE staff
        SET
          employee_code=?,
          date_of_joining=?,
          date_of_birth=?,
          cadre=?,
          department=?,
          designation=?,
          pay_level=?,
          current_address=?,
          permanent_address=?
        WHERE id=?
        `,
        [
          employee_code ?? null,
          date_of_joining ?? null,
          date_of_birth ?? null,
          cadre ?? null,
          department ?? null,
          designation ?? null,
          pay_level ?? null,
          JSON.stringify(current_address ?? null),
          JSON.stringify(permanent_address ?? null),
          id,
        ],
      );

      if (
        name !== undefined ||
        email !== undefined ||
        gender !== undefined ||
        category !== undefined ||
        research_interest !== undefined
      ) {
        await query(
          `
          UPDATE user
          SET
            name = COALESCE(?, name),
            email = COALESCE(?, email),
            gender = COALESCE(?, gender),
            category = COALESCE(?, category),
            research_interest = COALESCE(?, research_interest)
          WHERE id = ?
          `,
          [
            name ?? null,
            email ?? null,
            gender ?? null,
            category ?? null,
            research_interest ?? null,
            resolvedUserId,
          ],
        );
      }

      action = "Updated";
    } else {
      // CREATE new user, then staff
      if (!name || !email) {
        return NextResponse.json(
          {
            message: "Name and email are required to create a new staff member",
          },
          { status: 400 },
        );
      }

      if (department && !isValidDeptCode(department)) {
        return NextResponse.json(
          { message: `Unknown department code: ${department}` },
          { status: 400 },
        );
      }
      const userResult = await query(
        `
        INSERT INTO user (name, email, gender, category, research_interest, is_deleted, role)
        VALUES (?, ?, ?, ?, ?, 0, ?)
        `,
        [name, email, gender ?? null, category ?? null, research_interest ?? null, 5],
      );

      resolvedUserId = userResult.insertId;

      try {
        const staffResult = await query(
          `
          INSERT INTO staff (
            user_id,
            employee_code,
            date_of_joining,
            date_of_birth,
            cadre,
            department,
            designation,
            pay_level,
            current_address,
            permanent_address
          )
          VALUES (?,?,?,?,?,?,?,?,?,?)
          `,
          [
            resolvedUserId,
            employee_code ?? null,
            date_of_joining ?? null,
            date_of_birth ?? null,
            cadre ?? null,
            department ? department.toLowerCase() : null,
            designation ?? null,
            pay_level ?? null,
            JSON.stringify(current_address ?? null),
            JSON.stringify(permanent_address ?? null),
          ],
        );

        returnedId = staffResult.insertId;
      } catch (staffError) {
        // Roll back the user we just created so we don't leave an orphan
        await query("DELETE FROM user WHERE id = ?", [resolvedUserId]);
        throw staffError;
      }

      action = "Inserted";
    }

  
    // SYNC EDUCATION + WORK EXPERIENCE + LABS
   
    if (
      education !== undefined ||
      work_experience !== undefined ||
      labs !== undefined
    ) {
      const userRow = await query("SELECT email FROM user WHERE id = ?", [
        resolvedUserId,
      ]);
      const resolvedEmail = userRow[0]?.email;

      try {
        if (education !== undefined) {
          await syncEducation(resolvedEmail, education);
        }
        if (work_experience !== undefined) {
          await syncWorkExperience(resolvedEmail, work_experience);
        }
        if (labs !== undefined) {
          await syncLabs(returnedId, labs);
        }
      } catch (relatedError) {
        console.error("Related records sync error:", relatedError);

        return NextResponse.json(
          {
            message: `${action} staff, but failed to sync related records`,
            id: returnedId,
            user_id: resolvedUserId,
            error: relatedError.message,
          },
          { status: 207 },
        );
      }
    }

    return NextResponse.json(
      {
        message: `${action} successfully`,
        id: returnedId,
        user_id: resolvedUserId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Staff POST Error:", error);

    return NextResponse.json(
      {
        message: "Database Error",
        error: error.message,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Staff ID is required" },
        { status: 400 },
      );
    }

    const exists = await query(
      "SELECT id, user_id FROM staff WHERE id = ?",
      [id],
    );

    if (exists.length === 0) {
      return NextResponse.json({ message: "Staff not found" }, { status: 404 });
    }

const { user_id: userId } = exists[0];

// Get the user's email before deleting the user
const user = await query("SELECT email FROM user WHERE id = ?", [userId]);

const email = user[0]?.email;

// Delete education and work experience
if (email) {
  await query("DELETE FROM education WHERE email = ?", [email]);
  await query("DELETE FROM work_experience WHERE email = ?", [email]);
}

// Delete staff (labs will be deleted automatically via ON DELETE CASCADE)
await query("DELETE FROM staff WHERE id = ?", [id]);

// Delete user
if (userId) {
  await query("DELETE FROM user WHERE id = ?", [userId]);
}

    // NOTE: education and work_experience rows for this person's email are
    // intentionally left untouched, since they're keyed by email rather
    // than staff.id and other records may still reference that email
    // historically. Add a `?purge_related=true` flag here if you want
    // cascading deletes across both tables too.

    return NextResponse.json(
      { message: "Deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Staff DELETE Error:", error);

    return NextResponse.json(
      {
        message: "Database Error",
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const {
      user_id,
      employee_code,
      date_of_joining,
      date_of_birth,
      cadre,
      department,
      designation,
      pay_level,
      current_address,
      permanent_address,
      name,
      gender,
      category,
      research_interest,
      mobile_number,
      image,
      cv,
      education,
      work_experience,
      labs,
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { message: "user_id is required" },
        { status: 400 },
      );
    }

    // Check if staff exists, and grab staff.id + email in the same trip
    // (staff.id is needed as the FK for syncing labs)
    const exists = await query(
      `
      SELECT s.id, u.email
      FROM staff s
      INNER JOIN user u ON s.user_id = u.id
      WHERE s.user_id = ?
      `,
      [user_id],
    );

    if (exists.length === 0) {
      return NextResponse.json({ message: "Staff not found" }, { status: 404 });
    }

    const { id: staffId, email: resolvedEmail } = exists[0];

    // Update staff table
    await query(
      `
      UPDATE staff
      SET
        employee_code = ?,
        date_of_joining = ?,
        date_of_birth = ?,
        cadre = COALESCE(?, cadre),
        department = ?,
        designation = COALESCE(?, designation),
        pay_level = COALESCE(?, pay_level),
        current_address = ?,
        permanent_address = ?
      WHERE user_id = ?
      `,
      [
        employee_code ?? null,
        date_of_joining ?? null,
        date_of_birth ?? null,
        cadre ?? null,
        department ?? null,
        designation ?? null,
        pay_level ?? null,
        JSON.stringify(current_address ?? null),
        JSON.stringify(permanent_address ?? null),
        user_id,
      ],
    );

    // Update user table
    await query(
      `
      UPDATE user
      SET
        name = COALESCE(?, name),
        gender = ?,
        category = ?,
        research_interest = ?,
        ext_no = ?,
        image = ?,
        cv = ?
      WHERE id = ?
      `,
      [
        name ?? null,
        gender ?? null,
        category ?? null,
        research_interest ?? null,
        mobile_number ?? null,
        image ?? null,
        cv ?? null,
        user_id,
      ],
    );

    // SYNC EDUCATION + WORK EXPERIENCE + LABS
    if (education !== undefined) {
      await syncEducation(resolvedEmail, education);
    }
    if (work_experience !== undefined) {
      await syncWorkExperience(resolvedEmail, work_experience);
    }
    if (labs !== undefined) {
      await syncLabs(staffId, labs);
    }

    return NextResponse.json(
      {
        message: "Staff updated successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("PUT Staff Error:", error);

    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: error.message,
      },
      {
        status: 500,
      },
    );
  }
}
