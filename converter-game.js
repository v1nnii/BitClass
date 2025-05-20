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

  document.getElementById("hintModal").style.display = "block";
  document.getElementById("hintFeedback").textContent = "";
  updateHintDisplay();
}
function updateHintDisplay() {
  const base = targetSystem;

  let html = `<pre><strong>${hintValue} | ${base}</strong></pre>`;
  html += `
    <p>Введите <strong>частное</strong> и <strong>остаток</strong>:</p>
    <input type="text" id="quotientInput" placeholder="Частное">
    <input type="text" id="remainderInput" placeholder="Остаток">
    <br>
    <button onclick="submitHintStep()">Далее</button>
  `;
  document.getElementById("currentStepValue").innerHTML = html;
}




function closeHint() {
  document.getElementById("hintModal").style.display = "none";
}
function submitHintStep() {
  const base = targetSystem;
  const q = parseInt(document.getElementById("quotientInput").value);
  const rInput = document.getElementById("remainderInput").value.trim().toLowerCase();

  const expectedQ = Math.floor(hintValue / base);
  const expectedR = hintValue % base;
  const expectedRStr = expectedR.toString(base);

  if (q === expectedQ && rInput === expectedRStr) {
    hintSteps.push(expectedRStr);
    hintValue = q;

    if (hintValue === 0) {
      const correctAnswer = [...hintSteps].reverse().join("");
      const userFinal = prompt(`Введите итоговое число снизу вверх (остатки):\n${hintSteps.reverse().join(" ")}`);
      if (userFinal === correctAnswer) {
        alert("✅ Молодец! Всё правильно!");
      } else {
        alert(`❌ Почти! Правильный ответ: ${correctAnswer}`);
      }
      closeHint();
    } else {
      document.getElementById("hintFeedback").textContent = "✅ Верно!";
      updateHintDisplay();
    }
  } else {
    document.getElementById("hintFeedback").textContent = "❌ Неверно. Попробуйте снова.";
  }
}


startGame();
