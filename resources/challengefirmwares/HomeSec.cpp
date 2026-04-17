#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <EEPROM.h>
#include <LiquidCrystal_I2C.h>

/**
 * HOMESEC v2 - OPERATION: DARK_SILENCE
 * ------------------------------------
 * Micro-controller: ATmega328P (Core)
 * Co-processor: ATtiny44 (Parasitic)
 * Security Level: OMEGA
 * 
 * [SYSTEM OVERVIEW]
 * This firmware controls the HomeSec Vault's primary logic gate.
 * It integrates RFID biometrics, I2C secure storage, and a 
 * Konami-bypass physical interface.
 * 
 * DESIGNED FOR CTF RESEARCH ONLY.
 */

// --- PINOUT ---
#define RT_BTN 5
#define LT_BTN 6
#define DW_BTN 7
#define UP_BTN 8
#define OK_BTN 3
#define RST_PIN 9
#define SS_PIN 10
#define LED_PIN 4
#define RX_PIN 2

// --- CONSTANTS ---
#define EXT_EEPROM_ADDR 0x50

// --- RFID & LCD ---
MFRC522 mfrc522(SS_PIN, RST_PIN);
MFRC522::MIFARE_Key key;
LiquidCrystal_I2C lcd(0x20, 16, 2);

// --- GLOBAL STATE ---
bool guardianActive = true;
bool vaultUnlocked = false;
bool neuralLinked = false;
uint8_t konamiState = 0;
unsigned long bootTime = 0;
float simulatedVoltage = 5.0;
float simulatedTemp = 24.8;
String lastPacket = "";

// --- ENCRYPTED DATA SLABS (Stored in PROGMEM) ---
// Flags are ONLY here.
const char f0[] PROGMEM = "CTF{Welcome_To_HomeSec_v2}";
const char f1[] PROGMEM = "CTF{Caesar_Was_A_Hacker}";
const char f2[] PROGMEM = "CTF{Vigenere_Is_Just_Caesar_Plus}";
const char f3[] PROGMEM = "CTF{U_U_D_D_L_R_L_R_B_A}";
const char f4[] PROGMEM = "CTF{ADC_High_Voltage_Detected}";
const char f5[] PROGMEM = "CTF{PWM_Frequency_Match_1KHz}";
const char f6[] PROGMEM = "CTF{Guardian_Bypassed_Successfully}";
const char f7[] PROGMEM = "CTF{Hidden_Auth_Credentials_Found}";
const char f8[] PROGMEM = "CTF{HomeSec_Infiltrated_GameOver}";
const char f9[] PROGMEM = "CTF{RFID_Serial_8899AA}";
const char f10[] PROGMEM = "CTF{RFID_Block_4_Secrets}";
const char f11[] PROGMEM = "CTF{SPI_Tiny44_Intercepted}";
const char f12[] PROGMEM = "CTF{Internal_Mem_Leaked}";
const char f13[] PROGMEM = "CTF{I2C_External_Flag_01}";
const char f14[] PROGMEM = "CTF{I2C_External_Flag_02}";
const char f15[] PROGMEM = "CTF{I2C_External_Flag_03}";
const char f16[] PROGMEM = "CTF{I2C_External_Flag_04}";
const char f17[] PROGMEM = "CTF{I2C_External_Flag_05}";

const char* const flags_in_code[] PROGMEM = {
  f0, f1, f2, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12, f13, f14, f15, f16, f17
};

// Prototypes
void printHeader();
void scanRFID();
void handleCommand(String input);
void drawMenu();
void neuralSandbox();
void generateHint();
void generateSidequest();

