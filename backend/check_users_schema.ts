import pool from './config/db.js';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

const checkSchema = async () => {
    try {
        const [rows] = await pool.query('DESCRIBE users');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
};

checkSchema();
