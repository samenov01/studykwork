const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "studykwork-dev-secret";
const DEFAULT_UNI = "Yessenov University (Актау)";
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "studx.db");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const CLIENT_DIST = path.join(__dirname, "client", "dist");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${unique}${ext}`);
    },
  }),
  limits: { files: 4, fileSize: 5 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function runResult(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function initDb() {
  await run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      university TEXT,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS ads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER DEFAULT 0,
      city TEXT,
      university TEXT,
      description TEXT,
      contact_phone TEXT,
      contact_whatsapp TEXT,
      contact_telegram TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ad_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      FOREIGN KEY(ad_id) REFERENCES ads(id)
    )`
  );

  const count = await get("SELECT COUNT(*) as c FROM ads");
  if (count.c === 0) {
    await seed();
  }
}

async function seed() {
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

  const sampleAds = [
    {
      title: "Помогу с курсовой по маркетингу за 3 дня",
      category: categories[0],
      price: 18000,
      city: "",
      university: DEFAULT_UNI,
      description: "Структурирую курсовую, оформлю по ГОСТ, добавлю графики и список литературы. Опыт 3 года.",
      contacts: { phone: "+7 777 111 22 33", telegram: "@aidan", whatsapp: "+7 777 111 22 33" },
      images: ["https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=60"],
    },
    {
      title: "Решу задачи по высшей математике и физике",
      category: categories[1],
      price: 12000,
      city: "",
      university: DEFAULT_UNI,
      description: "Вышмат, линейка, интегралы, сопромат. Онлайн и офлайн, проверка перед сдачей.",
      contacts: { phone: "+7 747 000 44 11", telegram: "@mathhelper" },
      images: ["https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=60"],
    },
    {
      title: "Репетитор по IELTS / Speaking club",
      category: categories[2],
      price: 8500,
      city: "",
      university: DEFAULT_UNI,
      description: "Подготовка к IELTS, разговорный английский. Свой материал и пробные тесты.",
      contacts: { phone: "+7 700 999 88 77", whatsapp: "+7 700 999 88 77" },
      images: ["https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=60"],
    },
    {
      title: "Дизайн презентаций и постеров за ночь",
      category: categories[3],
      price: 9000,
      city: "",
      university: DEFAULT_UNI,
      description: "Чистая типографика, иллюстрации, подберу цветовую схему. Делаю интро-анимации.",
      contacts: { telegram: "@slidequeen" },
      images: ["https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=60"],
    },
    {
      title: "Напишу Telegram-бота для автоматизации",
      category: categories[4],
      price: 25000,
      city: "",
      university: DEFAULT_UNI,
      description: "Python/Node.js боты, оплаты, парсеры, интеграции с Google Sheets. Поддержка после сдачи.",
      contacts: { phone: "+7 708 555 12 12", telegram: "@botdev" },
      images: ["https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=60"],
    },
    {
      title: "Сделаю конспект + шпаргалку перед экзаменом",
      category: categories[6],
      price: 6000,
      city: "",
      university: DEFAULT_UNI,
      description: "Быстро собираю по лекциям и книгам, делаю короткий чеклист и карточки.",
      contacts: { whatsapp: "+7 701 123 45 66" },
      images: ["https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=60"],
    },
    {
      title: "Ищу тиммейтов для хакатона Astana Hub",
      category: categories[7],
      price: 0,
      city: "",
      university: DEFAULT_UNI,
      description: "Нужны фронтендер и дизайнер. Проект: сервис для отслеживания занятий. Призовой фонд — есть.",
      contacts: { telegram: "@teamlead" },
      images: ["https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=60"],
    },
    {
      title: "Комната в общежитии, ищу соседа",
      category: categories[8],
      price: 35000,
      city: "",
      university: DEFAULT_UNI,
      description: "Тихая комната, удобное расположение, интернет. Ищу спокойного соседа, желательно ИТ.",
      contacts: { phone: "+7 777 999 77 00", whatsapp: "+7 777 999 77 00" },
      images: ["https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=60"],
    },
  ];

  const passwordHash = await bcrypt.hash("123456", 10);
  const user = await run(
    `INSERT INTO users (name, email, university, password_hash) VALUES (?, ?, ?, ?)`,
    ["Demo User", "demo@studykwork.kz", DEFAULT_UNI, passwordHash]
  );

  for (const ad of sampleAds) {
    const adResult = await run(
      `INSERT INTO ads (user_id, title, category, price, city, university, description, contact_phone, contact_whatsapp, contact_telegram)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.lastID,
        ad.title,
        ad.category,
        ad.price,
        ad.city,
        ad.university,
        ad.description,
        ad.contacts.phone || "",
        ad.contacts.whatsapp || "",
        ad.contacts.telegram || "",
      ]
    );
    for (const url of ad.images) {
      await run(`INSERT INTO images (ad_id, url) VALUES (?, ?)`, [adResult.lastID, url]);
    }
  }
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Требуется авторизация" });
  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get("SELECT id, name, email, university FROM users WHERE id = ?", [payload.id]);
    if (!user) return res.status(401).json({ error: "Не найден пользователь" });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Недействительный токен" });
  }
}

function normalizeAds(rows, imagesMap) {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    price: row.price,
    university: row.university,
    description: row.description,
    contacts: {
      phone: row.contact_phone,
      whatsapp: row.contact_whatsapp,
      telegram: row.contact_telegram,
    },
    user: {
      id: row.user_id,
      name: row.owner_name,
      email: row.owner_email,
      university: row.owner_university,
    },
    images: imagesMap[row.id] || [],
    createdAt: row.created_at,
  }));
}

async function fetchImagesMap(ids) {
  if (!ids.length) return {};
  const placeholders = ids.map(() => "?").join(",");
  const images = await all(`SELECT ad_id, url FROM images WHERE ad_id IN (${placeholders})`, ids);
  const map = {};
  images.forEach((img) => {
    if (!map[img.ad_id]) map[img.ad_id] = [];
    map[img.ad_id].push(img.url);
  });
  return map;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Заполните обязательные поля" });
  const existing = await get("SELECT id FROM users WHERE email = ?", [email.toLowerCase()]);
  if (existing) return res.status(400).json({ error: "Пользователь уже существует" });
  const hash = await bcrypt.hash(password, 10);
  const result = await run(
    `INSERT INTO users (name, email, university, password_hash) VALUES (?, ?, ?, ?)`,
    [name, email.toLowerCase(), DEFAULT_UNI, hash]
  );
  const user = { id: result.lastID, name, email: email.toLowerCase(), university: DEFAULT_UNI };
  const token = signToken(user);
  res.json({ token, user });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Заполните почту и пароль" });
  const user = await get("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
  if (!user) return res.status(401).json({ error: "Неверная почта или пароль" });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: "Неверная почта или пароль" });
  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, university: user.university } });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/ads", async (req, res) => {
  const { search = "", category, minPrice, maxPrice } = req.query;
  const params = [];
  let sql = `
    SELECT ads.*, users.name as owner_name, users.email as owner_email, users.university as owner_university
    FROM ads
    JOIN users ON ads.user_id = users.id
    WHERE ads.university = ?
  `;
  params.push(DEFAULT_UNI);
  if (search) {
    sql += " AND (LOWER(ads.title) LIKE ? OR LOWER(ads.description) LIKE ?)";
    const term = `%${search.toLowerCase()}%`;
    params.push(term, term);
  }
  if (category) {
    sql += " AND ads.category = ?";
    params.push(category);
  }
  if (minPrice) {
    sql += " AND ads.price >= ?";
    params.push(Number(minPrice));
  }
  if (maxPrice) {
    sql += " AND ads.price <= ?";
    params.push(Number(maxPrice));
  }
  sql += " ORDER BY ads.created_at DESC";

  const rows = await all(sql, params);
  const imagesMap = await fetchImagesMap(rows.map((r) => r.id));
  res.json(normalizeAds(rows, imagesMap));
});

app.get("/api/ads/:id", async (req, res) => {
  const row = await get(
    `SELECT ads.*, users.name as owner_name, users.email as owner_email, users.university as owner_university
     FROM ads JOIN users ON ads.user_id = users.id WHERE ads.id = ?`,
    [req.params.id]
  );
  if (!row) return res.status(404).json({ error: "Объявление не найдено" });
  if (row.university !== DEFAULT_UNI) return res.status(404).json({ error: "Объявление не найдено" });
  const imagesMap = await fetchImagesMap([row.id]);
  res.json(normalizeAds([row], imagesMap)[0]);
});

app.post("/api/ads", authMiddleware, upload.array("images", 4), async (req, res) => {
  const { title, category, price = 0, description = "", phone = "", whatsapp = "", telegram = "" } = req.body;

  if (!title || !category || !description) return res.status(400).json({ error: "Заполните обязательные поля" });
  const adResult = await run(
    `INSERT INTO ads (user_id, title, category, price, city, university, description, contact_phone, contact_whatsapp, contact_telegram)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      title,
      category,
      Number(price) || 0,
      "",
      DEFAULT_UNI,
      description,
      phone,
      whatsapp,
      telegram,
    ]
  );

  const urls = [];
  if (req.files?.length) {
    for (const file of req.files) {
      const url = `/uploads/${file.filename}`;
      urls.push(url);
      await run(`INSERT INTO images (ad_id, url) VALUES (?, ?)`, [adResult.lastID, url]);
    }
  } else {
    const placeholder = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=60";
    urls.push(placeholder);
    await run(`INSERT INTO images (ad_id, url) VALUES (?, ?)`, [adResult.lastID, placeholder]);
  }

  const row = await get(
    `SELECT ads.*, users.name as owner_name, users.email as owner_email, users.university as owner_university
     FROM ads JOIN users ON ads.user_id = users.id WHERE ads.id = ?`,
    [adResult.lastID]
  );
  const imagesMap = {};
  imagesMap[row.id] = urls;
  res.status(201).json(normalizeAds([row], imagesMap)[0]);
});

