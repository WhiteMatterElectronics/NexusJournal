export const ENHANCED_TUTORIALS = [
  {
    id: 'intro-electron-assistant',
    title: 'Welcome to Electron Assistant',
    category: 'theory',
    difficulty: 'beginner',
    description: 'A comprehensive introduction to the Electron Assistant ESP32-C3 hardware and web console.',
    content: JSON.stringify([
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
    ])
  },
  {
    id: 'blinky-hello-world',
    title: 'Blinky: The Hello World of Hardware',
    category: 'component',
    difficulty: 'beginner',
    description: 'Deep dive into GPIO multiplexing, driving current, blocking vs non-blocking delays.',
    content: JSON.stringify([
      { id: 'b1', type: 'markdown', data: { text: '<p>In software, you print "Hello World!" to prove the compiler and environment work. In hardware, you <strong>blink an LED</strong> to prove you power, ground, clock synthesis, and code execution are alive!</p>' } },
      { id: 'b2', type: 'sub_heading', data: { text: '1. The Blocking Approach' } },
      { id: 'b3', type: 'markdown', data: { text: '<p>The easiest way to toggle a pin is using <code>delay()</code>. This stops the CPU from advancing. <strong>Never</strong> use this method in complex firmware because the CPU can do absolutely nothing else (like servicing interrupts or WiFi) while waiting!</p>' } },
      { id: 'b4', type: 'code', data: { language: 'cpp', code: 'const int LED_PIN = 8; // Change according to your board\n\nvoid setup() {\n  // Configure GPIO matrix to route an output buffer to the pin\n  pinMode(LED_PIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_PIN, HIGH); // Source current to LED\n  delay(1000);               // Block CPU for 1 sec\n  digitalWrite(LED_PIN, LOW);  // Sink to Ground\n  delay(1000);\n}' } },
      { id: 'b5', type: 'sub_heading', data: { text: '2. The State Machine Approach' } },
      { id: 'b6', type: 'markdown', data: { text: '<p>In professional embedded design, we use <strong>non-blocking</strong> code. Instead of halting the CPU, we poll a fast hardware timer (like <code>millis()</code>) to see if enough time has passed. This allows thousands of other loops to execute per second!</p>' } },
      { id: 'b7', type: 'code', data: { language: 'cpp', code: 'const int LED_PIN = 8;\nunsigned long previousMillis = 0;\nconst long interval = 1000; // Blink interval in ms\nbool ledState = false;\n\nvoid setup() {\n  pinMode(LED_PIN, OUTPUT);\n}\n\nvoid loop() {\n  // What time is it now?\n  unsigned long currentMillis = millis();\n\n  // Has enough time passed since we last toggled?\n  if (currentMillis - previousMillis >= interval) {\n    // Save the last time we blinked\n    previousMillis = currentMillis; \n\n    // Flip the state\n    ledState = !ledState;\n    digitalWrite(LED_PIN, ledState ? HIGH : LOW);\n  }\n  \n  // SUPER FAST: We can read sensors, update screens, \n  // and do math right here without getting blocked!\n}' } },
      { id: 'b8', type: 'sub_heading', data: { text: '3. Hardware PWM Breating LED' } },
      { id: 'b9', type: 'markdown', data: { text: '<p>Instead of just toggling the LED fully ON or OFF, we can use Pulse Width Modulation (PWM). On the ESP32, this is handled entirely in silicon using the <strong>LEDC</strong> peripheral, requiring zero CPU utilization once started.</p>' } },
      { id: 'b10', type: 'code', data: { language: 'cpp', code: 'const int LED_PIN = 8;\n\nvoid setup() {\n  // Configure the channel, freq, and resolution\n  // ESP32 Arduino Core 3.x simplifies this dramatically\n  ledcAttach(LED_PIN, 5000, 8); // 8-bit resolution (0-255)\n}\n\nvoid loop() {\n  // Fade in\n  for(int duty = 0; duty <= 255; duty++) {\n    ledcWrite(LED_PIN, duty);\n    delay(5);\n  }\n  // Fade out\n  for(int duty = 255; duty >= 0; duty--) {\n    ledcWrite(LED_PIN, duty);\n    delay(5);\n  }\n}' } },
      { id: 'b11', type: 'note', data: { type: 'tip', text: 'Hardware Limit: Ensure your LED uses a current-limiting resistor (e.g., 220Ω or 330Ω) in series. The ESP32-C3 GPIO pins can safely source/sink about 40mA. Drawing more can burn the internal silicon driving transistor!' } },
      { id: 'l_1', type: 'app_link', data: { appId: 'flasher', label: 'Open Flash Module to deploy code' } }
    ])
  },
  {
    id: 'rfid-basics',
    title: 'RFID & NFC: The MIFARE Classic 1K',
    category: 'protocol',
    difficulty: 'intermediate',
    description: 'Deep dive into 13.56MHz induction, sector-based cryptography, and MFRC522 integration.',
    content: JSON.stringify([
      { id: 'r1', type: 'markdown', data: { text: '<p><strong>RFID (Radio Frequency Identification)</strong> and NFC (Near Field Communication) are everywhere. When we talk about \"hacking\" hotel cards or badges, we are almost always referring to ISO/IEC 14443A cards, specifically the notorious <strong>MIFARE Classic 1K</strong>.</p>' } },
      { id: 'r2', type: 'sub_heading', data: { text: 'Memory Structure of MIFARE Classic' } },
      { id: 'r3', type: 'markdown', data: { text: '<p>Unlike a standard hard drive, the MIFARE Classic is divided into <strong>16 Sectors</strong>, each containing <strong>4 Blocks</strong> (16 bytes per block). \n\nThe 4th Block in every sector is called the <em>Sector Trailer</em>. This trailer holds the cryptographic keys (Key A and Key B) and the access control bits. If you do not have the key, the card chip physically refuses to transmit the encrypted block data.</p>' } },
      { id: 'r4', type: 'image', data: { url: '', caption: '[INSERT 1k MEMORY MAP HERE]' } },
      { id: 'r5', type: 'sub_heading', data: { text: '1. Dumping UID Only' } },
      { id: 'r6', type: 'markdown', data: { text: '<p>The simplest attack relies on legacy systems that verify authorization solely via the card\'s unencrypted UID (Unique ID). Here is the code to print the UID using the standard <code>MFRC522</code> library.</p>' } },
      { id: 'r7', type: 'code', data: { language: 'cpp', code: '#include <SPI.h>\n#include <MFRC522.h>\n\n#define SS_PIN  7\n#define RST_PIN 3\n\nMFRC522 mfrc522(SS_PIN, RST_PIN);\n\nvoid setup() {\n  Serial.begin(115200);\n  SPI.begin(4, 5, 6, 7); // SCK, MISO, MOSI, SS\n  mfrc522.PCD_Init();\n  Serial.println("Scan PICC to see UID...");\n}\n\nvoid loop() {\n  if ( ! mfrc522.PICC_IsNewCardPresent() || ! mfrc522.PICC_ReadCardSerial()) {\n    return;\n  }\n\n  Serial.print("Card UID: ");\n  for (byte i = 0; i < mfrc522.uid.size; i++) {\n    Serial.print(mfrc522.uid.uidByte[i] < 0x10 ? " 0" : " ");\n    Serial.print(mfrc522.uid.uidByte[i], HEX);\n  }\n  Serial.println();\n  mfrc522.PICC_HaltA(); // Halt PICC\n}' } },
      { id: 'r8', type: 'sub_heading', data: { text: '2. Authenticating & Reading a Data Block' } },
      { id: 'r9', type: 'markdown', data: { text: '<p>Many cheap applications fail to change the default transport key. Default Key A is usually <code>FF FF FF FF FF FF</code>. To read a block, we must authenticate to its Sector first using the Crypto-1 algorithm (handled internally by the chip).</p>' } },
      { id: 'r10', type: 'code', data: { language: 'cpp', code: '#include <SPI.h>\n#include <MFRC522.h>\n\nMFRC522 mfrc522(7, 3);\nMFRC522::MIFARE_Key key;\n\nvoid setup() {\n  Serial.begin(115200);\n  SPI.begin(4, 5, 6, 7);\n  mfrc522.PCD_Init();\n  \n  // Prepare default key FA FF FF FF FF FF\n  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;\n}\n\nvoid loop() {\n  if ( ! mfrc522.PICC_IsNewCardPresent() || ! mfrc522.PICC_ReadCardSerial()) return;\n\n  byte blockAddr = 4; // Sector 1, Block 0\n  byte buffer[18];\n  byte size = sizeof(buffer);\n\n  // Authenticate using Key A\n  MFRC522::StatusCode status = mfrc522.PCD_Authenticate(\n      MFRC522::PICC_CMD_MF_AUTH_KEY_A, blockAddr, &key, &(mfrc522.uid)\n  );\n\n  if (status != MFRC522::STATUS_OK) {\n    Serial.println("Authentication failed!");\n    return;\n  }\n\n  // Read the block\n  status = mfrc522.MIFARE_Read(blockAddr, buffer, &size);\n  if (status == MFRC522::STATUS_OK) {\n    Serial.print("Data in Block 4: ");\n    dump_byte_array(buffer, 16);\n    Serial.println();\n  }\n\n  mfrc522.PICC_HaltA();\n  mfrc522.PCD_StopCrypto1(); // Crucial! Clear crypto engine\n}\n\nvoid dump_byte_array(byte *buffer, byte bufferSize) {\n  for (byte i = 0; i < bufferSize; i++) {\n    Serial.print(buffer[i] < 0x10 ? " 0" : " ");\n    Serial.print(buffer[i], HEX);\n  }\n}' } },
      { id: 'r11', type: 'note', data: { type: 'warning', text: 'Never write arbitrary data to the Sector Trailer (the last block of any sector) unless you explicitly understand access control bits. Writing malformed bits will irreversibly permanently brick the sector!' } },
      { id: 'rx2', type: 'app_link', data: { appId: 'rfid', label: 'Open GUI RFID Tool' } }
    ])
  },
  {
    id: 'i2c-scanner',
    title: 'I2C Recon: Discovering the Bus',
    category: 'protocol',
    difficulty: 'beginner',
    description: 'Learn about Open-Drain interfaces and write a scanner to identify connected peripherals.',
    content: JSON.stringify([
      { id: 's1', type: 'markdown', data: { text: '<p>The <strong>Inter-Integrated Circuit (I2C)</strong> bus is an elegant masterpiece. It allows you to connect over 100 devices using just TWO wires: Data (SDA) and Clock (SCL).</p><p>Instead of \"driving\" lines high or low like normal GPIOs, I2C uses an <em>Open-Drain</em> design. Devices can only pull the lines LOW (to Ground). They rely on physical <strong>Pull-Up Resistors</strong> (usually 4.7K Ohms) to pull the lines HIGH when no device is actively pulling it low. This prevents short circuits if two devices talk at once.</p>' } },
      { id: 's2', type: 'sub_heading', data: { text: 'The Essential Scanner' } },
      { id: 's3', type: 'markdown', data: { text: '<p>Before writing drivers, you must prove the device is electrically responding. We send an empty `Wire.beginTransmission()` ping. If a device is listening at that address, it responds by physically pulling the SDA line low on the 9th clock pulse (the ACK bit). If the ESP32 sees SDA go low, the device is found!</p>' } },
      { id: 's4', type: 'code', data: { language: 'cpp', code: '#include <Wire.h>\n\n// ESP32-C3 Custom Pins\n#define I2C_SDA 8 \n#define I2C_SCL 9\n\nvoid setup() {\n  Serial.begin(115200);\n  \n  // Initialize I2C with Custom Pins\n  Wire.begin(I2C_SDA, I2C_SCL);\n  \n  Serial.println("\\nExecuting Deep Bus Scan...");\n}\n\nvoid loop() {\n  byte error, address;\n  int devicesFound = 0;\n\n  // I2C 7-bit addresses range from 0x01 to 0x7F\n  for(address = 1; address < 127; address++) {\n    // Initiate a test ping without payload\n    Wire.beginTransmission(address);\n    error = Wire.endTransmission();\n\n    // error == 0 means ACK was received\n    if (error == 0) {\n      Serial.print("[+] Device Found at address 0x");\n      if (address < 16) Serial.print("0");\n      Serial.println(address, HEX);\n      devicesFound++;\n    } else if (error == 4) {\n      Serial.print("[-] Unknown Bus Error at 0x");\n      if (address < 16) Serial.print("0");\n      Serial.println(address, HEX);\n    }\n  }\n  \n  if (devicesFound == 0) {\n    Serial.println("[-] Bus empty. Check wiring and pull-up resistors.");\n  } else {\n    Serial.println("[*] Scan Complete.");\n  }\n  \n  delay(5000); // Rescan every 5 seconds\n}' } },
      { id: 's5', type: 'note', data: { type: 'tip', text: 'Common Device Addresses: 0x3C (OLED Display), 0x50 (EEPROM Memory), 0x68 (RTC or Gyroscope). If you see 0x50, there is a memory chip you can dump!' } }
    ])
  },
  {
    id: 'i2c-mem',
    title: 'Dumping I2C EEPROMs',
    category: 'protocol',
    difficulty: 'advanced',
    description: 'Learn how massive memory banks multiplex addresses to fit on the 7-bit I2C bus.',
    content: JSON.stringify([
      { id: 'm1', type: 'markdown', data: { text: '<p>The I2C protocol limits devices to one 8-bit byte for addressing. But what if your EEPROM (like the <strong>AT24C256</strong>) holds 32 Kilobytes of data? The memory chip multiplexes the data transaction to bypass this limit.</p>' } },
      { id: 'm2', type: 'sub_heading', data: { text: '16-bit Internal Addressing' } },
      { id: 'm3', type: 'markdown', data: { text: '<p>When communicating with heavy EEPROMs, the transaction looks like this:<br/>1. Send Device Address (Usually <code>0x50</code>)<br/>2. Send High Byte of Memory Address<br/>3. Send Low Byte of Memory Address<br/>4. Read or Write Data Bytes...</p>' } },
      { id: 'm4', type: 'code', data: { language: 'cpp', code: '#include <Wire.h>\n\n#define EEPROM_ADDR 0x50\n\nvoid setup() {\n  Wire.begin(8, 9);\n  Serial.begin(115200);\n}\n\n// Reading a single byte from a 16-bit deep memory\nbyte readEEPROMByte(uint16_t memoryAddress) {\n  byte rData = 0xFF;\n  \n  Wire.beginTransmission(EEPROM_ADDR);\n  Wire.write((int)(memoryAddress >> 8));   // High Byte (MSB)\n  Wire.write((int)(memoryAddress & 0xFF)); // Low Byte (LSB)\n  Wire.endTransmission();\n\n  // Request exactly 1 byte back\n  Wire.requestFrom((uint8_t)EEPROM_ADDR, (uint8_t)1);\n  \n  if (Wire.available()) {\n    rData = Wire.read();\n  }\n  return rData;\n}\n\nvoid loop() {\n  // Let us read address 0x01A4 \n  byte secret = readEEPROMByte(0x01A4);\n  Serial.print("Value: ");\n  Serial.println(secret, HEX);\n  delay(2000);\n}' } },
      { id: 'm5', type: 'sub_heading', data: { text: 'Sequential Page Burst Reading' } },
      { id: 'm6', type: 'markdown', data: { text: '<p>Reading one byte at a time through I2C is extremely slow. Because I2C EEPROMs use an internal address counter, if we just keep clocking the bus after requesting the first byte, the EEPROM auto-increments and blasts the next byte back instantly!</p>' } },
      { id: 'm7', type: 'code', data: { language: 'cpp', code: 'void dumpPage(uint16_t startAddress, uint8_t length) {\n  Wire.beginTransmission(EEPROM_ADDR);\n  Wire.write((int)(startAddress >> 8));\n  Wire.write((int)(startAddress & 0xFF));\n  Wire.endTransmission();\n\n  // Ask for a massive chunk at once!\n  Wire.requestFrom((uint8_t)EEPROM_ADDR, length);\n  \n  int i = 0;\n  while (Wire.available() && i < length) {\n    byte b = Wire.read();\n    if(b < 0x10) Serial.print("0");\n    Serial.print(b, HEX);\n    Serial.print(" ");\n    i++;\n  }\n  Serial.println();\n}' } },
      { id: 'm8', type: 'note', data: { type: 'tip', text: 'You do not need to write terminal code for this constantly. Use the GUI EEPROM App in the OS to auto-handle burst reading across 16-bit memory addresses!' } },
      { id: 'lx1', type: 'app_link', data: { appId: 'eeprom', label: 'Extract data using the visual EEPROM app' } }
    ])
  },
  {
    id: 'uart-basics',
    title: 'UART Interception & Fuzzing',
    category: 'protocol',
    difficulty: 'intermediate',
    description: 'Bypass default Serial configurations to intercept firmware and external UART lines.',
    content: JSON.stringify([
      { id: 'u1', type: 'markdown', data: { text: '<p>Universal Asynchronous Receiver-Transmitter (UART) is the bedrock of hardware debugging. Unlike I2C or SPI, UART requires no clock line—it relies entirely on both sides agreeing precisely on the timing (the <strong>Baud Rate</strong>).</p>' } },
      { id: 'u2', type: 'sub_heading', data: { text: 'Hardware Pass-through (Snooping/Fuzzing)' } },
      { id: 'u3', type: 'markdown', data: { text: '<p>The ESP32-C3 is incredible for CTFs because it contains multiple hardware UART blocks. You can use <code>Serial</code> to talk to your computer (this web OS interface), and deploy <code>Serial1</code> on any arbitrary pair of pins to talk to the victim board simultaneously. This makes a perfect Man-In-The-Middle tool.</p>' } },
      { id: 'u4', type: 'code', data: { language: 'cpp', code: '// Using Hardware UART block 1 for target device\nHardwareSerial TargetUART(1);\n\n#define TARGET_TX 21\n#define TARGET_RX 20\n\nvoid setup() {\n  // Serial 0 goes to our USB / Host OS interface\n  Serial.begin(115200);\n  \n  // Serial 1 configures to physical pins touching the target\n  // Most embedded targets bootloader consoles default to 115200 8N1\n  TargetUART.begin(115200, SERIAL_8N1, TARGET_RX, TARGET_TX);\n  \n  Serial.println("--- TRANSPARENT PROXY ARMED ---");\n}\n\nvoid loop() {\n  // If the target device prints something, forward it to our Host OS Terminal\n  while (TargetUART.available()) {\n    Serial.write(TargetUART.read());\n  }\n  \n  // If we type a command in the Host OS Terminal, forward it to the Target\n  while (Serial.available()) {\n    TargetUART.write(Serial.read());\n  }\n}' } },
      { id: 'u5', type: 'note', data: { type: 'warning', text: 'Voltage Warning: The ESP32 is exclusively 3.3V logic. If you are Man-In-The-Middle a 5V system (like an old Arduino Uno or industrial sensor), you MUST use a logic level shifter on the RX pin! Injecting 5V directly into an ESP32 GPIO will permanently fry the semiconductor gate.' } },
      { id: 'lu1', type: 'app_link', data: { appId: 'console', label: 'Monitor Traffic via Serial Console' } }
    ])
  },
  {
    id: 'esp32c3-pinout',
    title: 'Mastering the ESP32-C3 Silicon',
    category: 'theory',
    difficulty: 'advanced',
    description: 'Go beyond the Arduino abstraction. Explore Strapping Pins, JTAG USB, and RISC-V anomalies.',
    content: JSON.stringify([
      { id: 'es1', type: 'markdown', data: { text: '<p>The ESP32-C3 is a radical shift from Espressif. It abandoned the proprietary Xtensa core architecture for a modern, open-source <strong>RISC-V 32-bit single-core processor</strong> running at 160MHz. Because it has integrated USB Serial/JTAG, it does not need a bulky CP2102 chip on the board.</p>' } },
      { id: 'es2', type: 'sub_heading', data: { text: 'Strapping Pins (Boot Modes)' } },
      { id: 'es3', type: 'markdown', data: { text: '<p>Strapping pins are GPIOs that determine the boot state of the chip right when power is applied. If these pins have unexpected voltages (perhaps you wired a sensor to them that pulls them high or low), the ESP32 will refuse to boot or refuse to talk over USB!</p>\n<ul>\n<li><strong>GPIO 9</strong>: The vital bootloader pin. If low on boot, chip enters Download Mode (waiting for flashing). Must be pulled high for normal execution.</li>\n<li><strong>GPIO 8</strong>: Must be pulled high or floating for normal boot.</li>\n<li><strong>GPIO 2</strong>: Must be pulled high for normal SPI Flash boot.</li>\n</ul>\n<p>It is best practice to completely avoid using GPIO 2, 8, and 9 for I2C or input switches if possible.</p>' } },
      { id: 'es4', type: 'sub_heading', data: { text: 'Interrogating the Hardware Reset Reason' } },
      { id: 'es5', type: 'markdown', data: { text: '<p>Finding out *why* a microcontroller restarted is critical to debugging. Did it finish a deep sleep? Did it crash (Watchdog timer triggered)? Or did someone physically press the button?</p>' } },
      { id: 'es6', type: 'code', data: { language: 'cpp', code: '#include <esp_system.h>\n\nvoid setup() {\n  Serial.begin(115200);\n  delay(2000);\n  \n  // Direct access to the ESP-IDF RTOS backend\n  esp_reset_reason_t reason = esp_reset_reason();\n  \n  switch (reason) {\n    case ESP_RST_POWERON:\n      Serial.println("Power On Reset");\n      break;\n    case ESP_RST_EXT:\n      Serial.println("External Pin Reset (RST Button)");\n      break;\n    case ESP_RST_PANIC:\n      Serial.println("Software Exception / Panic Crash");\n      break;\n    case ESP_RST_INT_WDT:\n      Serial.println("Interrupt Watchdog Reset (Stuck Loop!)");\n      break;\n    case ESP_RST_DEEPSLEEP:\n      Serial.println("Woke up gracefully from sleep.");\n      break;\n    default:\n      Serial.printf("Other reason: %d\\n", reason);\n  }\n}\n\nvoid loop() {\n  // Do nothing\n}' } },
      { id: 'es7', type: 'note', data: { type: 'tip', text: 'Unlike older chips, the built-in USB/JTAG handles flashing without needing an auto-reset circuit. Sometimes, if the firmware hard crashes instantly, the USB controller stops responding. Hold the physical BOOT button (GPIO 9), tap RST, and your computer will see the port again!' } }
    ])
  }
];
