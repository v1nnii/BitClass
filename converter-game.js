let currentDecimal = 0;
let currentSystem = 'binary';
let score = 0;
let timeLeft = 30;
let timer;

const decimalNumberSpan = document.getElementById("decimalNumber");
const targetSystemSpan = document.getElementById("targetSystem");
const timeLeftSpan = document.getElementById("timeLeft");
const scoreSpan = document.getElementById("score");
const feedback = document.getElementById("feedback");

function startGame() {
  score = 0;
  timeLeft = 30;
  scoreSpan.textContent = score;
  timeLeftSpan.textContent = timeLeft;
  nextQuestion();
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timeLeftSpan.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      endGame();
    }
  }, 1000);
}

function nextQuestion() {
  currentDecimal = Math.floor(Math.random() * 31);
  currentSystem = Math.random() > 0.5 ? 'binary' : 'hex';

  decimalNumberSpan.textContent = currentDecimal;
  targetSystemSpan.textContent = currentSystem === 'binary' ? 'двоичную' : 'шестнадцатеричную';
  document.getElementById("userAnswer").value = '';
  feedback.textContent = '';
}

function submitAnswer() {
  const userInput = document.getElementById("userAnswer").value.trim().toLowerCase();
  let correctAnswer = '';
  if (currentSystem === 'binary') {
    correctAnswer = currentDecimal.toString(2);
  } else {
    correctAnswer = currentDecimal.toString(16);
  }
  if (userInput === correctAnswer) {
    score++;
    scoreSpan.textContent = score;
    feedback.style.color = 'green';
    feedback.textContent = 'Верно!';
  } else {
    feedback.style.color = 'red';
    feedback.textContent = `Неверно. Правильный ответ: ${correctAnswer}`;
  }
  nextQuestion();
}

function endGame() {
  feedback.textContent = `⏰ Время вышло! Ваш счёт: ${score}`;
  feedback.style.color = '#000';
  document.getElementById("decimalNumber").textContent = '–';
  document.getElementById("targetSystem").textContent = '–';
}

// Автоматический запуск игры при загрузке
window.onload = startGame;
