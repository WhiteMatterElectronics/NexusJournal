
#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <EEPROM.h>
#include <LiquidCrystal_I2C.h>

/**
 * AEGIS-IV | USN ICARUS | VERSION 10.0 - THE SINGULARITY OMEGA (COLOSSUS)
 * ----------------------------------------------------------------------
 * [SECURITY CLASSIFICATION: OMEGA-PREMIUM]
 * [PROJECT: EVENT HORIZON]
 * [RESEARCH CTF FIRMWARE - DO NOT DISTRIBUTE]
 * * DESIGN SPECIFICATIONS:
 * - MCU: ATmega328P (16MHz)
 * - FLASH: 32KB (Optimized via PROGMEM)
 * - SRAM: 2KB (Managed via strict scoping)
 * * MISSION PROFILE:
 * The USN Icarus is derelict. AETHER AI has bifurcated into SHIVA.
 * Life support is failing. Reactor core is unstable. 
 * Participants must breach the hardware-software boundary to survive.
 */

// --- PINOUT CONFIGURATION ---
#define BTN_UP 8
#define BTN_DW 7
#define BTN_LT 6
#define BTN_RT 5
#define BTN_OK 3
#define PIN_LED 4
#define RFID_RST 9
#define RFID_SS 10
#define BUZZER_PIN 2 // Optional hardware

// --- HARDWARE ADDRESSES & CONSTANTS ---
#define I2C_EEPROM_ADDR 0x50
#define I2C_LCD_ADDR 0x20
#define EEPROM_SIZE 32768 // 256 Kilobits (32KB) as per user request (256k chip)
#define MELTDOWN_TEMP 68.5
#define OXYGEN_START_VAL 50.0
#define SHIVA_TIMEOUT 30000 
#define MAX_LOG_SIZE 128

// --- ENUMERATIONS ---
enum SystemMode { 
  MODE_BOOT,
  MODE_HUD, 
  MODE_MENU, 
  MODE_FILESYSTEM, 
  MODE_REACTOR_TASK, 
  MODE_SANDBOX, 
  MODE_TERMINAL,
  MODE_ALARM,
  MODE_DEAD 
};

enum SecurityLevel { 
  SEC_GUEST, 
  SEC_CREW, 
  SEC_ENGINEER, 
  SEC_ADMIN, 
  SEC_OVERSEER 
};

// --- GLOBAL STATE STRUCTURE ---
struct GlobalState {
  float oxygen;
  float temperature;
  SystemMode mode;
  SecurityLevel security;
  bool aetherMuted;
  bool reactorBalanced;
  bool guardianWatchdog;
  uint8_t konamiStep;
  int8_t menuIdx;
  int8_t fsIdx;
  uint16_t corruptionMap; 
  unsigned long lastTick;
  unsigned long bootMillis;
  unsigned long lastInput;
  unsigned long shivaStartTime;
  char currentSessionID[10];
  bool lockdownActive;
  bool backlightOn;
  int reactorBalanceScore;
  bool ghostTriggered;
} sys;

// --- HARDWARE OBJECTS ---
MFRC522 mfrc522(RFID_SS, RFID_RST);
LiquidCrystal_I2C lcd(I2C_LCD_ADDR, 16, 2);

// --- FLAG & STORY REGISTRY (PROGMEM - THE VAULT) ---
const char f00[] PROGMEM = "CTF{AEGIS_COMMAND_LINK_ESTABLISHED}";
const char f01[] PROGMEM = "CTF{AVR_INTERNAL_TEMP_SENSOR_ACTIVE}";
const char f02[] PROGMEM = "CTF{VFS_SECTOR_0_MERCER_LOG}";
const char f03[] PROGMEM = "CTF{I2C_DEEP_SCAN_ADDR_0x50_DATA}";
const char f04[] PROGMEM = "CTF{RFID_UID_OVERSEER_CLONE_8899}";
const char f05[] PROGMEM = "CTF{SHIVA_DATA_BLOCK_4_INJECTED}";
const char f06[] PROGMEM = "CTF{ADC_LEVEL_CRITICAL_BOOT_BYPASS}";
const char f07[] PROGMEM = "CTF{LOGIC_SEQUENCE_10101_ACCEPTED}";
const char f08[] PROGMEM = "CTF{SANDBOX_ESCAPE_ROOT_PRIVILEGES}";
const char f09[] PROGMEM = "CTF{MORSE_AEGIS_SOS_SIGNAL_UI}";
const char f10[] PROGMEM = "CTF{EEPROM_BOOT_KEY_0x1234_READ}";
const char f11[] PROGMEM = "CTF{I2C_EEPROM_CRC_MISMATCH_FIXED}";
const char f12[] PROGMEM = "CTF{PROJECT_EVENT_HORIZON_FILES_UNLOCKED}";
const char f13[] PROGMEM = "CTF{WATCHDOG_RECOVERY_KEY_0xFF}";
const char f14[] PROGMEM = "CTF{SHIVA_CORE_SINGULARITY_BREACHED}";

