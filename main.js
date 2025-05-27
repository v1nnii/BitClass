document.addEventListener('DOMContentLoaded', async () => {
    console.log('Страница загружена, начинаем инициализацию.');

    const menuItems = document.querySelectorAll('.menu-item');
    const classLinks = document.querySelectorAll('.class-link');
    const sections = document.querySelectorAll('.content-section');
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    function showSection(sectionId) {
        sections.forEach(section => section.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.add('active');
        }
    }
async function getDailyProgress() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.warn("Нет токена авторизации");
            return 0;
        }

        const response = await fetch('/api/progress/daily', {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            return data.score || 0;
        } else {
            console.error("Ошибка получения дневного прогресса:", response.status);
            return 0;
        }
    } catch (err) {
        console.error("Ошибка при загрузке дневного прогресса:", err);
        return 0;
    }
}

    // Обновить и сохранить дневной прогресс
    function updateDailyProgress(newPoints) {
        const today = new Date().toISOString().slice(0, 10);
        const data = JSON.parse(localStorage.getItem("dailyProgress")) || {};
        const current = data.date === today ? data.score : 0;
        const updated = current + newPoints;

        localStorage.setItem("dailyProgress", JSON.stringify({
            date: today,
            score: updated
        }));

        return updated;
    }
async function loadTotalProgress() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.warn("Нет токена для авторизации");
            return;
        }

        const response = await fetch(`/api/progress/total`, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log("Общий прогресс получен:", data);

            const dailyScore = await getDailyProgress(); 
            updateProgressWidget(data.total_score, dailyScore);
        } else {
            console.error("Ошибка при получении общего прогресса:", response.status);
        }
    } catch (err) {
        console.error("Ошибка при получении общего прогресса:", err);
    }
}


    // Отображение прогресса
    function updateProgressWidget(totalScore, dailyScore) {
        const xpTotal = document.querySelector('.xp-total');
        const progressText = document.querySelector('.progress-text');
        const progressFill = document.querySelector('.progress-fill');

        const dailyGoal = 80;

        if (xpTotal) xpTotal.textContent = `${totalScore} XP`;

        if (progressText && progressFill) {
            progressText.textContent = `${dailyScore}/${dailyGoal} XP`;
            const percent = Math.min((dailyScore / dailyGoal) * 100, 100);
            progressFill.style.width = `${percent}%`;
        } else {
            console.warn("Элементы прогресс-бара не найдены на странице.");
        }
    }
      
      
      
    // Навигация
    menuItems.forEach(item => {
        const sectionId = item.getAttribute('data-section');
        if (!sectionId) return;

        item.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(sectionId);
            history.pushState(null, '', `#${sectionId}`);
        });
    });

    classLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');
            showSection(sectionId);
            history.pushState(null, '', `#${sectionId}`);
        });
    });

    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            dropdownMenu.classList.toggle('show');
            dropdownToggle.classList.toggle('active');
        });
    }

    // Инициализация при загрузке
    const initialHash = window.location.hash.replace('#', '') || 'home';
    showSection(initialHash);

    loadTotalProgress(); 
});
