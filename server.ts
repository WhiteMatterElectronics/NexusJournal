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
  `);

  // Seed data if empty
  const tutorialCount = db.prepare("SELECT count(*) as count FROM tutorials").get() as { count: number };
  
  const firstTutorialBlocks = [
    { id: 'b1', type: 'sub_heading', data: { text: 'Welcome to NexusJournal' } },
    { id: 'b2', type: 'markdown', data: { text: '<p>NexusJournal is a comprehensive hardware and software platform designed to streamline your embedded development workflow. At its core, it consists of a <strong>tiny custom PCB powered by the ESP32-C3</strong> microcontroller, seamlessly integrated with this powerful web-based platform.</p>' } },
    { id: 'b3', type: 'sub_heading', data: { text: 'The Hardware: ESP32-C3 Custom PCB' } },
    { id: 'b4', type: 'image', data: { url: '/uploads/1776080347349-523477590-2D_PCB1_2026-04-12.png', caption: 'NexusJournal ESP32-C3 Schematic & PCB Layout' } },
    { id: 'b5', type: 'markdown', data: { text: '<p>The NexusJournal board is designed for rapid prototyping and learning. It acts as a bridge between your computer and the physical world. It features:</p><ul><li><strong>ESP32-C3 RISC-V MCU</strong>: Wi-Fi & Bluetooth LE 5.0 capabilities.</li><li><strong>USB Type-C</strong>: For power, programming, and serial communication.</li><li><strong>Compact Form Factor</strong>: Fits perfectly on a breadboard.</li><li><strong>Built-in RGB LED</strong>: For status indication and visual debugging.</li></ul>' } },
    { id: 'b6', type: 'note', data: { type: 'tip', text: 'Try navigating to the FLASH_MODULE now to upload your first firmware, or head over to the LAB to see what your board is currently outputting!' } },
    { id: 'b7', type: 'code', data: { language: 'cpp', code: 'void setup() {\n  Serial.begin(115200);\n  Serial.println("NexusJournal Online");\n}\n\nvoid loop() {\n  // Your code here\n}' } }
  ];

  if (tutorialCount.count === 0) {
    const seedTutorials = [
      {
        id: 'intro-nexus-journal',
        title: 'Welcome to NexusJournal',
        category: 'theory',
        difficulty: 'beginner',
        description: 'A comprehensive introduction to the NexusJournal ESP32-C3 hardware and web platform.',
        content: JSON.stringify(firstTutorialBlocks)
      },
      {
        id: 'blinky-hello-world',
        title: 'Blinky: Hello World',
        category: 'component',
        difficulty: 'beginner',
        description: 'The absolute first step in hardware: making an LED blink.',
        content: '# Blinky: The Hello World of Hardware\n\nIn the world of microcontrollers, "Blinky" is the equivalent of "Hello World". It proves that your code is running and you can control the hardware.\n\n## The Code\n\n```cpp\nconst int LED_PIN = 2; // Built-in LED on many boards\n\nvoid setup() {\n  pinMode(LED_PIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_PIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_PIN, LOW);\n  delay(1000);\n}\n```\n\n## What\'s Happening?\n1. **`pinMode`**: Configures the pin as an output so it can provide power.\n2. **`digitalWrite`**: Sets the pin to HIGH (3.3V) or LOW (0V).\n3. **`delay`**: Pauses execution for the specified number of milliseconds.'
      },
      {
        id: 'rfid-basics',
        title: 'RFID Technology Basics',
        category: 'protocol',
        difficulty: 'beginner',
        description: 'Understand how Radio Frequency Identification works with the MFRC522.',
        content: '# RFID Basics\n\nRadio Frequency Identification (RFID) uses electromagnetic fields to automatically identify and track tags attached to objects.\n\n## Components\n1. **RFID Tag**: Contains the data.\n2. **RFID Reader**: Sends signals and receives data from the tag.\n3. **Antenna**: Facilitates communication.\n\n## MFRC522 Module\nThe MFRC522 is a highly integrated reader/writer IC for contactless communication at 13.56 MHz.\n\n### SPI Interface\n- **SDA (SS)**: Slave Select\n- **SCK**: Serial Clock\n- **MOSI**: Master Out Slave In\n- **MISO**: Master In Slave Out\n- **IRQ**: Interrupt Request\n- **GND**: Ground\n- **RST**: Reset\n- **3.3V**: Power'
      },
      {
        id: 'i2c-scanner',
        title: 'I2C Scanner Tool',
        category: 'protocol',
        difficulty: 'intermediate',
        description: 'A vital tool for debugging I2C buses and finding connected devices.',
        content: '# I2C Scanner\n\nWhen working with I2C, the first thing you usually need to do is verify that your device is actually visible on the bus.\n\n## The Scanner Code\n\n```cpp\n#include <Wire.h>\n\nvoid setup() {\n  Wire.begin();\n  Serial.begin(115200);\n  while (!Serial);\n  Serial.println("\\nI2C Scanner");\n}\n\nvoid loop() {\n  byte error, address;\n  int nDevices = 0;\n\n  for(address = 1; address < 127; address++ ) {\n    Wire.beginTransmission(address);\n    error = Wire.endTransmission();\n\n    if (error == 0) {\n      Serial.print("I2C device found at address 0x");\n      if (address<16) Serial.print("0");\n      Serial.println(address,HEX);\n      nDevices++;\n    }\n  }\n  if (nDevices == 0) Serial.println("No I2C devices found\\n");\n  delay(5000);\n}\n```'
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
      },
      {
        id: 'esp32c3-pinout',
        title: 'ESP32-C3 Pinout Guide',
        category: 'theory',
        difficulty: 'beginner',
        description: 'A detailed look at the GPIOs and special functions of the ESP32-C3.',
        content: '# ESP32-C3 Pinout\n\nThe ESP32-C3 features a variety of GPIOs with multiple functions.\n\n## Key Pins\n- **GPIO 0-21**: General Purpose I/O\n- **UART0**: TX (GPIO 21), RX (GPIO 20)\n- **I2C**: SDA (GPIO 8), SCL (GPIO 9)\n- **SPI**: SCK (GPIO 4), MISO (GPIO 6), MOSI (GPIO 5), SS (GPIO 7)\n\n## Strapping Pins\n- **GPIO 9**: Boot mode selection (Pull high for normal boot, pull low for flashing)'
      }
    ];

    const insertTutorial = db.prepare("INSERT INTO tutorials (id, title, category, difficulty, description, content, attachments, firmwareId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    seedTutorials.forEach(t => insertTutorial.run(t.id, t.title, t.category, t.difficulty, t.description, t.content, null, null));
  } else {
    // Force update the first tutorial to be "beautiful" with blocks
    db.prepare("UPDATE tutorials SET content = ? WHERE id = ?").run(JSON.stringify(firstTutorialBlocks), 'intro-nexus-journal');
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
