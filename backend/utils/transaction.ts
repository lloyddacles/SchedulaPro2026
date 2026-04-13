import { PoolConnection } from 'mysql2/promise';
import pool from '../config/db.js';

/**
 * Executes a callback within a managed SQL transaction.
 * Automatically handles getConnection, beginTransaction, commit, rollback on error, and release.
 */
export async function withTransaction<T>(
  callback: (connection: PoolConnection) => Promise<T>
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
