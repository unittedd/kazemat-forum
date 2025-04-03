const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

// Middleware
app.use(cors());
app.use(express.json());

// Проверка подключения к БД
pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Connection error:', err));

app.post("/login", (req, res) => {
    const { login, password } = req.body;
    const sql = "SELECT id, login, username, role_id, profile_image FROM users WHERE login = ? AND password = ?";
    
    db.query(sql, [login, password], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        if (result.length > 0) {
            res.json({ success: true, user: result[0] });
        } else {
            res.json({ success: false, message: "Неверный логин или пароль" });
        }
    });
});


// Статическая обработка файлов из папки frontend
app.use(express.static(path.join(__dirname, '../frontend')));


// API для получения пользователей
app.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) {
      console.error('Ошибка запроса к базе данных: ', err);
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }
    res.json(results);
  });
});



app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  // Логика удаления пользователя из базы данных
  db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
      if (err) {
          res.status(500).send('Ошибка при удалении пользователя');
      } else {
          res.status(200).send('Пользователь удален');
      }
  });
});



// Маршрут для получения секций
app.get('/api/sections', (req, res) => {
  db.query('SELECT * FROM sections', (err, results) => {
    if (err) {
      console.error('Ошибка выполнения запроса:', err);
      res.status(500).send('Ошибка сервера');
      return;
    }
    res.json(results);
  });
});


// **Маршрут для получения сообщений**
app.get('/messages', (req, res) => {
  db.query('SELECT * FROM messages ORDER BY created_at ASC', (err, results) => {
      if (err) {
          console.error('Ошибка при получении сообщений:', err);
          res.status(500).send('Ошибка сервера');
          return;
      }
      res.json(results);
  });
});

// **Маршрут для сохранения сообщения**
app.post('/send-message', (req, res) => {
  const { username, message, profile_image } = req.body;

  if (!username || !message) {
      return res.status(400).json({ error: 'Заполните все поля' });
  }

  const sql = 'INSERT INTO messages (username, message, profile_image) VALUES (?, ?, ?)';
  db.query(sql, [username, message, profile_image || 'default-avatar.png'], (err, result) => {
      if (err) {
          console.error('Ошибка при сохранении сообщения:', err);
          res.status(500).send('Ошибка сервера');
          return;
      }
      res.status(201).json({ success: true });
  });
});


app.get('/get-messages', (req, res) => {
  const query = 'SELECT * FROM messages ORDER BY created_at ASC';
  db.query(query, (err, results) => {
      if (err) {
          console.error("Ошибка запроса:", err);
          return res.status(500).send("Ошибка запроса к базе данных");
      }
      res.json(results); // Отправляем результаты запроса
  });
});


// API для получения всех сообщений
app.get('/get-messages', (req, res) => {
  const query = 'SELECT * FROM messages ORDER BY created_at DESC';
  db.query(query, (err, results) => {
      if (err) {
          console.error('Ошибка при получении сообщений:', err);
          return res.status(500).send('Ошибка сервера');
      }
      res.json(results); // Отправляем результаты в формате JSON
  });
});

// Удаление сообщения по ID
app.delete('/delete-message/:id', (req, res) => {
  const messageId = req.params.id;
  const query = 'DELETE FROM messages WHERE id = ?';

  db.execute(query, [messageId], (err, results) => {
    if (err) {
      return res.status(500).send('Ошибка сервера');
    }
    res.status(200).send('Сообщение удалено');
  });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Эндпоинт для обработки формы обратной связи
app.post("/feedback", (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ message: "Заполните все поля" });
    }

    const sql = "INSERT INTO feedback (name, email, message) VALUES (?, ?, ?)";
    db.query(sql, [name, email, message], (err, result) => {
        if (err) {
            console.error("Ошибка сохранения в БД:", err);
            return res.status(500).json({ message: "Ошибка сервера" });
        }
        res.json({ message: "Ваше сообщение отправлено!" });
    });
});

// Настройка для обслуживания статических файлов (папка uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.listen(3000, () => {
    console.log("Сервер запущен на порту 3000");
});

module.exports = app;
