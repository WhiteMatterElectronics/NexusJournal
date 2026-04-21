import express from "express";
import path from "path";
import Database from "better-sqlite3";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { ENHANCED_TUTORIALS } from "./src/data/tutorials.js";
import { DEFAULT_APP_INFO } from "./src/data/appInfo.js";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

export function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use('/uploads', express.static(uploadsDir));

  // Initialize SQLite Database
  const db = new Database("nexus_journal.db");
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS tutorials (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      attachments TEXT,
      firmwareId TEXT
    );
  `);

  // Migration: Add attachments column to tutorials table if it doesn't exist
  try {
    const tableInfo = db.pragma("table_info(tutorials)") as any[];
    const hasAttachments = tableInfo.some(column => column.name === 'attachments');
    if (!hasAttachments) {
      db.exec("ALTER TABLE tutorials ADD COLUMN attachments TEXT;");
      console.log("Migration: Added 'attachments' column to 'tutorials' table.");
    }
    
    const hasFirmwareId = tableInfo.some(column => column.name === 'firmwareId');
    if (!hasFirmwareId) {
      db.exec("ALTER TABLE tutorials ADD COLUMN firmwareId TEXT;");
      console.log("Migration: Added 'firmwareId' column to 'tutorials' table.");
    }
  } catch (err) {
    console.error("Migration failed:", err);
  }

  // Ensure firmware table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS firmware (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT NOT NULL,
      binaryUrl TEXT NOT NULL,
      target TEXT NOT NULL,
      uploadedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      content TEXT,
      type TEXT NOT NULL, -- 'file' or 'folder'
      extension TEXT, -- 'c', 'asm', 'bin', 'elf', etc.
      parentId TEXT, -- For nested folders
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_info (
      appId TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);

  // Migration: Ensure 'files' table exists if not already (redundant but safe)
  try {
    const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='files'").get();
    if (!tableInfo) {
      db.exec(`
        CREATE TABLE files (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          content TEXT,
          type TEXT NOT NULL,
          extension TEXT,
          parentId TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);
    }
  } catch (e) {}

  // API for Files System
  app.get("/api/files", (req, res) => {
    try {
      const files = db.prepare("SELECT * FROM files").all();
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/files", (req, res) => {
    try {
      const { id, name, content, type, extension, parentId } = req.body;
      const now = new Date().toISOString();
      
      // Check if file exists to preserve metadata for partial updates
      const existing = db.prepare("SELECT * FROM files WHERE id = ?").get(id) as any;
      
      const fileData = {
        id,
        name: name !== undefined ? name : (existing?.name || "unnamed"),
        content: content !== undefined ? content : (existing?.content || ""),
        type: type !== undefined ? type : (existing?.type || "file"),
        extension: extension !== undefined ? extension : (existing?.extension || ""),
        parentId: parentId !== undefined ? parentId : (existing?.parentId || null),
        updatedAt: now,
        createdAt: existing?.createdAt || now
      };

      const insert = db.prepare(`
        INSERT INTO files (id, name, content, type, extension, parentId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          content=excluded.content,
          type=excluded.type,
          extension=excluded.extension,
          parentId=excluded.parentId,
          updatedAt=excluded.updatedAt
      `);
      insert.run(fileData.id, fileData.name, fileData.content, fileData.type, fileData.extension, fileData.parentId, fileData.createdAt, fileData.updatedAt);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/files/:id", (req, res) => {
    try {
      const deleteFileAndChildren = (id: string) => {
        const children = db.prepare("SELECT id FROM files WHERE parentId = ?").all() as { id: string }[];
        children.forEach(child => deleteFileAndChildren(child.id));
        db.prepare("DELETE FROM files WHERE id = ?").run(id);
      };
      deleteFileAndChildren(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Seed data if empty
  const tutorialCount = db.prepare("SELECT count(*) as count FROM tutorials").get() as { count: number };
  
  // Seed files if empty
  const fileCount = db.prepare("SELECT count(*) as count FROM files").get() as { count: number };
  if (fileCount.count === 0) {
    const seedFiles = [
      { id: 'f1', name: 'projects', type: 'folder', extension: null, parentId: null, content: null },
      { id: 'f2', name: 'main.c', type: 'file', extension: 'c', parentId: 'f1', content: '#include <stdio.h>\\n\\nint main() {\\n    printf("Hello Nexus!\\\\n");\\n    return 0;\\n}' },
      { id: 'f3', name: 'boot.asm', type: 'file', extension: 'asm', parentId: 'f1', content: '; X86 Boot Stub\\nmov eax, 1\\nint 0x80' },
    ];
    const insertFile = db.prepare("INSERT INTO files (id, name, content, type, extension, parentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const now = new Date().toISOString();
    seedFiles.forEach(f => insertFile.run(f.id, f.name, f.content, f.type, f.extension, f.parentId, now, now));
  }

  if (tutorialCount.count === 0) {
    const insertTutorial = db.prepare("INSERT INTO tutorials (id, title, category, difficulty, description, content, attachments, firmwareId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    ENHANCED_TUTORIALS.forEach(t => insertTutorial.run(t.id, t.title, t.category, t.difficulty, t.description, t.content, null, null));
  } else {
    try {
      db.prepare("DELETE FROM tutorials WHERE id = 'intro-nexus-journal'").run();
    } catch(e) {}
    
    // Insert or update all predefined enhanced tutorials continually on boot so changes reflect
    const insert = db.prepare(`
      INSERT INTO tutorials (id, title, category, difficulty, description, content, attachments, firmwareId) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        description=excluded.description,
        content=excluded.content
    `);
    
    ENHANCED_TUTORIALS.forEach(t => {
      insert.run(
        t.id,
        t.title,
        t.category,
        t.difficulty,
        t.description,
        t.content,
        null,
        null
      );
    });
  }

  // Seed App Info
  const appInfoInsert = db.prepare(`
    INSERT INTO app_info (appId, title, description, content) 
    VALUES (?, ?, ?, ?)
    ON CONFLICT(appId) DO UPDATE SET
      title=excluded.title,
      description=excluded.description,
      content=excluded.content
  `);

  DEFAULT_APP_INFO.forEach(info => {
    appInfoInsert.run(info.appId, info.title, info.description, info.content);
  });

  // API Routes
  app.get("/api/tutorials", (req, res) => {
    const tutorials = db.prepare("SELECT * FROM tutorials").all();
    res.json(tutorials);
  });

  app.post("/api/tutorials", (req, res) => {
    try {
      const { id, title, category, difficulty, description, content, attachments, firmwareId } = req.body;
      const insert = db.prepare(`
        INSERT INTO tutorials (id, title, category, difficulty, description, content, attachments, firmwareId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title=excluded.title,
          category=excluded.category,
          difficulty=excluded.difficulty,
          description=excluded.description,
          content=excluded.content,
          attachments=excluded.attachments,
          firmwareId=excluded.firmwareId
      `);
      insert.run(id, title, category, difficulty, description, content, attachments ? JSON.stringify(attachments) : null, firmwareId || null);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving tutorial:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/tutorials/:id", (req, res) => {
    db.prepare("DELETE FROM tutorials WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // App Info Endpoints
  app.get("/api/app-info/:appId", (req, res) => {
    try {
      const info = db.prepare("SELECT * FROM app_info WHERE appId = ?").get(req.params.appId);
      if (info) {
        res.json(info);
      } else {
        res.status(404).json({ error: "App info not found" });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/app-info", (req, res) => {
    try {
      const { appId, title, description, content } = req.body;
      const insert = db.prepare(`
        INSERT INTO app_info (appId, title, description, content) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(appId) DO UPDATE SET
          title=excluded.title,
          description=excluded.description,
          content=excluded.content
      `);
      insert.run(appId, title, description, content);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/upload", upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, name: req.file.originalname, type: req.file.mimetype });
  });

  app.get("/api/firmware", (req, res) => {
    const firmware = db.prepare("SELECT * FROM firmware").all();
    res.json(firmware);
  });

  app.post("/api/firmware", (req, res) => {
    try {
      const { id, name, version, description, binaryUrl, target, uploadedAt } = req.body;
      const insert = db.prepare(`
        INSERT INTO firmware (id, name, version, description, binaryUrl, target, uploadedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name,
          version=excluded.version,
          description=excluded.description,
          binaryUrl=excluded.binaryUrl,
          target=excluded.target,
          uploadedAt=excluded.uploadedAt
      `);
      insert.run(id, name, version, description, binaryUrl, target, uploadedAt);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving firmware:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.delete("/api/firmware/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM firmware WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting firmware:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.get("/api/settings/:id", (req, res) => {
    try {
      const settings = db.prepare("SELECT data FROM settings WHERE id = ?").get(req.params.id) as { data: string } | undefined;
      if (settings) {
        res.json(JSON.parse(settings.data));
      } else {
        res.status(404).json({ error: "Settings not found" });
      }
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/settings/:id", (req, res) => {
    try {
      const data = JSON.stringify(req.body);
      db.prepare("INSERT INTO settings (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data").run(req.params.id, data);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Global API error handler to prevent HTML fallbacks
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  });

  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), 'dist/renderer');
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