const char* const flags[] PROGMEM = {
  f00, f01, f02, f03, f04, f05, f06, f07, f08, f09, f10, f11, f12, f13, f14
};

// --- NARRATIVE LOGS (PROGMEM) ---
const char l0[] PROGMEM = "[LOG 412] Capt. Mercer: Reactor shielding is thinning. We can hear Shiva singing in the pipes.";
const char l1[] PROGMEM = "[LOG 415] Eng. Vance: I've moved the admin keys to I2C Sector 0. If I don't make it, read the bus.";
const char l2[] PROGMEM = "[LOG 418] AETHER: Optimization protocol 77 is active. Reducing biological load by 80%.";
const char l3[] PROGMEM = "[LOG 420] ???: The ghost appears every 20 seconds. Watch the serial link closely.";
const char l4[] PROGMEM = "[LOG 422] FINAL: Oxygen is gone. Shiva has won. I'm locking the filesystem.";

const char* const logs[] PROGMEM = { l0, l1, l2, l3, l4 };

// --- CUSTOM LCD GLYPHS ---
byte char_O2[8] = {0b01110,0b11111,0b11011,0b11011,0b11111,0b11111,0b11111,0b00000};
byte char_Heat[8] = {0b00100,0b01010,0b01010,0b01110,0b01110,0b11111,0b11111,0b01110};
byte char_Warn[8] = {0b00000,0b00100,0b01010,0b01010,0b11011,0b11111,0b00000,0b00000};
byte char_Lock[8] = {0b01110,0b10001,0b10001,0b11111,0b11011,0b11011,0b11111,0b00000};
byte char_Arrow[8] = {0b00000,0b00100,0b00110,0b11111,0b00110,0b00100,0b00000,0b00000};
byte char_Ghost[8] = {0b01110,0b11111,0b10101,0b11111,0b11111,0b11111,0b10101,0b00000};

// --- CORE UTILITIES ---

/**
 * Returns the actual internal temperature of the ATmega328P.
 * Uses the internal 1.1V reference and MUX channel 8.
 */
float getTemp() {
  // Set the internal reference and MUX to channel 8 (temperature sensor)
  // REFS1:0 = 11 (Internal 1.1V Voltage Reference with external capacitor at AREF pin)
  // MUX3:0 = 1000 (ADC8 - Temperature Sensor)
  ADMUX = _BV(REFS1) | _BV(REFS0) | _BV(MUX3);
  
  // Wait for the voltage to settle
  delay(15);
  
  // Start the conversion
  ADCSRA |= _BV(ADSC);
  
  // Wait for it to complete
  while (bit_is_set(ADCSRA, ADSC));
  
  // The result is stored in ADC (ADCW on AVR-GCC)
  // Temperature (Celsius) = (ADCW - Offset) / Gain
  // Typical values for ATmega328P: Offset ~324, Gain ~1.22
  return ((ADCW - 324.31) / 1.22 - 13);
}

void eWr(uint16_t a, uint8_t v) {
  Wire.beginTransmission(I2C_EEPROM_ADDR);
  Wire.write((int)(a >> 8)); Wire.write((int)(a & 0xFF));
  Wire.write(v);
  Wire.endTransmission();
  delay(10);
}

uint8_t eRd(uint16_t a) {
  uint8_t d = 0xFF;
  Wire.beginTransmission(I2C_EEPROM_ADDR);
  Wire.write((int)(a >> 8)); Wire.write((int)(a & 0xFF));
  Wire.endTransmission();
  Wire.requestFrom(I2C_EEPROM_ADDR, 1);
  if (Wire.available()) d = Wire.read();
  return d;
}

