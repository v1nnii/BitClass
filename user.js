// Загрузка данных пользователя
async function fetchUserData() {
    const token = localStorage.getItem('token');
    const userProfileSidebar = document.querySelector('.user-profile'); // Профиль в сайт-баре
    const userProfileExchange = document.querySelector('.exchange-user-profile'); // Профиль на странице "Обмен"
    const notificationElement = document.querySelector('.notification');

    function displayNotification(message, type = 'error') {
        if (notificationElement) {
            notificationElement.textContent = message;
            notificationElement.style.color = type === 'error' ? 'red' : 'green';
            notificationElement.style.display = 'block';
            setTimeout(() => {
                notificationElement.style.display = 'none';
            }, 5000);
        }
    }

    if (!token) {
        displayNotification('Авторизация отсутствует. Перенаправление...');
        setTimeout(() => window.location.href = "index.html", 2000);
        return;
    }
    try {
        const response = await fetch('bitclass-production.up.railway.app/api/users', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
            const user = await response.json();

            // Заполнение данных в сайт-баре
            if (userProfileSidebar) {
                userProfileSidebar.querySelector('.user-name').textContent = `${user.firstName} ${user.lastName}`;
                const userImageSidebar = userProfileSidebar.querySelector('.user-image');
                if (userImageSidebar) {
                    userImageSidebar.src = user.profileImage || '';
                    userImageSidebar.style.display = user.profileImage ? 'block' : 'none';
                }
            }

        
        } else {
            displayNotification('Ошибка при получении данных пользователя.');
        }
    } catch {
        displayNotification('Ошибка сети.');
    }
}

// Вызов функции загрузки данных пользователя
fetchUserData();
