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
    rejectUnauthorized: false // Обязательно для Neon.tech!
  }
});


// 2. Middleware (убрано дублирование)
app.use(cors());
app.use(express.json()); // Заменяет bodyParser.json()

// 3. Проверка подключения к БД
pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Connection error:', err));

// 4. Статические файлы
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. Исправлены все SQL-запросы
app.post("/login", (req, res) => {
    const { login, password } = req.body;
    const sql = "SELECT id, login, username, role_id, profile_image FROM users WHERE login = $1 AND password = $2";
    
    pool.query(sql, [login, password], (err, result) => {
        if (err) return handleError(res, err);
        res.json(result.rows.length > 0 
            ? { success: true, user: result.rows[0] }
            : { success: false, message: "Неверный логин или пароль" }
        );
    });
});

// server.js
app.get('/api/sections', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM sections');
    res.json(rows);
  } catch (err) {
    console.error('Ошибка получения секций:', err);
    res.status(500).json({ 
      error: 'Не удалось получить список разделов',
      details: process.env.NODE_ENV === 'development' ? err.message : null
    });
  }
});

// 6. Унифицированные API endpoints
app.route('/api/messages')
  .get((req, res) => {
    pool.query('SELECT * FROM messages ORDER BY created_at DESC', (err, results) => {
      if (err) return handleError(res, err);
      res.json(results.rows);
    });
  })
  .post((req, res) => {
    const { username, message, profile_image } = req.body;
    if (!username || !message) return res.status(400).json({ error: 'Заполните все поля' });
    
    pool.query(
      'INSERT INTO messages (username, message, profile_image) VALUES ($1, $2, $3) RETURNING *',
      [username, message, profile_image || 'default-avatar.png'],
      (err, result) => {
        if (err) return handleError(res, err);
        res.status(201).json(result.rows[0]);
      }
    );
  });

app.delete('/api/messages/:id', (req, res) => {
  pool.query('DELETE FROM messages WHERE id = $1', [req.params.id], (err) => {
    if (err) return handleError(res, err);
    res.status(204).send();
  });
});

// 7. Обратная связь
app.post("/api/feedback", (req, res) => {
    const { name, email, message } = req.body;
    
    if (!name || !email || !message) {
        return res.status(400).json({ message: "Заполните все поля" });
    }

    pool.query(
      'INSERT INTO feedback (name, email, message) VALUES ($1, $2, $3) RETURNING *',
      [name, email, message],
      (err, result) => {
        if (err) return handleError(res, err);
        res.status(201).json(result.rows[0]);
      }
    );
});

// 8. Обработчик ошибок
function handleError(res, err) {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
}

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