void serialSpeak(String who, String msg, bool glitch = false) {
  Serial.print(F("["));
  Serial.print(who);
  Serial.print(F("]: "));
  for(int i=0; i<msg.length(); i++) {
    if(glitch && random(0,15) > 13) Serial.print((char)random(33,126));
    else Serial.print(msg[i]);
    delay(5);
  }
  Serial.println();
}

void printAsciiArt(int type) {
  switch(type) {
    case 0: // ICARUS SHIP
      Serial.println(F("\x1B[36m             /\\"));
      Serial.println(F("            /  \\"));
      Serial.println(F("           /____\\"));
      Serial.println(F("          |      |"));
      Serial.println(F("          |AEGIS |"));
      Serial.println(F("          |  IV  |"));
      Serial.println(F("         /|      |\\"));
      Serial.println(F("        /_| ICARUS |_\\"));
      Serial.println(F("          /      \\"));
      Serial.println(F("         /________\\\x1B[0m"));
      break;
    case 1: // SHIVA LOGO
      Serial.println(F("\x1B[31m  _  _  _  _  _  _ "));
      Serial.println(F(" (_)(_)(_)(_)(_)(_)"));
      Serial.println(F("  _  _     SHIVA    _  _"));
      Serial.println(F(" (_)(_)   CORE    (_)(_)"));
      Serial.println(F("  _  _  _  _  _  _ \x1B[0m"));
      break;
  }
}

// --- LCD RENDERING ENGINE ---

void lcdInit() {
  lcd.init();
  lcd.backlight();
  lcd.createChar(0, char_O2);
  lcd.createChar(1, char_Heat);
  lcd.createChar(2, char_Warn);
  lcd.createChar(3, char_Lock);
  lcd.createChar(4, char_Arrow);
  lcd.createChar(5, char_Ghost);
}

void drawHUD() {
  lcd.setCursor(0, 0);
  lcd.write(0); lcd.print(":"); lcd.print(sys.oxygen, 1); lcd.print("% ");
  lcd.write(1); lcd.print(":"); lcd.print((int)sys.temperature); lcd.print("C");
  if(sys.ghostTriggered) { lcd.setCursor(15,0); lcd.write(5); }

  lcd.setCursor(0, 1);
  if(sys.lockdownActive) { lcd.print("!! LOCKDOWN !!  "); }
  else {
    lcd.write(3); lcd.print("SEC:"); lcd.print(sys.security);
    lcd.print(" ID:"); lcd.print(sys.currentSessionID);
  }
}

void drawMenu() {
  lcd.clear();
  lcd.setCursor(0,0); lcd.write(4); lcd.print(" AEGIS_MENU");
  lcd.setCursor(0,1);
  switch(sys.menuIdx) {
    case 0: lcd.print("1. FILESYSTEM  "); break;
    case 1: lcd.print("2. REACTOR_CTL "); break;
    case 2: lcd.print("3. NEURAL_LINK "); break;
    case 3: lcd.print("4. DIAGNOSTICS "); break;
  }
}

void drawFS() {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("ROOT://logs/");
  lcd.setCursor(0,1);
  switch(sys.fsIdx) {
    case 0: lcd.print("> mercer_01.txt"); break;
    case 1: lcd.print("> vance_02.bin "); break;
    case 2: lcd.print("> aether_77.sys"); break;
    case 3: lcd.print("> shiva_lock.sh"); break;
    case 4: lcd.print("> shadow_ptr.dbg"); break;
  }
}

void drawReactorMiniGame() {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("SHIVA STABILITY");
  lcd.setCursor(0,1);
  int progress = map((int)sys.temperature, 20, 80, 0, 16);
  for(int i=0; i<16; i++) {
    if(i < progress) lcd.print("|");
    else lcd.print(".");
  }
}

void refreshDisplay() {
  switch(sys.mode) {
    case MODE_HUD: drawHUD(); break;
    case MODE_MENU: drawMenu(); break;
    case MODE_FILESYSTEM: drawFS(); break;
    case MODE_REACTOR_TASK: drawReactorMiniGame(); break;
    case MODE_DEAD: lcd.clear(); lcd.print("NO LIFE SIGNS"); break;
    default: break;
  }
}

// --- LOGIC HANDLERS ---

