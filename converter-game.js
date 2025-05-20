let decimalNumber, targetSystem, score = 0, timeLeft = 30, timer;
const bases = [2, 16];
function pad(num) {
  return num.toString().padStart(3, ' ');
}

function startGame() {
  decimalNumber = Math.floor(Math.random() * 256);
  targetSystem = bases[Math.floor(Math.random() * bases.length)];
  document.getElementById("decimalNumber").textContent = decimalNumber;
  document.getElementById("targetSystem").textContent =
    targetSystem === 2 ? "двоичную (2)" : "шестнадцатеричную (16)";
  document.getElementById("userAnswer").value = "";
  document.getElementById("feedback").textContent = "";

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
  document.getElementById("hintFeedback").textContent = "";
  document.getElementById("hintModal").style.display = "block";
  updateHintTable();
}

function updateHintTable() {
  const base = targetSystem;
  let html = `<pre><strong>${decimalNumber} | ${base}</strong>\n`;

  // Отображаем уже выполненные шаги
  let currentValue = decimalNumber;
  for (let i = 0; i < hintSteps.length; i++) {
    const q = Math.floor(currentValue / base);
    const r = currentValue % base;
    html += `${pad(q)}   остаток: ${r.toString(base)}\n`;
    currentValue = q;
  }

  // Текущий шаг — пользовательский ввод
  if (currentValue > 0) {
    html += `\n<strong>${pad(currentValue)} | ${base}</strong>\n`;
    html += `
      <div style="display: flex; gap: 10px; align-items: center;">
        <input type="text" id="quotientInput" placeholder="Частное" style="width: 80px;">
        <input type="text" id="remainderInput" placeholder="Остаток" style="width: 80px;">
        <button onclick="submitHintStep()">Далее</button>
      </div>
    `;
  } else {
    // Все шаги завершены, просим ввести итоговый ответ
    const reversed = [...hintSteps].reverse();
    const correctAnswer = reversed.join("");
    const userFinal = prompt(`Введите результат (снизу вверх):\n${reversed.join(" ")}`);
    if (userFinal === correctAnswer) {
      alert("✅ Молодец! Всё правильно!");
    } else {
      alert(`❌ Почти! Правильный ответ: ${correctAnswer}`);
    }
    closeHint();
    return;
  }

  html += `</pre>`;
  document.getElementById("currentStepValue").innerHTML = html;
}




function closeHint() {
  document.getElementById("hintModal").style.display = "none";
}
function submitHintStep() {
  const base = targetSystem;
  const qInput = parseInt(document.getElementById("quotientInput").value.trim());
  const rInput = document.getElementById("remainderInput").value.trim().toLowerCase();

  const current = hintSteps.reduce((val, step) => Math.floor(val / base), decimalNumber);
  const expectedQ = Math.floor(current / base);
  const expectedR = current % base;
  const expectedRStr = expectedR.toString(base);

  if (qInput === expectedQ && rInput === expectedRStr) {
    hintSteps.push(expectedRStr);
    document.getElementById("hintFeedback").textContent = "✅ Верно!";
    updateHintTable();
  } else {
    document.getElementById("hintFeedback").textContent = "❌ Неверно. Попробуйте снова.";
  }
}



startGame();
