const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
// בחירת בסיס נתונים לפי סביבה
let db, initDb;
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
  // שימוש ב-PostgreSQL בפריסה
  console.log('Using PostgreSQL database in production');
  const postgresDb = require('./db-postgres');
  db = postgresDb.db;
  initDb = postgresDb.initDb;
} else {
  // שימוש ב-SQLite בפיתוח
  console.log('Using SQLite database in development');
  const sqliteDb = require('./db');
  db = sqliteDb.db;
  initDb = sqliteDb.initDb;
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from React build
app.use(express.static('client/build'));

// בדיקה שהשרת רץ
app.get('/', (req, res) => {
  res.send('Shmirot backend is running!');
});

// הוספת משתמש
app.post('/api/users', async (req, res) => {
  try {
    const { name, rank, role, platoon, company, phone, email } = req.body;
    const result = await db.run(
      'INSERT INTO users (name, rank, role, platoon, company, phone, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [name, rank, role, platoon, company, phone, email]
    );
    
    // רישום בהיסטוריה
    await db.run(
      'INSERT INTO activity_log (action, table_name, record_id, new_values, user_id) VALUES ($1, $2, $3, $4, $5)',
      ['CREATE', 'users', result.lastID, JSON.stringify({ name, rank, role, platoon, company, phone, email }), 1]
    );
    
    res.json({ id: result.lastID, name, rank, role, platoon, company, phone, email });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: error.message });
  }
});

// קבלת כל המשתמשים עם סינון
app.get('/api/users', async (req, res) => {
  try {
    const { role, platoon, company, search } = req.query;
    let query = 'SELECT * FROM users';
    let params = [];
    let conditions = [];
    let paramIndex = 1;
    
    if (role && role !== '') {
      conditions.push(`role = $${paramIndex++}`);
      params.push(role);
    }
    if (platoon && platoon !== '') {
      conditions.push(`platoon = $${paramIndex++}`);
      params.push(platoon);
    }
    if (company && company !== '') {
      conditions.push(`company = $${paramIndex++}`);
      params.push(company);
    }
    if (search && search !== '') {
      conditions.push(`(name ILIKE $${paramIndex++} OR rank ILIKE $${paramIndex++} OR role ILIKE $${paramIndex++} OR platoon ILIKE $${paramIndex++} OR company ILIKE $${paramIndex++})`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY name';
    
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// קבלת תפקידים
app.get('/api/roles', (req, res) => {
  db.all('SELECT * FROM roles ORDER BY name', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// קבלת פלוגות ייחודיות
app.get('/api/platoons', (req, res) => {
  db.all('SELECT DISTINCT platoon FROM users WHERE platoon IS NOT NULL AND platoon != "" ORDER BY platoon', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => row.platoon));
  });
});

// קבלת מחלקות ייחודיות
app.get('/api/companies', (req, res) => {
  db.all('SELECT DISTINCT company FROM users WHERE company IS NOT NULL AND company != "" ORDER BY company', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => row.company));
  });
});

// הוספת תפקיד חדש
app.post('/api/roles', (req, res) => {
  const { name, description, permissions } = req.body;
  db.run(
    'INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)',
    [name, description, permissions],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, description, permissions });
    }
  );
});

