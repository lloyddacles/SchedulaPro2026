import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const sslConfig = process.env.DB_SSL === 'true' 
  ? { rejectUnauthorized: false } 
  : undefined;

const getDbConfig = (): any => {
    const rawHost = (process.env.DB_HOST || 'localhost').trim();
    const hostParts = rawHost.split(':');

    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    return {
      host: hostParts[0],
      port: hostParts[1] ? Number(hostParts[1]) : Number(process.env.DB_PORT || 3306),
      user: (process.env.DB_USER || 'root').trim(),
      password: (process.env.DB_PASSWORD || '').trim(),
      database: (process.env.DB_NAME || 'faculty_scheduling').trim(),
      ssl: sslConfig,
      connectTimeout: 20000,
    };
};

const config = getDbConfig();
const pool = mysql.createPool(
  typeof config === 'string' 
    ? config 
    : {
        ...config,
        waitForConnections: true,
        connectionLimit: 25,
        queueLimit: 0
      }
);

export default pool;
