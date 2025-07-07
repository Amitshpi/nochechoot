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
    
    if (process.env.NODE_ENV === 'production') {
      // PostgreSQL syntax
      const result = await db.run(
        'INSERT INTO users (name, rank, role, platoon, company, phone, email) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [name, rank, role, platoon, company, phone, email]
      );
      
      // רישום בהיסטוריה
      await db.run(
        'INSERT INTO activity_log (action, table_name, record_id, new_values, user_id) VALUES ($1, $2, $3, $4, $5)',
        ['CREATE', 'users', result.rows[0].id, JSON.stringify({ name, rank, role, platoon, company, phone, email }), 1]
      );
      
      res.json({ id: result.rows[0].id, name, rank, role, platoon, company, phone, email });
    } else {
      // SQLite syntax
      db.run(
        'INSERT INTO users (name, rank, role, platoon, company, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, rank, role, platoon, company, phone, email],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          
          // רישום בהיסטוריה
          db.run(
            'INSERT INTO activity_log (action, table_name, record_id, new_values, user_id) VALUES (?, ?, ?, ?, ?)',
            ['CREATE', 'users', this.lastID, JSON.stringify({ name, rank, role, platoon, company, phone, email }), 1]
          );
          
          res.json({ id: this.lastID, name, rank, role, platoon, company, phone, email });
        }
      );
    }
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
    
    if (role && role !== '') {
      conditions.push(process.env.NODE_ENV === 'production' ? 'role = $1' : 'role = ?');
      params.push(role);
    }
    if (platoon && platoon !== '') {
      conditions.push(process.env.NODE_ENV === 'production' ? 'platoon = $' + (params.length + 1) : 'platoon = ?');
      params.push(platoon);
    }
    if (company && company !== '') {
      conditions.push(process.env.NODE_ENV === 'production' ? 'company = $' + (params.length + 1) : 'company = ?');
      params.push(company);
    }
    if (search && search !== '') {
      const searchCondition = process.env.NODE_ENV === 'production' 
        ? '(name LIKE $' + (params.length + 1) + ' OR rank LIKE $' + (params.length + 2) + ' OR role LIKE $' + (params.length + 3) + ' OR platoon LIKE $' + (params.length + 4) + ' OR company LIKE $' + (params.length + 5) + ')'
        : '(name LIKE ? OR rank LIKE ? OR role LIKE ? OR platoon LIKE ? OR company LIKE ?)';
      conditions.push(searchCondition);
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
app.get('/api/roles', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM roles ORDER BY name', []);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// קבלת פלוגות ייחודיות
app.get('/api/platoons', async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT platoon FROM users WHERE platoon IS NOT NULL AND platoon != \'\' ORDER BY platoon', []);
    res.json(rows.map(row => row.platoon));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// קבלת מחלקות ייחודיות
app.get('/api/companies', async (req, res) => {
  try {
    const rows = await db.all('SELECT DISTINCT company FROM users WHERE company IS NOT NULL AND company != \'\' ORDER BY company', []);
    res.json(rows.map(row => row.company));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// הוספת תפקיד חדש
app.post('/api/roles', async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.run(
        'INSERT INTO roles (name, description, permissions) VALUES ($1, $2, $3) RETURNING id',
        [name, description, permissions]
      );
      res.json({ id: result.rows[0].id, name, description, permissions });
    } else {
      db.run(
        'INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)',
        [name, description, permissions],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ id: this.lastID, name, description, permissions });
        }
      );
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// עדכון תפקיד
app.put('/api/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    
    if (process.env.NODE_ENV === 'production') {
      await db.run(
        'UPDATE roles SET name = $1, description = $2, permissions = $3 WHERE id = $4',
        [name, description, permissions, id]
      );
    } else {
      db.run(
        'UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?',
        [name, description, permissions, id],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
        }
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// מחיקת תפקיד
app.delete('/api/roles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (process.env.NODE_ENV === 'production') {
      await db.run('DELETE FROM roles WHERE id = $1', [id]);
    } else {
      db.run('DELETE FROM roles WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// עדכון משתמש
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rank, role, platoon, company, phone, email } = req.body;
    
    if (process.env.NODE_ENV === 'production') {
      await db.run(
        'UPDATE users SET name = $1, rank = $2, role = $3, platoon = $4, company = $5, phone = $6, email = $7 WHERE id = $8',
        [name, rank, role, platoon, company, phone, email, id]
      );
    } else {
      db.run(
        'UPDATE users SET name = ?, rank = ?, role = ?, platoon = ?, company = ?, phone = ?, email = ? WHERE id = ?',
        [name, rank, role, platoon, company, phone, email, id],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
        }
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// מחיקת משתמש
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (process.env.NODE_ENV === 'production') {
      await db.run('DELETE FROM users WHERE id = $1', [id]);
    } else {
      db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// הוספת בקשת יציאה
app.post('/api/requests', async (req, res) => {
  try {
    const { user_id, start_date, end_date, reason } = req.body;
    
    if (process.env.NODE_ENV === 'production') {
      const result = await db.run(
        'INSERT INTO requests (user_id, start_date, end_date, reason) VALUES ($1, $2, $3, $4) RETURNING id',
        [user_id, start_date, end_date, reason]
      );
      res.json({ id: result.rows[0].id, user_id, start_date, end_date, reason, status: 'pending' });
    } else {
      db.run(
        'INSERT INTO requests (user_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
        [user_id, start_date, end_date, reason],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ id: this.lastID, user_id, start_date, end_date, reason, status: 'pending' });
        }
      );
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// קבלת כל הבקשות עם סינון
app.get('/api/requests', async (req, res) => {
  try {
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
      conditions.push(process.env.NODE_ENV === 'production' ? 'requests.status = $1' : 'requests.status = ?');
      params.push(status);
    }
    if (user_id && user_id !== '') {
      conditions.push(process.env.NODE_ENV === 'production' ? 'requests.user_id = $' + (params.length + 1) : 'requests.user_id = ?');
      params.push(user_id);
    }
    if (start_date && start_date !== '') {
      conditions.push(process.env.NODE_ENV === 'production' ? 'requests.start_date >= $' + (params.length + 1) : 'requests.start_date >= ?');
      params.push(start_date);
    }
    if (end_date && end_date !== '') {
      conditions.push(process.env.NODE_ENV === 'production' ? 'requests.end_date <= $' + (params.length + 1) : 'requests.end_date <= ?');
      params.push(end_date);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY requests.created_at DESC';
    
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (error) {
    console.error('SQL Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// אישור/דחייה של בקשה
app.put('/api/requests/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by } = req.body;
    
    const approved_at = status === 'approved' || status === 'rejected' ? new Date().toISOString() : null;
    
    if (process.env.NODE_ENV === 'production') {
      await db.run(
        'UPDATE requests SET status = $1, approved_by = $2, approved_at = $3 WHERE id = $4',
        [status, approved_by, approved_at, id]
      );
    } else {
      db.run(
        'UPDATE requests SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?',
        [status, approved_by, approved_at, id],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
        }
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// מחיקת בקשה
app.delete('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (process.env.NODE_ENV === 'production') {
      await db.run('DELETE FROM requests WHERE id = $1', [id]);
    } else {
      db.run('DELETE FROM requests WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
      });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// שליפת נוכחות לפי תאריך
app.get('/api/presence', async (req, res) => {
  try {
    const { date, role, platoon, company } = req.query;
    if (!date) return res.status(400).json({ error: 'Missing date' });
    
    let query = `
      SELECT users.*, requests.id as request_id, requests.status as request_status 
      FROM users
      LEFT JOIN requests ON users.id = requests.user_id
      AND requests.start_date <= ${process.env.NODE_ENV === 'production' ? '$1' : '?'} AND requests.end_date >= ${process.env.NODE_ENV === 'production' ? '$2' : '?'}
      AND requests.status = 'approved'
    `;
    let params = [date, date];
    let conditions = [];
    
    if (role && role !== '') {
      conditions.push(process.env.NODE_ENV === 'production' ? 'users.role = $' + (params.length + 1) : 'users.role = ?');
      params.push(role);
    }
    if (platoon && platoon !== '') {
      conditions.push(process.env.NODE_ENV === 'production' ? 'users.platoon = $' + (params.length + 1) : 'users.platoon = ?');
      params.push(platoon);
    }
    if (company && company !== '') {
      conditions.push(process.env.NODE_ENV === 'production' ? 'users.company = $' + (params.length + 1) : 'users.company = ?');
      params.push(company);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    const rows = await db.all(query, params);
    // מי שאין לו בקשה מאושרת בתאריך הזה - נמצא בבסיס
    const present = rows.filter(r => !r.request_id);
    const absent = rows.filter(r => r.request_id);
    res.json({ present, absent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ייצוא נתונים ל-Excel
app.get('/api/export', async (req, res) => {
  try {
    const { type, start_date, end_date, role } = req.query;
    
    if (type === 'presence') {
      // ייצוא נוכחות
      let query = `
        SELECT users.name, users.rank, users.role, 
               CASE WHEN requests.id IS NOT NULL THEN 'לא בבסיס' ELSE 'בבסיס' END as status,
               requests.start_date, requests.end_date, requests.reason
        FROM users
        LEFT JOIN requests ON users.id = requests.user_id
        AND requests.start_date <= ${process.env.NODE_ENV === 'production' ? '$1' : '?'} AND requests.end_date >= ${process.env.NODE_ENV === 'production' ? '$2' : '?'}
        AND requests.status = 'approved'
      `;
      let params = [start_date, end_date];
      
      if (role) {
        query += process.env.NODE_ENV === 'production' ? ' WHERE users.role = $3' : ' WHERE users.role = ?';
        params.push(role);
      }
      
      const rows = await db.all(query, params);
      res.json({ data: rows, filename: `presence_${start_date}_${end_date}.json` });
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
        query += process.env.NODE_ENV === 'production' ? ' WHERE requests.start_date >= $1 AND requests.end_date <= $2' : ' WHERE requests.start_date >= ? AND requests.end_date <= ?';
        params.push(start_date, end_date);
      }
      
      const rows = await db.all(query, params);
      res.json({ data: rows, filename: `requests_${start_date}_${end_date}.json` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// קבלת היסטוריית פעילות
app.get('/api/activity', async (req, res) => {
  try {
    const { table_name, record_id, limit = 50 } = req.query;
    let query = 'SELECT * FROM activity_log';
    let params = [];
    
    if (table_name) {
      query += process.env.NODE_ENV === 'production' ? ' WHERE table_name = $1' : ' WHERE table_name = ?';
      params.push(table_name);
    }
    if (record_id) {
      query += table_name ? (process.env.NODE_ENV === 'production' ? ' AND record_id = $' + (params.length + 1) : ' AND record_id = ?') : (process.env.NODE_ENV === 'production' ? ' WHERE record_id = $1' : ' WHERE record_id = ?');
      params.push(record_id);
    }
    
    query += process.env.NODE_ENV === 'production' ? ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) : ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    
    const rows = await db.all(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

initDb();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 