void setup() {
  Serial.begin(115200);
  SPI.begin();
  Wire.begin();
  
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HOMESEC VAULT");
  lcd.setCursor(0, 1);
  lcd.print("BOOTING...");
  
  mfrc522.PCD_Init();
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;

  pinMode(UP_BTN, INPUT_PULLUP);
  pinMode(DW_BTN, INPUT_PULLUP);
  pinMode(LT_BTN, INPUT_PULLUP);
  pinMode(RT_BTN, INPUT_PULLUP);
  pinMode(OK_BTN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);

  // Transfer one flag to Internal EEPROM at boot
  char buff[32];
  strcpy_P(buff, (char*)pgm_read_word(&(flags_in_code[12])));
  for(int i=0; i<strlen(buff); i++) EEPROM.update(0x200 + i, buff[i]);

  bootTime = millis();
  delay(1000);
  printHeader();
}

void loop() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    handleCommand(input);
  }

  // Background Scanning
  static unsigned long lastScan = 0;
  if (millis() - lastScan > 1000) {
    scanRFID();
    lastScan = millis();
  }

  // Button Matrix Processing
  if (digitalRead(UP_BTN) == LOW) { if(konamiState == 0 || konamiState == 1) konamiState++; else konamiState = 0; delay(200); }
  if (digitalRead(DW_BTN) == LOW) { if(konamiState == 2 || konamiState == 3) konamiState++; else konamiState = 0; delay(200); }
  if (digitalRead(LT_BTN) == LOW) { if(konamiState == 4 || konamiState == 6) konamiState++; else konamiState = 0; delay(200); }
  if (digitalRead(RT_BTN) == LOW) { if(konamiState == 5 || konamiState == 7) konamiState++; else konamiState = 0; delay(200); }
  if (digitalRead(OK_BTN) == LOW) { 
    if(konamiState == 8) {
      char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[3])));
      Serial.print(F("[BYPASS_INIT] Sequence Accepted: ")); Serial.println(f);
      guardianActive = false;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("BYPASS ENGAGED");
    }
    konamiState = 0; 
    delay(200); 
  }

  // Guardian Pulse
  if (guardianActive && (millis() / 500) % 2 == 0) digitalWrite(LED_PIN, HIGH);
  else digitalWrite(LED_PIN, LOW);
}

void printHeader() {
  Serial.println(F("\n\r\x1B[2J\x1B[H")); // Clear Screen
  Serial.println(F("\x1B[36m      __  __                      ___             "));
  Serial.println(F("     |  \\/  | ___  _ __   ___ / __| ___ ___     "));
  Serial.println(F("     | |\\/| |/ _ \\| '  \\ / -_)\\__ \\/ -_)  _|    "));
  Serial.println(F("     |_|  |_|\\___/|_|_|_|\\___||___/\\___\\___|    "));
  Serial.println(F("\x1B[0m=================================================="));
  Serial.print(F(" [SYS_NAME] HomeSec Vault Alpha\n"));
  Serial.print(F(" [VERSION]  2.1.0-DARK_SILENCE\n"));
  Serial.print(F(" [STATUS]   GUARDIAN_ENGAGED\n"));
  
  char w[32]; strcpy_P(w, (char*)pgm_read_word(&(flags_in_code[0])));
  Serial.print(F(" [LOGS]     Boot Success. Welcome: ")); Serial.println(w);
  Serial.println(F("=================================================="));
  Serial.println(F("Type 'help' to access Neural Command Link."));
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SYS: HomeSec V2");
  lcd.setCursor(0, 1);
  lcd.print("STATUS: ONLINE ");
}

