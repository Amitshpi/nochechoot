const sqlite3 = require('sqlite3').verbose();
const DBSOURCE = 'db.sqlite';

const db = new sqlite3.Database(DBSOURCE, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

function initDb() {
  db.serialize(() => {
    // טבלת משתמשים עם תפקידים, פלוגה ומחלקה
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rank TEXT,
      role TEXT,
      platoon TEXT,
      company TEXT,
      phone TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // טבלת בקשות יציאה עם היסטוריה
    db.run(`CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      approved_by INTEGER,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(approved_by) REFERENCES users(id)
    )`);

    // טבלת היסטוריית שינויים
    db.run(`CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // טבלת תפקידים
    db.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT
    )`);

    // הוספת עמודות פלוגה ומחלקה אם הן לא קיימות
    db.run(`ALTER TABLE users ADD COLUMN platoon TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding platoon column:', err);
      }
    });
    db.run(`ALTER TABLE users ADD COLUMN company TEXT`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding company column:', err);
      }
    });
  });
}

module.exports = { db, initDb }; 