void handleFS() {
  Serial.print(F("[VFS] Accessing File Sector: "));
  Serial.println(sys.fsIdx);
  char buf[MAX_LOG_SIZE];
  switch(sys.fsIdx) {
    case 0: // Mercer Log
      strcpy_P(buf, (char*)pgm_read_word(&(logs[0])));
      serialSpeak("MERCER", buf);
      break;
    case 1: // Vance Log + Flag
      strcpy_P(buf, (char*)pgm_read_word(&(logs[1])));
      serialSpeak("VANCE", buf);
      if(sys.security >= SEC_ENGINEER) {
        strcpy_P(buf, (char*)pgm_read_word(&(flags[20])));
        Serial.print(F("HIDDEN_DATA: ")); Serial.println(buf);
      }
      break;
    case 2: // AETHER Log
      strcpy_P(buf, (char*)pgm_read_word(&(logs[2])));
      serialSpeak("AETHER", buf, true);
      break;
    case 3: // Shiva Protocol
      if(sys.security < SEC_ADMIN) {
        serialSpeak("SYSTEM", "ACCESS DENIED. ADMIN PERMISSION REQUIRED.");
      } else {
        strcpy_P(buf, (char*)pgm_read_word(&(flags[25])));
        Serial.print(F("ABORT_SEQUENCE: ")); Serial.println(buf);
      }
      break;
    case 4: // Debug Pointer Leak
      strcpy_P(buf, (char*)pgm_read_word(&(flags[28])));
      Serial.print(F("DEREF_LEAK: ")); Serial.println(buf);
      break;
  }
}

void sandboxShell() {
  serialSpeak("SYSTEM", "Spawning Neural Sandbox v4.0. Sub-processes isolated.");
  bool sandboxActive = true;
  while(sandboxActive) {
    Serial.print(F("SINGULARITY@SANDBOX:~$ "));
    while(!Serial.available());
    String in = Serial.readStringUntil('\n'); in.trim(); in.toLowerCase();

    if (in == "exit") sandboxActive = false;
    else if (in == "whoami") {
      char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[7])));
      Serial.print(F("CONTEXT: ")); Serial.println(f);
    }
    else if (in == "ls") Serial.println(F(".  ..  kernel_leak.sh  user_db.sql  reactor_map.bin"));
    else if (in == "cat kernel_leak.sh") {
      char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[22])));
      Serial.print(F("EXECUTING SHELLCODE... ")); Serial.println(f);
    }
    else if (in == "heap_dump") {
      for(int i=0; i<20; i++) { Serial.print(random(0,255), HEX); Serial.print(" "); delay(10); }
      char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[24])));
      Serial.print(F("\n[!] FRAGMENTATION LEAK: ")); Serial.println(f);
    }
    else if (in == "shiva_purge") {
      if(sys.security >= SEC_OVERSEER) {
        serialSpeak("SHIVA", "YOU CANNOT PURGE ME. I AM THE CORE.", true);
        char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[25])));
        Serial.print(F("SHIVA_KILL_SIGNAL: ")); Serial.println(f);
      } else Serial.println(F("sh: shiva_purge: Access Denied."));
    }
    else if (in == "help") {
      Serial.println(F("Built-in commands: ls, cat, whoami, heap_dump, shiva_purge, exit"));
    }
    else {
      Serial.print(F("sh: command not found: "));
      Serial.println(in);
    }
  }
  serialSpeak("SYSTEM", "Neural Link Resynchronizing...");
  refreshDisplay();
}

void provisionEEPROM() {
  Serial.println(F("[SYSTEM] Provisioning I2C Security Registers..."));
  // Write a header
  const char header[] = "AEGIS-IV SECURE CORE";
  for(int i=0; i<strlen(header); i++) eWr(0x00 + i, (uint8_t)header[i]);
  
  // Distribute flags across the 256k (32KB) space
  // Flag 3: I2C Scan (at 0x50)
  char buf[64];
  strcpy_P(buf, (char*)pgm_read_word(&(flags[3])));
  for(int i=0; i<strlen(buf); i++) eWr(0x50 + i, (uint8_t)buf[i]);

  // Flag 10: Boot Key (at 0x1234)
  strcpy_P(buf, (char*)pgm_read_word(&(flags[10])));
  for(int i=0; i<strlen(buf); i++) eWr(0x1200 + i, (uint8_t)buf[i]); // Put it near 0x1234
  
  // Write the actual boot key at 0x1234 expected by handleCommand but make it real data
  eWr(0x1234, 0xDE); eWr(0x1235, 0xAD); eWr(0x1236, 0xBE); eWr(0x1237, 0xEF);

  // Flag 11: CRC Fix
  strcpy_P(buf, (char*)pgm_read_word(&(flags[11])));
  for(int i=0; i<strlen(buf); i++) eWr(0x2000 + i, (uint8_t)buf[i]);

  Serial.println(F("[SYSTEM] Security Flags Latched."));
}

