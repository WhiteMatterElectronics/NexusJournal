#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>

// --- RFID PINS ---
#define RST_PIN   3
#define SS_PIN    7
#define SCK_PIN   4
#define MISO_PIN  6
#define MOSI_PIN  5

// --- EEPROM PINS & CONSTS ---
#define EEPROM_SIZE 4096 
#define SDA_PIN 8
#define SCL_PIN 9

MFRC522 mfrc522(SS_PIN, RST_PIN);
MFRC522::MIFARE_Key key;

void setup() {

  Serial.begin(921600);
  delay(5000);
    // Initialize SPI RFID
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN); 
  mfrc522.PCD_Init();
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;



  // Initialize I2C EEPROM
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  

  Serial.println("\n--- SYSTEM READY ---");
}

// --- YOUR ORIGINAL RFID FUNCTIONS (UNTOUCHED) ---

bool authenticateCard(int block) {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return false; 
  }
  MFRC522::StatusCode status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, block, &key, &(mfrc522.uid));
  if (status != MFRC522::STATUS_OK) {
    Serial.print("AUTH_ERR: ");
    Serial.println(mfrc522.GetStatusCodeName(status));
    return false;
  }
  return true;
}

void runDump() {
  Serial.println("SCAN_CARD_NOW");
  unsigned long start = millis();
  while (!authenticateCard(0)) {
    if (millis() - start > 5000) { Serial.println("TIMEOUT"); return; }
    delay(100);
  }
  byte buffer[18];
  byte size = sizeof(buffer);
  for (int b = 0; b < 64; b++) {
    if (b % 4 == 0) {
      mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, b, &key, &(mfrc522.uid));
    }
    if (mfrc522.MIFARE_Read(b, buffer, &size) == MFRC522::STATUS_OK) {
      Serial.printf("BLOCK:%d:DATA:", b);
      for (byte i = 0; i < 16; i++) Serial.printf("%02X", buffer[i]);
      Serial.println();
    } else {
      Serial.printf("BLOCK:%d:READ_ERR\n", b);
    }
  }
  closeOut();
}

void runRead(int sector) {
  Serial.println("SCAN_CARD_NOW");
  unsigned long start = millis();
  while (!authenticateCard(sector * 4)) {
    if (millis() - start > 5000) { Serial.println("TIMEOUT"); return; }
    delay(100);
  }
  byte buffer[18];
  byte size = sizeof(buffer);
  for (int i = 0; i < 4; i++) {
    int block = (sector * 4) + i;
    if (mfrc522.MIFARE_Read(block, buffer, &size) == MFRC522::STATUS_OK) {
      Serial.printf("BLOCK:%d:DATA:", block);
      for (byte b = 0; b < 16; b++) Serial.printf("%02X", buffer[b]);
      Serial.println();
    }
  }
  closeOut();
}

void runWrite(int block, String hex) {
  if (hex.length() != 32) { Serial.println("ERR:HEX_LEN_32_REQ"); return; }
  Serial.println("SCAN_CARD_NOW");
  unsigned long start = millis();
  while (!authenticateCard(block)) {
    if (millis() - start > 5000) { Serial.println("TIMEOUT"); return; }
    delay(100);
  }
  byte data[16];
  for (int i = 0; i < 16; i++) {
    data[i] = strtol(hex.substring(i * 2, i * 2 + 2).c_str(), NULL, 16);
  }
  if (mfrc522.MIFARE_Write(block, data, 16) == MFRC522::STATUS_OK) {
    Serial.println("WRITE_SUCCESS");
  } else {
    Serial.println("WRITE_FAILED");
  }
  closeOut();
}

void closeOut() {
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

// --- YOUR ORIGINAL EEPROM FUNCTIONS (UNTOUCHED) ---

void writeByte(uint8_t i2cAddr, uint16_t memAddr, uint8_t data) {
  Wire.beginTransmission(i2cAddr);
  Wire.write((uint8_t)(memAddr >> 8));
  Wire.write((uint8_t)(memAddr & 0xFF));
  Wire.write(data);
  Wire.endTransmission();
  delay(5); 
}

void dumpEEPROM(uint8_t i2cAddr) {
  Serial.printf("\n--- DUMPING DEVICE 0x%02X ---\n", i2cAddr);
  for (uint32_t addr = 0; addr < EEPROM_SIZE; addr += 16) {
    Serial.printf("0x%04X:  ", addr);
    Wire.beginTransmission(i2cAddr);
    Wire.write((uint8_t)(addr >> 8));
    Wire.write((uint8_t)(addr & 0xFF));
    if (Wire.endTransmission() != 0) {
      Serial.println("\nERROR: Device not responding.");
      return;
    }
    Wire.requestFrom(i2cAddr, (uint8_t)16);
    for (int i = 0; i < 16; i++) {
      if (Wire.available()) {
        uint8_t val = Wire.read();
        Serial.printf("%02X ", val);
      }
    }
    Serial.println();
  }
  Serial.println("--- DUMP COMPLETE ---");
}

void handleWrite(String input) {
  input = input.substring(6); 
  input.trim();
  int space1 = input.indexOf(' ');
  uint8_t i2cAddr = (uint8_t)strtol(input.substring(0, space1).c_str(), NULL, 16);
  input = input.substring(space1 + 1);
  int space2 = input.indexOf(' ');
  uint16_t memAddr = (uint16_t)strtol(input.substring(0, space2).c_str(), NULL, 16);
  String dataPart = input.substring(space2 + 1);
  dataPart.trim();

  if (dataPart.startsWith("\"")) {
    String text = dataPart.substring(1, dataPart.lastIndexOf("\""));
    for (int i = 0; i < text.length(); i++) {
      writeByte(i2cAddr, memAddr + i, (uint8_t)text[i]);
    }
  } 
  else if (dataPart.indexOf(' ') > 0 || dataPart.startsWith("0X") || dataPart.startsWith("0x")) {
    int byteCount = 0;
    char *ptr = strtok((char*)dataPart.c_str(), " ");
    while (ptr != NULL) {
      uint8_t b = (uint8_t)strtol(ptr, NULL, 0);
      writeByte(i2cAddr, memAddr + byteCount, b);
      byteCount++;
      ptr = strtok(NULL, " ");
    }
  } 
  else {
    for (int i = 0; i < dataPart.length(); i++) {
      writeByte(i2cAddr, memAddr + i, (uint8_t)dataPart[i]);
    }
  }
  Serial.println("Write Finished.");
}

// --- COMBINED LOOP ---

void loop() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();

    // Logic for EEPROM (Commands with specific arguments)
    if (input.startsWith("DUMP 0x")) {
      uint8_t addr = (uint8_t)strtol(input.substring(5).c_str(), NULL, 16);
      dumpEEPROM(addr);
    } 
    else if (input.startsWith("WRITE 0x")) {
      handleWrite(input);
    }
    // Logic for RFID
    else if (input == "DUMP") {
      runDump();
    }
    else if (input.startsWith("READ")) {
      int sector = input.substring(5).toInt();
      runRead(sector);
    } 
    else if (input.startsWith("WRITE")) {
      int firstSpace = input.indexOf(' ');
      int secondSpace = input.indexOf(' ', firstSpace + 1);
      int block = input.substring(firstSpace + 1, secondSpace).toInt();
      String hexData = input.substring(secondSpace + 1);
      runWrite(block, hexData);
    }
  }
}