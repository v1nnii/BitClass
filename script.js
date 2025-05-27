document.addEventListener("DOMContentLoaded", () => {
  const formTitle = document.getElementById("form-title");
  const switchText = document.getElementById("switch-text");
  const submitBtn = document.getElementById("submit-btn");
  const toggleFields = document.querySelectorAll(".toggle-field");
  const authForm = document.getElementById("auth-form");
  const showPasswordCheckbox = document.getElementById("show-password");
  const passwordField = document.getElementById("password");
  const confirmPasswordField = document.getElementById("confirm-password");
  const firstNameField = document.getElementById("first-name");
  const lastNameField = document.getElementById("last-name");

  const API_URL = "https://bitclass-production.up.railway.app";

  let isLogin = true;

  const toggleMode = () => {
    isLogin = !isLogin;

    if (isLogin) {
      formTitle.textContent = "Войдите";
      submitBtn.textContent = "Войти";
      switchText.innerHTML = 'Нет аккаунта? <span id="switch-link">Создайте</span>';
      toggleFields.forEach((field) => (field.style.display = "none"));
      firstNameField.removeAttribute("required");
      lastNameField.removeAttribute("required");
      confirmPasswordField.removeAttribute("required");
    } else {
      formTitle.textContent = "Создайте аккаунт";
      submitBtn.textContent = "Зарегистрироваться";
      switchText.innerHTML = 'Есть аккаунт? <span id="switch-link">Войдите</span>';
      toggleFields.forEach((field) => (field.style.display = "block"));
      firstNameField.setAttribute("required", "true");
      lastNameField.setAttribute("required", "true");
      confirmPasswordField.setAttribute("required", "true");
    }

    authForm.reset();
    document.getElementById("switch-link").addEventListener("click", toggleMode);
  };

  document.getElementById("switch-link").addEventListener("click", toggleMode);

  showPasswordCheckbox.addEventListener("change", () => {
    const type = showPasswordCheckbox.checked ? "text" : "password";
    passwordField.type = type;
    confirmPasswordField.type = type;
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const firstName = firstNameField.value.trim();
    const lastName = lastNameField.value.trim();
    const password = passwordField.value.trim();
    const confirmPassword = confirmPasswordField.value.trim();

    if (!isLogin) {
      if (!email || !firstName || !lastName) {
        alert("Пожалуйста, заполните все поля!");
        return;
      }
      if (password !== confirmPassword) {
        alert("Пароли не совпадают!");
        return;
      }
    }

    try {
      let response;
      if (isLogin) {
        response = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      } else {
        response = await fetch(`${API_URL}/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, firstName, lastName, password }),
        });
      }

      if (response.ok) {
        const result = await response.json();

        if (!isLogin) {
          alert(result.message || "Регистрация успешна. Теперь войдите.");
          isLogin = true;
          toggleMode();
        } else {
          if (result.token && result.usersId) {
            localStorage.setItem("user", JSON.stringify({
              token: result.token,
              usersId: result.usersId
            }));
            localStorage.setItem("token", result.token); 
          }
          
          window.location.href = "main.html";
        }
      } else {
        const errorResult = await response.json();
        alert(errorResult.message || "Произошла ошибка.");
      }
    } catch (error) {
      console.error("Ошибка при запросе:", error);
      alert("Произошла ошибка. Попробуйте еще раз.");
    }

    authForm.reset();
  });
function getTopicProgress(slug) {
  const progressData = JSON.parse(localStorage.getItem("topicProgress") || "{}");
  return progressData[slug] || 0;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".topic-bubble").forEach((el) => {
    const slug = el.dataset.slug;
    const progress = getTopicProgress(slug);

    if (progress === 100) {
      el.classList.add("topic-complete");
    } else if (progress > 0) {
      el.classList.add("topic-partial");
    } else {
      el.classList.add("topic-none");
    }
  });
});

  toggleMode();
});
