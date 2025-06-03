document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  const introSection = document.getElementById("section-intro");
  const quizSection = document.getElementById("section-quiz");
  const textBox = document.querySelector(".text-box");
  const toQuizBtn = document.getElementById("to-quiz");
  const questionText = document.getElementById("question-text");
  const answersContainer = document.getElementById("answers-container");
  const nextBtn = document.getElementById("next-question");
  const progressBar = document.getElementById("progress-bar");

  let questions = [];
  let currentQuestionIndex = 0;
  let score = 0;
  let dailyScore = 0;
  let totalScore = 0;

  toQuizBtn.disabled = true;

  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const token = userData?.token;
  const userId = userData?.usersId;

  async function getDailyProgressFromServer() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const response = await fetch(`/api/progress/daily?userId=${userId}&date=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Ошибка загрузки прогресса");
      const data = await response.json();
      return data.score || 0;
    } catch (err) {
      console.error(err);
      return 0;
    }
  }

  async function updateDailyProgressOnServer(points) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const response = await fetch(`/api/progress/daily`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, date: today, points })
      });
      const data = await response.json();
      return data.updatedScore ?? dailyScore + points;
    } catch (err) {
      console.error("Ошибка при обновлении дневного прогресса:", err);
      return dailyScore;
    }
  }

  function updateProgressWidget(newTotal, newDaily) {
    const xpTotal = document.querySelector('.xp-total');
    const progressText = document.querySelector('.progress-text');
    const progressFill = document.querySelector('.progress-fill');

    const dailyGoal = 80;

    if (xpTotal) xpTotal.textContent = `${newTotal} XP`;
    if (progressText && progressFill) {
      progressText.textContent = `${newDaily}/${dailyGoal} XP`;
      progressFill.style.width = `${Math.min((newDaily / dailyGoal) * 100, 100)}%`;
    }
  }

  // Проверка наличия slug
  if (!slug) {
    textBox.textContent = "Не указан slug темы.";
    return;
  }

  // Загрузка темы
  try {
    const topicRes = await fetch(`/api/topic/${slug}`);
    const topicData = await topicRes.json();
    if (topicData?.content_md) {
      textBox.innerHTML = marked.parse(topicData.content_md);
      toQuizBtn.disabled = false;
    } else {
      textBox.textContent = "Контент не найден.";
    }
  } catch (err) {
    textBox.textContent = "Ошибка загрузки темы: " + err.message;
  }

  // Загрузка вопросов
  try {
    const questionsRes = await fetch(`/api/questions/${slug}`);
    const questionsData = await questionsRes.json();
    if (Array.isArray(questionsData) && questionsData.length > 0) {
      questions = questionsData;
      const totalSteps = questions.length + 1;
      progressBar.innerHTML = "";
      for (let i = 0; i < totalSteps; i++) {
        const square = document.createElement("div");
        square.classList.add("progress-square");
        progressBar.appendChild(square);
      }
    } else {
      toQuizBtn.textContent = "Нет доступных вопросов";
      toQuizBtn.disabled = true;
    }
  } catch (err) {
    toQuizBtn.textContent = "Ошибка загрузки";
    toQuizBtn.disabled = true;
    console.error("Ошибка загрузки вопросов:", err);
  }

  // Загрузка текущего дневного прогресса
  if (token && userId) {
    dailyScore = await getDailyProgressFromServer();
    totalScore = dailyScore;
    updateProgressWidget(totalScore, dailyScore);
  }

  // Запуск теста
  toQuizBtn.addEventListener("click", () => {
    introSection.style.display = "none";
    quizSection.style.display = "block";
    markProgress(0);
    saveReadProgress();
    showQuestion();
  });

  function showQuestion() {
  if (currentQuestionIndex >= questions.length) return showResult();

  const question = questions[currentQuestionIndex];
  questionText.textContent = `Вопрос ${currentQuestionIndex + 1}: ${question.text}`;
  answersContainer.innerHTML = "";
  nextBtn.style.display = "none";

  if (question.type === "choice") {
    // Варианты с кнопками
    question.answers.forEach(answer => {
      const btn = document.createElement("button");
      btn.textContent = answer.text;
      btn.className = "answer-button";
      btn.addEventListener("click", () => handleAnswerClick(btn, answer));
      answersContainer.appendChild(btn);
    });
} else if (question.type === "text") {
  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.flexDirection = "column";
  wrapper.style.alignItems = "center";
  wrapper.style.width = "100%";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Введите ответ";
  input.className = "answer-input long-center";

  const actionBtn = document.createElement("button");
  actionBtn.textContent = "Ответить";
  actionBtn.className = "submit-answer-button bottom-left";

  wrapper.appendChild(input);
  answersContainer.appendChild(wrapper);
  answersContainer.appendChild(actionBtn);

  let hasAnswered = false;

  actionBtn.addEventListener("click", () => {
    if (!hasAnswered) {
      const userAnswer = input.value.trim();
      if (!userAnswer) {
        alert("Пожалуйста, введите ответ");
        return;
      }

      const isCorrect = handleTextAnswer(userAnswer, input);
      hasAnswered = true;

      actionBtn.textContent = "Следующий вопрос";
    } else {
      currentQuestionIndex++;
      showQuestion();
    }
  });
}else {
    // Если тип неизвестен, просто пропустить вопрос
    nextBtn.style.display = "inline-block";
  }
}

function handleTextAnswer(userAnswer, inputElem) {
  const question = questions[currentQuestionIndex];
  const correctAnswer = question.answers.find(a => a.is_correct)?.text.trim().toLowerCase();

  const isCorrect = correctAnswer === userAnswer.toLowerCase();

  if (isCorrect) {
    inputElem.classList.add("correct");
    score += 10;

    if (token && userId) {
      updateDailyProgressOnServer(10).then(updated => {
        dailyScore = updated;
        totalScore += 10;
        updateProgressWidget(totalScore, dailyScore);
      });
    }
  } else {
    inputElem.classList.add("wrong");
  }

  inputElem.disabled = true;
  markProgress(currentQuestionIndex + 1);
  saveAnswerProgress({ text: userAnswer }, isCorrect);

  return isCorrect;
}




  function handleAnswerClick(button, answer) {
    const isCorrect = answer.is_correct;

    if (isCorrect) {
      button.classList.add("correct");
      score += 10;

      if (token && userId) {
        updateDailyProgressOnServer(10).then(updated => {
          dailyScore = updated;
          totalScore += 10;
          updateProgressWidget(totalScore, dailyScore);
        });
      }
    } else {
      button.classList.add("wrong");
    }

    Array.from(answersContainer.children).forEach(b => {
      b.disabled = true;
      if (b.textContent === getCorrectAnswerText()) {
        b.classList.add("correct");
      }
    });

    markProgress(currentQuestionIndex + 1);
    saveAnswerProgress(answer, isCorrect);
    nextBtn.style.display = "inline-block";
  }

  function getCorrectAnswerText() {
    const correct = questions[currentQuestionIndex]?.answers.find(a => a.is_correct);
    return correct?.text || "";
  }

  nextBtn.addEventListener("click", () => {
    currentQuestionIndex++;
    showQuestion();
  });

  function markProgress(index) {
    const squares = document.querySelectorAll(".progress-square");
    if (squares[index]) squares[index].classList.add("done");
  }

  function saveAnswerProgress(answer, isCorrect) {
    if (!token || !userId) return;
    const currentQuestion = questions[currentQuestionIndex];
    const payload = {
      userId,
      topicId: currentQuestion.topic_id,
      questionIndex: currentQuestionIndex,
      isCorrect,
      answerGiven: answer.text,
      score: isCorrect ? 10 : 0,
    };

    fetch("/api/progress/question", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }).catch(err => {
      console.error("Ошибка при сохранении прогресса:", err);
    });
  }

  function saveReadProgress() {
    if (!token || !userId) return;
    fetch("/api/progress/topic-read", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, topicSlug: slug }),
    }).catch(err => {
      console.error("Ошибка при сохранении прочтения:", err);
    });
  }

  function showResult() {
    const total = questions.length;
    const percent = Math.round((score / (total * 10)) * 100);

    quizSection.innerHTML = `
      <div class="result-container">
        <h2>🎉 Тест завершён!</h2>
        <p>Вы набрали: <strong>${score} XP</strong> из <strong>${total * 10} XP</strong></p>
        <p>Результат: <strong>${percent}%</strong></p>
        <div class="result-buttons-corner">
          <button class="restart-button" id="restart-quiz">Пройти снова</button>
          <button class="finish-button" id="go-home">На главную</button>
        </div>
      </div>
    `;

    document.getElementById("restart-quiz").addEventListener("click", () => {
      window.location.reload();
    });

    document.getElementById("go-home").addEventListener("click", () => {
      window.location.href = "/main.html";
    });
  }
});
