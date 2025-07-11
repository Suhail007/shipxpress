import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Format: postgresql://username:password@hostname:5432/database",
  );
}

// Create PostgreSQL connection
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

// Test connection on startup
sql`SELECT 1`
  .then(() => {
    console.log('✅ PostgreSQL connection established successfully');
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    console.log('📝 Please check your DATABASE_URL and ensure PostgreSQL server is running');
  });