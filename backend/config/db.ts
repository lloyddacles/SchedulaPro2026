import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const sslConfig = process.env.DB_SSL === 'true' 
  ? { rejectUnauthorized: false } 
  : undefined;

const pool = mysql.createPool({
  host: (process.env.DB_HOST || 'localhost').trim(),
  user: (process.env.DB_USER || 'root').trim(),
  password: (process.env.DB_PASSWORD || '').trim(),
  database: (process.env.DB_NAME || 'faculty_scheduling').trim(),
  port: Number(process.env.DB_PORT) || 3306,
  ssl: sslConfig,
  connectTimeout: 20000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
