// middleware/auth.js

const jwt = require('jsonwebtoken');
const SECRET_KEY = "your_secret_key"; // Тот же секретный ключ, что и в вашем сервере

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Необходимо авторизоваться.' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Неверный или истекший токен.' });
        }
        req.user = user; // Добавляем информацию о пользователе в запрос
        next(); // Переходим к следующему обработчику
    });
};

module.exports = authenticateToken;