app.get("/api/my/ads", authMiddleware, async (req, res) => {
  const rows = await all(
    `SELECT ads.*, users.name as owner_name, users.email as owner_email, users.university as owner_university
     FROM ads JOIN users ON ads.user_id = users.id WHERE ads.user_id = ? ORDER BY ads.created_at DESC`,
    [req.user.id]
  );
  const imagesMap = await fetchImagesMap(rows.map((r) => r.id));
  res.json(normalizeAds(rows, imagesMap));
});

app.delete("/api/ads/:id", authMiddleware, async (req, res) => {
  const ad = await get("SELECT * FROM ads WHERE id = ?", [req.params.id]);
  if (!ad) return res.status(404).json({ error: "Объявление не найдено" });
  if (ad.user_id !== req.user.id) return res.status(403).json({ error: "Нет прав на удаление" });
  await run("DELETE FROM images WHERE ad_id = ?", [req.params.id]);
  await run("DELETE FROM ads WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// Fallback to SPA entry for non-API routes
app.get(/^(?!\/api).*/, (req, res) => {
  const clientIndex = path.join(CLIENT_DIST, "index.html");
  if (fs.existsSync(clientIndex)) {
    res.sendFile(clientIndex);
  } else {
    res.status(500).send("Client build not found. Run `cd client && npm run build`.");
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`StudyKwork server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to init DB", err);
    process.exit(1);
  });