// עדכון תפקיד
app.put('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, permissions } = req.body;
  
  db.run(
    'UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?',
    [name, description, permissions, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// מחיקת תפקיד
app.delete('/api/roles/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM roles WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// עדכון משתמש
app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, rank, role, platoon, company, phone, email } = req.body;
  
  db.run(
    'UPDATE users SET name = ?, rank = ?, role = ?, platoon = ?, company = ?, phone = ?, email = ? WHERE id = ?',
    [name, rank, role, platoon, company, phone, email, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// מחיקת משתמש
app.delete('/api/users/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// הוספת בקשת יציאה
app.post('/api/requests', (req, res) => {
  const { user_id, start_date, end_date, reason } = req.body;
  db.run(
    'INSERT INTO requests (user_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
    [user_id, start_date, end_date, reason],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, user_id, start_date, end_date, reason, status: 'pending' });
    }
  );
});

// קבלת כל הבקשות עם סינון
app.get('/api/requests', (req, res) => {
  const { status, user_id, start_date, end_date } = req.query;
  let query = `
    SELECT requests.*, users.name, users.rank, users.role,
           approver.name as approver_name
    FROM requests 
    JOIN users ON requests.user_id = users.id
    LEFT JOIN users approver ON requests.approved_by = approver.id
  `;
  let params = [];
  let conditions = [];
  
  if (status && status !== '') {
    conditions.push('requests.status = ?');
    params.push(status);
  }
  if (user_id && user_id !== '') {
    conditions.push('requests.user_id = ?');
    params.push(user_id);
  }
  if (start_date && start_date !== '') {
    conditions.push('requests.start_date >= ?');
    params.push(start_date);
  }
  if (end_date && end_date !== '') {
    conditions.push('requests.end_date <= ?');
    params.push(end_date);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  query += ' ORDER BY requests.created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('SQL Error:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// אישור/דחייה של בקשה
app.put('/api/requests/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, approved_by } = req.body;
  
  const approved_at = status === 'approved' || status === 'rejected' ? new Date().toISOString() : null;
  
  db.run(
    'UPDATE requests SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?',
    [status, approved_by, approved_at, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// מחיקת בקשה
app.delete('/api/requests/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM requests WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// שליפת נוכחות לפי תאריך
app.get('/api/presence', (req, res) => {
  const { date, role, platoon, company } = req.query;
  if (!date) return res.status(400).json({ error: 'Missing date' });
  
  let query = `
    SELECT users.*, requests.id as request_id, requests.status as request_status 
    FROM users
    LEFT JOIN requests ON users.id = requests.user_id
    AND requests.start_date <= ? AND requests.end_date >= ?
    AND requests.status = 'approved'
  `;
  let params = [date, date];
  let conditions = [];
  
  if (role && role !== '') {
    conditions.push('users.role = ?');
    params.push(role);
  }
  if (platoon && platoon !== '') {
    conditions.push('users.platoon = ?');
    params.push(platoon);
  }
  if (company && company !== '') {
    conditions.push('users.company = ?');
    params.push(company);
  }
  
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    // מי שאין לו בקשה מאושרת בתאריך הזה - נמצא בבסיס
    const present = rows.filter(r => !r.request_id);
    const absent = rows.filter(r => r.request_id);
    res.json({ present, absent });
  });
});

// ייצוא נתונים ל-Excel
app.get('/api/export', (req, res) => {
  const { type, start_date, end_date, role } = req.query;
  
  if (type === 'presence') {
    // ייצוא נוכחות
    let query = `
      SELECT users.name, users.rank, users.role, 
             CASE WHEN requests.id IS NOT NULL THEN 'לא בבסיס' ELSE 'בבסיס' END as status,
             requests.start_date, requests.end_date, requests.reason
      FROM users
      LEFT JOIN requests ON users.id = requests.user_id
      AND requests.start_date <= ? AND requests.end_date >= ?
      AND requests.status = 'approved'
    `;
    let params = [start_date, end_date];
    
    if (role) {
      query += ' WHERE users.role = ?';
      params.push(role);
    }
    
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ data: rows, filename: `presence_${start_date}_${end_date}.json` });
    });
  } else if (type === 'requests') {
    // ייצוא בקשות
    let query = `
      SELECT users.name, users.rank, users.role, 
             requests.start_date, requests.end_date, requests.status, requests.reason,
             approver.name as approver_name
      FROM requests 
      JOIN users ON requests.user_id = users.id
      LEFT JOIN users approver ON requests.approved_by = approver.id
    `;
    let params = [];
    
    if (start_date && end_date) {
      query += ' WHERE requests.start_date >= ? AND requests.end_date <= ?';
      params.push(start_date, end_date);
    }
    
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ data: rows, filename: `requests_${start_date}_${end_date}.json` });
    });
  }
});

// קבלת היסטוריית פעילות
app.get('/api/activity', (req, res) => {
  const { table_name, record_id, limit = 50 } = req.query;
  let query = 'SELECT * FROM activity_log';
  let params = [];
  
  if (table_name) {
    query += ' WHERE table_name = ?';
    params.push(table_name);
  }
  if (record_id) {
    query += table_name ? ' AND record_id = ?' : ' WHERE record_id = ?';
    params.push(record_id);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

initDb();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 