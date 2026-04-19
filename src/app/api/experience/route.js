  import { NextResponse } from "next/server";
  import { getServerSession } from "next-auth";
  import { authOptions } from '@/lib/authOptions'
  import {query} from "@/lib/db";

  export async function POST(request) {
    try {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
      }

      const {
        email,
        work_experience, 
        work_experiences, 
        institute,
        start_date,
        end_date,
        id,
      } = await request.json();

      const designation = work_experience || work_experiences;
      const validEndDate = end_date === "continue" ? null : end_date;

      if (id) {
        const result = await query(
          `UPDATE work_experience 
          SET work_experiences = ?, institute = ?, start_date = ?, end_date = ? 
          WHERE id = ?`,
          [designation, institute, start_date, validEndDate, id.toString()]
        );

        if (result.affectedRows === 1) {
          return NextResponse.json({ message: "Successfully updated work experience" }, { status: 200 });
        }

        const insertResult = await query(
          `INSERT INTO work_experience (id, email, work_experiences, institute, start_date, end_date) 
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            email,
            designation,
            institute,
            start_date,
            validEndDate,
          ]
        );

        if (insertResult.affectedRows === 1) {
          return NextResponse.json({ message: "Work experience record created" }, { status: 201 });
        }

        return NextResponse.json({ message: "Failed to update or create experience" }, { status: 500 });
      }

      const result = await query(
        `INSERT INTO work_experience (id, email, work_experiences, institute, start_date, end_date) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          Date.now().toString(),
          email,
          designation,
          institute,
          start_date,
          validEndDate,
        ]
      );

      if (result.affectedRows === 1) {
        return NextResponse.json({ message: "Successfully saved work experience" }, { status: 200 });
      }

      return NextResponse.json({ message: "Failed to create experience" }, { status: 500 });
    } catch (error) {
      console.error("Database query error:", error);
      return NextResponse.json(
        { message: "Database query failed", error: error.message },
        { status: 500 }
      );
    }
  }

  export async function GET(request) {
    try {
      const { searchParams } = new URL(request.url);
      const email = searchParams.get("email");

      if (!email) {
        return NextResponse.json({ message: "Email is required" }, { status: 400 });
      }

      const result = await query(`SELECT * FROM work_experience WHERE email = ?`, [email]);

      if (result.length === 0) {
        return NextResponse.json({ message: "No work experience found" }, { status: 404 });
      }

      const workExperiences = result.map((exp) => ({
        id: exp.id,
        work_experiences: exp.work_experiences,
        institute: exp.institute,
        start_date: exp.start_date,
        end_date: exp.end_date === null ? "continue" : exp.end_date,
      }));

      return NextResponse.json({ workExperiences }, { status: 200 });
    } catch (error) {
      console.error("Error fetching data:", error);
      return NextResponse.json(
        { message: "Internal Server Error", error: error.message },
        { status: 500 }
      );
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

      if (!id) {
        return NextResponse.json({ message: "Experience ID is required" }, { status: 400 });
      }

      const result = await query(`DELETE FROM work_experience WHERE id = ?`, [id]);

      if (result.affectedRows === 0) {
        return NextResponse.json({ message: "Experience not found" }, { status: 404 });
      }

      return NextResponse.json({ message: "Experience deleted successfully" }, { status: 200 });
    } catch (error) {
      console.error("Error deleting data:", error);
      return NextResponse.json(
        { message: "Error deleting experience", error: error.message },
        { status: 500 }
      );
    }
  }