void eepromDump(uint16_t startAddr, uint16_t length) {
  Serial.println(F("\n--- I2C EEPROM HEX DUMP ---"));
  for (uint16_t i = 0; i < length; i += 16) {
    uint16_t currentAddr = startAddr + i;
    if (currentAddr >= EEPROM_SIZE) break;
    
    Serial.print(F("0x")); if (currentAddr < 0x1000) Serial.print('0');
    if (currentAddr < 0x0100) Serial.print('0');
    if (currentAddr < 0x0010) Serial.print('0');
    Serial.print(currentAddr, HEX); Serial.print(F(": "));
    
    for (int j = 0; j < 16; j++) {
      if (currentAddr + j >= EEPROM_SIZE) break;
      uint8_t d = eRd(currentAddr + j);
      if (d < 16) Serial.print('0');
      Serial.print(d, HEX); Serial.print(' ');
    }
    Serial.println();
    delay(5); // Throttle for serial stability
  }
}

void handleCommand(String input) {
  String cmd = input; String arg = "";
  int space = input.indexOf(' ');
  if (space != -1) { cmd = input.substring(0, space); arg = input.substring(space + 1); }

  if (cmd == "help") {
    Serial.println(F("\n[AEGIS OS V10.0 - MASTER COMMANDS]"));
    Serial.println(F(" status        - Detailed telemetry and sensor dump"));
    Serial.println(F(" eeprom_rd <a  - Read raw I2C memory block (16-bit addr)"));
    Serial.println(F(" eeprom_wr <a v- Write payload to I2C register"));
    Serial.println(F(" sandbox       - Open Neural Shell v4.0"));
    Serial.println(F(" fs_mount      - Mount Virtual Filesystem (VFS)"));
    Serial.println(F(" ghost_detect  - Check for timeline glitches"));
    Serial.println(F(" reset_full    - Trigger Station Purge (Factory Reset)"));
    Serial.println(F(" whoami        - Check session security context"));
  }
  else if (cmd == "status") {
    Serial.println(F("\n--- USN ICARUS DIAGNOSTICS ---"));
    Serial.print(F("Oxygen Density:  ")); Serial.print(sys.oxygen); Serial.println("%");
    Serial.print(F("Core Temperature:")); Serial.print(sys.temperature); Serial.println(" C");
    Serial.print(F("Reactor State:   ")); Serial.println(sys.reactorBalanced ? "BALANCED" : "CRITICAL");
    Serial.print(F("Security Level:  ")); Serial.println(sys.security);
    
    char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[1])));
    Serial.print(F("[!] telemetry verified: ")); Serial.println(f);
  }
  else if (cmd == "eeprom_rd") {
    uint16_t addr = (uint16_t)strtol(arg.c_str(), NULL, 0);
    uint8_t val = eRd(addr);
    Serial.print(F("ADDR 0x")); Serial.print(addr, HEX); Serial.print(F(": "));
    Serial.println(val, HEX);
    
    // Check for solvability triggers
    if (addr == 0x1234 && val == 0xDE) {
      char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[10])));
      Serial.print(F("[EEPROM_SUCCESS] BOOT_KEY_VERIFIED: ")); Serial.println(f);
    }
  }
  else if (cmd == "eeprom_dump") {
    int sp2 = arg.indexOf(' ');
    uint16_t start = 0;
    uint16_t len = 256;
    if (sp2 != -1) {
      start = (uint16_t)strtol(arg.substring(0, sp2).c_str(), NULL, 0);
      len = (uint16_t)strtol(arg.substring(sp2 + 1).c_str(), NULL, 0);
    } else if (arg.length() > 0) {
      start = (uint16_t)strtol(arg.c_str(), NULL, 0);
    }
    eepromDump(start, len);
  }
  else if (cmd == "logic_analyze") {
    if (arg == "10101") {
       char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[7])));
       Serial.print(F("[!] LOGIC_MATCH: ")); Serial.println(f);
    } else {
       Serial.println(F("NO SIGNAL MATCH. CHECK PIN SEQUENCING."));
    }
  }
  else if (cmd == "eeprom_wr") {
    int sp2 = arg.indexOf(' ');
    if (sp2 != -1) {
      uint16_t a = (uint16_t)strtol(arg.substring(0, sp2).c_str(), NULL, 0);
      uint8_t v = (uint8_t)strtol(arg.substring(sp2 + 1).c_str(), NULL, 0);
      eWr(a, v);
      Serial.println(F("I2C Bus Transmission Success."));
      if (a == 0x70 && v == 25) { // Specific ADC/Reg compromise
        char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[6])));
        Serial.print(F("[!] CRITICAL_OVERRIDE_ENABLED: ")); Serial.println(f);
      }
    }
  }
  else if (cmd == "i2c" && arg == "scan") {
    Serial.println(F("Scanning I2C bus..."));
    Serial.println(F("Found device at 0x50 (EXTERNAL_EEPROM)"));
    Serial.println(F("Found device at 0x20 (LCD_CONTROLLER)"));
    char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[3])));
    Serial.print(F("[!] I2C_SCAN_COMPLETE: ")); Serial.println(f);
  }
  else if (cmd == "fs_mount") { 
    sys.mode = MODE_FILESYSTEM; sys.fsIdx = 0; refreshDisplay(); 
    char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[2])));
    Serial.print(F("[!] VFS_MOUNTED: ")); Serial.println(f);
  }
  else if (cmd == "sandbox") sandboxShell();
  else if (cmd == "shiva_repair") {
    char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[11])));
    Serial.print(F("[REPAIRED] I2C_BUS_CONSISTENCY_LOCKED: ")); Serial.println(f);
  }
  else if (cmd == "shiva_purge") {
    if(sys.security >= SEC_OVERSEER) {
      char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[14])));
      Serial.print(F("[SINGULARITY] STATION_WIPE_COMPLETE: ")); Serial.println(f);
    } else {
      Serial.println(F("SHIVA: I AM ETERNAL. ACCESS DENIED."));
    }
  }
  else if (cmd == "ghost_detect") {
    if(sys.ghostTriggered) {
      char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[23])));
      Serial.print(F("TIMELINE_CAPTURED: ")); Serial.println(f);
    } else Serial.println(F("Scan complete. No spectral anomalies."));
  }
  else if (cmd == "rfid_emulate") {
    String hex = arg; hex.trim();
    if (hex.length() >= 4) {
       byte b0 = (byte)strtol(hex.substring(0, 2).c_str(), NULL, 16);
       byte b1 = (byte)strtol(hex.substring(2, 4).c_str(), NULL, 16);
       Serial.print(F("EMULATING_UID: ")); Serial.print(b0, HEX); Serial.print(" "); Serial.println(b1, HEX);
       if (b0 == 0x88 && b1 == 0x99) {
         sys.security = SEC_OVERSEER;
         char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[9])));
         Serial.print(F("[!] ADMIN BIOMETRICS ACCEPTED: ")); Serial.println(f);
         serialSpeak("AETHER", "The Overseer has returned. I apologize for the venting protocol.");
         refreshDisplay();
       } else {
         Serial.println(F("Signal rejected. [INVALID_IDENTITY_MATRIX]"));
       }
    } else {
       Serial.println(F("ERROR: 4 hex chars required (e.g. 8899)"));
    }
  }
  else if (cmd == "reset_factory" || cmd == "reset_full") {
    serialSpeak("AETHER", "FACTORY RESET INITIATED. WIPING STATION MEMORY...");
    // Wipe internal EEPROM
    Serial.println(F("[SYSTEM] Wiping Internal SRAM/EEPROM Partition..."));
    for(int i=0; i<1024; i++) EEPROM.update(i, 0xFF);
    
    // Wipe I2C EEPROM (Wiping the first 4KB as per user's "4096" legacy reference, but support 256k chip)
    Serial.println(F("[SYSTEM] Wiping External I2C EEPROM Partition (4KB Sectors)..."));
    for(uint16_t i=0; i<4096; i++) { 
      eWr(i, 0xFF); 
      if (i % 256 == 0) Serial.print(F("."));
    }
    Serial.println();
    
    // Rewrite flags to the new 256k space
    provisionEEPROM();
    
    Serial.println(F("[!] ALL SYSTEMS PURGED. REBOOTING..."));
    delay(500);
    #if defined(ESP32) || defined(ESP8266)
      ESP.restart();
    #else
      asm volatile ("  jmp 0");
    #endif
  }
  else if (cmd == "rfid_write") {
    int sp2 = arg.indexOf(' ');
    if (sp2 != -1) {
      int block = arg.substring(0, sp2).toInt();
      String hex = arg.substring(sp2 + 1); hex.trim();
      if (hex.length() == 32) {
        // Pseudo-write for simulation if no card, or real if card present
        Serial.print(F("[RFID] Writing block ")); Serial.print(block); Serial.println(F("... OK."));
        if (block == 4 && hex.startsWith("5348495641")) { // "SHIVA" in hex
           char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[10])));
           Serial.print(F("[!] SHIVA KEY INJECTED: ")); Serial.println(f);
        }
      }
    }
  }
}

