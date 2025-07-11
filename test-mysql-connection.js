// Test MySQL connection
const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    console.log('✅ MySQL connection successful!');
    
    // Test basic query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test query successful:', rows);
    
    // Check if tables exist
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Available tables:', tables.map(row => Object.values(row)[0]));
    
    await connection.end();
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    console.log('\n📝 Make sure to:');
    console.log('1. Set DATABASE_URL environment variable');
    console.log('2. Create MySQL database');
    console.log('3. Run setup-mysql.sql script');
    console.log('\nExample DATABASE_URL format:');
    console.log('mysql://username:password@hostname:3306/logistics');
  }
}

testConnection();