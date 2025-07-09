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

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4000'],
  credentials: true
}));
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

// עריכת בקשה
app.put('/api/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, start_date, end_date, reason } = req.body;
    
    if (process.env.NODE_ENV === 'production') {
      await db.run(
        'UPDATE requests SET user_id = $1, start_date = $2, end_date = $3, reason = $4 WHERE id = $5',
        [user_id, start_date, end_date, reason, id]
      );
    } else {
      db.run(
        'UPDATE requests SET user_id = ?, start_date = ?, end_date = ?, reason = ? WHERE id = ?',
        [user_id, start_date, end_date, reason, id],
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
    
    // שליפת כל הבקשות לתאריך זה (כולל ממתינות)
    let requestsQuery = `
      SELECT users.*, requests.id as request_id, requests.status as request_status, requests.reason
      FROM users
      LEFT JOIN requests ON users.id = requests.user_id
      AND requests.start_date <= ${process.env.NODE_ENV === 'production' ? '$1' : '?'} AND requests.end_date >= ${process.env.NODE_ENV === 'production' ? '$2' : '?'}
    `;
    let requestsParams = [date, date];
    let requestsConditions = [];
    
    if (role && role !== '') {
      requestsConditions.push(process.env.NODE_ENV === 'production' ? 'users.role = $' + (requestsParams.length + 1) : 'users.role = ?');
      requestsParams.push(role);
    }
    if (platoon && platoon !== '') {
      requestsConditions.push(process.env.NODE_ENV === 'production' ? 'users.platoon = $' + (requestsParams.length + 1) : 'users.platoon = ?');
      requestsParams.push(platoon);
    }
    if (company && company !== '') {
      requestsConditions.push(process.env.NODE_ENV === 'production' ? 'users.company = $' + (requestsParams.length + 1) : 'users.company = ?');
      requestsParams.push(company);
    }
    
    if (requestsConditions.length > 0) {
      requestsQuery += ' WHERE ' + requestsConditions.join(' AND ');
    }
    
    const allRows = await new Promise((resolve, reject) => {
      db.all(requestsQuery, requestsParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    // מי שאין לו בקשה מאושרת בתאריך הזה - נמצא בבסיס
    const present = allRows.filter(r => !r.request_id);
    const absent = allRows.filter(r => r.request_id && r.request_status === 'approved');
    const pending = allRows.filter(r => r.request_id && r.request_status === 'pending');
    const rejected = allRows.filter(r => r.request_id && r.request_status === 'rejected');
    
    // בדיקה אם יש אנשים עם אותו תפקיד שיוצאים באותו יום
    const roleConflicts = {};
    const approvedRequests = allRows.filter(r => r.request_id && r.request_status === 'approved');
    
    approvedRequests.forEach(request => {
      if (!roleConflicts[request.role]) {
        roleConflicts[request.role] = [];
      }
      roleConflicts[request.role].push(request);
    });
    
    const conflicts = Object.entries(roleConflicts)
      .filter(([role, requests]) => requests.length > 1)
      .map(([role, requests]) => ({
        role,
        count: requests.length,
        users: requests.map(r => ({ name: r.name, rank: r.rank }))
      }));
    
    res.json({ 
      present, 
      absent, 
      pending, 
      rejected,
      conflicts,
      summary: {
        present: present.length,
        absent: absent.length,
        pending: pending.length,
        rejected: rejected.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// שליפת נוכחות עם תמיכה במספר תפקידים
app.get('/api/presence/multi-role', async (req, res) => {
  try {
    const { date, roles, platoon, company } = req.query;
    if (!date) return res.status(400).json({ error: 'Missing date' });
    
    let query = `
      SELECT users.*, requests.id as request_id, requests.status as request_status, requests.reason
      FROM users
      LEFT JOIN requests ON users.id = requests.user_id
      AND requests.start_date <= ${process.env.NODE_ENV === 'production' ? '$1' : '?'} AND requests.end_date >= ${process.env.NODE_ENV === 'production' ? '$2' : '?'}
    `;
    let params = [date, date];
    let conditions = [];
    
    if (roles && roles !== '') {
      const roleList = roles.split(',').map(r => r.trim());
      const rolePlaceholders = roleList.map((_, i) => 
        process.env.NODE_ENV === 'production' ? `$${params.length + i + 1}` : '?'
      ).join(', ');
      conditions.push(`users.role IN (${rolePlaceholders})`);
      params.push(...roleList);
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
    
    const allRows = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const present = allRows.filter(r => !r.request_id);
    const absent = allRows.filter(r => r.request_id && r.request_status === 'approved');
    const pending = allRows.filter(r => r.request_id && r.request_status === 'pending');
    const rejected = allRows.filter(r => r.request_id && r.request_status === 'rejected');
    
    // בדיקה אם יש אנשים עם אותו תפקיד שיוצאים באותו יום
    const roleConflicts = {};
    const approvedRequests = allRows.filter(r => r.request_id && r.request_status === 'approved');
    
    approvedRequests.forEach(request => {
      if (!roleConflicts[request.role]) {
        roleConflicts[request.role] = [];
      }
      roleConflicts[request.role].push(request);
    });
    
    const conflicts = Object.entries(roleConflicts)
      .filter(([role, requests]) => requests.length > 1)
      .map(([role, requests]) => ({
        role,
        count: requests.length,
        users: requests.map(r => ({ name: r.name, rank: r.rank }))
      }));
    
    res.json({ 
      present, 
      absent, 
      pending, 
      rejected,
      conflicts,
      summary: {
        present: present.length,
        absent: absent.length,
        pending: pending.length,
        rejected: rejected.length
      }
    });
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
    const query = `
      SELECT * FROM activity_log 
      ORDER BY created_at DESC 
      LIMIT 100
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error fetching activity:', err);
        res.status(500).json({ error: 'Database error' });
        return;
      }
      res.json(rows || []);
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// אופטימיזציה של לוח יציאות
app.post('/api/optimize-leave', async (req, res) => {
  try {
    const {
      minPeopleInBase,
      roleRequirements,
      minLeaveDuration,
      maxLeaveDuration,
      startDate,
      endDate
    } = req.body;

    // קבלת כל המשתמשים
    const users = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM users ORDER BY name', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // קבלת בקשות קיימות
    const existingRequests = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM requests WHERE status = "approved"', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // אלגוריתם אופטימיזציה
    const optimizationResults = optimizeLeaveSchedule({
      users,
      existingRequests,
      minPeopleInBase,
      roleRequirements,
      minLeaveDuration,
      maxLeaveDuration,
      startDate,
      endDate
    });

    res.json(optimizationResults);
  } catch (error) {
    console.error('Error optimizing leave schedule:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// החלת תוצאות האופטימיזציה
app.post('/api/apply-optimization', async (req, res) => {
  try {
    const { requests } = req.body;
    
    // יצירת בקשות חדשות
    for (const request of requests) {
      await new Promise((resolve, reject) => {
        const query = `
          INSERT INTO requests (user_id, start_date, end_date, reason, status, created_at)
          VALUES (?, ?, ?, ?, 'pending', datetime('now'))
        `;
        
        db.run(query, [
          request.userId,
          request.startDate,
          request.endDate,
          request.reason
        ], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    res.json({ success: true, message: 'Optimization applied successfully' });
  } catch (error) {
    console.error('Error applying optimization:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// פונקציית האופטימיזציה
function optimizeLeaveSchedule({
  users,
  existingRequests,
  minPeopleInBase,
  roleRequirements,
  minLeaveDuration,
  maxLeaveDuration,
  startDate,
  endDate
}) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  
  // יצירת לוח זמנים
  const schedule = {};
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    schedule[dateStr] = {
      peopleInBase: users.length,
      peopleOnLeave: 0,
      roleCounts: {}
    };
  }

  // חישוב אנשים בבסיס לפי בקשות קיימות
  existingRequests.forEach(request => {
    const start = new Date(request.start_date);
    const end = new Date(request.end_date);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (schedule[dateStr]) {
        schedule[dateStr].peopleInBase--;
        schedule[dateStr].peopleOnLeave++;
      }
    }
  });

  // חישוב תפקידים בבסיס
  users.forEach(user => {
    const userRequests = existingRequests.filter(r => r.user_id === user.id);
    const isOnLeave = (date) => {
      return userRequests.some(r => {
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        return date >= start && date <= end;
      });
    };

    Object.keys(schedule).forEach(dateStr => {
      const date = new Date(dateStr);
      if (!isOnLeave(date)) {
        if (!schedule[dateStr].roleCounts[user.role]) {
          schedule[dateStr].roleCounts[user.role] = 0;
        }
        schedule[dateStr].roleCounts[user.role]++;
      }
    });
  });

  // בחירת אנשים ליציאה
  const selectedUsers = [];
  const availableUsers = users.filter(user => {
    const userRequests = existingRequests.filter(r => r.user_id === user.id);
    return userRequests.length === 0; // רק אנשים ללא בקשות קיימות
  });

  // אלגוריתם בחירה חכם
  availableUsers.forEach(user => {
    const userScore = calculateUserScore(user, schedule, roleRequirements);
    selectedUsers.push({ user, score: userScore });
  });

  selectedUsers.sort((a, b) => b.score - a.score);

  // יצירת בקשות יציאה
  const newRequests = [];
  let currentDate = new Date(start);
  
  for (let i = 0; i < selectedUsers.length && currentDate < end; i++) {
    const { user } = selectedUsers[i];
    
    // בדיקה אם יש מספיק אנשים בבסיס
    const canTakeLeave = checkAvailability(user, currentDate, schedule, minPeopleInBase, roleRequirements);
    
    if (canTakeLeave) {
      const leaveDuration = Math.min(maxLeaveDuration, Math.max(minLeaveDuration, 7)); // שבוע-שבוע
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + leaveDuration - 1);
      
      if (endDate <= end) {
        newRequests.push({
          userId: user.id,
          userName: user.name,
          startDate: currentDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          duration: leaveDuration,
          reason: 'יציאה אופטימלית - שבוע-שבוע'
        });
        
        // עדכון הלוח
        for (let d = new Date(currentDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          if (schedule[dateStr]) {
            schedule[dateStr].peopleInBase--;
            schedule[dateStr].peopleOnLeave++;
            if (schedule[dateStr].roleCounts[user.role]) {
              schedule[dateStr].roleCounts[user.role]--;
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + leaveDuration);
      }
    }
  }

  // חישוב סטטיסטיקות
  const peopleWithLeave = new Set(newRequests.map(r => r.userId)).size;
  const averageLeaveDays = newRequests.length > 0 
    ? Math.round(newRequests.reduce((sum, r) => sum + r.duration, 0) / newRequests.length)
    : 0;
  
  const efficiency = Math.round((peopleWithLeave / users.length) * 100);

  return {
    requests: newRequests,
    peopleWithLeave,
    averageLeaveDays,
    efficiency,
    schedule: schedule
  };
}

// פונקציות עזר לאופטימיזציה
function calculateUserScore(user, schedule, roleRequirements) {
  let score = 0;
  
  // עדיפות לאנשים עם פחות יציאות קודמות
  score += 10;
  
  // עדיפות לתפקידים עם דרישות גבוהות
  if (roleRequirements[user.role]) {
    score += roleRequirements[user.role] * 5;
  }
  
  // עדיפות לאנשים שפחות זמן בבסיס
  Object.values(schedule).forEach(day => {
    if (day.roleCounts[user.role] > 1) {
      score += 2; // יש עוד אנשים באותו תפקיד
    }
  });
  
  return score;
}

function checkAvailability(user, date, schedule, minPeopleInBase, roleRequirements) {
  const dateStr = date.toISOString().split('T')[0];
  const daySchedule = schedule[dateStr];
  
  if (!daySchedule) return false;
  
  // בדיקת מינימום אנשים בבסיס
  if (daySchedule.peopleInBase <= minPeopleInBase) return false;
  
  // בדיקת דרישות תפקידים
  if (roleRequirements[user.role]) {
    const currentRoleCount = daySchedule.roleCounts[user.role] || 0;
    if (currentRoleCount <= roleRequirements[user.role]) return false;
  }
  
  return true;
}

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

initDb();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 