const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;

// Настройка подключения к PostgreSQL (используем pool вместо db)
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

// Middleware (убрали дублирование)
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Все запросы к БД через pool (заменили db на pool)
app.post("/login", (req, res) => {
    const { login, password } = req.body;
    // Исправлен SQL для PostgreSQL ($1 вместо ?)
    const sql = "SELECT id, login, username, role_id, profile_image FROM users WHERE login = $1 AND password = $2";
    
    pool.query(sql, [login, password], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.json({ success: false, message: "Неверный логин или пароль" });
        }
    });
});

// API для получения пользователей
app.get('/api/users', (req, res) => {
  pool.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error('Ошибка запроса к базе данных: ', err);
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }
    res.json(results.rows);
  });
});

app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  pool.query('DELETE FROM users WHERE id = $1', [userId], (err, result) => {
      if (err) {
          res.status(500).send('Ошибка при удалении пользователя');
      } else {
          res.status(200).send('Пользователь удален');
      }
  });
});

// Маршрут для получения секций
app.get('/api/sections', (req, res) => {
  pool.query('SELECT * FROM sections', (err, results) => {
    if (err) {
      console.error('Ошибка выполнения запроса:', err);
      res.status(500).send('Ошибка сервера');
      return;
    }
    res.json(results.rows);
  });
});

// Объединенные маршруты для сообщений
app.get('/messages', (req, res) => {
  pool.query('SELECT * FROM messages ORDER BY created_at ASC', (err, results) => {
      if (err) {
          console.error('Ошибка при получении сообщений:', err);
          return res.status(500).send('Ошибка сервера');
      }
      res.json(results.rows);
  });
});

app.post('/send-message', (req, res) => {
  const { username, message, profile_image } = req.body;

  if (!username || !message) {
      return res.status(400).json({ error: 'Заполните все поля' });
  }

  // Исправлен SQL для PostgreSQL
  const sql = `INSERT INTO messages (username, message, profile_image, created_at) 
              VALUES ($1, $2, $3, NOW())`;
  
  pool.query(sql, 
    [username, message, profile_image || 'default-avatar.png'], 
    (err, result) => {
      if (err) {
          console.error('Ошибка при сохранении сообщения:', err);
          return res.status(500).send('Ошибка сервера');
      }
      res.status(201).json({ success: true });
  });
});

app.delete('/delete-message/:id', (req, res) => {
  const messageId = req.params.id;
  pool.query('DELETE FROM messages WHERE id = $1', [messageId], (err, results) => {
    if (err) {
      return res.status(500).send('Ошибка сервера');
    }
    res.status(200).send('Сообщение удалено');
  });
});

// Обратная связь
app.post("/feedback", (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: "Заполните все поля" });
    }

    const sql = `INSERT INTO feedback (name, email, message, created_at) 
                VALUES ($1, $2, $3, NOW())`;
    pool.query(sql, [name, email, message], (err, result) => {
        if (err) {
            console.error("Ошибка сохранения в БД:", err);
            return res.status(500).json({ message: "Ошибка сервера" });
        }
        res.json({ message: "Ваше сообщение отправлено!" });
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});

module.exports = app;
