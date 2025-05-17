let currentNumber, targetBase;
let score = 0;
let timeLeft = 30;
let timerInterval;

function generateTask() {
  currentNumber = Math.floor(Math.random() * 256) + 1;
  targetBase = Math.random() < 0.5 ? 2 : 16;
  document.getElementById("decimalNumber").textContent = currentNumber;
  document.getElementById("targetSystem").textContent = targetBase === 2 ? "двоичную (2)" : "шестнадцатеричную (16)";
  document.getElementById("userAnswer").value = "";
  document.getElementById("feedback").textContent = "";
  generateHintSteps();
}

function submitAnswer() {
  const userAnswer = document.getElementById("userAnswer").value.trim().toLowerCase();
  const correctAnswer = currentNumber.toString(targetBase);

  if (userAnswer === correctAnswer) {
    score++;
    document.getElementById("score").textContent = score;
    document.getElementById("feedback").textContent = "✅ Верно!";
    generateTask();
  } else {
    document.getElementById("feedback").textContent = "❌ Неверно. Попробуйте ещё.";
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("timeLeft").textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      document.getElementById("feedback").textContent = `⏱️ Время вышло! Итог: ${score} правильных ответов.`;
      document.getElementById("userAnswer").disabled = true;
    }
  }, 1000);
}

function showHint() {
  document.getElementById("hintModal").style.display = "flex";
}

function closeHint() {
  document.getElementById("hintModal").style.display = "none";
}

function generateHintSteps() {
  const stepsContainer = document.getElementById("hintSteps");
  stepsContainer.innerHTML = "";

  let num = currentNumber;
  let steps = [];

  if (targetBase === 2) {
    while (num > 0) {
      const step = `${num} / 2 = ${Math.floor(num / 2)}, остаток ${num % 2}`;
      steps.unshift(step);
      num = Math.floor(num / 2);
    }
  } else if (targetBase === 16) {
    while (num > 0) {
      const rem = num % 16;
      const hex = rem.toString(16).toUpperCase();
      const step = `${num} / 16 = ${Math.floor(num / 16)}, остаток ${rem} (${hex})`;
      steps.unshift(step);
      num = Math.floor(num / 16);
    }
  }

  steps.forEach(s => {
    const p = document.createElement("p");
    p.className = "hint-step";
    p.textContent = s;
    stepsContainer.appendChild(p);
  });
}

// Инициализация
window.onload = function() {
  generateTask();
  startTimer();
};