import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const diagnoseLogin = async () => {
    const testUsername = 'admin';
    const testPassword = 'admin123';

    try {
        console.log('🔍 --- STARTING LOGIN DIAGNOSIS ---');
        console.log(`📡 Target: ${process.env.DB_HOST}`);
        
        // 1. Check Table Structure
        console.log('\n1️⃣ Checking table schema...');
        const [columns] = await pool.query('SHOW COLUMNS FROM users');
        const colNames = columns.map(c => c.Field);
        console.log('✅ Columns found:', colNames.join(', '));
        
        const requiredCols = ['username', 'password_hash', 'role', 'email'];
        const missing = requiredCols.filter(c => !colNames.includes(c));
        if (missing.length > 0) {
            console.error('❌ CRITICAL: Missing columns in users table:', missing);
        }

        // 2. Check User Record
        console.log(`\n2️⃣ Searching for user "${testUsername}"...`);
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [testUsername]);
        
        if (rows.length === 0) {
            console.error(`❌ FAILURE: User "${testUsername}" not found in database.`);
            const [allUsers] = await pool.query('SELECT username FROM users LIMIT 10');
            console.log('ℹ️ Existing usernames:', allUsers.map(u => u.username));
            return;
        }

        const user = rows[0];
        console.log('✅ User found!');
        console.log('ℹ️ Role:', user.role);
        console.log('ℹ️ Email:', user.email);
        console.log('ℹ️ Password Hash Prefix:', user.password_hash.substring(0, 10) + '...');

        // 3. Verify Bcrypt Logic
        console.log('\n3️⃣ Testing credential synchronization...');
        const isMatch = await bcrypt.compare(testPassword, user.password_hash);
        
        if (isMatch) {
            console.log('✅ SUCCESS: Credentials match! The system identity is correctly synchronized.');
            console.log('💡 TIP: If login still fails in the browser, check CORS, SSL, or Vercel Build state.');
        } else {
            console.error('❌ FAILURE: Password mismatch. The provided key does not match the stored hash.');
            
            // Auto-fix attempt? No, just report.
            console.log('\n🔧 Recalculating hash for test...');
            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash(testPassword, salt);
            console.log('ℹ️ Sample Hash for "admin123":', newHash);
        }

    } catch (err) {
        console.error('\n💥 CRITICAL DIAGNOSTIC ERROR:', err.message);
    } finally {
        process.exit();
    }
};

diagnoseLogin();
