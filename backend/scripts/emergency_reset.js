import pool from '../config/db.js';
import bcrypt from 'bcryptjs';

const emergencyReset = async () => {
    try {
        console.log('📡 Establishing secure connection to Aiven Cloud Matrix...');
        
        const newPassword = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        
        console.log('⚡ Recalibrating Admin access key...');
        
        // Update both password and ensure role is admin
        const [result] = await pool.execute(
            "UPDATE users SET password_hash = ?, role = 'admin' WHERE username = 'admin'",
            [hash]
        );
        
        if (result.affectedRows === 0) {
            console.log('❌ Error: Identity "admin" not found in the matrix.');
        } else {
            console.log('✅ Success: Admin credentials have been synchronized.');
            console.log('🔑 New Password: admin123');
        }
        
    } catch (err) {
        console.error('❌ Critical failure during emergency reset:', err.message);
    } finally {
        process.exit();
    }
};

emergencyReset();
