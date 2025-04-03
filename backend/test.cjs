const chai = require('chai');
const expect = chai.expect;
const request = require('supertest');
const mysql = require('mysql2');
const app = require("./server"); // Твой сервер с реальной базой данных

// Создаём подключение к тестовой базе данных
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@Hasbik1609D',
    database: 'kazemat_forum' // Используем тестовую базу данных
});

// Подключаемся к базе данных
before((done) => {
    db.connect((err) => {
        if (err) {
            return done(err);
        }
        console.log("Подключено к БД");
        done();
    });
});

describe('API Tests', function () {

    // Добавляем одного пользователя перед каждым тестом
    beforeEach((done) => {
        const testUser = { login: 'user1', password: 'password1', username: 'User One', role_id: 1 };
        
        // Проверяем, существует ли уже пользователь с таким логином
        db.query('SELECT COUNT(*) AS count FROM users WHERE login = ?', [testUser.login], (err, result) => {
            if (err) return done(err);
            
            if (result[0].count === 0) {
                // Если пользователь не существует, добавляем его
                db.query('INSERT INTO users (login, password, username, role_id) VALUES (?, ?, ?, ?)', 
                [testUser.login, testUser.password, testUser.username, testUser.role_id], (err) => {
                    if (err) return done(err);
                    done();
                });
            } else {
                // Если пользователь существует, продолжаем тест
                done();
            }
        });
    });

    
    it('POST /login - неверные данные', function (done) {
        // Тестируем запрос на логин с неверными данными
        request(app)
            .post('/login')
            .send({ login: 'wrong', password: 'wrong' })
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.success).to.be.false;
                expect(res.body.message).to.equal('Неверный логин или пароль');
                done();
            });
    });

    it('GET /api/users - получение списка пользователей', function (done) {
        // Тестируем запрос на получение списка пользователей
        request(app)
            .get('/api/users')
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                // Выводим список пользователей в консоль
                console.log('Список пользователей:', res.body);
                
                // Проверяем, что ответ содержит хотя бы одного пользователя
                expect(res.body).to.be.an('array'); // Ответ должен быть массивом
                expect(res.body).to.have.lengthOf.at.least(1); // Ожидаем, что в ответе будет хотя бы 1 пользователь
                done();
            });
    });
    
    

    it('POST /feedback - успешная отправка', function (done) {
        // Тестируем запрос на отправку отзыва
        request(app)
            .post('/feedback')
            .send({ name: 'Сметанин Владислав', email: 'smetanin@example.com', message: 'Привет' })
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body.message).to.equal('Ваше сообщение отправлено!');
                done();
            });
    });

    after(() => {
        db.end(); // Закрываем подключение к БД после всех тестов
    });
});
