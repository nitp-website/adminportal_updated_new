import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from '@/lib/authOptions'
import { query } from "@/lib/db";


export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { type, email, id, start_date, end_date } = body;
    const validEndDate = end_date === "continue" ? null : end_date;

    let sql, params, action, returnedId;

    switch (type) {
      case "honours_awards": {
        const exists = id
          ? await query("SELECT id FROM honours_awards WHERE id=?", [id])
          : [];

        if (id && exists.length > 0) {
          sql = `UPDATE honours_awards SET honour_award=?, start_date=?, end_date=? WHERE id=?`;
          params = [body.honour_award, start_date, validEndDate, id];
          action = "Updated";
          returnedId = id;
        } else {
          sql = `INSERT INTO honours_awards (email, honour_award, start_date, end_date) VALUES (?, ?, ?, ?)`;
          params = [email, body.honour_award, start_date, validEndDate];
          action = "Inserted";
        }
        break;
      }

      case "special_lectures": {
        const exists = id
          ? await query("SELECT id FROM special_lectures WHERE id=?", [id])
          : [];

        if (id && exists.length > 0) {
          sql = `UPDATE special_lectures SET topic=?, institute_name=?, start_date=?, end_date=?, financed_by=? WHERE id=?`;
          params = [body.topic, body.institute_name, start_date, validEndDate, body.financed_by, id];
          action = "Updated";
          returnedId = id;
        } else {
          sql = `INSERT INTO special_lectures (email, topic, institute_name, start_date, end_date, financed_by) VALUES (?, ?, ?, ?, ?, ?)`;
          params = [email, body.topic, body.institute_name, start_date, validEndDate, body.financed_by];
          action = "Inserted";
        }
        break;
      }

      case "visits_abroad": {
        const exists = id
          ? await query("SELECT id FROM visits_abroad WHERE id=?", [id])
          : [];

        if (id && exists.length > 0) {
          sql = `UPDATE visits_abroad SET country=?, start_date=?, end_date=?, purpose=?, funded_by=? , institute_name = ? WHERE id=?`;
          params = [body.country, start_date, validEndDate, body.purpose, body.funded_by,body.institute_name ,id];
          action = "Updated";
          returnedId = id;
        } else {
          sql = `INSERT INTO visits_abroad (email, country, start_date, end_date, purpose, funded_by,institute_name) VALUES (?, ?, ?, ?, ?, ? , ?)`;
          params = [email, body.country, start_date, validEndDate, body.purpose, body.funded_by,body.institute_name];
          action = "Inserted";
        }
        break;
      }

      case "editorial_boards": {
        const exists = id
          ? await query("SELECT id FROM editorial_boards WHERE id=?", [id])
          : [];

        if (id && exists.length > 0) {
          sql = `UPDATE editorial_boards SET position=?, journal_name=?, start_date=?, end_date=? WHERE id=?`;
          params = [body.position, body.journal_name, start_date, validEndDate, id];
          action = "Updated";
          returnedId = id;
        } else {
          sql = `INSERT INTO editorial_boards (email, position, journal_name, start_date, end_date) VALUES (?, ?, ?, ?, ?)`;
          params = [email, body.position, body.journal_name, start_date, validEndDate];
          action = "Inserted";
        }
        break;
      }

      case "mooc_courses": {
        const exists = id
          ? await query("SELECT id FROM mooc_courses WHERE id=?", [id])
          : [];

        if (id && exists.length > 0) {
          sql = `UPDATE mooc_courses SET course_code=?, course_name=?, start_date=?, end_date=?, status=? WHERE id=?`;
          params = [body.course_code, body.course_name, start_date, validEndDate, body.status, id];
          action = "Updated";
          returnedId = id;
        } else {
          sql = `INSERT INTO mooc_courses (email, course_code, course_name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)`;
          params = [email, body.course_code, body.course_name, start_date, validEndDate, body.status];
          action = "Inserted";
        }
        break;
      }

      default:
        return NextResponse.json({ message: "Invalid type" }, { status: 400 });
    }

    const result = await query(sql, params);

    // Set the returnedId if it was an insert
    if (!returnedId) returnedId = result.insertId;

    return NextResponse.json(
      { message: `${action} successfully`, id: returnedId, result },
      { status: 200 }
    );
  } catch (error) {
    console.error("DB Error:", error);
    return NextResponse.json({ message: "Database error", error: error.message }, { status: 500 });
  }
}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const type = searchParams.get("type");

    if (!email || !type) {
      return NextResponse.json({ message: "Email and type required" }, { status: 400 });
    }

    let table;
    switch (type) {
      case "honours_awards": table = "honours_awards"; break;
      case "special_lectures": table = "special_lectures"; break;
      case "visits_abroad": table = "visits_abroad"; break;
      case "editorial_boards": table = "editorial_boards"; break;
      case "mooc_courses": table = "mooc_courses"; break;
      default: return NextResponse.json({ message: "Invalid type" }, { status: 400 });
    }

    const result = await query(`SELECT * FROM ${table} WHERE email = ?`, [email]);
    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ message: "Internal Server Error", error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json({ message: "ID and type required" }, { status: 400 });
    }

    let table;
    switch (type) {
      case "honours_awards": table = "honours_awards"; break;
      case "special_lectures": table = "special_lectures"; break;
      case "visits_abroad": table = "visits_abroad"; break;
      case "editorial_boards": table = "editorial_boards"; break;
      case "mooc_courses": table = "mooc_courses"; break;
      default: return NextResponse.json({ message: "Invalid type" }, { status: 400 });
    }

    const result = await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ message: "Error deleting record", error: error.message }, { status: 500 });
  }
}
