const pool = require('./config/db');

const migrateSettings = async () => {
    try {
        console.log('Initiating architectural systems expansion... Setting up White-Label relational stores.');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);
        console.log('Success: Recreated system_settings hierarchical array.');

        // Seeding isolated parameters via transactional injection
        const { rows } = await pool.query(`SELECT key FROM system_settings`);
        if (rows.length === 0) {
            await pool.query(`
                INSERT INTO system_settings (key, value) VALUES 
                ('app_name', 'FacultySync'),
                ('institution_name', 'Golden Minds Colleges'),
                ('logo_url', '')
            `);
            console.log('Successfully booted global default framework configurations.');
        } else {
            console.log('Existing parameter cache detected, skipping factory defaults.');
        }
        
    } catch (err) {
        console.error('Critical Failure building System Settings table:', err);
    } finally {
        process.exit();
    }
};

migrateSettings();
