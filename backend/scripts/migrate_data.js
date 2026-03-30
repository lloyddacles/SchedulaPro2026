import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
    console.log('🚀 Starting Data Migration: LOCAL ➔ AIVEN');

    // 1. Establish Source Connection (Local)
    const sourcePool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'faculty_scheduling',
        port: Number(process.env.DB_PORT || 3306),
    });

    // 2. Establish Target Connection (Aiven Remote)
    const remoteHostRaw = (process.env.REMOTE_DB_HOST || '').trim();
    const remoteHostParts = remoteHostRaw.split(':');
    
    const targetPool = mysql.createPool({
        host: remoteHostParts[0],
        port: remoteHostParts[1] ? Number(remoteHostParts[1]) : Number(process.env.REMOTE_DB_PORT || 3306),
        user: (process.env.REMOTE_DB_USER || 'avnadmin').trim(),
        password: (process.env.REMOTE_DB_PASSWORD || '').trim(),
        database: (process.env.REMOTE_DB_NAME || 'defaultdb').trim(),
        ssl: { rejectUnauthorized: false },
        connectTimeout: 20000,
    });

    const tables = [
        'campuses',
        'programs',
        'terms',
        'subjects',
        'faculty',
        'sections',
        'rooms',
        'teaching_loads',
        'schedules',
        'users',
        'system_settings',
        'faculty_unavailability',
        'schedule_requests',
        'audit_logs'
    ];

    try {
        console.log('📡 Testing connections...');
        await sourcePool.query('SELECT 1');
        console.log('✅ Local connection OK');
        await targetPool.query('SELECT 1');
        console.log('✅ Aiven connection OK');

        // Disable Foreign Key Checks temporarily on target
        await targetPool.query('SET FOREIGN_KEY_CHECKS = 0');

        for (const table of tables) {
            console.log(`📦 Migrating table: ${table}...`);
            
            // Fetch rows from source
            const [rows] = await sourcePool.query(`SELECT * FROM \`${table}\``);
            
            if (rows.length === 0) {
                console.log(`⚠️  ${table} is empty, skipping data move.`);
                continue;
            }

            // Clear target table
            await targetPool.query(`DELETE FROM \`${table}\``);
            
            // Build bulk insert
            const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
            const placeholders = Object.keys(rows[0]).map(() => '?').join(', ');
            const values = rows.map(row => Object.values(row));

            await targetPool.query(
                `INSERT INTO \`${table}\` (${columns}) VALUES ?`,
                [values]
            );

            console.log(`✅ ${table} migrated (${rows.length} rows)`);
        }

        // Re-enable Foreign Key Checks
        await targetPool.query('SET FOREIGN_KEY_CHECKS = 1');
        
        console.log('🎉 MIGRATION COMPLETE! Your Aiven database is now a clone of your Local database.');

    } catch (error) {
        console.error('❌ Migration Failed:', error);
    } finally {
        await sourcePool.end();
        await targetPool.end();
    }
}

migrate();
