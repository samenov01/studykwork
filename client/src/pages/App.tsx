import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";

type Contacts = {
  phone?: string;
  whatsapp?: string;
  telegram?: string;
};

type Ad = {
  id: string | number;
  title: string;
  category: string;
  price: number;
  university: string;
  description: string;
  contacts: Contacts;
  images: string[];
  createdAt?: string;
};

type User = {
  id: number;
  name: string;
  email: string;
  university: string;
};

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

const API_BASE = import.meta.env.VITE_API_BASE || "";
const storageKeys = {
  user: "studykwork_user",
  token: "studykwork_token",
  favorites: "studykwork_favorites",
};

const initialAddForm = {
  title: "",
  category: "",
  price: "",
  description: "",
  phone: "",
  whatsapp: "",
  telegram: "",
};

function contactIcon(type: keyof Contacts) {
  const base = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  if (type === "phone")
    return `<svg class="contact-icon" viewBox="0 0 24 24"><path ${base} d="M3 5c0 8 8 16 16 16l3-5-6-3-2 2c-2-1-4-3-5-5l2-2-3-6-5 3Z"/></svg>`;
  if (type === "whatsapp")
    return `<svg class="contact-icon" viewBox="0 0 24 24"><path ${base} d="M4 20 5 16a8 8 0 1 1 3 3l-4 1Z"/><path ${base} d="M8 9c0 4 4 7 6 7 1 0 2-1 2-2l-2-1-1 1a7 7 0 0 1-2-2l1-1-1-2c-1 0-3 1-3 2Z"/></svg>`;
  if (type === "telegram")
    return `<svg class="contact-icon" viewBox="0 0 24 24"><path ${base} d="m3 12 7 2 10-8-4 14-6-5-2 3-1-6-4 0Z"/></svg>`;
  return "";
}

