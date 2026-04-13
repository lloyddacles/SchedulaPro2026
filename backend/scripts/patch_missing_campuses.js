import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend/.env
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function patch() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });

    try {
        console.log('--- CAMPUS ALIGNMENT PATCH ---');
        
        // 1. Audit before
        const [before] = await connection.query(`
            SELECT p.code, COUNT(*) as count 
            FROM sections sec 
            JOIN programs p ON sec.program_id = p.id 
            WHERE sec.campus_id IS NULL AND p.code IN ('BSCRIM', 'BSTM', 'BSE')
            GROUP BY p.code
        `);
        console.log('Orphaned sections before patch:', before);

        // 2. Perform surgical patch to Main Campus (ID 1)
        const [result] = await connection.query(`
            UPDATE sections sec
            JOIN programs p ON sec.program_id = p.id
            SET sec.campus_id = 1
            WHERE sec.campus_id IS NULL AND p.code IN ('BSCRIM', 'BSTM', 'BSE')
        `);
        console.log(`Patch Complete: ${result.affectedRows} sections re-connected to Main Campus (ID 1).`);

        // 3. Audit after
        const [after] = await connection.query(`
            SELECT p.code, COUNT(*) as count 
            FROM sections sec 
            JOIN programs p ON sec.program_id = p.id 
            WHERE sec.campus_id IS NULL AND p.code IN ('BSCRIM', 'BSTM', 'BSE')
            GROUP BY p.code
        `);
        console.log('Orphaned sections after patch (should be empty):', after);

    } catch (err) {
        console.error('Patch Error:', err);
    } finally {
        await connection.end();
    }
}

patch();
