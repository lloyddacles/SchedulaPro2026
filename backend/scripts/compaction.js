import pool from '../config/db.js';

/**
 * Audit Compaction & Archival Strategy
 * 
 * Objectives:
 * 1. Ensure primary 'audit_logs' table remains lean for high-performance dashboard queries.
 * 2. Maintain 6 months of hot data for active forensics.
 * 3. Preserve older data in 'audit_logs_archive' for long-term institutional compliance.
 */
const compactAuditLogs = async () => {
    try {
        console.log('📦 Initializing Institutional Audit Archival Pipeline...');

        // 1. Ensure Archive Table Exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs_archive LIKE audit_logs
        `);

        // 2. Identify Archival Threshold (6 Months)
        const threshold = new Date();
        threshold.setMonth(threshold.getMonth() - 6);
        const thresholdStr = threshold.toISOString().slice(0, 19).replace('T', ' ');

        console.log(`🔍 Identifying logs older than ${thresholdStr}...`);

        // 3. Count candidates
        const [countRow] = await pool.query(
            'SELECT COUNT(*) as olderCount FROM audit_logs WHERE created_at < ?',
            [thresholdStr]
        );
        const count = countRow[0].olderCount;

        if (count === 0) {
            console.log('✅ No historical logs require archival at this time.');
            return;
        }

        console.log(`📤 Archiving ${count} traces to long-term storage...`);

        // 4. Atomic Transfer (as close to atomic as MySQL allows for bulk moves)
        // We copy then delete to ensure no trace is lost if a crash occurs mid-process.
        await pool.query(`
            INSERT INTO audit_logs_archive 
            SELECT * FROM audit_logs 
            WHERE created_at < ?
        `, [thresholdStr]);

        await pool.query(`
            DELETE FROM audit_logs 
            WHERE created_at < ?
        `, [thresholdStr]);

        console.log(`✨ Successfully archived ${count} audit traces. Primary table compacted.`);

    } catch (err) {
        console.error('❌ Critical failure during audit compaction:', err.message);
    } finally {
        process.exit();
    }
};

compactAuditLogs();
