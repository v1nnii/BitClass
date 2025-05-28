const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mammoth = require("mammoth");
require("dotenv").config();



const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const app = express();
const PORT = 3000;
const SECRET_KEY = "your_secret_key";

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname)));

// Создание папки uploads при необходимости
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage });

// Проверка подключения к БД
const testDbConnection = async () => {
    try {
        const client = await pool.connect();
        console.log("Подключение к базе данных успешно!");
        client.release();
    } catch (err) {
        console.error("Ошибка подключения к базе данных:", err);
    }
};

testDbConnection();

// Валидация
const validateInput = (data) => {
    const errors = {};
    if (!data.email) errors.email = "Email is required";
    if (!data.firstName && data.firstName !== undefined) errors.firstName = "First name is required";
    if (!data.lastName && data.lastName !== undefined) errors.lastName = "Last name is required";
    if (!data.password) errors.password = "Password is required";
    return Object.keys(errors).length === 0 ? null : errors;
};

// Регистрация
app.post("/register", async (req, res) => {
    const { email, firstName, lastName, password } = req.body;
    const validationError = validateInput({ email, firstName, lastName, password });
    if (validationError) {
        return res.status(400).json({ errors: validationError });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            "INSERT INTO users (email, first_name, last_name, password) VALUES ($1, $2, $3, $4) RETURNING *",
            [email, firstName, lastName, hashedPassword]
        );

        res.status(201).json({ usersId: result.rows[0].id });
    } catch (err) {
        console.error("Ошибка при создании пользователя:", err);
        if (err.code === "23505") {
            res.status(400).json({ message: "Email уже занят." });
        } else {
            res.status(500).json({ message: "Ошибка при создании пользователя." });
        }
    }
});

// Вход
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const validationError = validateInput({ email, password });
    if (validationError) {
        return res.status(400).json({ errors: validationError });
    }

    try {
        const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                const token = jwt.sign(
                    { usersId: user.id, firstName: user.first_name, lastName: user.last_name },
                    SECRET_KEY,
                    { expiresIn: "1h" }
                );
                res.status(200).json({ 
                    token, 
                    usersId: user.id 
                  });
            } else {
                res.status(401).json({ message: "Неправильный email или пароль." });
            }
        } else {
            res.status(401).json({ message: "Пользователь не найден." });
        }
    } catch (err) {
        console.error("Ошибка при входе:", err);
        res.status(500).json({ message: "Ошибка при входе." });
    }
});
app.get("/api/progress/topics", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Необходимо авторизоваться." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.usersId;

        const result = await pool.query(`
            SELECT t.slug
            FROM user_topic_progress utp
            JOIN topics t ON utp.topic_id = t.id
            WHERE utp.user_id = $1
        `, [userId]);

        const completedTopics = result.rows.map(row => row.slug);

        res.json({ completedTopics });
    } catch (err) {
        console.error("Ошибка при получении тем прогресса:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Получение текущего пользователя
app.get("/api/users", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Необходимо авторизоваться." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const result = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.usersId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Пользователь не найден." });
        }

        res.status(200).json({
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            usersId: decoded.usersId,
        });
    } catch (err) {
        res.status(401).json({ message: "Неверный или истекший токен." });
    }
});

