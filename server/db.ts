import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Format: mysql://username:password@hostname:3306/database",
  );
}

// Create MySQL connection pool
export const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
});

export const db = drizzle(pool, { schema, mode: 'default' });

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL connection established successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
    console.log('📝 Please check your DATABASE_URL and ensure MySQL server is running');
  });