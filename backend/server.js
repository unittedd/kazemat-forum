const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// 1. Улучшенная настройка CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 2. Middleware для логирования
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// 3. Унифицированные API endpoints
app.post("/api/login", async (req, res) => {
  try {
    const { login, password } = req.body;
    const { rows } = await pool.query(
      `SELECT id, login, username, role_id, profile_image 
       FROM users WHERE login = $1 AND password = $2`,
      [login, password]
    );
    
    rows.length > 0 
      ? res.json({ success: true, user: rows[0] })
      : res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// 4. Стандартизированные ответы
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// 5. Единый стиль для сообщений
app.route('/api/messages')
  .get(async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM messages ORDER BY created_at DESC'
      );
      res.json(rows);
    } catch (err) {
      console.error('Get messages error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  })
  .post(async (req, res) => {
    try {
      const { username, message, profile_image } = req.body;
      if (!username || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { rows } = await pool.query(
        `INSERT INTO messages (username, message, profile_image)
         VALUES ($1, $2, $3) RETURNING *`,
        [username, message, profile_image || 'default-avatar.png']
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Send message error:', err);
      res.status(500).json({ error: 'Message send failed' });
    }
  });

app.delete('/api/messages/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// 6. Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
