import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { administrationList, depList } from "@/lib/const";

const ALLOWED_SORT_FIELDS = ['updatedAt', 'openDate', 'department'];

const buildOrderByClause = (sortBy, sortOrder, defaultField = 'openDate') => {
  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : defaultField;
  const orderDirection = String(sortOrder || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  if (orderField === 'department') {
    return `ORDER BY (CASE WHEN department IS NULL OR department = '' THEN 1 ELSE 0 END), department ${orderDirection}, openDate DESC`;
  }
  return `ORDER BY ${orderField} ${orderDirection}, openDate DESC`;
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type")?.trim();
    const rawNoticeSubType = searchParams.get("notice_sub_type")?.trim();
    const noticeSubType = rawNoticeSubType?.toUpperCase();
    const sortBy = searchParams.get("sortBy");
    const sortOrder = searchParams.get("sortOrder");
    const orderByClause = buildOrderByClause(sortBy, sortOrder, 'timestamp');
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 20);
    const offset = (page - 1) * limit;
    const now = new Date().getTime();

    let results;
    let total = 0;

    switch (type) {
      case "all":
        if (noticeSubType) {
          const countRes = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_sub_type = ?`, [noticeSubType]);
          total = Number(countRes[0].count);
          results = await query(`SELECT * FROM notices WHERE notice_sub_type = ? ${orderByClause} LIMIT ${limit} OFFSET ${offset}`, [noticeSubType]);
        } else {
          const countRes = await query(`SELECT COUNT(*) as count FROM notices`);
          total = Number(countRes[0].count);
          results = await query(`SELECT * FROM notices ${orderByClause} LIMIT ${limit} OFFSET ${offset}`);
        }
        break;

      case "tender":
        if (noticeSubType) {
          const countRes = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type='tender' AND notice_sub_type = ?`, [noticeSubType]);
          total = Number(countRes[0].count);
          results = await query(`SELECT * FROM notices WHERE notice_type='tender' AND notice_sub_type = ? ${orderByClause} LIMIT ${limit} OFFSET ${offset}`, [noticeSubType]);
        } else {
          const countRes = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type='tender'`);
          total = Number(countRes[0].count);
          results = await query(`SELECT * FROM notices WHERE notice_type='tender' ${orderByClause} LIMIT ${limit} OFFSET ${offset}`);
        }
        break;

      case "whole":
        const wholeCount = await query(`SELECT COUNT(*) as count FROM notices`);
        total = Number(wholeCount[0].count);
        results = await query(`SELECT * FROM notices ${orderByClause} LIMIT ${limit} OFFSET ${offset}`);
        break;

      case "active":
        const activeCount = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type = 'general' AND openDate < ? AND closeDate > ?`, [now, now]);
        total = Number(activeCount[0].count);
        results = await query(`SELECT * FROM notices WHERE notice_type = 'general' AND openDate < ? AND closeDate > ? ${orderByClause} LIMIT ${limit} OFFSET ${offset}`, [now, now]);
        break;

      case "academics":
        const acadCount = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type = 'academics'`);
        total = Number(acadCount[0].count);
        results = await query(`SELECT * FROM notices WHERE notice_type = 'academics' ${orderByClause} LIMIT ${limit} OFFSET ${offset}`);
        break;
      
      case "exam":
        const examCount = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type = 'exam'`);
        total = Number(examCount[0].count);
        results = await query(`SELECT * FROM notices WHERE notice_type = 'exam' ${orderByClause} LIMIT ${limit} OFFSET ${offset}`);
        break;
        
      case "facultystaffjob":
        const jobCount = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type = 'facultystaffjob'`);
        total = Number(jobCount[0].count);
        results = await query(`SELECT * FROM notices WHERE notice_type = 'facultystaffjob' ${orderByClause} LIMIT ${limit} OFFSET ${offset}`);
        break;

      case "admissions":
        if (rawNoticeSubType) {
          const countRes = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type = 'admissions' AND notice_sub_type = ? AND isVisible = 1`, [rawNoticeSubType]);
          total = Number(countRes[0].count);
          results = await query(`SELECT * FROM notices WHERE notice_type = 'admissions' AND notice_sub_type = ? AND isVisible = 1 ${orderByClause} LIMIT ${limit} OFFSET ${offset}`, [rawNoticeSubType]);
        } else {
          const countRes = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type = 'admissions' AND isVisible = 1`);
          total = Number(countRes[0].count);
          results = await query(`SELECT * FROM notices WHERE notice_type = 'admissions' AND isVisible = 1 ${orderByClause} LIMIT ${limit} OFFSET ${offset}`);
        }
        break;

      case "convocation":
        const convCount = await query(`SELECT COUNT(*) as count FROM notices WHERE LOWER(notice_type) = 'convocation'`);
        total = Number(convCount[0].count);
        results = await query(`SELECT * FROM notices WHERE LOWER(notice_type) = 'convocation' ${orderByClause} LIMIT ${limit} OFFSET ${offset}`);
        break;

      default:
        if (administrationList.has(type?.trim()?.toLowerCase())) {
          if (noticeSubType) {
            const countRes = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type = ? AND notice_sub_type = ?`, [administrationList.get(type?.trim()?.toLowerCase()), noticeSubType]);
            total = Number(countRes[0].count);
            results = await query(`SELECT * FROM notices WHERE notice_type = ? AND notice_sub_type = ? ${orderByClause} LIMIT ${limit} OFFSET ${offset}`, [administrationList.get(type?.trim()?.toLowerCase()), noticeSubType]);
          } else {
            const countRes = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type = ?`, [administrationList.get(type?.trim()?.toLowerCase())]);
            total = Number(countRes[0].count);
            results = await query(`SELECT * FROM notices WHERE notice_type = ? ${orderByClause} LIMIT ${limit} OFFSET ${offset}`, [administrationList.get(type?.trim()?.toLowerCase())]);
          }
        } else if (depList.has(type?.trim()?.toLowerCase())) {
          const countRes = await query(`SELECT COUNT(*) as count FROM notices WHERE notice_type = 'department' AND department = ?`, [depList.get(type?.trim()?.toLowerCase())]);
          total = Number(countRes[0].count);
          results = await query(`SELECT * FROM notices WHERE notice_type = 'department' AND department = ? ${orderByClause} LIMIT ${limit} OFFSET ${offset}`, [depList.get(type?.trim()?.toLowerCase())]);
        } else {
          return NextResponse.json({ message: "Invalid type parameter" }, { status: 400 });
        }
    }

    const notices = JSON.parse(JSON.stringify(results));
    notices.forEach((notice) => {
      if (notice.attachments) notice.attachments = JSON.parse(notice.attachments);
    });

    return NextResponse.json({
      page,
      limit,
      offset,
      total,
      totalPages: Math.ceil(total / limit),
      data: notices
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    let {
      type,
      start_date,
      end_date,
      department,
      notice_type,
      notice_types,
      from,
      to,
      keyword = "",
      sortBy,
      sortOrder,
    } = body;

    const orderByClause = buildOrderByClause(sortBy, sortOrder, 'openDate');

    // Ensure from and to are valid integers
    from = parseInt(from) || 0;
    to = parseInt(to) || 15;

    // Validate that from and to are valid
    if (from < 0) from = 0;
    if (to <= from) to = from + 15;

    let results;

    // 1. Multiple notice types specified (e.g. user has combined role + special permissions)
    if (notice_types && Array.isArray(notice_types) && notice_types.length > 0) {
      const limit = Math.max(1, Math.min(100, to - from));
      const offset = Math.max(0, from);
      const cleanTypes = notice_types.map((t) => String(t).trim().toLowerCase());
      const hasDept = cleanTypes.includes("department");
      const nonDeptTypes = cleanTypes.filter((t) => t !== "department");

      let sql = "";
      let params = [];

      if (hasDept && department) {
        if (nonDeptTypes.length > 0) {
          const placeholders = nonDeptTypes.map(() => "?").join(",");
          sql = `SELECT * FROM notices 
                 WHERE (LOWER(notice_type) IN (${placeholders}) OR (LOWER(notice_type) = 'department' AND department = ?))
                 ${orderByClause} 
                 LIMIT ${limit} OFFSET ${offset}`;
          params = [...nonDeptTypes, department];
        } else {
          sql = `SELECT * FROM notices 
                 WHERE LOWER(notice_type) = 'department' AND department = ?
                 ${orderByClause} 
                 LIMIT ${limit} OFFSET ${offset}`;
          params = [department];
        }
      } else {
        const placeholders = cleanTypes.map(() => "?").join(",");
        sql = `SELECT * FROM notices 
               WHERE LOWER(notice_type) IN (${placeholders})
               ${orderByClause} 
               LIMIT ${limit} OFFSET ${offset}`;
        params = cleanTypes;
      }

      results = await query(sql, params);
    }
    // 2. Single department notice with department filter (DEPT_ADMIN)
    else if (notice_type === "department" && department) {
      const limit = Math.max(1, Math.min(100, to - from));
      const offset = Math.max(0, from);
      results = await query(
        `SELECT * FROM notices 
         WHERE LOWER(notice_type) = 'department' AND department = ?
         ${orderByClause} 
         LIMIT ${limit} OFFSET ${offset}`,
        [department],
      );
    }
    // 3. Single notice type filter (academics, tender, exam, admissions, job, etc.)
    else if (notice_type && notice_type !== "general" && notice_type !== "all") {
      const limit = Math.max(1, Math.min(100, to - from));
      const offset = Math.max(0, from);
      results = await query(
        `SELECT * FROM notices 
         WHERE LOWER(notice_type) = ?
         ${orderByClause} 
         LIMIT ${limit} OFFSET ${offset}`,
        [String(notice_type).trim().toLowerCase()],
      );
    }
    // 4. Default / Search / Range queries
    else {
      switch (type) {
        case "range":
          const rangeLimit = Math.max(1, Math.min(100, to - from));
          const rangeOffset = Math.max(0, from);

          if (!notice_type) {
            results = await query(
              `SELECT * FROM notices 
               WHERE title LIKE ? 
               ${orderByClause} 
               LIMIT ${rangeLimit} OFFSET ${rangeOffset}`,
              [`%${keyword}%`],
            );
          } else if (notice_type !== "department") {
            results = await query(
              `SELECT * FROM notices 
               WHERE LOWER(notice_type) = ? 
               AND closeDate <= ? 
               AND openDate >= ? 
               AND title LIKE ? 
               ${orderByClause} 
               LIMIT ${rangeLimit} OFFSET ${rangeOffset}`,
              [notice_type.toLowerCase(), end_date, start_date, `%${keyword}%`],
            );
          } else {
            results = await query(
              `SELECT * FROM notices 
               WHERE closeDate <= ? 
               AND openDate >= ? 
               AND department = ? 
               AND title LIKE ? 
               ${orderByClause} 
               LIMIT ${rangeLimit} OFFSET ${rangeOffset}`,
              [end_date, start_date, department, `%${keyword}%`],
            );
          }
          break;

        case "between":
          const limit = Math.max(1, Math.min(100, to - from));
          const offset = Math.max(0, from);

          results = await query(
            `SELECT * FROM notices 
             ${orderByClause} 
             LIMIT ${limit} OFFSET ${offset}`,
          );
          break;

        default:
          return NextResponse.json(
            { message: "Invalid type parameter" },
            { status: 400 },
          );
      }
    }

    // Parse attachments JSON for each result
    const notices = JSON.parse(JSON.stringify(results));
    notices.forEach((notice) => {
      if (notice.attachments) {
        notice.attachments = JSON.parse(notice.attachments);
      }
    });

    return NextResponse.json(notices);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
