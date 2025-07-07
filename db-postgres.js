const { Pool } = require('pg');

// יצירת חיבור לבסיס נתונים PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// פונקציה ליצירת הטבלאות
async function initDb() {
  try {
    // יצירת טבלת משתמשים
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        rank VARCHAR(100),
        role VARCHAR(100),
        platoon VARCHAR(100),
        company VARCHAR(100),
        phone VARCHAR(20),
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // יצירת טבלת תפקידים
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        permissions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // יצירת טבלת בקשות יציאה
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // יצירת טבלת היסטוריית פעילות
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        action VARCHAR(50) NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id INTEGER,
        new_values TEXT,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
  }
}

// פונקציות עזר לשאילתות
const db = {
  // שאילתה אחת
  query: (text, params) => pool.query(text, params),
  
  // שאילתה שמחזירה שורה אחת
  get: async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows[0];
  },
  
  // שאילתה שמחזירה כל השורות
  all: async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows;
  },
  
  // שאילתה להכנסת נתונים
  run: async (text, params) => {
    const result = await pool.query(text, params);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  }
};

module.exports = { db, initDb, pool }; 