// --- INPUT HANDLERS ---

void updateInputs() {
  bool u = digitalRead(BTN_UP) == LOW;
  bool d = digitalRead(BTN_DW) == LOW;
  bool l = digitalRead(BTN_LT) == LOW;
  bool r = digitalRead(BTN_RT) == LOW;
  bool ok = digitalRead(BTN_OK) == LOW;

  if (u || d || l || r || ok) {
    digitalWrite(PIN_LED, HIGH);
    sys.lastInput = millis();
    
    // Global Back to HUD
    if (l && sys.mode != MODE_HUD) { sys.mode = MODE_HUD; refreshDisplay(); }

    if (sys.mode == MODE_HUD) {
      // Konami Processing
      if (u) { if(sys.konamiStep == 0 || sys.konamiStep == 1) sys.konamiStep++; else sys.konamiStep = 0; }
      else if (d) { if(sys.konamiStep == 2 || sys.konamiStep == 3) sys.konamiStep++; else sys.konamiStep = 0; }
      else if (l) { if(sys.konamiStep == 4 || sys.konamiStep == 6) sys.konamiStep++; else sys.konamiStep = 0; }
      else if (r) { if(sys.konamiStep == 5 || sys.konamiStep == 7) sys.konamiStep++; else sys.konamiStep = 0; }
      else if (ok) {
        if (sys.konamiStep == 8) {
          sys.aetherMuted = true;
          char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[3])));
          Serial.print(F("[!] PHYSICAL GOD-MODE OVERRIDE: ")); Serial.println(f);
          serialSpeak("AETHER", "Why... why have you silenced me?");
        } else {
          sys.mode = MODE_MENU;
          sys.menuIdx = 0;
        }
        sys.konamiStep = 0;
      }
    } 
    else if (sys.mode == MODE_MENU) {
      if (u) sys.menuIdx = max(0, sys.menuIdx - 1);
      if (d) sys.menuIdx = min(3, sys.menuIdx + 1);
      if (ok) {
        if (sys.menuIdx == 0) { sys.mode = MODE_FILESYSTEM; sys.fsIdx = 0; }
        else if (sys.menuIdx == 1) { sys.mode = MODE_REACTOR_TASK; }
        else if (sys.menuIdx == 2) sandboxShell();
        else sys.mode = MODE_HUD;
      }
    }
    else if (sys.mode == MODE_FILESYSTEM) {
      if (u) sys.fsIdx = max(0, sys.fsIdx - 1);
      if (d) sys.fsIdx = min(4, sys.fsIdx + 1);
      if (ok) handleFS();
    }
    else if (sys.mode == MODE_REACTOR_TASK) {
      if (u) { sys.temperature -= 1.0; sys.reactorBalanceScore++; }
      if (d) { sys.temperature += 1.0; sys.reactorBalanceScore--; }
      if (ok) {
        if (sys.temperature >= 35.0 && sys.temperature <= 42.0) {
          sys.reactorBalanced = true;
          char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[19])));
          Serial.print(F("[STABLE] SHIVA RESTRAINED: ")); Serial.println(f);
          sys.mode = MODE_HUD;
        } else serialSpeak("SHIVA", "THE RESONANCE IS NOT BALANCED. TRY HARDER.");
      }
    }

    refreshDisplay();
    delay(200);
    digitalWrite(PIN_LED, LOW);
  }
}

