import pool from '../config/db.js';

const migrateResetFields = async () => {
    try {
        console.log('Initiating security framework expansion... Provisioning OTP and Recovery stores.');
        
        // Add email column
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN email VARCHAR(255) UNIQUE AFTER username,
            ADD COLUMN reset_otp VARCHAR(10) AFTER password_hash,
            ADD COLUMN reset_expires DATETIME AFTER reset_otp
        `);
        
        console.log('Success: User security baseline synchronized.');
        
    } catch (err) {
        console.error('Critical Failure during security migration:', err);
    } finally {
        process.exit();
    }
};

migrateResetFields();
