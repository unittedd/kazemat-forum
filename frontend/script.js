
    document.addEventListener("DOMContentLoaded", function () {
      // Получаем объект пользователя из sessionStorage
      const user = JSON.parse(sessionStorage.getItem("currentUser"));

      // Проверяем, существует ли объект пользователя
      if (!user) {
        // Если пользователь не найден, перенаправляем на страницу входа
        window.location.href = "login.html";
      } else {
        // Получаем ссылки на админ-панель и панель модератора
        const adminPanelLink = document.getElementById("admin-panel-link");
        const moderatorPanelLink = document.getElementById("moderator-panel-link");

        // Если роль пользователя - Администратор (role_id === 1), показываем админ-панель
        if (user.role_id === 1) {
          adminPanelLink.style.display = "inline-block";  // Показываем ссылку
        } else {
          adminPanelLink.style.display = "none";  // Скрываем ссылку
        }

        // Если роль пользователя - Модератор (role_id === 2), показываем панель модератора
        if (user.role_id === 2) {
          moderatorPanelLink.style.display = "inline-block";  // Показываем ссылку
        } else {
          moderatorPanelLink.style.display = "none";  // Скрываем ссылку
        }
      }
    });

    function logout() {
      // Логика выхода пользователя (очистка sessionStorage)
      sessionStorage.removeItem("currentUser");
      window.location.href = "login.html";
    }


    document.getElementById("feedbackForm").addEventListener("submit", async function (e) {
      e.preventDefault();
  
      const formData = {
          name: document.getElementById("name").value,
          email: document.getElementById("email").value,
          message: document.getElementById("message").value
      };
  
      try {
          const response = await fetch("https://kazemat-forum.onrender.com/feedback", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json"
              },
              body: JSON.stringify(formData)
          });
  
          const data = await response.json();
          document.getElementById("feedbackResponse").textContent = data.message;
          this.reset();
      } catch (error) {
          console.error("Ошибка:", error);
          document.getElementById("feedbackResponse").textContent = "Ошибка отправки формы";
      }
  });
  
