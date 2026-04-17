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
      { id: 'f2', name: 'main.c', type: 'file', extension: 'c', parentId: 'f1', content: '#include <stdio.h>\n\nint main() {\n    printf("Hello Nexus!\\n");\n    return 0;\n}' },
      { id: 'f3', name: 'boot.asm', type: 'file', extension: 'asm', parentId: 'f1', content: '; X86 Boot Stub\nmov eax, 1\nint 0x80' },
    ];
    const insertFile = db.prepare("INSERT INTO files (id, name, content, type, extension, parentId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    const now = new Date().toISOString();
    seedFiles.forEach(f => insertFile.run(f.id, f.name, f.content, f.type, f.extension, f.parentId, now, now));
  }
  
  const firstTutorialBlocks = [
    { id: 'b1', type: 'sub_heading', data: { text: 'Welcome to Electron Assistant' } },
    { id: 'b2', type: 'markdown', data: { text: '<p>The <strong>Electron Assistant</strong> is a comprehensive hardware and software platform designed to streamline your embedded development and hardware hacking workflow. While it might look like a desktop operating system, it is actually a <strong>highly specialized, interactive web console</strong>—a well-thought-out interface designed to work seamlessly with the ESP32-C3 Supermini adapter board and other serial-based devices.</p>' } },
    
    { id: 'b3', type: 'sub_heading', data: { text: 'The Hardware: ESP32-C3 Supermini Adapter Board' } },
    { id: 'b4', type: 'image', data: { url: '', caption: '[INSERT PHOTO OF ESP32-C3 SUPERMINI ADAPTER BOARD HERE]' } },
    { id: 'b5', type: 'markdown', data: { text: '<p>The custom ESP32-C3 Supermini adapter board acts as your physical bridge to target devices. It provides various interfaces to interact with hardware targets in CTF challenges or real-world debugging. Here is the pinout for the adapter board:</p>\n<ul>\n<li><strong>RFID Pins (SPI)</strong>: RST (3), SS (7), SCK (4), MISO (5), MOSI (6)</li>\n<li><strong>I2C Pins</strong>: SDA (8), SCL (9) — Features an onboard 32KB EEPROM (EEPROM_SIZE 32768)</li>\n<li><strong>UART1 Bridge Pins</strong>: RX1 (20), TX1 (21)</li>\n</ul>' } },
    
    { id: 'b6', type: 'sub_heading', data: { text: 'The Serial Console: Your Gateway & Bridge Mode' } },
    { id: 'b7', type: 'markdown', data: { text: '<p>The most important tool in this entire suite is the <strong>Serial Console</strong>. When the ESP32 adapter board is connected, it often acts in <strong>Bridge Mode</strong>. This means the ESP32 acts as a transparent UART relay between the Electron Assistant web interface and your hardware target. Any command you type here gets forwarded directly to the device under test over UART1, and its responses are printed right back to your screen.</p><p>What makes this ecosystem incredibly powerful is that you are <strong>not locked into a closed system!</strong> You can write your own custom firmware for the ESP32 using the Arduino IDE or ESP-IDF, deploy it (via the Flash Module), and still use the Serial Console to interact with it seamlessly. Whether you are attacking a vulnerable smart lock, intercepting bootloader sequences, or just running your own customized CTF tools over standard serial comms, the Console is central to the fun!</p>' } },
    { id: 'i_con', type: 'image', data: { url: '', caption: '[INSERT SERIAL CONSOLE SCREENSHOT HERE]' } },
    { id: 'l_con', type: 'app_link', data: { appId: 'console', label: 'Launch Serial Console' } },
    
    { id: 'b8', type: 'sub_heading', data: { text: 'EEPROM Dumper (I2C)' } },
    { id: 'b9', type: 'markdown', data: { text: '<p>The EEPROM Dumper allows you to interact directly with I2C-based memory chips, up to massive 32KB dumps. In hardware CTFs, firmware strings, cryptographic keys, and sometimes raw flags are hidden deep inside external memory. This tool reads the memory pages, visualizes them in hex, and allows you to intercept the contents without wrestling with raw hex dumps in a naked terminal.</p>' } },
    { id: 'i_eeprom', type: 'image', data: { url: '', caption: '[INSERT EEPROM DUMPER SCREENSHOT HERE]' } },
    { id: 'l_eeprom', type: 'app_link', data: { appId: 'eeprom', label: 'Launch EEPROM Dumper' } },
    
    { id: 'b10', type: 'sub_heading', data: { text: 'RFID Card Tool (SPI / MFRC522)' } },
    { id: 'b11', type: 'markdown', data: { text: '<p>Using the onboard MFRC522 integration, the RFID tool allows you to read card UIDs, dump MIFARE blocks, and sometimes even emulate basic card responses. Whenever a physical challenge requires badging in or cloning access cards, this interface ensures you have a clean way to analyze the card payload.</p>' } },
    { id: 'i_rfid', type: 'image', data: { url: '', caption: '[INSERT RFID TOOL SCREENSHOT HERE]' } },
    { id: 'l_rfid', type: 'app_link', data: { appId: 'rfid', label: 'Launch RFID Tool' } },

    { id: 'b12', type: 'sub_heading', data: { text: 'BLE & WiFi Commanders' } },
    { id: 'b13', type: 'markdown', data: { text: '<p>Wireless attacks are common in modern IoT CTFs. The <strong>BLE Commander</strong> hooks directly into the Web Bluetooth API (or via ESP32 bridge) to discover nearby peripherals, read GATT characteristics, and auto-write payloads recursively. The <strong>WiFi Commander</strong> provides similar functionality for discovering SSIDs, sniffing management frames, and analyzing AP security properties.</p>' } },
    { id: 'i_ble', type: 'image', data: { url: '', caption: '[INSERT BLE COMMANDER SCREENSHOT HERE]' } },
    { id: 'l_ble', type: 'app_link', data: { appId: 'bluetooth', label: 'Launch BLE Commander' } },
    { id: 'l_wifi', type: 'app_link', data: { appId: 'wifi', label: 'Launch WiFi Commander' } },

    { id: 'b14', type: 'sub_heading', data: { text: 'Cyphonator (Cryptography)' } },
    { id: 'b15', type: 'markdown', data: { text: '<p>Extracted a weird base64 string from the EEPROM? Found a seemingly random XOR\'d hex block? The <strong>Cyphonator</strong> is an onboard cryptographic swiss-army knife designed to slice through encoding structures instantly without needing to swap out to CyberChef simultaneously.</p>' } },
    { id: 'i_cyph', type: 'image', data: { url: '', caption: '[INSERT CYPHONATOR SCREENSHOT HERE]' } },
    { id: 'l_cyph', type: 'app_link', data: { appId: 'cyphonator', label: 'Launch Cyphonator' } },

    { id: 'b16', type: 'sub_heading', data: { text: 'Binary Analysis & x86 Debugger' } },
    { id: 'b17', type: 'markdown', data: { text: '<p>If you dumped a raw firmware `.bin` or an `.elf`, the <strong>Binary Analysis</strong> tool allows you to inspect the raw hex, locate printable ASCII strings, and understand file structures. Accompanied by the <strong>x86 Debugger</strong>, you can step through disassembly specifically tailored for reverse-engineering payloads or exploits on-the-fly.</p>' } },
    { id: 'i_bin', type: 'image', data: { url: '', caption: '[INSERT BINARY ANALYSIS SCREENSHOT HERE]' } },
    { id: 'l_bin', type: 'app_link', data: { appId: 'binary', label: 'Launch Binary Analysis' } },

    { id: 'b18', type: 'sub_heading', data: { text: 'File Management: Data Slabs & My Files' } },
    { id: 'b19', type: 'markdown', data: { text: '<p>Hardware hacking is messy. You will generate dozens of intermediate notes, dumps, and scripts. The <strong>My Files</strong> and <strong>Data Slabs</strong> (Notes) applications give you an internal, sandboxed workspace to keep track of your active findings. You can edit configurations, keep raw decoded keys, and build up your attack narrative entirely within the web console.</p>' } },
    { id: 'i_files', type: 'image', data: { url: '', caption: '[INSERT MY FILES SCREENSHOT HERE]' } },
    { id: 'l_files', type: 'app_link', data: { appId: 'my_files', label: 'Open My Files' } },

    { id: 'b20', type: 'sub_heading', data: { text: 'Flash Module' } },
    { id: 'b21', type: 'markdown', data: { text: '<p>Tying it all together, the <strong>Flash Module</strong> lets you deploy everything! You can upload pre-compiled challenge firmware, or your own custom-written Arduino/ESP-IDF tools back onto your dev board directly over the browser via the Web Serial API.</p>' } },
    { id: 'l_flash', type: 'app_link', data: { appId: 'flasher', label: 'Launch Flash Module' } },

    { id: 'b22', type: 'note', data: { type: 'tip', text: 'You are now fully equipped to tackle any hardware embedded challenge. Remember, this ecosystem is built to be manipulated, expanded, and rewritten. Have fun hacking the planet!' } }
  ];

  if (tutorialCount.count === 0) {
    const seedTutorials = [
      {
        id: 'intro-electron-assistant',
        title: 'Welcome to Electron Assistant',
        category: 'theory',
        difficulty: 'beginner',
        description: 'A comprehensive introduction to the Electron Assistant ESP32-C3 hardware and web console.',
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
    // Delete the old intro-nexus-journal if it exists
    try {
      db.prepare("DELETE FROM tutorials WHERE id = 'intro-nexus-journal'").run();
    } catch(e) {}
    
    // Insert or update the new intro-electron-assistant tutorial
    const insert = db.prepare(`
      INSERT INTO tutorials (id, title, category, difficulty, description, content, attachments, firmwareId) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title=excluded.title,
        description=excluded.description,
        content=excluded.content
    `);
    insert.run(
      'intro-electron-assistant',
      'Welcome to Electron Assistant',
      'theory',
      'beginner',
      'A comprehensive introduction to the Electron Assistant ESP32-C3 hardware and web console.',
      JSON.stringify(firstTutorialBlocks),
      null,
      null
    );
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