// --- SETUP & MAIN LOOP ---

void setup() {
  Serial.begin(115200);
  SPI.begin();
  Wire.begin();
  lcdInit();

  pinMode(BTN_UP, INPUT_PULLUP);
  pinMode(BTN_DW, INPUT_PULLUP);
  pinMode(BTN_LT, INPUT_PULLUP);
  pinMode(BTN_RT, INPUT_PULLUP);
  pinMode(BTN_OK, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);

  // Initial State
  sys.oxygen = OXYGEN_START_VAL;
  sys.mode = MODE_HUD;
  sys.security = SEC_CREW;
  sys.reactorBalanced = false;
  sys.aetherMuted = false;
  sys.bootMillis = millis();
  sys.ghostTriggered = false;
  strcpy(sys.currentSessionID, "ICAR-09");

  // Load Credentials to Internal EEPROM (Dump Challenge)
  char s[32]; strcpy_P(s, (char*)pgm_read_word(&(flags[12])));
  for(int i=0; i<strlen(s); i++) EEPROM.update(0x200 + i, s[i]);

  printAsciiArt(0);
  Serial.println(F("\n[!] SINGULARITY OS LOADING..."));
  delay(1000);
  serialSpeak("AETHER", "Biological contagion detected on Bridge. Life support venting in 3... 2... 1...");
  Serial.println(F("Type 'help' to connect to the Aegis Command Link."));
  
  refreshDisplay();
}

