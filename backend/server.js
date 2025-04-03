const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Настройка подключения к PostgreSQL
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: 5432,
  ssl: { 
    rejectUnauthorized: false
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// 1. Добавим логгирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API Endpoints
// 2. Унифицируем все API-маршруты под /api
app.post("/api/login", (req, res) => {
    const { login, password } = req.body;
    const sql = "SELECT id, login, username, role_id, profile_image FROM users WHERE login = $1 AND password = $2";
    
    pool.query(sql, [login, password], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        res.json({
            success: result.rows.length > 0,
            user: result.rows[0] || null,
            message: result.rows.length > 0 ? '' : 'Неверный логин или пароль'
        });
    });
});

app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error('Ошибка запроса:', err);
    res.status(500).json({ error: 'Ошибка базы данных' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления:', err);
    res.status(500).json({ error: 'Ошибка при удалении' });
  }
});

app.get('/api/sections', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sections');
    res.json(rows);
  } catch (err) {
    console.error('Ошибка запроса:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 3. Объединим маршруты сообщений под /api/messages
app.route('/api/messages')
  .get(async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM messages ORDER BY created_at DESC'
      );
      res.json(rows);
    } catch (err) {
      console.error('Ошибка запроса:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  })
  .post(async (req, res) => {
    try {
      const { username, message, profile_image } = req.body;
      if (!username || !message) {
        return res.status(400).json({ error: 'Заполните все поля' });
      }

      const { rows } = await pool.query(
        `INSERT INTO messages (username, message, profile_image) 
        VALUES ($1, $2, $3) RETURNING *`,
        [username, message, profile_image || 'default-avatar.png']
      );
      
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  });

app.delete('/api/messages/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM messages WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post("/api/feedback", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Заполните все поля" });
    }

    const { rows } = await pool.query(
      `INSERT INTO feedback (name, email, message) 
      VALUES ($1, $2, $3) RETURNING *`,
      [name, email, message]
    );
    
    res.json(rows[0]);
  } catch (err) {
    console.error("Ошибка сохранения:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// 4. Статические файлы должны обрабатываться ПОСЛЕ API-маршрутов
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. Обработка 404 для API-запросов
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 6. Fallback для SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

module.exports = app;
