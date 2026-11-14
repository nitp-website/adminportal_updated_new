import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(50, parseInt(searchParams.get('limit')) || 20);
    const offset = (page - 1) * limit;

    // Get total count
    const countRes = await query(`SELECT COUNT(*) as count FROM workshops_conferences`);
    const total = Number(countRes[0].count);

    // Fetch workshops with user details
    const results = await query(`
      SELECT 
        wc.*, 
        u.name as faculty_name, 
        u.department,
        u.image as faculty_image
      FROM workshops_conferences wc
      LEFT JOIN user u ON wc.email = u.email
      ORDER BY wc.start_date DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    return NextResponse.json({
      page,
      limit,
      offset,
      total,
      totalPages: Math.ceil(total / limit),
      data: results
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { message: error.message },
      { status: 500 }
    );
  }
}
