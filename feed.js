document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modal");
    const openBtn = document.getElementById("addMaterialBtn");
    const closeBtn = modal.querySelector(".close-btn");
    const form = document.getElementById("materialForm");
    const feedContainer = document.getElementById("feedContainer");
    const fileInput = document.getElementById("fileInput");
    const typeSelect = form.querySelector('select[name="type"]');
    const contentInput = form.querySelector('textarea[name="content"]');
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
  
    let allFeedItems = [];
  
    openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  
    window.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  
    typeSelect.addEventListener("change", () => {
      if (typeSelect.value === "doc") {
        fileInput.classList.remove("hidden");
        contentInput.parentElement.classList.add("hidden");
      } else {
        fileInput.classList.add("hidden");
        contentInput.parentElement.classList.remove("hidden");
      }
    });
  
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
  
      try {
        const response = await fetch("/api/feed/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
          body: formData,
        });
  
        if (!response.ok) throw new Error("Ошибка при добавлении материала");
  
        const newMaterial = await response.json();
        allFeedItems.unshift(newMaterial);
        applyFilters();
  
        form.reset();
        fileInput.classList.add("hidden");
        contentInput.parentElement.classList.remove("hidden");
        modal.classList.add("hidden");
      } catch (err) {
        console.error(err);
        alert("Ошибка добавления материала");
      }
    });
  
    function showTextModal(title, content) {
      const modalOverlay = document.createElement("div");
      modalOverlay.classList.add("modal");
  
      modalOverlay.innerHTML = `
        <div class="modal-content">
          <span class="close-btn">&times;</span>
          <h3>${title}</h3>
          <pre style="white-space: pre-wrap; max-height: 400px; overflow-y: auto;">${content}</pre>
        </div>
      `;
  
      const feedSection = document.getElementById("feed");
      feedSection.appendChild(modalOverlay);
  
      modalOverlay.querySelector(".close-btn").addEventListener("click", () => {
        modalOverlay.remove();
      });
  
      modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) {
          modalOverlay.remove();
        }
      });
    }
  
function appendMaterial(item) {
  const card = document.createElement("div");
  card.classList.add("feed-card");

  const title = document.createElement("h3");
  title.textContent = item.title;
  card.appendChild(title);

  const highlightBox = document.createElement("div");
  highlightBox.className = "highlight-box";

  let contentElement;

  if (item.type === "video") {
    contentElement = document.createElement("div");
    contentElement.className = "video-wrapper";

    const url = item.content;
    let embedUrl = "";

    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtube.com")
        ? url.split("v=")[1]?.split("&")[0]
        : url.split("/").pop();
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (url.includes("rutube.ru") || url.includes("vk.com")) {
      embedUrl = url;
    }

    contentElement.innerHTML = embedUrl
      ? `<iframe src="${embedUrl}" allowfullscreen></iframe>`
      : `<a href="${url}" target="_blank">Смотреть видео</a>`;

    highlightBox.appendChild(contentElement);

  } else if (item.type === "doc") {
    contentElement = document.createElement("pre");
    contentElement.className = "doc-preview";
    contentElement.textContent = item.preview || "Документ";
    contentElement.style.cursor = "pointer";
    contentElement.addEventListener("click", () => {
      showTextModal(item.title, item.content);
    });

    highlightBox.appendChild(contentElement);

  } else {
    contentElement = document.createElement("div");
    contentElement.className = "text-content";
    contentElement.textContent = item.content;

    highlightBox.appendChild(contentElement);
  }

  card.appendChild(highlightBox);

  const meta = document.createElement("div");
  meta.className = "meta";

  const author = item.first_name || item.last_name
    ? `${item.first_name || ""} ${item.last_name || ""}`.trim()
    : "Неизвестно";

  const uploaded = item.created_at
    ? new Date(item.created_at).toLocaleString("ru-RU")
    : "Неизвестно";

  meta.textContent = `Тип: ${item.type} | Автор: ${author} | Загружено: ${uploaded}`;
  card.appendChild(meta);

  document.getElementById("feedContainer").appendChild(card);
}

  
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
  
      const formData = new FormData();
      formData.append("file", file);
  
      try {
        const response = await fetch("/api/parse-doc", {
          method: "POST",
          body: formData
        });
  
        if (!response.ok) throw new Error("Ошибка при обработке файла");
  
        const data = await response.json();
        form.querySelector('input[name="title"]').value = data.title || "";
        form.querySelector('textarea[name="content"]').value = data.preview || "";
      } catch (err) {
        console.error("Ошибка загрузки документа:", err);
        alert("Не удалось прочитать документ");
      }
    });
  
    async function loadFeed() {
      try {
        const response = await fetch("/api/feed");
        const data = await response.json();
        allFeedItems = data;
        applyFilters();
      } catch (err) {
        console.error("Ошибка при загрузке ленты:", err);
      }
    }
  
    function renderFeed(items) {
      feedContainer.innerHTML = "";
      items.forEach(appendMaterial);
    }
  
    function applyFilters() {
      const query = searchInput.value.toLowerCase();
      const sortOrder = sortSelect.value;
  
      let filtered = allFeedItems.filter(item =>
        item.title.toLowerCase().includes(query) ||
        (item.content && item.content.toLowerCase().includes(query))
      );
  
      filtered.sort((a, b) => {
        const timeA = new Date(a.created_at);
        const timeB = new Date(b.created_at);
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  
      renderFeed(filtered);
    }
  
    searchInput.addEventListener("input", applyFilters);
    sortSelect.addEventListener("change", applyFilters);
  
    loadFeed();
  });
  