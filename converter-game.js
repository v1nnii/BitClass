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
  const base = targetSystem;
  let value = decimalNumber;
  let steps = [];

  // Вычисляем шаги деления
  while (value > 0) {
    const quotient = Math.floor(value / base);
    const remainder = value % base;
    steps.push({ dividend: value, quotient, remainder });
    value = quotient;
  }

  // Строим HTML для визуализации
  let visual = `<pre><strong>${decimalNumber} | ${base}</strong>\n`;
  steps.forEach(step => {
    visual += `  ${step.quotient.toString(base)}  остаток: ${step.remainder.toString(base)}\n`;
  });
  visual += `</pre>`;

  document.getElementById("currentStepValue").innerHTML = visual;
  document.getElementById("hintModal").style.display = "block";
}



function closeHint() {
  document.getElementById("hintModal").style.display = "none";
}
function submitHintStep() {
  const q = parseInt(document.getElementById("quotientInput").value);
  const r = document.getElementById("remainderInput").value.trim().toLowerCase();

  const base = targetSystem;
  const expectedR = hintValue % base;
  const expectedQ = Math.floor(hintValue / base);

  // Ожидаемый остаток как символ
  const expectedRStr = expectedR.toString(base);

  if (r === expectedRStr && q === expectedQ) {
    hintSteps.push(expectedRStr);
    hintValue = q;
    document.getElementById("hintFeedback").textContent = "✅ Верно!";
    if (hintValue === 0) {
      const correctAnswer = hintSteps.reverse().join("");
      setTimeout(() => {
        const userFinal = prompt(`Введите полученное число в системе счисления ${base}:\n(${hintSteps.reverse().join(" ")})`);
        if (userFinal === correctAnswer) {
          alert("✅ Молодец! Это правильный ответ.");
        } else {
          alert(`❌ Неверно. Правильный ответ: ${correctAnswer}`);
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
