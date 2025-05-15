const displayText = document.getElementById('displayText');
const userInput = document.getElementById('userInput');
const restartBtn = document.getElementById('restartBtn');
const accuracyDisplay = document.getElementById('accuracyDisplay');
const wpmDisplay = document.getElementById('wpmDisplay');
const recordValue = document.getElementById('recordValue');
const scoreDisplay = document.getElementById('scoreDisplay');
const timeBar = document.getElementById('timeBar');

let targetTexts = [];
let currentTextIndex = 0;
let startTime = null;
let level = 1;
let score = 0;
let timer;
let timeLeft = 30;
let maxTime = 30;

let totalKeystrokes = 0;
let totalErrors = 0;

// Получение рекорда с сервера
async function fetchRecord() {
  try {
    const response = await fetch("/api/typing-race/score", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
    });
    const data = await response.json();
    if (data.highScore !== undefined) {
      recordValue.textContent = data.highScore;
    }
  } catch (err) {
    console.warn("Ошибка при получении рекорда", err);
  }
}

// Сохранение рекорда
async function saveRecord(score) {
  try {
    await fetch("/api/typing-race/score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("token"),
      },
      body: JSON.stringify({ score }),
    });
    fetchRecord();
  } catch (err) {
    console.warn("Ошибка при сохранении рекорда", err);
  }
}

// Получение текста (по 15 на уровень)
async function fetchText(level) {
  let url = '';
  switch (level) {
    case 1: url = '/api/typing-race/syllables'; break;
    case 2: url = '/api/typing-race/words'; break;
    case 3: url = '/api/typing-race/sentences'; break;
    default: url = '/api/typing-race/sentences';
  }

  const response = await fetch(url);
  const data = await response.json();
  return data.texts.slice(0, 15); // Ограничение до 15
}

// Отображение текста
function renderText() {
  const typed = userInput.value;
  let html = "";

  for (let i = 0; i < targetTexts[currentTextIndex].length; i++) {
    const char = targetTexts[currentTextIndex][i];
    const typedChar = typed[i];

    if (typedChar == null) {
      html += `<span>${char}</span>`;
    } else if (typedChar === char) {
      html += `<span class="correct">${char}</span>`;
    } else {
      html += `<span class="wrong">${char}</span>`;
    }
  }

  displayText.innerHTML = html;
}

// Таймер
function startTimer() {
  timeLeft = maxTime;
  updateTimeBar();

  timer = setInterval(() => {
    timeLeft -= 0.1;
    if (timeLeft <= 0) {
      clearInterval(timer);
      endGame();
    }
    updateTimeBar();
  }, 100);
}

function updateTimeBar() {
  const widthPercent = Math.max(0, (timeLeft / maxTime) * 100);
  timeBar.style.width = `${widthPercent}%`;
}

function endGame() {
  userInput.disabled = true;
  clearInterval(timer);
  saveRecord(score);

  const endTime = Date.now();
  const duration = startTime ? (endTime - startTime) / 1000 : 1;
  const typed = userInput.value;
  const target = targetTexts[Math.min(currentTextIndex, targetTexts.length - 1)] || "";

  let currentErrors = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] !== target[i]) {
      currentErrors++;
    }
  }

  totalErrors += currentErrors;
  totalKeystrokes += typed.length;

  const accuracy = totalKeystrokes > 0
    ? Math.max(0, Math.round(((totalKeystrokes - totalErrors) / totalKeystrokes) * 100))
    : 0;

  const words = target.trim().split(/\s+/).length || 1;
  const wpm = Math.round((words / duration) * 60);

  showGameOverModal(accuracy, wpm, score);
}

// Сброс игры
function resetGame() {
  clearInterval(timer);
  score = 0;
  level = 1;
  totalKeystrokes = 0;
  totalErrors = 0;

  scoreDisplay.textContent = score;
  accuracyDisplay.textContent = '–';
  wpmDisplay.textContent = '–';

  startGame();
}

// Запуск игры
async function startGame() {
  userInput.disabled = false;
  userInput.value = "";
  userInput.focus();

  targetTexts = await fetchText(level);
  currentTextIndex = 0;

  totalKeystrokes = 0;
  totalErrors = 0;
  startTime = null;

  clearInterval(timer);
  renderText();
  startTimer();
}

// Обработка ввода
userInput.addEventListener("input", () => {
  if (!startTime) startTime = Date.now();

  renderText();

  const target = targetTexts[currentTextIndex];
  const typed = userInput.value;

  totalKeystrokes++;

  let currentErrors = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] !== target[i]) {
      currentErrors++;
    }
  }

  totalErrors += currentErrors;

  const accuracy = totalKeystrokes > 0
    ? Math.max(0, Math.round(((totalKeystrokes - totalErrors) / totalKeystrokes) * 100))
    : 100;

  accuracyDisplay.textContent = `${accuracy}%`;

  if (typed === target) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const words = target.trim().split(/\s+/).length || 1;
    const wpm = Math.round((words / duration) * 60);

    wpmDisplay.textContent = wpm;

    score += Math.max(1, Math.round(wpm * (accuracy / 100)));
    scoreDisplay.textContent = score;

    timeLeft = Math.min(maxTime, timeLeft + 3);

    currentTextIndex++;
    userInput.value = "";

    if (currentTextIndex < targetTexts.length) {
      renderText();
      startTime = Date.now();
    } else {
      if (level < 3) {
        level++;
        startGame();
      } else {
        endGame();
      }
    }
  }
});

// Перезапуск
restartBtn.addEventListener("click", resetGame);

// Инициализация
window.onload = () => {
  fetchRecord();
  startGame();
};

// Модалка завершения
function showGameOverModal(accuracy, wpm, score) {
  document.getElementById("modalAccuracy").textContent = accuracy + "%";
  document.getElementById("modalWPM").textContent = wpm;
  document.getElementById("modalScore").textContent = score;
  document.getElementById("gameOverModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("gameOverModal").classList.add("hidden");
}
function handleRestart() {
  closeModal();  
  resetGame();   
}
function goToMain() {
  window.location.href = "main.html";
}
document.getElementById("logo").addEventListener("click", () => {
  window.location.href = "main.html";
});

