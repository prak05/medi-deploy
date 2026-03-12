import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

const db = new Database("medical.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    history TEXT
  );

  CREATE TABLE IF NOT EXISTS journals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    date TEXT,
    patientId INTEGER,
    FOREIGN KEY(patientId) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    content TEXT,
    patientId INTEGER,
    journalId INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patientId) REFERENCES patients(id),
    FOREIGN KEY(journalId) REFERENCES journals(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/patients", (req, res) => {
    const patients = db.prepare("SELECT * FROM patients").all();
    res.json(patients);
  });

  app.post("/api/patients", (req, res) => {
    const { name, age, gender, history } = req.body;
    const info = db.prepare("INSERT INTO patients (name, age, gender, history) VALUES (?, ?, ?, ?)").run(name, age, gender, history);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/journals", (req, res) => {
    const journals = db.prepare("SELECT * FROM journals ORDER BY timestamp DESC").all();
    res.json(journals);
  });

  app.post("/api/journals", (req, res) => {
    const { title, content, type } = req.body;
    const info = db.prepare("INSERT INTO journals (title, content, type) VALUES (?, ?, ?)").run(title, content, type);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/appointments", (req, res) => {
    const appointments = db.prepare("SELECT * FROM appointments").all();
    res.json(appointments);
  });

  app.post("/api/appointments", (req, res) => {
    const { title, date, patientId } = req.body;
    const info = db.prepare("INSERT INTO appointments (title, date, patientId) VALUES (?, ?, ?)").run(title, date, patientId);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/documents", (req, res) => {
    const { patientId, journalId } = req.query;
    let docs;
    if (patientId) {
      docs = db.prepare("SELECT * FROM documents WHERE patientId = ?").all(patientId);
    } else if (journalId) {
      docs = db.prepare("SELECT * FROM documents WHERE journalId = ?").all(journalId);
    } else {
      docs = db.prepare("SELECT * FROM documents").all();
    }
    res.json(docs);
  });

  app.post("/api/documents", (req, res) => {
    const { name, type, content, patientId, journalId } = req.body;
    const info = db.prepare("INSERT INTO documents (name, type, content, patientId, journalId) VALUES (?, ?, ?, ?, ?)").run(name, type, content, patientId, journalId);
    res.json({ id: info.lastInsertRowid });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
