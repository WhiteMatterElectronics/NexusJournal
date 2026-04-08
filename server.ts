import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import cors from "cors";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize SQLite Database
  const db = new Database("electron_assistant.db");
  
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS tutorials (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL
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

  // Recreate firmware table to match new schema
  db.exec(`
    DROP TABLE IF EXISTS firmware;
    CREATE TABLE firmware (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      description TEXT NOT NULL,
      binaryUrl TEXT NOT NULL,
      target TEXT NOT NULL,
      uploadedAt TEXT NOT NULL
    );
  `);

  // Seed data if empty
  const tutorialCount = db.prepare("SELECT count(*) as count FROM tutorials").get() as { count: number };
  if (tutorialCount.count === 0) {
    const seedTutorials = [
      {
        id: 'intro-electron-assistant',
        title: 'Welcome to ElectronAssistant',
        category: 'theory',
        difficulty: 'beginner',
        description: 'A comprehensive introduction to the ElectronAssistant ESP32-C3 hardware and web platform.',
        content: '# Welcome to ElectronAssistant\n\nElectronAssistant is a comprehensive hardware and software platform designed to streamline your embedded development workflow. At its core, it consists of a **tiny custom PCB powered by the ESP32-C3** microcontroller, seamlessly integrated with this powerful web-based platform.\n\n## The Hardware: ESP32-C3 Custom PCB\n\nThe ElectronAssistant board is designed for rapid prototyping and learning. It features:\n- **ESP32-C3 RISC-V MCU**: Wi-Fi & Bluetooth LE 5.0 capabilities.\n- **USB Type-C**: For power, programming, and serial communication.\n- **Compact Form Factor**: Fits perfectly on a breadboard.\n- **Built-in RGB LED**: For status indication and visual debugging.\n\n## Connecting to the Platform\n\nConnecting your ElectronAssistant to the web platform is incredibly simple, thanks to the **Web Serial API**.\n\n1. **Plug it in**: Connect the ElectronAssistant board to your computer using a USB-C cable.\n2. **Access the Lab or Flash Module**: Navigate to the `LAB` or `FLASH_MODULE` tab in the web interface.\n3. **Select Port**: Click the `SELECT_PORT` button. A browser prompt will appear.\n4. **Choose the Device**: Select the USB Serial device corresponding to your ESP32-C3 (often labeled as "USB JTAG/serial debug unit" or similar) and click "Connect".\n\nOnce connected, the platform maintains the serial connection across different views, allowing you to flash firmware and immediately monitor the output without reconnecting!\n\n## Platform Features\n\nThis web platform is your all-in-one command center:\n\n### 📚 Knowledge Base (Tutorials)\nYou are here! The Knowledge Base contains interactive tutorials, documentation, and guides. Tutorials can even be linked directly to firmware files. If a tutorial has associated firmware, you\'ll see a `FLASH_FIRMWARE` button at the top right.\n\n### ⚡ Flash Module\nThe Flash Module allows you to upload pre-compiled `.bin` firmware files directly to your ElectronAssistant board from the browser. No need to install complex toolchains or IDEs. Just select the firmware, click flash, and watch the progress.\n\n### 🔬 The Lab (Serial Console)\nThe Lab is your primary debugging interface. It provides a real-time serial monitor to view logs, sensor data, and debug messages coming from your board. It also allows you to send commands back to the device.\n\n### ⚙️ System Config\nThe System Config area is for administrators to manage the platform. Here you can upload new firmware binaries, write new tutorials using the block-based editor, and link tutorials to specific firmware versions.\n\n---\n\n> **Tip**: Try navigating to the `FLASH_MODULE` now to upload your first firmware, or head over to the `LAB` to see what your board is currently outputting!'
      },
      {
        id: 'i2c-mem',
        title: 'I2C Memories',
        category: 'protocol',
        difficulty: 'intermediate',
        description: 'Learn how to interface with EEPROMs and other I2C storage devices.',
        content: '# I2C Memory Interfacing\n\nI2C (Inter-Integrated Circuit) is a synchronous, multi-master, multi-slave, packet switched, single-ended, serial communication bus.\n\n## Key Concepts\n- **SDA (Serial Data)**: The line for master and slave to send and receive data.\n- **SCL (Serial Clock)**: The line that carries the clock signal.\n\n## Addressing\nEach device on the I2C bus has a unique 7-bit or 10-bit address.\n\n```cpp\n#include <Wire.h>\n\nvoid setup() {\n  Wire.begin();\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  // Scan I2C bus\n}\n```'
      },
      {
        id: 'uart-basics',
        title: 'UART Communication',
        category: 'protocol',
        difficulty: 'beginner',
        description: 'The foundation of hardware debugging and serial data transfer.',
        content: '# UART Basics\n\nUniversal Asynchronous Receiver-Transmitter (UART) is a computer hardware device for asynchronous serial communication.\n\n## Configuration\n- **Baud Rate**: 9600, 115200, etc.\n- **Data Bits**: Usually 8.\n- **Parity**: None, Even, Odd.\n- **Stop Bits**: Usually 1.\n\n> UART is asynchronous, meaning it does not use a clock signal to synchronize the transmitter and receiver.'
      }
    ];

    const insertTutorial = db.prepare("INSERT INTO tutorials (id, title, category, difficulty, description, content) VALUES (?, ?, ?, ?, ?, ?)");
    seedTutorials.forEach(t => insertTutorial.run(t.id, t.title, t.category, t.difficulty, t.description, t.content));
  } else {
    // Ensure the intro tutorial exists even if DB was already seeded
    const introExists = db.prepare("SELECT count(*) as count FROM tutorials WHERE id = 'intro-electron-assistant'").get() as { count: number };
    if (introExists.count === 0) {
      const introTutorial = {
        id: 'intro-electron-assistant',
        title: 'Welcome to ElectronAssistant',
        category: 'theory',
        difficulty: 'beginner',
        description: 'A comprehensive introduction to the ElectronAssistant ESP32-C3 hardware and web platform.',
        content: '# Welcome to ElectronAssistant\n\nElectronAssistant is a comprehensive hardware and software platform designed to streamline your embedded development workflow. At its core, it consists of a **tiny custom PCB powered by the ESP32-C3** microcontroller, seamlessly integrated with this powerful web-based platform.\n\n## The Hardware: ESP32-C3 Custom PCB\n\nThe ElectronAssistant board is designed for rapid prototyping and learning. It features:\n- **ESP32-C3 RISC-V MCU**: Wi-Fi & Bluetooth LE 5.0 capabilities.\n- **USB Type-C**: For power, programming, and serial communication.\n- **Compact Form Factor**: Fits perfectly on a breadboard.\n- **Built-in RGB LED**: For status indication and visual debugging.\n\n## Connecting to the Platform\n\nConnecting your ElectronAssistant to the web platform is incredibly simple, thanks to the **Web Serial API**.\n\n1. **Plug it in**: Connect the ElectronAssistant board to your computer using a USB-C cable.\n2. **Access the Lab or Flash Module**: Navigate to the `LAB` or `FLASH_MODULE` tab in the web interface.\n3. **Select Port**: Click the `SELECT_PORT` button. A browser prompt will appear.\n4. **Choose the Device**: Select the USB Serial device corresponding to your ESP32-C3 (often labeled as "USB JTAG/serial debug unit" or similar) and click "Connect".\n\nOnce connected, the platform maintains the serial connection across different views, allowing you to flash firmware and immediately monitor the output without reconnecting!\n\n## Platform Features\n\nThis web platform is your all-in-one command center:\n\n### 📚 Knowledge Base (Tutorials)\nYou are here! The Knowledge Base contains interactive tutorials, documentation, and guides. Tutorials can even be linked directly to firmware files. If a tutorial has associated firmware, you\'ll see a `FLASH_FIRMWARE` button at the top right.\n\n### ⚡ Flash Module\nThe Flash Module allows you to upload pre-compiled `.bin` firmware files directly to your ElectronAssistant board from the browser. No need to install complex toolchains or IDEs. Just select the firmware, click flash, and watch the progress.\n\n### 🔬 The Lab (Serial Console)\nThe Lab is your primary debugging interface. It provides a real-time serial monitor to view logs, sensor data, and debug messages coming from your board. It also allows you to send commands back to the device.\n\n### ⚙️ System Config\nThe System Config area is for administrators to manage the platform. Here you can upload new firmware binaries, write new tutorials using the block-based editor, and link tutorials to specific firmware versions.\n\n---\n\n> **Tip**: Try navigating to the `FLASH_MODULE` now to upload your first firmware, or head over to the `LAB` to see what your board is currently outputting!'
      };
      const insertTutorial = db.prepare("INSERT INTO tutorials (id, title, category, difficulty, description, content) VALUES (?, ?, ?, ?, ?, ?)");
      insertTutorial.run(introTutorial.id, introTutorial.title, introTutorial.category, introTutorial.difficulty, introTutorial.description, introTutorial.content);
    }
  }

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(uploadsDir));

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

  app.post("/api/upload", upload.single('file'), (req: any, res) => {
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