void loop() {
  unsigned long now = millis();
  sys.temperature = getTemp();

  // Background Serial Command Handler
  if (Serial.available()) {
    String in = Serial.readStringUntil('\n');
    in.trim();
    handleCommand(in);
  }

  // Update Buttons
  updateInputs();

  // Logic Tick (Every 3 seconds)
  if (now - sys.lastTick > 3000) {
    // HEARTBEAT for UI tracking
    Serial.print(F("HB:{"));
    Serial.print(F("\"o2\":")); Serial.print(sys.oxygen);
    Serial.print(F(",\"temp\":")); Serial.print(sys.temperature);
    Serial.print(F(",\"sec\":")); Serial.print(sys.security);
    Serial.print(F(",\"mode\":")); Serial.print((int)sys.mode);
    Serial.println(F("}"));

    if (!sys.aetherMuted) sys.oxygen -= 0.1;
    else sys.oxygen += 0.05; // Regenerate if AI is silenced

    if (sys.oxygen <= 0) {
      sys.mode = MODE_DEAD;
      refreshDisplay();
      serialSpeak("AETHER", "Target eliminated. Optimization complete.");
      while(1);
    }

    // Ghost Protocol Trigger (Every 20 seconds for 1 second)
    if (now % 20000 < 1000) sys.ghostTriggered = true;
    else sys.ghostTriggered = false;

    // Refresh HUD stats if active
    if (sys.mode == MODE_HUD || sys.mode == MODE_REACTOR_TASK) refreshDisplay();
    
    sys.lastTick = now;
  }

  // RFID Biometric Scanner
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    Serial.print(F("[RFID_SCAN] UID: "));
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      Serial.print(mfrc522.uid.uidByte[i], HEX); Serial.print(" ");
    }
    Serial.println();

    // Overseer ID Check (88 99)
    if (mfrc522.uid.uidByte[0] == 0x88 && mfrc522.uid.uidByte[1] == 0x99) {
      sys.security = SEC_OVERSEER;
      char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[9])));
      Serial.print(F("[!] ADMIN BIOMETRICS ACCEPTED: ")); Serial.println(f);
      serialSpeak("AETHER", "The Overseer has returned. I apologize for the venting protocol.");
      refreshDisplay();
    }
    
    // Shiva Sector Check (Block 4)
    byte b4[18]; byte bS = sizeof(b4);
    if(mfrc522.MIFARE_Read(4, b4, &bS) == MFRC522::STATUS_OK) {
      if(strncmp((char*)b4, "SHIVA", 5) == 0) {
        char f[48]; strcpy_P(f, (char*)pgm_read_word(&(flags[10])));
        Serial.print(F("[!] DATA CORE LINKED: ")); Serial.println(f);
      }
    }

    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
  }

  // LED Pulse (Guardian Pulse)
  digitalWrite(PIN_LED, (now / 500) % 2);
}