// Получение темы по slug
app.get("/api/topic/:slug", async (req, res) => {
    const { slug } = req.params;
    try {
        const result = await pool.query("SELECT content_md FROM topics WHERE slug = $1", [slug]);
        if (result.rows.length > 0) {
            res.json({ content_md: result.rows[0].content_md });
        } else {
            res.status(404).json({ error: "Тема не найдена" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.post("/api/parse-doc", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Файл не загружен" });
  
    try {
      const buffer = fs.readFileSync(req.file.path);
      const result = await mammoth.extractRawText({ buffer });
  
      const lines = result.value.split("\n").map(line => line.trim()).filter(Boolean);
      const title = lines[0] || "Документ";
      const preview = lines.slice(1, 6).join("\n");
  
      // Удаляем файл после обработки
      fs.unlinkSync(req.file.path);
  
      res.json({ title, preview });
    } catch (err) {
      console.error("Ошибка чтения DOCX:", err);
      res.status(500).json({ error: "Не удалось прочитать документ" });
    }
  });

  app.post("/api/feed/upload", upload.single("file"), async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Необходимо авторизоваться." });
    }

    let userId, firstName, lastName;
    try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, SECRET_KEY);
        userId = decoded.usersId;
        firstName = decoded.firstName;
        lastName = decoded.lastName;
    } catch (err) {
        return res.status(401).json({ message: "Неверный токен" });
    }

    let { title, type, content } = req.body;

    if (!type || !['text', 'video', 'doc'].includes(type)) {
        return res.status(400).json({ error: "Некорректные данные" });
    }

    let finalContent = content;
    let preview = null;

    if (type === 'doc') {
        if (!req.file) {
            return res.status(400).json({ error: "Файл не загружен" });
        }

        const filePath = path.join(__dirname, 'uploads', req.file.filename);
        const fileName = req.file.originalname;

        try {
            const result = await mammoth.extractRawText({ path: filePath });
            const fullText = result.value.trim();

            const lines = fullText.split(/\r?\n/).filter(line => line.trim() !== "");
            preview = lines.slice(0, 5).join("\n");

            title = title || fileName.replace(/\.[^/.]+$/, "");
            finalContent = fullText;
        } catch (err) {
            console.error("Ошибка чтения .doc файла:", err);
            return res.status(500).json({ error: "Ошибка чтения документа" });
        }
    }

    try {
        const result = await pool.query(
            `INSERT INTO feed_items (title, content, type, preview, user_id, first_name, last_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [title, finalContent, type, preview, userId, firstName, lastName]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Ошибка при добавлении материала:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});



  // Получение всех материалов
  app.get("/api/feed", async (req, res) => {
    const { type } = req.query;
    let query = "SELECT * FROM feed_items";
    const values = [];
  
    if (type && ['text', 'video', 'doc'].includes(type)) {
      query += " WHERE type = $1";
      values.push(type);
    }
  
    query += " ORDER BY created_at DESC";
  
    try {
      const result = await pool.query(query, values);
      res.json(result.rows);
    } catch (err) {
      console.error("Ошибка при получении ленты:", err);
      res.status(500).json({ error: "Ошибка сервера" });
    }
  });
app.get("/api/questions/:slug", async (req, res) => {
    const { slug } = req.params;

    try {
        const result = await pool.query(`
            SELECT 
                q.id AS question_id,
                q.text AS question_text,
                q.order_num,
                q.topic_id,
                q.type AS question_type,  -- 👈 добавляем тип вопроса
                a.id AS answer_id,
                a.text AS answer_text,
                a.is_correct
            FROM questions q
            JOIN answers a ON q.id = a.question_id
            WHERE q.topic_slug = $1
            ORDER BY q.order_num, q.id, a.id
        `, [slug]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Вопросы не найдены" });
        }

        const questionsMap = new Map();

        for (const row of result.rows) {
            const questionId = row.question_id;

            if (!questionsMap.has(questionId)) {
                questionsMap.set(questionId, {
                    id: questionId,
                    text: row.question_text,
                    order: row.order_num,
                    topic_id: row.topic_id,
                    type: row.question_type,  // 👈 добавляем сюда
                    answers: []
                });
            }

            questionsMap.get(questionId).answers.push({
                id: row.answer_id,
                text: row.answer_text,
                is_correct: row.is_correct
            });
        }

        res.json(Array.from(questionsMap.values()));
    } catch (err) {
        console.error("Ошибка при получении вопросов:", err.stack || err.message);
        res.status(500).json({ error: "Ошибка сервера при получении вопросов" });
    }
});




// Сохранение ответа на вопрос
app.post("/api/progress/question", async (req, res) => {
    const { userId, topicId, questionIndex, isCorrect, answerGiven, score } = req.body;
    
    try {
        console.log("Saving question progress:", { userId, topicId, questionIndex, isCorrect, answerGiven, score });

        await pool.query(`
            INSERT INTO user_question_progress (user_id, topic_id, question_index, is_correct, answer_given, earned_score)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, topic_id, question_index)
            DO UPDATE SET is_correct = $4, answer_given = $5, earned_score = $6, timestamp = CURRENT_TIMESTAMP
        `, [userId, topicId, questionIndex, isCorrect, answerGiven, score]);

        const topicProgress = await pool.query(`
            SELECT * FROM user_topic_progress WHERE user_id = $1 AND topic_id = $2
        `, [userId, topicId]);

        if (topicProgress.rows.length === 0) {
            await pool.query(`
                INSERT INTO user_topic_progress (user_id, topic_id, total_score, is_completed)
                VALUES ($1, $2, $3, $4)
            `, [userId, topicId, score, false]);
        } else {
            const newScore = topicProgress.rows[0].total_score + score;
            await pool.query(`
                UPDATE user_topic_progress
                SET total_score = $1, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = $2 AND topic_id = $3
            `, [newScore, userId, topicId]);
        }


        const today = new Date().toISOString().slice(0, 10); 
        await pool.query(`
            INSERT INTO user_daily_score (user_id, class_id, section_id, topic_id, date, daily_score)
            VALUES ($1, NULL, NULL, $2, $3, $4)
            ON CONFLICT (user_id, topic_id, date)
            DO UPDATE SET daily_score = user_daily_score.daily_score + $4
        `, [userId, topicId, today, score]);


        res.status(200).json({ message: "Прогресс обновлён" });
    } catch (err) {
        console.error("Ошибка при обновлении прогресса:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
    
});

app.get("/api/progress/daily", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Необходим токен авторизации." });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.usersId;

    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT COALESCE(SUM(daily_score), 0) AS score FROM user_daily_score WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );

    res.status(200).json({ score: result.rows[0].score });
  } catch (err) {
    console.error("Ошибка получения дневного прогресса:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// POST /api/progress/daily — безопасное добавление баллов
app.post("/api/progress/daily", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Необходим токен авторизации." });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.usersId;

    const { topicId, points } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    if (!topicId || typeof points !== "number") {
      return res.status(400).json({ message: "Неверные данные." });
    }

    await pool.query(`
      INSERT INTO user_daily_score (user_id, class_id, section_id, topic_id, date, daily_score)
      VALUES ($1, NULL, NULL, $2, $3, $4)
      ON CONFLICT (user_id, topic_id, date)
      DO UPDATE SET daily_score = user_daily_score.daily_score + $4
    `, [userId, topicId, today, points]);

    const updated = await pool.query(
      `SELECT COALESCE(SUM(daily_score), 0) AS score FROM user_daily_score WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );

    res.status(200).json({ updatedScore: updated.rows[0].score });
  } catch (err) {
    console.error("Ошибка обновления дневного прогресса:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

app.post("/api/progress/topic-read", async (req, res) => {
    const { userId, topicSlug } = req.body;

    try {
        // Получаем topic_id по slug
        const topicResult = await pool.query("SELECT id FROM topics WHERE slug = $1", [topicSlug]);
        if (topicResult.rows.length === 0) {
            return res.status(404).json({ message: "Тема не найдена" });
        }

        const topicId = topicResult.rows[0].id;
        const scoreToAdd = 10;

        // Проверяем, есть ли уже прогресс по теме
        const progressResult = await pool.query(
            "SELECT * FROM user_topic_progress WHERE user_id = $1 AND topic_id = $2",
            [userId, topicId]
        );

        if (progressResult.rows.length === 0) {
            // Если прогресса нет — создаем с 10 баллами
            await pool.query(`
                INSERT INTO user_topic_progress (user_id, topic_id, total_score, is_completed)
                VALUES ($1, $2, $3, false)
            `, [userId, topicId, scoreToAdd]);
        } else {
            // Если прогресс есть — увеличиваем total_score
            await pool.query(`
                UPDATE user_topic_progress
                SET total_score = total_score + $1, last_updated = CURRENT_TIMESTAMP
                WHERE user_id = $2 AND topic_id = $3
            `, [scoreToAdd, userId, topicId]);
        }

        // Также добавим к ежедневному прогрессу
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        await pool.query(`
            INSERT INTO user_daily_score (user_id, class_id, section_id, topic_id, date, daily_score)
            VALUES ($1, NULL, NULL, $2, $3, $4)
            ON CONFLICT (user_id, topic_id, date)
            DO UPDATE SET daily_score = user_daily_score.daily_score + $4
        `, [userId, topicId, today, scoreToAdd]);

        res.status(200).json({ message: `Начислено ${scoreToAdd} баллов за прочтение темы` });
    } catch (err) {
        console.error("Ошибка при сохранении прогресса чтения темы:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

// Получение суммарного прогресса пользователя по всем темам
app.get("/api/progress/total", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Необходимо авторизоваться." });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const userId = decoded.usersId;

        const result = await pool.query(
            `SELECT COALESCE(SUM(total_score), 0) AS total_score FROM user_topic_progress WHERE user_id = $1`,
            [userId]
        );

        res.status(200).json({ total_score: result.rows[0].total_score });
    } catch (err) {
        console.error("Ошибка при получении общего прогресса:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});


// Получение 5 случайных слогов для первого этапа
app.get("/api/typing-race/syllables", async (req, res) => {
    try {
        const result = await pool.query('SELECT syllable FROM syllables_game_tap ORDER BY RANDOM() LIMIT 5');
        const syllables = result.rows.map(row => row.syllable);
        res.status(200).json({ texts: syllables });
    } catch (err) {
        console.error("Ошибка при получении слогов:", err);
        res.status(500).json({ message: "Ошибка при получении слогов." });
    }
});

// Получение 5 случайных слов для второго этапа
app.get("/api/typing-race/words", async (req, res) => {
    try {
        const result = await pool.query('SELECT word FROM words_game_tap ORDER BY RANDOM() LIMIT 5');
        const words = result.rows.map(row => row.word);
        res.status(200).json({ texts: words });
    } catch (err) {
        console.error("Ошибка при получении слов:", err);
        res.status(500).json({ message: "Ошибка при получении слов." });
    }
});

// Получение 5 случайных предложений для третьего этапа
app.get("/api/typing-race/sentences", async (req, res) => {
    try {
        const result = await pool.query('SELECT sentence FROM sentences_game_tap ORDER BY RANDOM() LIMIT 5');
        const sentences = result.rows.map(row => row.sentence);
        res.status(200).json({ texts: sentences });
    } catch (err) {
        console.error("Ошибка при получении предложений:", err);
        res.status(500).json({ message: "Ошибка при получении предложений." });
    }
});
// Сохранение результатов игры
app.post("/api/typing-race/save", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Необходимо авторизоваться." });
    }

    const token = authHeader.split(" ")[1];
    let userId;

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        userId = parseInt(decoded.usersId, 10); 
    } catch (err) {
        return res.status(401).json({ message: "Неверный токен." });
    }

    const { timeTaken, accuracy, score } = req.body;

    if (typeof timeTaken !== "number" || typeof accuracy !== "number" || typeof score !== "number") {
        return res.status(400).json({ message: "Неверные данные для сохранения." });
    }

    try {
        const result = await pool.query(
            `INSERT INTO typing_race_results (user_id, time_taken, accuracy, score, date)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
            [userId, timeTaken, accuracy, score]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Ошибка при сохранении результатов игры:", err);
        res.status(500).json({ message: "Ошибка при сохранении результатов игры." });
    }
});


// Получение истории результатов игры
app.get("/api/typing-race/history", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Необходимо авторизоваться." });
    }

    const token = authHeader.split(" ")[1];
    let userId;

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        userId = parseInt(decoded.usersId, 10);
    } catch (err) {
        return res.status(401).json({ message: "Неверный токен." });
    }

    try {
        const result = await pool.query(
            `SELECT * FROM typing_race_results WHERE user_id = $1 ORDER BY date DESC`,
            [userId]
        );

        res.status(200).json(result.rows);
    } catch (err) {
        console.error("Ошибка при получении истории результатов:", err);
        res.status(500).json({ message: "Ошибка при получении истории." });
    }
});


// Сохранение рекорда (high score)
app.post("/api/typing-race/score", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Необходимо авторизоваться." });
    }

    const token = authHeader.split(" ")[1];
    let userId;

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        userId = parseInt(decoded.usersId, 10);
    } catch (err) {
        return res.status(401).json({ message: "Неверный токен." });
    }

    const { score } = req.body;

    if (typeof score !== "number" || score < 0) {
        return res.status(400).json({ message: "Некорректный счёт." });
    }

    try {
        const existing = await pool.query(
            "SELECT high_score FROM score_game_tap WHERE user_id = $1",
            [userId]
        );

        if (existing.rows.length === 0) {
            await pool.query(
                "INSERT INTO score_game_tap (user_id, high_score) VALUES ($1, $2)",
                [userId, score]
            );
        } else if (score > existing.rows[0].high_score) {
            await pool.query(
                "UPDATE score_game_tap SET high_score = $1 WHERE user_id = $2",
                [score, userId]
            );
        }

        res.status(200).json({ message: "Рекорд сохранён!" });
    } catch (err) {
        console.error("Ошибка при сохранении рекорда:", err);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});


// Получение рекорда (high score)
app.get("/api/typing-race/score", async (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Необходимо авторизоваться." });
    }

    const token = authHeader.split(" ")[1];
    let userId;

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        userId = parseInt(decoded.usersId, 10);
    } catch (err) {
        return res.status(401).json({ message: "Неверный токен." });
    }

    try {
        const result = await pool.query(
            "SELECT high_score FROM score_game_tap WHERE user_id = $1",
            [userId]
        );

        const highScore = result.rows[0]?.high_score || 0;

        res.status(200).json({ highScore });
    } catch (err) {
        console.error("Ошибка при получении рекорда:", err);
        res.status(500).json({ message: "Ошибка сервера" });
    }
});

// Запуск сервера
app.listen(3000, () => {
    console.log("Сервер запущен на bitclass-production.up.railway.app");
});