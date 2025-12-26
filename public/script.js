const API_BASE = "";
const DEFAULT_UNI = "Yessenov University (Актау)";

const categories = [
  "Помогу с курсовой / дипломом",
  "Решу задачи по математике / физике / информатике",
  "Репетиторство",
  "Дизайн презентаций / постеров",
  "Программирование (сайты, боты, скрипты)",
  "Переводы (казахский/русский/английский и др.)",
  "Конспекты, шпаргалки, помощь перед экзаменом",
  "Поиск тиммейтов для проектов / хакатонов",
  "Аренда/поиск комнаты или соседа по общежитию",
];

const state = {
  user: JSON.parse(localStorage.getItem("studykwork_user") || localStorage.getItem("studx_user") || "null"),
  token: localStorage.getItem("studykwork_token") || localStorage.getItem("studx_token") || "",
  favorites: new Set(
    JSON.parse(localStorage.getItem("studykwork_favorites") || localStorage.getItem("studx_favorites") || "[]")
  ),
};

let adsCache = [];
let uploadImages = [];

const sectionButtons = document.querySelectorAll("[data-section]");
const sections = document.querySelectorAll(".section");
const adsGrid = document.querySelector("#adsGrid");
const searchInput = document.querySelector("#search");
const categorySelect = document.querySelector("#category");
const universitySelect = document.querySelector("#university");
const priceMinInput = document.querySelector("#priceMin");
const priceMaxInput = document.querySelector("#priceMax");
const adForm = document.querySelector("#adForm");
const adCategory = document.querySelector("#adCategory");
const imageInput = document.querySelector("#adImages");
const imagePreview = document.querySelector("#imagePreview");
const myAdsList = document.querySelector("#myAdsList");
const favoritesList = document.querySelector("#favoritesList");
const myAdsCount = document.querySelector("#myAdsCount");
const favCount = document.querySelector("#favCount");
const statsTotal = document.querySelector("#statsTotal");
const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");
const currentUser = document.querySelector("#currentUser");
const loginToggle = document.querySelector("#loginToggle");
const brandHome = document.querySelector("#brandHome");
const backToFeed = document.querySelector("#backToFeed");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

const adViewSection = document.querySelector("#ad-view");
const adViewTitle = document.querySelector("#adViewTitle");
const adViewMain = document.querySelector("#adViewMain");
const adViewGallery = document.querySelector("#adViewGallery");
const adViewCategory = document.querySelector("#adViewCategory");
const adViewMeta = document.querySelector("#adViewMeta");
const adViewPrice = document.querySelector("#adViewPrice");
const adViewDescription = document.querySelector("#adViewDescription");
const adViewContacts = document.querySelector("#adViewContacts");
const adViewFav = document.querySelector("#adViewFav");
const adViewChat = document.querySelector("#adViewChat");
const adViewCall = document.querySelector("#adViewCall");

function saveFavorites() {
  localStorage.setItem("studykwork_favorites", JSON.stringify([...state.favorites]));
  localStorage.removeItem("studx_favorites");
}

function saveAuth() {
  if (state.user && state.token) {
    localStorage.setItem("studykwork_user", JSON.stringify(state.user));
    localStorage.setItem("studykwork_token", state.token);
  } else {
    localStorage.removeItem("studykwork_user");
    localStorage.removeItem("studykwork_token");
  }
  localStorage.removeItem("studx_user");
  localStorage.removeItem("studx_token");
}

function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

function showSection(id) {
  sections.forEach((section) => {
    section.classList.toggle("active", section.id === id);
  });
  if (id !== "ad-view" && location.pathname.startsWith("/ad/")) {
    history.replaceState({}, "", "/");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

sectionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    showSection(btn.dataset.section);
    history.pushState({}, "", "/");
  });
});