function useApi(token: string | null) {
  return (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {};
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE}${path}`, { ...options, headers });
  };
}

export default function App() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [myAds, setMyAds] = useState<Ad[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(storageKeys.user);
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(storageKeys.token));
  const [favorites, setFavorites] = useState<Set<string | number>>(() => {
    const saved = localStorage.getItem(storageKeys.favorites);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [filters, setFilters] = useState({ search: "", category: "", priceMin: "", priceMax: "" });
  const [addForm, setAddForm] = useState(initialAddForm);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [authTab, setAuthTab] = useState<"register" | "login">("register");
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const presenceChannel = useRef<BroadcastChannel | null>(null);
  const presenceSet = useRef<Set<string>>(new Set());
  const sessionId = useRef<string>(crypto.randomUUID());

  const navigate = useNavigate();
  const apiFetch = useApi(token);

  useEffect(() => {
    loadAds();
    if (token && user) loadMyAds();
    initPresence();
  }, [token]);

  function initPresence() {
    if (presenceChannel.current) return;
    const channel = new BroadcastChannel("studykwork-presence");
    presenceChannel.current = channel;
    presenceSet.current.add(sessionId.current);
    setOnlineCount(presenceSet.current.size);

    channel.onmessage = (event) => {
      const { type, id } = event.data || {};
      if (!id || id === sessionId.current) return;
      if (type === "join") {
        presenceSet.current.add(id);
        channel.postMessage({ type: "ack", id: sessionId.current });
      } else if (type === "ack") {
        presenceSet.current.add(id);
      } else if (type === "leave") {
        presenceSet.current.delete(id);
      }
      setOnlineCount(presenceSet.current.size);
    };

    channel.postMessage({ type: "join", id: sessionId.current });

    const handleUnload = () => channel.postMessage({ type: "leave", id: sessionId.current });
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      channel.postMessage({ type: "leave", id: sessionId.current });
      window.removeEventListener("beforeunload", handleUnload);
      channel.close();
    };
  }

  useEffect(() => {
    localStorage.setItem(storageKeys.favorites, JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  useEffect(() => {
    if (user && token) {
      localStorage.setItem(storageKeys.user, JSON.stringify(user));
      localStorage.setItem(storageKeys.token, token);
    } else {
      localStorage.removeItem(storageKeys.user);
      localStorage.removeItem(storageKeys.token);
    }
  }, [user, token]);

  const filteredAds = useMemo(() => {
    const min = Number(filters.priceMin) || 0;
    const max = Number(filters.priceMax) || Infinity;
    return ads.filter((ad) => {
      const price = Number(ad.price) || 0;
      const matchesSearch =
        ad.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        ad.description.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = filters.category ? ad.category === filters.category : true;
      const matchesPrice = price >= min && price <= max;
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [ads, filters]);

  async function loadAds() {
    const res = await apiFetch("/api/ads");
    if (!res.ok) return;
    const data = (await res.json()) as Ad[];
    setAds(data);
  }

  async function loadMyAds() {
    if (!token) return;
    const res = await apiFetch("/api/my/ads");
    if (!res.ok) return;
    const data = (await res.json()) as Ad[];
    setMyAds(data);
  }

  function handleNav(path: string) {
    navigate(path);
  }

  function handleImageChange(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).slice(0, 4);
    setImages(arr);
    setImagePreviews(arr.map((f) => URL.createObjectURL(f)));
  }

  async function handleAddAd(e: FormEvent) {
    e.preventDefault();
    if (!user || !token) {
      alert("Нужен аккаунт студента. Зарегистрируйтесь или войдите.");
      handleNav("/profile");
      return;
    }
    const formData = new FormData();
    formData.append("title", addForm.title.trim());
    formData.append("category", addForm.category);
    formData.append("price", addForm.price || "0");
    formData.append("description", addForm.description.trim());
    formData.append("phone", addForm.phone.trim());
    formData.append("whatsapp", addForm.whatsapp.trim());
    formData.append("telegram", addForm.telegram.trim());
    images.forEach((file) => formData.append("images", file));

    const res = await apiFetch("/api/ads", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Не удалось опубликовать объявление.");
      return;
    }
    setAds((prev) => [data as Ad, ...prev]);
    setAddForm({ title: "", category: "", price: "", description: "", phone: "", whatsapp: "", telegram: "" });
    setImages([]);
    setImagePreviews([]);
    loadMyAds();
    alert("Объявление добавлено!");
    handleNav("/my-ads");
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: (document.getElementById("regName") as HTMLInputElement).value.trim(),
        email: (document.getElementById("regEmail") as HTMLInputElement).value.trim().toLowerCase(),
        password: (document.getElementById("regPassword") as HTMLInputElement).value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Ошибка регистрации");
      return;
    }
    setUser(data.user);
    setToken(data.token);
    setAuthTab("login");
    loadMyAds();
    alert("Регистрация успешна, вы вошли.");
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: (document.getElementById("loginEmail") as HTMLInputElement).value.trim().toLowerCase(),
        password: (document.getElementById("loginPassword") as HTMLInputElement).value,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Неверная почта или пароль");
      return;
    }
    setUser(data.user);
    setToken(data.token);
    loadMyAds();
    alert("Вы вошли.");
  }

  function toggleFavorite(id: string | number) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteAd(id: string | number) {
    const res = await apiFetch(`/api/ads/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("Не удалось удалить объявление.");
      return;
    }
    setAds((prev) => prev.filter((ad) => ad.id !== id));
    setMyAds((prev) => prev.filter((ad) => ad.id !== id));
  }

  const favoritesList = ads.filter((ad) => favorites.has(ad.id));

  return (
    <div className="app-shell">
      <Header onNav={handleNav} onAdd={() => handleNav("/add")} onLogin={() => handleNav("/profile")} userName={user?.name} />

      <Routes>
        <Route
          path="/"
          element={
            <>
              <section id="hero" className="section hero active">
                <Hero
                  stats={ads.length}
                  online={onlineCount}
                  recentAds={ads.slice(0, 3)}
                  favorites={favorites}
                  toggleFavorite={toggleFavorite}
                  onOpen={(id) => navigate(`/ad/${id}`)}
                  onFind={() => navigate("/feed")}
                  onCreate={() => navigate("/add")}
                />
              </section>
            </>
          }
        />

        <Route
          path="/feed"
          element={
            <section id="feed" className="section">
              <Feed
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                ads={filteredAds}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                onOpen={(id) => navigate(`/ad/${id}`)}
                onReset={() => setFilters({ search: "", category: "", priceMin: "", priceMax: "" })}
                onAdd={() => handleNav("/add")}
              />
            </section>
          }
        />

        <Route
          path="/add"
          element={
            <section id="add-ad" className="section">
              <AddAdForm
                addForm={addForm}
                setAddForm={setAddForm}
                categories={categories}
                onSubmit={handleAddAd}
                onImagesChange={handleImageChange}
                previews={imagePreviews}
              />
            </section>
          }
        />

        <Route
          path="/my-ads"
          element={
            <section id="my-ads" className="section">
              <MyAndFav
                myAds={myAds}
                favoritesList={favoritesList}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                onOpen={(id) => navigate(`/ad/${id}`)}
                onDelete={deleteAd}
                onCreate={() => handleNav("/add")}
              />
            </section>
          }
        />

        <Route
          path="/profile"
          element={
            <section id="profile" className="section">
              <ProfileBlock
                authTab={authTab}
                setAuthTab={setAuthTab}
                user={user}
                onLogout={() => {
                  setUser(null);
                  setToken(null);
                  setMyAds([]);
                }}
                onRegister={handleRegister}
                onLogin={handleLogin}
              />
            </section>
          }
        />

        <Route path="/ad/:id" element={<AdDetail apiFetch={apiFetch} toggleFavorite={toggleFavorite} favorites={favorites} onBack={() => navigate("/")} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function Header({
  onNav,
  onAdd,
  onLogin,
  userName,
}: {
  onNav: (path: string) => void;
  onAdd: () => void;
  onLogin: () => void;
  userName?: string;
}) {
  return (
    <header className="topbar">
      <button className="brand brand-link" onClick={() => onNav("/")}>
        <div className="logo-dot" />
        <div>
          <div className="brand-name">StudyKwork</div>
          <div className="brand-sub">Помощь от студентов для студентов</div>
        </div>
      </button>
      <nav className="nav">
        <button className="nav-link" onClick={() => onNav("/")}>
          Главная
        </button>
        <button className="nav-link" onClick={() => onNav("/feed")}>
          Объявления
        </button>
        <button className="nav-link" onClick={() => onNav("/add")}>
          Добавить
        </button>
        <button className="nav-link" onClick={() => onNav("/my-ads")}>
          Мои объявления
        </button>
        <button className="nav-link" onClick={() => onNav("/profile")}>
          Профиль
        </button>
      </nav>
      <div className="actions">
        <button className="ghost" onClick={onLogin}>
          {userName || "Войти"}
        </button>
        <button className="primary" onClick={onAdd}>
          Разместить объявление
        </button>
      </div>
    </header>
  );
}

function Hero({
  stats,
  online,
  recentAds,
  favorites,
  toggleFavorite,
  onOpen,
  onFind,
  onCreate,
}: {
  stats: number;
  online: number;
  recentAds: Ad[];
  favorites: Set<string | number>;
  toggleFavorite: (id: string | number) => void;
  onOpen: (id: string | number) => void;
  onFind: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="hero-grid">
      <div className="hero-copy">
        <p className="eyebrow">Фриланс для студентов YU</p>
        <h1>Найми одногруппника или возьми заказ — быстро и просто</h1>
        <p className="lede">Короткие заказы на курсовые, задачи, код, дизайн и подготовку к экзаменам внутри Yessenov University.</p>
        <div className="hero-actions">
          <button className="primary" onClick={onFind}>
            Найти исполнителя
          </button>
          <button className="secondary" onClick={onCreate}>
            Разместить заказ
          </button>
        </div>
        <div className="chips">
          <span className="chip">Курсовые</span>
          <span className="chip">Код</span>
          <span className="chip">Дизайн</span>
          <span className="chip">Экзамены</span>
          <span className="chip">Тиммейты</span>
        </div>
      </div>
      <div className="hero-right">
        <div className="hero-card">
          <div className="hero-cta">
            <div className="stat-block">
              <p className="muted">Сейчас онлайн</p>
              <div className="inline-stat">
                <span className="status-dot" aria-hidden="true" />
                <h2 id="onlineUsers">{online}</h2>
              </div>
            </div>
            <div className="stat-block">
              <p className="muted">Активных объявлений</p>
              <h2>{stats}</h2>
            </div>
            <div className="stat-block">
              <p className="muted">Категорий</p>
              <h2>9</h2>
            </div>
          </div>
          <div className="mini-ads">
            {recentAds.length === 0 ? (
              <p className="muted">Пока нет объявлений.</p>
            ) : (
              recentAds.map((ad) => (
                <div className="mini-ad" key={ad.id}>
                  <div className="mini-ad-head">
                    <span className="pill neutral">{ad.category}</span>
                    <span className="price">{ad.price ? `${Number(ad.price).toLocaleString()} ₸` : "Договорная"}</span>
                  </div>
                  <h4 className="mini-ad-title">{ad.title}</h4>
                  <p className="muted mini-ad-desc">{ad.description.slice(0, 120) + (ad.description.length > 120 ? "..." : "")}</p>
                  <div className="card-actions">
                    <button className="ghost small" onClick={() => onOpen(ad.id)}>
                      Открыть
                    </button>
                    <button className={`fav-btn small ${favorites.has(ad.id) ? "active" : ""}`} onClick={() => toggleFavorite(ad.id)}>
                      {favorites.has(ad.id) ? "В избранном" : "В избранное"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="qr-card">
          <div className="qr-copy">
            <span className="pill instagram">Instagram</span>
            <h3>Сканируй QR и подпишись</h3>
            <p className="muted">Горячие объявления, закулисье проекта и апдейты — следи за нами в Instagram.</p>
            <div className="qr-actions">
              <a className="primary button-link" href="https://www.instagram.com/studykwork" target="_blank" rel="noreferrer">
                Открыть профиль
              </a>
              <span className="muted small">Или наведи камеру на QR</span>
            </div>
          </div>
          <div className="qr-image-wrap">
            <img src="/qr.png" alt="QR-код на Instagram StudyKwork" className="qr-image" />
            <div className="qr-glow" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Feed({
  filters,
  setFilters,
  categories,
  ads,
  favorites,
  toggleFavorite,
  onOpen,
  onReset,
  onAdd,
}: {
  filters: { search: string; category: string; priceMin: string; priceMax: string };
  setFilters: (f: { search: string; category: string; priceMin: string; priceMax: string }) => void;
  categories: string[];
  ads: Ad[];
  favorites: Set<string | number>;
  toggleFavorite: (id: string | number) => void;
  onOpen: (id: string | number) => void;
  onReset: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="section-header">
        <div>
          <p className="eyebrow">Лента объявлений</p>
          <h2>Найди нужную помощь за пару минут</h2>
        </div>
        <div className="inline-actions">
          <button className="ghost" onClick={onReset}>
            Сбросить фильтры
          </button>
          <button className="primary" onClick={onAdd}>
            + Создать объявление
          </button>
        </div>
      </div>
      <div className="filters">
        <div className="input-group">
          <label htmlFor="search">Поиск</label>
          <input
            type="search"
            id="search"
            placeholder="Курсовая по маркетингу, репетитор по JavaScript..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="input-group">
          <label htmlFor="category">Категория</label>
          <select id="category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">Любая</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label>ВУЗ</label>
          <select disabled>
            <option>{DEFAULT_UNI}</option>
          </select>
        </div>
        <div className="input-group">
          <label>Цена, ₸</label>
          <div className="split">
            <input
              type="number"
              placeholder="от"
              value={filters.priceMin}
              onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
            />
            <input
              type="number"
              placeholder="до"
              value={filters.priceMax}
              onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
            />
          </div>
        </div>
      </div>
      <h3 className="muted" style={{ margin: "0 0 8px" }}>Новые объявления</h3>
      <div className="ads-wrap">
        <div id="adsGrid" className="ads-grid">
          {ads.length === 0 ? (
            <div className="card" style={{ gridColumn: "1 / -1" }}>
              Ничего не найдено. Попробуй другие фильтры.
            </div>
          ) : (
            ads.map((ad) => (
              <article className="ad-card" key={ad.id}>
                <img
                  className="ad-thumb"
                  src={ad.images?.[0] || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=50"}
                  alt={ad.title}
                  onClick={() => onOpen(ad.id)}
                />
                <span className="pill neutral">{ad.category}</span>
                <h3 className="ad-title">{ad.title}</h3>
                <div className="ads-meta">{ad.university}</div>
                <p className="muted">{ad.description.slice(0, 180) + (ad.description.length > 180 ? "..." : "")}</p>
                <div className="price">{ad.price ? `${Number(ad.price).toLocaleString()} ₸` : "Договорная"}</div>
                <div className="card-actions">
                  <button className="ghost" onClick={() => onOpen(ad.id)}>
                    Открыть
                  </button>
                  <button className={`fav-btn ${favorites.has(ad.id) ? "active" : ""}`} onClick={() => toggleFavorite(ad.id)}>
                    {favorites.has(ad.id) ? "В избранном" : "В избранное"}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function AddAdForm({
  addForm,
  setAddForm,
  categories,
  onSubmit,
  onImagesChange,
  previews,
}: {
  addForm: typeof initialAddForm;
  setAddForm: Dispatch<SetStateAction<typeof initialAddForm>>;
  categories: string[];
  onSubmit: (e: FormEvent) => void;
  onImagesChange: (files: FileList | null) => void;
  previews: string[];
}) {
  return (
    <>
      <div className="section-header">
        <div>
          <p className="eyebrow">Создание объявления</p>
          <h2>Расскажи, чем можешь помочь</h2>
        </div>
        <p className="muted">Заполни форму — объявление появится в ленте и в твоих объявлениях.</p>
      </div>
      <form id="adForm" className="card form-card" onSubmit={onSubmit}>
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="adTitle">Заголовок</label>
            <input
              id="adTitle"
              required
              maxLength={120}
              placeholder="Например, решу задачи по физике за вечер"
              value={addForm.title}
              onChange={(e) => setAddForm({ ...addForm, title: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="adCategory">Категория</label>
            <select
              id="adCategory"
              required
              value={addForm.category}
              onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
            >
              <option value="">Выбери категорию</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid-3">
          <div className="input-group">
            <label htmlFor="adPrice">Цена, ₸</label>
            <input
              type="number"
              id="adPrice"
              required
              min="0"
              step="500"
              placeholder="10000"
              value={addForm.price}
              onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="adUniversity">ВУЗ</label>
            <input id="adUniversity" required value={DEFAULT_UNI} disabled />
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="adDescription">Описание</label>
          <textarea
            id="adDescription"
            rows={4}
            required
            placeholder="Кратко опиши опыт, сроки, формат работы"
            value={addForm.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
          />
        </div>
        <div className="grid-3">
          <div className="input-group">
            <label htmlFor="adPhone">Телефон</label>
            <input
              id="adPhone"
              placeholder="+7 777 000 00 00"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="adWhatsApp">WhatsApp</label>
            <input
              id="adWhatsApp"
              placeholder="+7 777 000 00 00"
              value={addForm.whatsapp}
              onChange={(e) => setAddForm({ ...addForm, whatsapp: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label htmlFor="adTelegram">Telegram</label>
            <input
              id="adTelegram"
              placeholder="@nickname"
              value={addForm.telegram}
              onChange={(e) => setAddForm({ ...addForm, telegram: e.target.value })}
            />
          </div>
        </div>
        <div className="input-group">
          <label htmlFor="adImages">Фото / скрины (до 4)</label>
          <input type="file" id="adImages" accept="image/*" multiple onChange={(e) => onImagesChange(e.target.files)} />
          <div className="image-preview">
            {previews.map((src) => (
              <img key={src} src={src} alt="preview" />
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="primary">
            Опубликовать
          </button>
          <p className="muted">Объявление привяжется к вашему профилю.</p>
        </div>
      </form>
    </>
  );
}

function MyAndFav({
  myAds,
  favoritesList,
  favorites,
  toggleFavorite,
  onOpen,
  onDelete,
  onCreate,
}: {
  myAds: Ad[];
  favoritesList: Ad[];
  favorites: Set<string | number>;
  toggleFavorite: (id: string | number) => void;
  onOpen: (id: string | number) => void;
  onDelete: (id: string | number) => void;
  onCreate: () => void;
}) {
  return (
    <>
      <div className="section-header">
        <div>
          <p className="eyebrow">Личный кабинет</p>
          <h2>Мои объявления и избранное</h2>
        </div>
        <button className="primary" onClick={onCreate}>
          + Новое объявление
        </button>
      </div>
      <div className="split-panels">
        <div className="card">
          <div className="section-subheader">
            <div>
              <p className="eyebrow">Публикации</p>
              <h3>Мои объявления</h3>
            </div>
            <span className="pill neutral">{myAds.length}</span>
          </div>
          <div className="stack">
            {myAds.length === 0 ? (
              <div className="stack-empty">У вас пока нет объявлений.</div>
            ) : (
              myAds.map((ad) => (
                <div className="ad-card" key={ad.id}>
                  <div className="ad-meta-row">
                    <h4>{ad.title}</h4>
                    <span className="pill neutral">{ad.category}</span>
                  </div>
                  <div className="ads-meta">{ad.university}</div>
                  <div className="price">{ad.price ? ad.price.toLocaleString() + " ₸" : "Договорная"}</div>
                  <div className="card-actions">
                    <button className="ghost small" onClick={() => onOpen(ad.id)}>
                      Открыть
                    </button>
                    <button className="ghost small danger" onClick={() => onDelete(ad.id)}>
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          <div className="section-subheader">
            <div>
              <p className="eyebrow">Избранное</p>
              <h3>Сохраненные объявления</h3>
            </div>
            <span className="pill success">{favorites.size}</span>
          </div>
          <div className="stack">
            {favoritesList.length === 0 ? (
              <div className="stack-empty">Избранных объявлений нет.</div>
            ) : (
              favoritesList.map((ad) => (
                <div className="ad-card" key={ad.id}>
                  <div className="ad-meta-row">
                    <h4>{ad.title}</h4>
                    <span className="pill neutral">{ad.category}</span>
                  </div>
                  <div className="ads-meta">{ad.university}</div>
                  <div className="price">{ad.price ? ad.price.toLocaleString() + " ₸" : "Договорная"}</div>
                  <div className="card-actions">
                    <button className="ghost small" onClick={() => onOpen(ad.id)}>
                      Смотреть
                    </button>
                    <button className={`fav-btn ${favorites.has(ad.id) ? "active" : ""}`} onClick={() => toggleFavorite(ad.id)}>
                      {favorites.has(ad.id) ? "Убрать" : "В избранное"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ProfileBlock({
  authTab,
  setAuthTab,
  user,
  onLogout,
  onRegister,
  onLogin,
}: {
  authTab: "register" | "login";
  setAuthTab: (t: "register" | "login") => void;
  user: User | null;
  onLogout: () => void;
  onRegister: (e: FormEvent) => void;
  onLogin: (e: FormEvent) => void;
}) {
  return (
    <>
      <div className="section-header">
        <div>
          <p className="eyebrow">Профиль</p>
          <h2>Управляй своим аккаунтом</h2>
        </div>
        <p className="muted">Регистрация и логин для студентов Yessenov University. Данные сохраняются на сервере.</p>
      </div>
      <div className="split-panels">
        <div className="card">
          <div className="tabs">
            <button className={`tab-button ${authTab === "register" ? "active" : ""}`} onClick={() => setAuthTab("register")}>
              Регистрация
            </button>
            <button className={`tab-button ${authTab === "login" ? "active" : ""}`} onClick={() => setAuthTab("login")}>
              Логин
            </button>
          </div>
          {authTab === "register" ? (
            <form id="registerForm" className="stack" onSubmit={onRegister}>
              <div className="input-group">
                <label htmlFor="regName">Имя</label>
                <input id="regName" required placeholder="Айдан" />
              </div>
              <div className="input-group">
                <label htmlFor="regEmail">Почта</label>
                <input type="email" id="regEmail" required placeholder="you@student.kz" />
              </div>
              <div className="input-group">
                <label htmlFor="regUniversity">ВУЗ</label>
                <input id="regUniversity" required value={DEFAULT_UNI} disabled />
              </div>
              <div className="input-group">
                <label htmlFor="regPassword">Пароль</label>
                <input type="password" id="regPassword" required minLength={6} />
              </div>
              <button className="primary" type="submit">
                Зарегистрироваться
              </button>
            </form>
          ) : (
            <form id="loginForm" className="stack" onSubmit={onLogin}>
              <div className="input-group">
                <label htmlFor="loginEmail">Почта</label>
                <input type="email" id="loginEmail" required />
              </div>
              <div className="input-group">
                <label htmlFor="loginPassword">Пароль</label>
                <input type="password" id="loginPassword" required />
              </div>
              <button className="secondary" type="submit">
                Войти
              </button>
            </form>
          )}
        </div>
        <div className="card">
          <h3>Профиль</h3>
          <div id="currentUser" className="profile-card muted">
            {user ? (
              <>
                <div>
                  <strong>{user.name}</strong>
                </div>
                <div>{user.email}</div>
                <div>{user.university}</div>
                <button className="ghost small" onClick={onLogout}>
                  Выйти
                </button>
              </>
            ) : (
              "Не авторизован. Заполни форму слева."
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function AdDetail({
  apiFetch,
  toggleFavorite,
  favorites,
  onBack,
}: {
  apiFetch: ReturnType<typeof useApi>;
  toggleFavorite: (id: string | number) => void;
  favorites: Set<string | number>;
  onBack: () => void;
}) {
  const { id } = useParams();
  const [ad, setAd] = useState<Ad | null>(null);
  const [mainImage, setMainImage] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    apiFetch(`/api/ads/${id}`).then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()) as Ad;
      setAd(data);
      setMainImage(data.images?.[0] || "");
    });
  }, [id]);

  if (!ad) {
    return (
      <div className="section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Объявление</p>
            <h2>Загрузка...</h2>
          </div>
          <button className="ghost" onClick={onBack}>
            ← Назад к ленте
          </button>
        </div>
      </div>
    );
  }

  return (
    <section id="ad-view" className="section active">
      <div className="section-header">
        <div>
          <p className="eyebrow">Объявление</p>
          <h2 id="adViewTitle">{ad.title}</h2>
        </div>
        <button className="ghost" onClick={onBack}>
          ← Назад к ленте
        </button>
      </div>
      <div id="adViewCard" className="ad-view card">
        <div className="ad-view-media">
          <img id="adViewMain" alt="Фото объявления" src={mainImage} />
          <div id="adViewGallery" className="ad-view-gallery">
            {ad.images?.map((src) => (
              <img key={src} src={src} onClick={() => setMainImage(src)} />
            ))}
          </div>
        </div>
        <div className="ad-view-info">
          <div className="pill neutral" id="adViewCategory">
            {ad.category}
          </div>
          <div className="ad-view-meta" id="adViewMeta">
            {ad.university}
          </div>
          <div className="price" id="adViewPrice">
            {ad.price ? `${Number(ad.price).toLocaleString()} ₸` : "Договорная"}
          </div>
          <p id="adViewDescription">{ad.description}</p>
          <div className="contact-chips" id="adViewContacts">
            {(["phone", "whatsapp", "telegram"] as (keyof Contacts)[])
              .filter((t) => ad.contacts?.[t])
              .map((type) => (
                <div key={type} className="contact-chip" dangerouslySetInnerHTML={{ __html: `${contactIcon(type)} ${ad.contacts[type]}` }} />
              ))}
          </div>
          <div className="cta-row">
            <button
              id="adViewFav"
              className={`ghost ${favorites.has(ad.id) ? "active" : ""}`}
              onClick={() => toggleFavorite(ad.id)}
            >
              {favorites.has(ad.id) ? "В избранном" : "В избранное"}
            </button>
            <button
              id="adViewChat"
              className="primary"
              onClick={() => {
                if (ad.contacts?.telegram) {
                  window.open(`https://t.me/${ad.contacts.telegram.replace("@", "")}`, "_blank");
                } else if (ad.contacts?.whatsapp) {
                  window.open(`https://wa.me/${ad.contacts.whatsapp.replace(/\D/g, "")}`, "_blank");
                } else {
                  alert("Контакт для переписки не указан.");
                }
              }}
            >
              Написать
            </button>
            <button
              id="adViewCall"
              className="secondary"
              onClick={() => {
                if (ad.contacts?.phone) {
                  window.open(`tel:${ad.contacts.phone.replace(/\D/g, "")}`);
                } else if (ad.contacts?.whatsapp) {
                  window.open(`https://wa.me/${ad.contacts.whatsapp.replace(/\D/g, "")}`, "_blank");
                } else {
                  alert("Телефон не указан.");
                }
              }}
            >
              Позвонить
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