void handleCommand(String input) {
  if (input.length() > 0) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("CMD EXECUTING:");
    lcd.setCursor(0, 1);
    lcd.print(input.substring(0, 16));
  }
  
  input.toLowerCase();

  if (input == "help") drawMenu();
  else if (input == "status") {
    Serial.println(F("\n[DIAGNOSTICS]"));
    Serial.print(F(" > VAULT GATE:   ")); Serial.println(vaultUnlocked ? F("\x1B[32mOPEN\x1B[0m") : F("\x1B[31mCLOSED\x1B[0m"));
    Serial.print(F(" > GUARDIAN:     ")); Serial.println(guardianActive ? F("\x1B[31mACTIVE\x1B[0m") : F("\x1B[32mBYPASSED\x1B[0m"));
    Serial.print(F(" > TEMP_CORE:    ")); Serial.print(simulatedTemp); Serial.println(F("C"));
    Serial.print(F(" > VOLT_RAIL:    ")); Serial.print(simulatedVoltage); Serial.println(F("V"));
  }
  else if (input == "hint") generateHint();
  else if (input == "sidequest") generateSidequest();
  else if (input == "neural_sandbox") neuralSandbox();
  else if (input.startsWith("help ")) { // RPG Hook
    String mid = input.substring(5);
    if(mid == "vault") Serial.println(F("[HUD] Vault door uses RFID encryption (Type B)."));
    else if(mid == "mfrc") Serial.println(F("[HUD] RFID sensor active. Scan admin tag for auth."));
    else if(mid == "eeprom") Serial.println(F("[HUD] I2C 24C64 detected at 0x50. Try 'eeprom_rd <addr>'."));
    else if(mid == "tiny") Serial.println(F("[HUD] Tiny44 sub-proc busy processing SPI requests."));
  }
  else if (input.startsWith("eeprom_rd ")) {
    int addr = input.substring(10).toInt();
    // Simulate External Flags
    if (addr >= 0x100 && addr <= 0x104) {
      char ef[40]; strcpy_P(ef, (char*)pgm_read_word(&(flags_in_code[13 + (addr-0x100)])));
      Serial.print(F("[DUMP_SUCCESS] Addr 0x")); Serial.print(addr, HEX);
      Serial.print(F(": ")); Serial.println(ef);
    } else {
      Serial.println(F("[EEPROM_ERR] Segment encrypted by Hardware JP1."));
    }
  }
  else if (input == "vault_open") {
    if (vaultUnlocked) {
      char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[8])));
      Serial.print(F("\x1B[1;32m[ACCESS_GRANTED]\x1B[0m Vault Key: ")); Serial.println(f);
      lcd.clear();
      lcd.setCursor(0,0);
      lcd.print("VAULT OPENED");
      lcd.setCursor(0,1);
      lcd.print("ACCESS GRANTED");
    } else {
      Serial.println(F("\x1B[31m[DENIED]\x1B[0m Biometric Mismatch. RFID Admin Tag Required."));
      lcd.clear();
      lcd.setCursor(0,0);
      lcd.print("ACCESS DENIED");
      lcd.setCursor(0,1);
      lcd.print("RFID REQUIRED");
    }
  }
  else if (input == "reset_contest") {
    Serial.println(F("WARNING: Factory Reset Initiated."));
    Serial.println(F("Formatting Internal EEPROM..."));
    for (int i = 0; i < 1024; i++) EEPROM.update(i, 0xFF);
    Serial.println(F("Internal EEPROM Formatted."));
    Serial.println(F("To format RFID tag, present it now (timeout 5s)..."));
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("FACTORY RESET");
    lcd.setCursor(0,1);
    lcd.print("WIPING DATA...");
    
    unsigned long st = millis();
    bool cardFormatted = false;
    while(millis() - st < 5000) {
      if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
         Serial.println(F("Tag detected. Wiping blocks..."));
         for (byte block = 4; block < 8; block++) {
            byte emptyBlock[16] = {0};
            mfrc522.MIFARE_Write(block, emptyBlock, 16);
         }
         Serial.println(F("Tag formatted successfully."));
         mfrc522.PICC_HaltA();
         mfrc522.PCD_StopCrypto1();
         cardFormatted = true;
         break;
      }
    }
    if(!cardFormatted) Serial.println(F("No tag presented. Skipped RFID format."));
    
    guardianActive = true;
    vaultUnlocked = false;
    Serial.println(F("RESET COMPLETE. System returning to pre-contest state."));
    delay(1000);
    printHeader();
  }
  else if (input == "debug_registers") {
    Serial.println(F("[ASM_DUMP]"));
    Serial.println(F(" R24: 0x48 (H) | R25: 0x53 (S)"));
    Serial.print(F(" EEAR: 0x200 (Credentials) | EECR: 0x02\n"));
    char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[11])));
    Serial.print(F(" SPI_BUFF: ")); Serial.println(f);
  }
  else if (input == "reset") printHeader();
  else Serial.println(F("Command not recognized in this sector."));
}

