import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend/.env
dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function migrate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });

    try {
        console.log('--- BSA SECTION ID MIGRATION ---');
        
        // 1. Get original data for Section 1
        const [original] = await connection.query('SELECT * FROM sections WHERE id = 1');
        const sec1 = original[0];
        
        if (!sec1 || sec1.name !== 'B1') {
             console.log('Safety Stop: Section ID 1 does not appear to be the BSA-1B1 record. Skipping migration.');
             return;
        }

        // 2. Create NEW section for BSA-1B1 (cloning ID 1)
        const [newSecResult] = await connection.query(`
            INSERT INTO sections (name, year_level, program_id, campus_id, is_archived)
            VALUES (?, ?, ?, ?, ?)
        `, [sec1.name, sec1.year_level, sec1.program_id, sec1.campus_id, sec1.is_archived]);
        
        const newId = newSecResult.insertId;
        console.log(`Step 1: Created NEW Section for BSA-1B1 with ID: ${newId}`);

        // 3. Update all teaching loads to point to the new ID
        const [updateResult] = await connection.query(`
            UPDATE teaching_loads SET section_id = ? WHERE section_id = 1
        `, [newId]);
        console.log(`Step 2: Migrated ${updateResult.affectedRows} workload records to the new Section ID.`);

        // 4. Transform Section 1 into the "General Education" placeholder it's intended to be
        // We find a program named 'GEN-ED' or leave it as is but rename it.
        const [genEdResult] = await connection.query(`
            UPDATE sections 
            SET name = 'General Education', 
                year_level = 0, 
                program_id = NULL 
            WHERE id = 1
        `);
        console.log(`Step 3: Repurposed Section ID 1 as a dedicated General Education placeholder.`);

        console.log('--- MIGRATION SUCCESSFUL ---');

    } catch (err) {
        console.error('Migration Error:', err);
    } finally {
        await connection.end();
    }
}

migrate();
