const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

//Подключение к PostgreSQL
const connectionString = 'postgres://neondb_owner:npg_Bs3EYWtoOym1@ep-autumn-sun-a2e55twh-pooler.eu-central-1.aws.neon.tech/kazemat-forum';
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
    require: true
  }
});

// Исправлено: CORS middleware должен быть объявлен один раз
app.use(cors());
app.use(express.json()); // Заменяет bodyParser.json()

// Удалено: Дублирующийся вызов cors() и bodyParser

// Проверка подключения к БД
pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Connection error:', err));

// Статические файлы
app.use(express.static(path.join(__dirname, '../frontend')));

// Исправлено: Все SQL запросы используют pool вместо db
app.post("/login", (req, res) => {
    const { login, password } = req.body;
    const sql = "SELECT id, login, username, role_id, profile_image FROM users WHERE login = $1 AND password = $2";
    
    pool.query(sql, [login, password], (err, result) => {
        if (err) {
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        res.json(result.rows.length > 0 
            ? { success: true, user: result.rows[0] }
            : { success: false, message: "Неверный логин или пароль" }
        );
    });
});

// Унифицированные API endpoints
app.route('/api/messages')
  .get((req, res) => {
    pool.query('SELECT * FROM messages ORDER BY created_at DESC', (err, results) => {
      if (err) return handleError(res, err);
      res.json(results.rows);
    });
  })
  .post((req, res) => {
    const { username, message, profile_image } = req.body;
    if (!username || !message) {
      return res.status(400).json({ error: 'Заполните все поля' });
    }
    
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

// Удалено: Дублирующиеся маршруты для messages

// Обратная связь
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

// Обработчик ошибок
function handleError(res, err) {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
}

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
