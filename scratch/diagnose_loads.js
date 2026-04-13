import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend/.env
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function diagnose() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });

    try {
        console.log('--- 1. ACTIVE TERM CHECK ---');
        const [terms] = await connection.query('SELECT id, name FROM terms WHERE is_active = 1');
        console.log('Active Term:', terms);
        const termId = terms[0]?.id;

        if (!termId) {
            console.log('No active term found!');
            return;
        }

        console.log('\n--- 2. ALL LOADS STATUS (Active Term) ---');
        const [allLoads] = await connection.query(`
            SELECT status, COUNT(*) as count 
            FROM teaching_loads 
            WHERE term_id = ? 
            GROUP BY status
        `, [termId]);
        console.table(allLoads);

        console.log('\n--- 3. LOADS BY PROGRAM (Including Missing Joins) ---');
        const [progAudit] = await connection.query(`
            SELECT 
                p.code as program_code,
                tl.status,
                COUNT(tl.id) as total_loads,
                COUNT(sec.id) as has_section,
                COUNT(p.id) as has_program
            FROM teaching_loads tl
            LEFT JOIN sections sec ON tl.section_id = sec.id
            LEFT JOIN programs p ON sec.program_id = p.id
            WHERE tl.term_id = ?
            GROUP BY p.code, tl.status
        `, [termId]);
        console.table(progAudit);

        console.log('\n--- 4. DATA GAP DETECTION ---');
        const [orphans] = await connection.query(`
            SELECT COUNT(*) as count
            FROM teaching_loads tl
            WHERE tl.term_id = ?
            AND (tl.status = 'approved' OR tl.status = 'Approved')
            AND (tl.section_id IS NULL OR tl.section_id NOT IN (SELECT id FROM sections))
        `, [termId]);
        console.log('Approved loads with MISSING/INVALID sections:', orphans[0].count);

    } catch (err) {
        console.error('Diagnosis Error:', err);
    } finally {
        await connection.end();
    }
}

diagnose();
