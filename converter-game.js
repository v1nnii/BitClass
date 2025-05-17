let decimalNumber, targetSystem, score = 0, timeLeft = 30, timer;
const bases = [2, 16];

function startGame() {
  decimalNumber = Math.floor(Math.random() * 256);
  targetSystem = bases[Math.floor(Math.random() * bases.length)];
  document.getElementById("decimalNumber").textContent = decimalNumber;
  document.getElementById("targetSystem").textContent =
    targetSystem === 2 ? "двоичную (2)" : "шестнадцатеричную (16)";
  document.getElementById("userAnswer").value = "";
  document.getElementById("feedback").textContent = "";
  timeLeft = 30;
  document.getElementById("timeLeft").textContent = timeLeft;

  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    document.getElementById("timeLeft").textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      alert("⏰ Время вышло!");
      startGame();
    }
  }, 1000);
}

function submitAnswer() {
  const userAnswer = document.getElementById("userAnswer").value.trim().toLowerCase();
  const correctAnswer = decimalNumber.toString(targetSystem);
  if (userAnswer === correctAnswer) {
    score++;
    document.getElementById("score").textContent = score;
    document.getElementById("feedback").textContent = "✅ Верно!";
    startGame();
  } else {
    document.getElementById("feedback").textContent = "❌ Неверно. Попробуйте снова.";
  }
}

// Подсказка — шаги
let hintValue = 0;
let hintSteps = [];

function openHint() {
  hintValue = decimalNumber;
  hintSteps = [];
  document.getElementById("currentStepValue").textContent = hintValue;
  document.getElementById("quotientInput").value = "";
  document.getElementById("remainderInput").value = "";
  document.getElementById("hintFeedback").textContent = "";
  document.getElementById("hintModal").style.display = "block";
}

function closeHint() {
  document.getElementById("hintModal").style.display = "none";
}

function submitHintStep() {
  const q = parseInt(document.getElementById("quotientInput").value);
  const r = parseInt(document.getElementById("remainderInput").value);
  const expectedR = hintValue % 2;
  const expectedQ = Math.floor(hintValue / 2);

  if (r === expectedR && q === expectedQ) {
    hintSteps.push(r);
    hintValue = q;
    document.getElementById("hintFeedback").textContent = "✅ Верно!";
    if (hintValue === 0) {
      const correctBinary = hintSteps.reverse().join("");
      setTimeout(() => {
        const userFinal = prompt(`Введите полученное двоичное число из остатков:\n(${hintSteps.reverse().join(" ")})`);
        if (userFinal === correctBinary) {
          alert("✅ Молодец! Это правильный ответ.");
        } else {
          alert(`❌ Неверно. Правильный ответ: ${correctBinary}`);
        }
        closeHint();
      }, 500);
    } else {
      document.getElementById("quotientInput").value = "";
      document.getElementById("remainderInput").value = "";
      document.getElementById("currentStepValue").textContent = hintValue;
    }
  } else {
    document.getElementById("hintFeedback").textContent = "❌ Неправильно. Попробуйте ещё раз.";
  }
}

startGame();
