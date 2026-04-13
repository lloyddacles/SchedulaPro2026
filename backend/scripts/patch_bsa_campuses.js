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
        console.log('--- BSA PROGRAM ALIGNMENT PATCH ---');
        
        // 1. Audit before
        const [before] = await connection.query(`
            SELECT name, year_level, campus_id 
            FROM sections 
            WHERE program_id = (SELECT id FROM programs WHERE code = 'BSA' LIMIT 1)
        `);
        console.log('BSA sections before patch:', before);

        // 2. Unify all BSA sections to Campus 2 (Bay 2 Campus)
        const [result] = await connection.query(`
            UPDATE sections
            SET campus_id = 2
            WHERE program_id = (SELECT id FROM programs WHERE code = 'BSA' LIMIT 1)
        `);
        console.log(`Patch Complete: ${result.affectedRows} BSA sections unified on Bay 2 Campus (ID 2).`);

        // 3. Audit after
        const [after] = await connection.query(`
            SELECT name, year_level, campus_id 
            FROM sections 
            WHERE program_id = (SELECT id FROM programs WHERE code = 'BSA' LIMIT 1)
        `);
        console.log('BSA sections after patch (should all be ID 2):', after);

    } catch (err) {
        console.error('Patch Error:', err);
    } finally {
        await connection.end();
    }
}

patch();
