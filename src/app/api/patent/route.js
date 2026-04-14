import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { depList } from '@/lib/const';
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
        const limit = Math.min(50, parseInt(searchParams.get('limit')) || 20);
        const offset = (page - 1) * limit;

        let results = []
        let total = 0
        switch (type) {
            case 'all':
                const allCount = await query(
                `SELECT COUNT(*) as count FROM ipr WHERE type = "patent"`
                )
                total = Number(allCount[0].count)
                        
                results = await query(
                    `SELECT * FROM ipr WHERE type = "patent" ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`
                );
                return NextResponse.json({
                    page,
                    limit,
                    offset,
                    total,
                    totalPages : Math.ceil(total/limit),
                    data : results
                });

            case 'count':
                const patentCount = await query(
                    `SELECT COUNT(*) AS patentCount FROM ipr WHERE type = "patent"`
                );
                return NextResponse.json(patentCount[0]);

            default:
                if(depList.has(type)){
                const deptCount = await query(
                    `SELECT COUNT(*) as count
                    FROM ipr i
                    JOIN user u ON u.email = i.email
                    WHERE i.type = "patent"
                    AND u.department = ?
                    AND u.is_deleted = 0`,
                    [depList.get(type)]
                );
                total = Number(deptCount[0].count);
                    results = await query(
                        `SELECT i.*, u.name, u.department
                        FROM ipr i
                        JOIN user u ON u.email = i.email
                        WHERE i.type = "patent" 
                            AND u.department = ? 
                            AND u.is_deleted = 0
                        ORDER BY i.id DESC
                        LIMIT ${limit} OFFSET ${offset}`,
                        [depList.get(type)]
                        );
                    
                    return NextResponse.json({
                        page,
                        limit,
                        offset,
                        total,
                        totalPages : Math.ceil(total/limit),
                        data:results
                    });
                }else{
                    return NextResponse.json(
                        { message: 'Invalid type parameter' },
                        { status: 400 }
                    );
                }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        return NextResponse.json(
            { message: 'Failed to fetch data' },
            { status: 500 }
        );
    }
}