brandHome.addEventListener("click", () => {
  showSection("hero");
  history.pushState({}, "", "/");
});

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    tabPanels.forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const panel = document.querySelector(`#tab-${btn.dataset.tab}`);
    if (panel) panel.classList.add("active");
  });
});

function populateSelect(select, options, placeholder = "Любой") {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

function refreshFilters() {
  populateSelect(categorySelect, categories, "Любая");
  populateSelect(adCategory, categories, "Выбери категорию");
  populateSelect(universitySelect, [DEFAULT_UNI], DEFAULT_UNI);
  universitySelect.value = DEFAULT_UNI;
}

function renderAds(list) {
  adsGrid.innerHTML = "";
  if (!list.length) {
    adsGrid.innerHTML = `<div class="card" style="grid-column: 1 / -1;">Ничего не найдено. Попробуй другие фильтры.</div>`;
    return;
  }

  list.forEach((ad) => {
    const card = document.createElement("article");
    card.className = "ad-card";

    const img = document.createElement("img");
    img.className = "ad-thumb";
    img.src = ad.images?.[0] || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=50";
    img.alt = ad.title;
    img.addEventListener("click", () => openAdPage(ad.id));

    const pill = document.createElement("span");
    pill.className = "pill neutral";
    pill.textContent = ad.category;

    const title = document.createElement("h3");
    title.className = "ad-title";
    title.textContent = ad.title;

    const meta = document.createElement("div");
    meta.className = "ads-meta";
    meta.textContent = `${ad.university}`;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = ad.price ? `${Number(ad.price).toLocaleString()} ₸` : "Договорная";

    const desc = document.createElement("p");
    desc.className = "muted";
    desc.textContent = ad.description.slice(0, 180) + (ad.description.length > 180 ? "..." : "");

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "ghost";
    openBtn.textContent = "Открыть";
    openBtn.addEventListener("click", () => openAdPage(ad.id));

    const favBtn = document.createElement("button");
    favBtn.className = "fav-btn";
    favBtn.textContent = state.favorites.has(ad.id) ? "В избранном" : "В избранное";
    if (state.favorites.has(ad.id)) favBtn.classList.add("active");
    favBtn.addEventListener("click", () => toggleFavorite(ad.id));

    actions.append(openBtn, favBtn);
    card.append(img, pill, title, meta, desc, price, actions);
    adsGrid.appendChild(card);
  });
}

function applyFilters() {
  const search = searchInput.value.toLowerCase();
  const category = categorySelect.value;
  const min = Number(priceMinInput.value) || 0;
  const max = Number(priceMaxInput.value) || Infinity;

  const filtered = adsCache.filter((ad) => {
    const price = Number(ad.price) || 0;
    const matchesSearch =
      ad.title.toLowerCase().includes(search) ||
      ad.description.toLowerCase().includes(search);
    const matchesCategory = category ? ad.category === category : true;
    const matchesPrice = price >= min && price <= max;
    return matchesSearch && matchesCategory && matchesPrice;
  });

  renderAds(filtered);
  updateStats();
}

function resetFilters() {
  searchInput.value = "";
  categorySelect.value = "";
  universitySelect.value = DEFAULT_UNI;
  priceMinInput.value = "";
  priceMaxInput.value = "";
  applyFilters();
}

function handlePreview(files) {
  uploadImages = [];
  imagePreview.innerHTML = "";
  const limit = Math.min(files.length, 4);
  for (let i = 0; i < limit; i++) {
    const file = files[i];
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadImages.push(file);
      const img = document.createElement("img");
      img.src = e.target.result;
      imagePreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

function buildAdFormData() {
  const formData = new FormData();
  formData.append("title", document.querySelector("#adTitle").value.trim());
  formData.append("category", adCategory.value);
  formData.append("price", document.querySelector("#adPrice").value || 0);
  formData.append("university", DEFAULT_UNI);
  formData.append("description", document.querySelector("#adDescription").value.trim());
  formData.append("phone", document.querySelector("#adPhone").value.trim());
  formData.append("whatsapp", document.querySelector("#adWhatsApp").value.trim());
  formData.append("telegram", document.querySelector("#adTelegram").value.trim());
  uploadImages.forEach((file) => formData.append("images", file));
  return formData;
}

async function loadAds() {
  const res = await apiFetch("/api/ads");
  if (!res.ok) {
    console.error("Не удалось загрузить объявления");
    return;
  }
  adsCache = await res.json();
  refreshFilters();
  applyFilters();
  updateFavoritesList();
}

async function loadMyAds() {
  myAdsList.innerHTML = "";
  if (!state.user) {
    myAdsList.innerHTML = `<div class="stack-empty">Войдите, чтобы видеть свои объявления.</div>`;
    myAdsCount.textContent = "0";
    return;
  }
  const res = await apiFetch("/api/my/ads");
  if (!res.ok) {
    myAdsList.innerHTML = `<div class="stack-empty">Ошибка загрузки. Попробуйте позже.</div>`;
    return;
  }
  const myAds = await res.json();
  myAdsCount.textContent = myAds.length;
  if (!myAds.length) {
    myAdsList.innerHTML = `<div class="stack-empty">У вас пока нет объявлений.</div>`;
    return;
  }
  myAds.forEach((ad) => {
    const item = document.createElement("div");
    item.className = "ad-card";
    item.innerHTML = `
      <div class="ad-meta-row">
        <h4>${ad.title}</h4>
        <span class="pill neutral">${ad.category}</span>
      </div>
      <div class="ads-meta">${ad.university}</div>
      <div class="price">${ad.price ? ad.price.toLocaleString() + " ₸" : "Договорная"}</div>
      <div class="card-actions">
        <button class="ghost small" data-open="${ad.id}">Открыть</button>
        <button class="ghost small danger" data-remove="${ad.id}">Удалить</button>
      </div>
    `;
    item.querySelector("[data-open]").addEventListener("click", () => openAdPage(ad.id));
    item.querySelector("[data-remove]").addEventListener("click", () => deleteAd(ad.id));
    myAdsList.appendChild(item);
  });
}

async function deleteAd(id) {
  const res = await apiFetch(`/api/ads/${id}`, { method: "DELETE" });
  if (!res.ok) {
    alert("Не удалось удалить объявление.");
    return;
  }
  adsCache = adsCache.filter((ad) => ad.id !== id);
  applyFilters();
  loadMyAds();
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  saveFavorites();
  applyFilters();
  updateFavoritesList();
  if (location.pathname.startsWith("/ad/") && adViewSection.classList.contains("active")) {
    adViewFav.textContent = state.favorites.has(id) ? "В избранном" : "В избранное";
    adViewFav.classList.toggle("active", state.favorites.has(id));
  }
}

function contactIcon(type) {
  const base = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  if (type === "phone") return `<svg class="contact-icon" viewBox="0 0 24 24"><path ${base} d="M3 5c0 8 8 16 16 16l3-5-6-3-2 2c-2-1-4-3-5-5l2-2-3-6-5 3Z"/></svg>`;
  if (type === "whatsapp") return `<svg class="contact-icon" viewBox="0 0 24 24"><path ${base} d="M4 20 5 16a8 8 0 1 1 3 3l-4 1Z"/><path ${base} d="M8 9c0 4 4 7 6 7 1 0 2-1 2-2l-2-1-1 1a7 7 0 0 1-2-2l1-1-1-2c-1 0-3 1-3 2Z"/></svg>`;
  if (type === "telegram") return `<svg class="contact-icon" viewBox="0 0 24 24"><path ${base} d="m3 12 7 2 10-8-4 14-6-5-2 3-1-6-4 0Z"/></svg>`;
  return "";
}

function renderContactChips(ad) {
  adViewContacts.innerHTML = "";
  const entries = [
    ["phone", ad.contacts?.phone],
    ["whatsapp", ad.contacts?.whatsapp],
    ["telegram", ad.contacts?.telegram],
  ];
  entries.forEach(([type, value]) => {
    if (!value) return;
    const chip = document.createElement("div");
    chip.className = "contact-chip";
    chip.innerHTML = `${contactIcon(type)} ${value}`;
    adViewContacts.appendChild(chip);
  });
}

async function openAdPage(id, { push = true } = {}) {
  let ad = adsCache.find((a) => a.id === id);
  if (!ad) {
    const res = await apiFetch(`/api/ads/${id}`);
    if (res.ok) {
      ad = await res.json();
      adsCache.push(ad);
    }
  }
  if (!ad) {
    alert("Объявление не найдено");
    return;
  }
  adViewTitle.textContent = ad.title;
  adViewMain.src = ad.images?.[0] || "";
  adViewGallery.innerHTML = "";
  ad.images?.forEach((src, idx) => {
    const thumb = document.createElement("img");
    thumb.src = src;
    thumb.addEventListener("click", () => (adViewMain.src = src));
    if (idx === 0) thumb.style.borderColor = "#3b82f6";
    adViewGallery.appendChild(thumb);
  });
  adViewCategory.textContent = ad.category;
  adViewMeta.textContent = `${ad.university}`;
  adViewPrice.textContent = ad.price ? `${Number(ad.price).toLocaleString()} ₸` : "Договорная";
  adViewDescription.textContent = ad.description;
  renderContactChips(ad);
  adViewFav.textContent = state.favorites.has(ad.id) ? "В избранном" : "В избранное";
  adViewFav.classList.toggle("active", state.favorites.has(ad.id));
  adViewFav.onclick = () => toggleFavorite(ad.id);
  adViewChat.onclick = () => {
    if (ad.contacts?.telegram) {
      window.open(`https://t.me/${ad.contacts.telegram.replace("@", "")}`, "_blank");
    } else if (ad.contacts?.whatsapp) {
      window.open(`https://wa.me/${ad.contacts.whatsapp.replace(/\D/g, "")}`, "_blank");
    } else {
      alert("Контакт для переписки не указан.");
    }
  };
  adViewCall.onclick = () => {
    if (ad.contacts?.phone) {
      window.open(`tel:${ad.contacts.phone.replace(/\D/g, "")}`);
    } else if (ad.contacts?.whatsapp) {
      window.open(`https://wa.me/${ad.contacts.whatsapp.replace(/\D/g, "")}`, "_blank");
    } else {
      alert("Телефон не указан.");
    }
  };
  if (push) history.pushState({ adId: id }, "", `/ad/${id}`);
  showSection("ad-view");
}

backToFeed.addEventListener("click", () => {
  history.pushState({}, "", "/");
  showSection("feed");
});

function updateFavoritesList() {
  const favs = adsCache.filter((ad) => state.favorites.has(ad.id));
  favoritesList.innerHTML = "";
  if (!favs.length) {
    favoritesList.innerHTML = `<div class="stack-empty">Избранных объявлений нет.</div>`;
  } else {
    favs.forEach((ad) => {
      const item = document.createElement("div");
      item.className = "ad-card";
      item.innerHTML = `
        <div class="ad-meta-row">
          <h4>${ad.title}</h4>
          <span class="pill neutral">${ad.category}</span>
        </div>
        <div class="ads-meta">${ad.university}</div>
        <div class="price">${ad.price ? ad.price.toLocaleString() + " ₸" : "Договорная"}</div>
        <div class="card-actions">
          <button class="ghost small" data-open="${ad.id}">Смотреть</button>
          <button class="fav-btn ${state.favorites.has(ad.id) ? "active" : ""}" data-fav="${ad.id}">${state.favorites.has(ad.id) ? "Убрать" : "В избранное"}</button>
        </div>
      `;
      item.querySelector("[data-open]").addEventListener("click", () => openAdPage(ad.id));
      item.querySelector("[data-fav]").addEventListener("click", () => toggleFavorite(ad.id));
      favoritesList.appendChild(item);
    });
  }
  favCount.textContent = state.favorites.size;
}

function updateAuthUI() {
  if (state.user) {
    loginToggle.textContent = state.user.name || "Профиль";
    currentUser.innerHTML = `
      <div><strong>${state.user.name}</strong></div>
      <div>${state.user.email}</div>
      <div>${state.user.university || DEFAULT_UNI}</div>
      <button class="ghost small" id="logoutBtn">Выйти</button>
    `;
    currentUser.querySelector("#logoutBtn").addEventListener("click", () => {
      state.user = null;
      state.token = "";
      saveAuth();
      updateAuthUI();
    });
    loadMyAds();
  } else {
    loginToggle.textContent = "Войти";
    currentUser.innerHTML = "Не авторизован. Заполни форму в вкладках слева.";
    myAdsList.innerHTML = `<div class="stack-empty">Войдите, чтобы видеть свои объявления.</div>`;
    myAdsCount.textContent = "0";
  }
  updateFavoritesList();
}

function updateStats() {
  statsTotal.textContent = adsCache.length;
}

function setDefaultUniversityFields() {
  const adUni = document.querySelector("#adUniversity");
  const regUni = document.querySelector("#regUniversity");
  if (adUni) {
    adUni.value = DEFAULT_UNI;
    adUni.disabled = true;
  }
  if (regUni) {
    regUni.value = DEFAULT_UNI;
    regUni.disabled = true;
  }
  if (universitySelect) {
    universitySelect.value = DEFAULT_UNI;
    universitySelect.disabled = true;
  }
}

function handleRoute() {
  const path = location.pathname;
  if (path.startsWith("/ad/")) {
    const id = path.split("/ad/")[1];
    if (id) {
      openAdPage(id, { push: false });
      return;
    }
  }
  showSection("hero");
}

imageInput.addEventListener("change", (e) => handlePreview(e.target.files));

adForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.user) {
    alert("Нужен аккаунт студента. Зарегистрируйтесь или войдите.");
    showSection("profile");
    return;
  }
  const formData = buildAdFormData();
  const res = await apiFetch("/api/ads", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    alert(err.error || "Не удалось опубликовать объявление.");
    return;
  }
  const created = await res.json();
  adsCache.unshift(created);
  adForm.reset();
  setDefaultUniversityFields();
  imagePreview.innerHTML = "";
  uploadImages = [];
  applyFilters();
  loadMyAds();
  alert("Объявление добавлено!");
  showSection("my-ads");
});

document.querySelector("#resetFilters").addEventListener("click", resetFilters);
searchInput.addEventListener("input", applyFilters);
[categorySelect, priceMinInput, priceMaxInput].forEach((el) => {
  el.addEventListener("input", applyFilters);
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.querySelector("#regName").value.trim();
  const email = document.querySelector("#regEmail").value.trim().toLowerCase();
  const password = document.querySelector("#regPassword").value;
  const res = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.error || "Ошибка регистрации");
    return;
  }
  state.user = data.user;
  state.token = data.token;
  saveAuth();
  updateAuthUI();
  alert("Регистрация успешна, вы вошли.");
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.querySelector("#loginEmail").value.trim().toLowerCase();
  const password = document.querySelector("#loginPassword").value;
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    alert(data.error || "Неверная почта или пароль");
    return;
  }
  state.user = data.user;
  state.token = data.token;
  saveAuth();
  updateAuthUI();
  alert("Вы вошли.");
});

loginToggle.addEventListener("click", () => {
  showSection("profile");
  history.pushState({}, "", "/");
});

window.addEventListener("popstate", handleRoute);

function init() {
  setDefaultUniversityFields();
  refreshFilters();
  loadAds();
  updateAuthUI();
  handleRoute();
}

init();