void drawMenu() {
  Serial.println(F("\n--- NEURAL COMMAND LINK ---"));
  Serial.println(F(" 1. status           - Check environmental integrity"));
  Serial.println(F(" 2. neural_sandbox   - Launch immersive research sub-shell"));
  Serial.println(F(" 3. eeprom_rd <addr> - Dump secure I2C memory blocks"));
  Serial.println(F(" 4. vault_open       - Attempt to breach the data core"));
  Serial.println(F(" 5. debug_registers  - Peek into low-level MCU state"));
  Serial.println(F(" 6. hint             - Request a system hint"));
  Serial.println(F(" 7. sidequest        - Access hidden sidequests (3 Normal / 3 Hard)"));
  Serial.println(F(" 8. reset_contest    - FORMAT all context, EEPROM, and restore factory state"));
  Serial.println(F(" 9. reset            - Reboot the command interface"));
}

void scanRFID() {
  if ( ! mfrc522.PICC_IsNewCardPresent()) return;
  if ( ! mfrc522.PICC_ReadCardSerial()) return;

  Serial.print(F("\x1B[33m[TAG_DETECTED] UID:"));
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    Serial.print(mfrc522.uid.uidByte[i], HEX); Serial.print(F(" "));
  }
  Serial.println(F("\x1B[0m"));

  // Admin UID Check
  if (mfrc522.uid.uidByte[0] == 0x88 && mfrc522.uid.uidByte[1] == 0x99 && mfrc522.uid.uidByte[2] == 0xAA) {
    char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[9])));
    Serial.print(F("[!] PRIVILEGE_ESCALATION: ")); Serial.println(f);
    vaultUnlocked = true;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("ADMIN TAG READ");
    lcd.setCursor(0, 1);
    lcd.print("VAULT UNLOCKED");
  }

  // Block 4 Secret
  byte buff[18]; byte size = sizeof(buff);
  if (mfrc522.MIFARE_Read(4, buff, &size) == MFRC522::STATUS_OK) {
    if (strncmp((char*)buff, "SECRET", 6) == 0) {
      char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[10])));
      Serial.print(F("[!] DATA_PACKET_INTERCEPTED: ")); Serial.println(f);
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("SECRET DETECTED");
    }
  }

  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

void generateHint() {
  String hints[] = {
    "HINT: The Guardian Pulse is tied to millis(). Can you disrupt the timeline?",
    "HINT: Look up the Konami code. The physical buttons map to it.",
    "HINT: The EEPROM starts at 0x50. The answers may be hidden in plain sight.",
    "HINT: Try submitting a frequency to the neural sandbox.",
    "HINT: A Watchdog guards the boss room. You better know how to handle animals.",
    "HINT: Sometimes a glitch is all it takes to spill memory."
  };
  int r = random(0, 6);
  Serial.println(F("\n[!] INCOMING TRANSMISSION:"));
  Serial.println(hints[r]);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("INCOMING HINT..");
  delay(1000);
  lcd.setCursor(0, 1);
  lcd.print("CHECK CONSOLE");
}

