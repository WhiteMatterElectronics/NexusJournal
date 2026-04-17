const Database = require('better-sqlite3');
const db = new Database('nexus_journal.db');

const electronAssistantBlocks = [
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
    JSON.stringify(electronAssistantBlocks),
    null,
    null
);
console.log("DB updated with V2 tutorial");