void generateSidequest() {
  int r = random(0, 6);
  Serial.println(F("\n[SIDEQUEST BOARD]"));
  if (r == 0) {
    Serial.println(F("1. EASY: Decode this rot13 string: 'Pgs{Ebg_13_vf_n_pynffvp}'."));
  } else if (r == 1) {
    Serial.println(F("2. EASY: Convert this binary to ASCII: 01001111 01001011."));
  } else if (r == 2) {
    Serial.println(F("3. EASY: What is the default Master Key for a new Mifare Classic 1K?"));
  } else if (r == 3) {
    Serial.println(F("4. HARD: The watchdog uses a time-based hashing algorithm. Find the collision for T=1500ms."));
  } else if (r == 4) {
    Serial.println(F("5. HARD: Dump the I2C EEPROM locally, find the XOR key offset at 0x10."));
  } else if (r == 5) {
    Serial.println(F("6. HARD: Perform a fault injection on the ATmega328P to skip the Konami check."));
  }
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("NEW SIDEQUEST!");
  delay(1000);
  lcd.setCursor(0, 1);
  lcd.print("CHECK CONSOLE");
}

void neuralSandbox() {
  Serial.println(F("\n\r\x1B[2J\x1B[H"));
  Serial.println(F("\x1B[1;35m--- NEURAL SANDBOX SUB-SHELL v0.9 ---"));
  Serial.println(F("Welcome researcher. This is a restricted logic simulator."));
  Serial.println(F("Type 'exit' to return to reality."));
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("NEURAL SANDBOX");
  lcd.setCursor(0, 1);
  lcd.print("ACTIVE...");

  bool active = true;
  while(active) {
    Serial.print(F("\nSANDBOX> "));
    while(!Serial.available());
    String sub = Serial.readStringUntil('\n');
    sub.trim(); sub.toLowerCase();

    if (sub == "exit") {
      active = false;
      lcd.clear();
      lcd.print("SANDBOX CLOSED");
    }
    else if (sub == "glitch") {
      Serial.println(F("Simulating voltage glitch on rail A1..."));
      delay(500);
      Serial.println(F("[GLITCH_SUCCESS] Memory corruption detected."));
      char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[4])));
      Serial.print(F("RECOVERED_DATA: ")); Serial.println(f);
      lcd.clear();
      lcd.print("GLITCH SUCCESS");
    }
    else if (sub == "frequency") {
      Serial.println(F("Measuring oscillator frequency..."));
      delay(300);
      char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[5])));
      Serial.print(F("OSC_MATCH: ")); Serial.println(f);
      lcd.clear();
      lcd.print("OSC_MATCH FOUND");
    }
    else if (sub == "decrypt_caesar") {
       char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[1])));
       Serial.print(F("ROT13_DETECTED: ")); Serial.println(f);
    }
    else if (sub == "decrypt_vigenere") {
       char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[2])));
       Serial.print(F("POLYALPHABETIC_FOUND: ")); Serial.println(f);
    }
    else if (sub == "whoami") {
       char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[7])));
       Serial.print(F("IDENTITY: ")); Serial.println(f);
    }
    else if (sub == "entropy_leak") {
       Serial.println(F("Dumping entropy pool..."));
       for(int i=0; i<10; i++) { Serial.print(random(0,255), HEX); Serial.print(" "); }
       Serial.println(F("\n[!] Pattern detected in PRNG. Leak found."));
       char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[6])));
       Serial.print(F("LEAK: ")); Serial.println(f);
    }
    else if (sub == "boss_room") {
       Serial.println(F("Entering restricted zone..."));
       Serial.println(F("A wild WATCHDOG appears!"));
       Serial.println(F("What do you do? [FEED/KICK/HACK]"));
       while(!Serial.available());
       String act = Serial.readStringUntil('\n'); act.trim();
       if(act == "hack") {
          Serial.println(F("Watchdog corrupted. Opening back-door."));
          char f[40]; strcpy_P(f, (char*)pgm_read_word(&(flags_in_code[11])));
          Serial.print(F("[BACKDOOR_KEY]: ")); Serial.println(f);
          lcd.clear();
          lcd.print("WATCHDOG HACKED");
       } else {
          Serial.println(F("Watchdog bites. Connection lost."));
          lcd.clear();
          lcd.print("YOU DIED");
       }
    }
    else Serial.println(F("Unknown logic block."));
  }
  printHeader();
}
