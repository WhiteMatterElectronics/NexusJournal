

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <NimBLEDevice.h>
#include "esp_system.h"
#include "esp_heap_caps.h"
#include "esp_chip_info.h"

// --- HARDWARE CONFIGURATION ---

// RFID Pins (SPI)
#define RST_PIN   3
#define SS_PIN    7
#define SCK_PIN   4
#define MISO_PIN  5
#define MOSI_PIN  6

// I2C Pins
#define SDA_PIN 8
#define SCL_PIN 9
#define EEPROM_SIZE 4096 

// UART1 Bridge Pins
#define RX1_PIN 20
#define TX1_PIN 21

// --- GLOBAL STATE & HANDLES ---

SemaphoreHandle_t i2cMutex;
MFRC522 mfrc522(SS_PIN, RST_PIN);
MFRC522::MIFARE_Key key;

// Task Handles for Status Reporting
TaskHandle_t hBridge = NULL;
TaskHandle_t hCmdProc = NULL;

// BLE State
NimBLEClient* pClient = nullptr;
NimBLEScan* pScan   = nullptr;
bool bleInitialized = false;

// Bridge State
bool bridgeActive = false;
uint32_t bridgeBaud = 115200;

// --- PROTOTYPES ---

void taskUartBridge(void *pvParameters);
void taskCommandProcessor(void *pvParameters);

// RFID Functions
void runDump();
void runRead(int sector);
void runWrite(int block, String hex);
bool authenticateCard(int block);
void closeOut();

// I2C/EEPROM Functions
void handleI2C(String input);
void handleEEPROMWrite(String input);
void dumpEEPROM(uint8_t i2cAddr);
void writeByte(uint8_t i2cAddr, uint16_t memAddr, uint8_t data);

// BLE Functions
void handleBLE(String input);
void printHelp(String target);
void printMan(String cmd);

// Bridge Function
void handleBridge(String input);

// Status Function
void reportSystemStatus();

// --- BLE CALLBACKS ---

class ScanCallbacks : public NimBLEScanCallbacks {
    void onResult(const NimBLEAdvertisedDevice* device) override {
        Serial.print(F("[BLE] "));
        Serial.printf("Device: %s\n", device->toString().c_str());
    }

    void onScanEnd(const NimBLEScanResults& results, int reason) override {
        Serial.print(F("[BLE] "));
        Serial.printf("Scan Ended. Found %d devices.\n", results.getCount());
    }
} scanCallbacks;

class ClientCallbacks : public NimBLEClientCallbacks {
    void onConnect(NimBLEClient* pClient) override {
        Serial.println(F("[BLE] Status: Connected to Server"));
    }
    void onDisconnect(NimBLEClient* pClient, int reason) override {
        Serial.print(F("[BLE] "));
        Serial.printf("Status: Disconnected (Reason: %d)\n", reason);
    }
} clientCallbacks;

void notifyCB(NimBLERemoteCharacteristic* pRemoteCharacteristic, uint8_t* pData, size_t length, bool isNotify) {
    Serial.print(F("[BLE-NOTIFY] "));
    Serial.printf("%s: ", pRemoteCharacteristic->getUUID().toString().c_str());
    for(size_t i = 0; i < length; i++) Serial.printf("%02X", pData[i]);
    Serial.println();
}

// --- INITIALIZATION ---

void setup() {
  Serial.begin(921600);
  Serial1.begin(bridgeBaud, SERIAL_8N1, RX1_PIN, TX1_PIN);
  Serial.setTimeout(50); 

  // SPI / RFID Setup
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN); 
  mfrc522.PCD_Init();
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF; 

  // I2C Setup
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  i2cMutex = xSemaphoreCreateMutex();

  // Initialize NimBLE
  NimBLEDevice::init("ESP32_CTF_TOOL");
  bleInitialized = true;
  pScan = NimBLEDevice::getScan();
  
  pScan->setScanCallbacks(&scanCallbacks, false); 
  pScan->setActiveScan(true);
  pScan->setInterval(100);
  pScan->setWindow(100);

  // RTOS Tasks - Store handles for status reporting
  xTaskCreate(taskUartBridge, "Bridge", 8192, NULL, 3, &hBridge);
  xTaskCreate(taskCommandProcessor, "CmdProc", 16384, NULL, 1, &hCmdProc);

  Serial.print(F("[SYSTEM] ")); Serial.println(F("\n========================================"));
  Serial.print(F("[SYSTEM] ")); Serial.println(F("       ESP32 CTF ASSISTANT v4.2       "));
  Serial.print(F("[SYSTEM] ")); Serial.println(F("========================================"));
  Serial.print(F("[SYSTEM] ")); Serial.println(F("Ready. Type 'HELP' for a list of modules."));
  Serial.print(F("[SYSTEM] ")); Serial.println(F("----------------------------------------"));
}

void loop() { vTaskDelete(NULL); }

// --- FREE-RTOS TASKS ---

void taskUartBridge(void *pvParameters) {
  bool needsPrefix = true;
  for (;;) {
    if (bridgeActive && Serial1.available()) {
      if (needsPrefix) {
        Serial.print(F("[UART] "));
        needsPrefix = false;
      }
      while (Serial1.available()) {
        char c = Serial1.read();
        Serial.write(c);
        if (c == '\n') needsPrefix = true; 
      }
    }
    vTaskDelay(pdMS_TO_TICKS(1)); 
  }
}

void taskCommandProcessor(void *pvParameters) {
  for (;;) {
    if (Serial.available()) {
      String input = Serial.readStringUntil('\n');
      input.trim();
      if (input.length() == 0) continue;

      String cmdUpper = input;
      cmdUpper.toUpperCase();

      if (cmdUpper.startsWith("HELP")) {
        printHelp(input.length() > 4 ? input.substring(5) : "");
      }
      else if (cmdUpper.startsWith("MAN")) {
        printMan(input.length() > 3 ? input.substring(4) : "");
      }
      else if (cmdUpper.equalsIgnoreCase("STATUS")) {
        reportSystemStatus();
      }
      else if (cmdUpper.equalsIgnoreCase("RESET")){
        Serial.print(F("[SYSTEM] ")); Serial.println(F("System restarting..."));
        vTaskDelay(pdMS_TO_TICKS(100));
        esp_restart();
      }
      else if (cmdUpper.startsWith("BRIDGE")) {
        handleBridge(input);
      }
      else if (cmdUpper.startsWith("I2C ") || cmdUpper.equalsIgnoreCase("I2C SCAN") || cmdUpper.equalsIgnoreCase("SCAN")) {
        handleI2C(input);
      }
      else if (cmdUpper.startsWith("BLE")) {
        handleBLE(input);
      }
      else if (cmdUpper.startsWith("EEPROM DUMP 0X") || cmdUpper.startsWith("DUMP 0X")) {
        int hexIndex = cmdUpper.indexOf("0X");
        if (hexIndex != -1) {
          uint8_t addr = (uint8_t)strtol(input.substring(hexIndex).c_str(), NULL, 16);
          dumpEEPROM(addr);
        }
      }
      else if (cmdUpper.startsWith("EEPROM WRITE 0X") || (cmdUpper.startsWith("WRITE 0X") && !cmdUpper.startsWith("WRITE "))) {
        String writeData = cmdUpper.startsWith("EEPROM ") ? input.substring(7) : input;
        handleEEPROMWrite(writeData);
      }
      else if (cmdUpper.equalsIgnoreCase("RFID DUMP") || cmdUpper.equalsIgnoreCase("DUMP")) {
        runDump();
      }
      else if (cmdUpper.startsWith("RFID READ ") || cmdUpper.startsWith("READ ")) {
        String sub = cmdUpper.startsWith("RFID ") ? input.substring(10) : input.substring(5);
        sub.trim();
        runRead(sub.toInt());
      }
      else if (cmdUpper.startsWith("RFID WRITE ") || (cmdUpper.startsWith("WRITE ") && !cmdUpper.startsWith("WRITE 0X"))) {
        String sub = cmdUpper.startsWith("RFID ") ? input.substring(11) : input.substring(6);
        sub.trim();
        int firstSpace = sub.indexOf(' ');
        if (firstSpace != -1) {
          int block = sub.substring(0, firstSpace).toInt();
          String hexData = sub.substring(firstSpace + 1);
          hexData.trim();
          runWrite(block, hexData);
        }
      }
      else {
        if (bridgeActive) {
          Serial1.println(input);
        } else {
          Serial.print(F("[SYSTEM] ")); Serial.println(F("ERR: Unknown command. Activate BRIDGE mode to talk to UART1."));
        }
      }
    }
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// --- BRIDGE HANDLER ---

void handleBridge(String input) {
    String sub = input.substring(6);
    sub.trim();
    String subUpper = sub;
    subUpper.toUpperCase();

    if (subUpper == "ON") {
        bridgeActive = true;
        Serial.print(F("[BRIDGE] ")); Serial.println(F("UART Bridge ACTIVATED"));
    }
    else if (subUpper == "OFF") {
        bridgeActive = false;
        Serial.print(F("[BRIDGE] ")); Serial.println(F("UART Bridge DEACTIVATED"));
    }
    else if (subUpper.startsWith("BAUD ")) {
        String val = sub.substring(5);
        val.trim();
        uint32_t newBaud = val.toInt();
        if (newBaud > 0) {
            bridgeBaud = newBaud;
            Serial1.begin(bridgeBaud, SERIAL_8N1, RX1_PIN, TX1_PIN);
            Serial.print(F("[BRIDGE] ")); Serial.printf("Baud rate set to %d\n", bridgeBaud);
        } else {
            Serial.print(F("[BRIDGE] ")); Serial.println(F("ERR: Invalid Baud Rate"));
        }
    }
    else {
        Serial.print(F("[BRIDGE] ")); Serial.printf("Status: %s | Baud: %d\n", bridgeActive ? "ON" : "OFF", bridgeBaud);
        Serial.print(F("[BRIDGE] ")); Serial.println(F("Usage: BRIDGE [ON|OFF|BAUD <value>]"));
    }
}

// --- STATUS REPORTER ---

void reportSystemStatus() {
    esp_chip_info_t chip_info;
    esp_chip_info(&chip_info);

    Serial.print(F("[STATUS] ")); Serial.println(F("\n[ SYSTEM STATUS REPORT ]"));
    Serial.print(F("[STATUS] ")); Serial.println(F("----------------------------------------"));
    
    Serial.print(F("[STATUS] ")); Serial.printf("Chip Model:   %s (Rev %d)\n", ESP.getChipModel(), chip_info.revision);
    Serial.print(F("[STATUS] ")); Serial.printf("Cores:        %d\n", chip_info.cores);
    Serial.print(F("[STATUS] ")); Serial.printf("CPU Freq:     %d MHz\n", ESP.getCpuFreqMHz());
    Serial.print(F("[STATUS] ")); Serial.printf("Flash Size:   %d MB\n", ESP.getFlashChipSize() / (1024 * 1024));
    
    Serial.print(F("[STATUS] ")); Serial.println(F("\n[ MEMORY USAGE ]"));
    Serial.print(F("[STATUS] ")); Serial.printf("Total Heap:   %d bytes\n", ESP.getHeapSize());
    Serial.print(F("[STATUS] ")); Serial.printf("Free Heap:    %d bytes\n", ESP.getFreeHeap());
    Serial.print(F("[STATUS] ")); Serial.printf("Min Free:     %d bytes\n", ESP.getMinFreeHeap());
    Serial.print(F("[STATUS] ")); Serial.printf("Max Alloc:    %d bytes\n", ESP.getMaxAllocHeap());
    
    Serial.print(F("[STATUS] ")); Serial.println(F("\n[ TASK MONITOR ]"));
    Serial.print(F("[STATUS] ")); Serial.println(F("TASK NAME    | STATE | PRIO | STACK HIGH WATER"));
    Serial.print(F("[STATUS] ")); Serial.println(F("----------------------------------------------"));
    
    TaskHandle_t tasks[] = {hBridge, hCmdProc, xTaskGetCurrentTaskHandle()};
    const char* names[] = {"Bridge", "CmdProc", "Status"};
    
    for(int i = 0; i < 3; i++) {
        if(tasks[i] != NULL) {
            UBaseType_t stackHighWaterMark = uxTaskGetStackHighWaterMark(tasks[i]);
            eTaskState state = eTaskGetState(tasks[i]);
            const char* stateStr = (state == eRunning) ? "RUN" : (state == eReady) ? "RDY" : (state == eBlocked) ? "BLK" : "SUS";
            Serial.print(F("[STATUS] ")); Serial.printf("%-12s | %-5s | %-4d | %d bytes remaining\n", 
                          names[i], stateStr, uxTaskPriorityGet(tasks[i]), stackHighWaterMark * sizeof(StackType_t));
        }
    }
    
    Serial.print(F("[STATUS] ")); Serial.println(F("\n[ CONNECTIVITY ]"));
    Serial.print(F("[STATUS] ")); Serial.printf("BLE Active:   %s\n", bleInitialized ? "YES" : "NO");
    Serial.print(F("[STATUS] ")); Serial.printf("BLE Client:   %s\n", (pClient && pClient->isConnected()) ? "CONNECTED" : "IDLE");
    Serial.print(F("[STATUS] ")); Serial.printf("UART Bridge:  %s (%d baud)\n", bridgeActive ? "ON" : "OFF", bridgeBaud);
    
    Serial.print(F("[STATUS] ")); Serial.println(F("----------------------------------------"));
}

// --- BLE HANDLER ---

void handleBLE(String input) {
    String sub = input.substring(3);
    sub.trim();
    String subUpper = sub;
    subUpper.toUpperCase();

    if (subUpper.startsWith("SCAN")) {
        Serial.print(F("[BLE] ")); Serial.println(F("Starting 5s scan..."));
        pScan->start(5000, false); 
        Serial.print(F("[BLE] ")); Serial.println(F("Scan routine finished."));
    }
    else if (subUpper.startsWith("CONNECT ")) {
        String addrStr = sub.substring(8);
        addrStr.trim();
        
        if (pClient) {
            NimBLEDevice::deleteClient(pClient);
            pClient = nullptr;
        }

        pClient = NimBLEDevice::createClient();
        pClient->setClientCallbacks(&clientCallbacks, false);
        pClient->setConnectTimeout(5000);
        
        Serial.print(F("[BLE] ")); Serial.printf("Connecting to %s...\n", addrStr.c_str());
        
        if (pClient->connect(NimBLEAddress(std::string(addrStr.c_str()), 0))) {
            Serial.print(F("[BLE] ")); Serial.println(F("Success! Exploring services..."));
            auto services = pClient->getServices(true);
            for (auto* service : services) {
                Serial.print(F("[BLE] ")); Serial.printf("  Service: %s\n", service->getUUID().toString().c_str());
                auto chars = service->getCharacteristics(true);
                for (auto* chr : chars) {
                    Serial.print(F("[BLE] ")); Serial.printf("    - Char: %s [", chr->getUUID().toString().c_str());
                    if (chr->canRead()) Serial.print("R ");
                    if (chr->canWrite()) Serial.print("W ");
                    if (chr->canNotify()) {
                        Serial.print("N ");
                        chr->subscribe(true, notifyCB);
                    }
                    Serial.println("]");
                }
            }
        } else {
            Serial.print(F("[BLE] ")); Serial.println(F("Connection Failed"));
            NimBLEDevice::deleteClient(pClient);
            pClient = nullptr;
        }
    }
    else if (subUpper.startsWith("READ ")) {
        if (!pClient || !pClient->isConnected()) { Serial.print(F("[BLE] ")); Serial.println(F("ERR: Not connected")); return; }
        String uuidStr = sub.substring(5); uuidStr.trim();
        bool found = false;
        for (auto* service : pClient->getServices(false)) {
            auto pChr = service->getCharacteristic(NimBLEUUID(uuidStr.c_str()));
            if (pChr && pChr->canRead()) {
                std::string val = pChr->readValue();
                Serial.print(F("[BLE] ")); Serial.printf("[BLE-READ] Hex: ");
                for(size_t i=0; i<val.length(); i++) Serial.printf("%02X", (uint8_t)val[i]);
                Serial.printf(" | ASCII: %s\n", val.c_str());
                found = true; break;
            }
        }
        if (!found) { Serial.print(F("[BLE] ")); Serial.println(F("ERR: UUID not found/readable")); }
    }
    else if (subUpper.startsWith("WRITE ")) {
        if (!pClient || !pClient->isConnected()) { Serial.print(F("[BLE] ")); Serial.println(F("ERR: Not connected")); return; }
        String params = sub.substring(6); params.trim();
        int space = params.indexOf(' ');
        if (space != -1) {
            String uuidStr = params.substring(0, space);
            String data = params.substring(space + 1);
            bool found = false;
            for (auto* service : pClient->getServices(false)) {
                auto pChr = service->getCharacteristic(NimBLEUUID(uuidStr.c_str()));
                if (pChr && pChr->canWrite()) {
                    pChr->writeValue(data.c_str(), data.length(), true);
                    Serial.print(F("[BLE] ")); Serial.println(F("Write sent."));
                    found = true; break;
                }
            }
            if (!found) { Serial.print(F("[BLE] ")); Serial.println(F("ERR: UUID not found/writable")); }
        }
    }
    else if (subUpper.equalsIgnoreCase("DISCONNECT")) {
        if (pClient) pClient->disconnect();
    }
}

// --- CONSOLIDATED I2C HANDLER ---

void handleI2C(String input) {
  if (!xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(1000))) return;
  char buf[128];
  input.toCharArray(buf, 128);
  char *p = strtok(buf, " "); 
  if (p == NULL) { xSemaphoreGive(i2cMutex); return; }
  String firstToken = String(p);
  firstToken.toUpperCase();
  char *cmd = (firstToken == "I2C") ? strtok(NULL, " ") : (char*)firstToken.c_str();
  if (cmd == NULL) { xSemaphoreGive(i2cMutex); return; }
  String subCmd = String(cmd);
  subCmd.toUpperCase();
  if (subCmd == "SCAN") {
    Serial.print(F("[I2C] ")); Serial.println(F("\n--- I2C BUS SCAN ---"));
    int devices = 0;
    for (byte address = 1; address < 127; address++) {
      Wire.beginTransmission(address);
      if (Wire.endTransmission() == 0) {
        Serial.print(F("[I2C] ")); Serial.printf("Found: 0x%02X\n", address);
        devices++;
      }
    }
    if (devices == 0) { Serial.print(F("[I2C] ")); Serial.println(F("No devices found.")); }
  } 
  else if (subCmd == "WRITE") {
    char *addrStr = strtok(NULL, " ");
    char *regStr = strtok(NULL, " ");
    if (addrStr && regStr) {
      uint8_t devAddr = (uint8_t)strtol(addrStr, NULL, 0);
      uint8_t devReg = (uint8_t)strtol(regStr, NULL, 0);
      Wire.beginTransmission(devAddr);
      Wire.write(devReg);
      while (char *val = strtok(NULL, " ")) {
        Wire.write((uint8_t)strtol(val, NULL, 0));
      }
      Wire.endTransmission();
      Serial.print(F("[I2C] ")); Serial.println(F("I2C Write finished."));
    }
  } 
  else if (subCmd == "READ") {
    char *addrStr = strtok(NULL, " ");
    char *regStr = strtok(NULL, " ");
    char *countStr = strtok(NULL, " ");
    if (addrStr && regStr && countStr) {
      uint8_t devAddr = (uint8_t)strtol(addrStr, NULL, 0);
      uint8_t devReg = (uint8_t)strtol(regStr, NULL, 0);
      int count = atoi(countStr);
      Wire.beginTransmission(devAddr);
      Wire.write(devReg);
      Wire.endTransmission(false); 
      uint8_t readLen = Wire.requestFrom(devAddr, (uint8_t)count);
      Serial.print(F("[I2C] ")); Serial.printf("Data: ");
      for (int i = 0; i < readLen; i++) Serial.printf("%02X", Wire.read());
      Serial.println();
    }
  }
  xSemaphoreGive(i2cMutex);
}

// --- EEPROM HELPERS ---

void writeByte(uint8_t i2cAddr, uint16_t memAddr, uint8_t data) {
  if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(500))) {
    Wire.beginTransmission(i2cAddr);
    Wire.write((uint8_t)(memAddr >> 8));
    Wire.write((uint8_t)(memAddr & 0xFF));
    Wire.write(data);
    Wire.endTransmission();
    xSemaphoreGive(i2cMutex);
    vTaskDelay(pdMS_TO_TICKS(5)); 
  }
}

void dumpEEPROM(uint8_t i2cAddr) {
  if (xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(1000))) {
    Serial.print(F("[EEPROM] ")); Serial.printf("\n--- EEPROM DUMP (0x%02X) ---\n", i2cAddr);
    for (uint32_t addr = 0; addr < EEPROM_SIZE; addr += 16) {
      Serial.print(F("[EEPROM] ")); Serial.printf("0x%04X: ", addr);
      Wire.beginTransmission(i2cAddr);
      Wire.write((uint8_t)(addr >> 8));
      Wire.write((uint8_t)(addr & 0xFF));
      if (Wire.endTransmission() != 0) {
        Serial.print(F("[EEPROM] ")); Serial.println(F("\nERR: Connection lost."));
        xSemaphoreGive(i2cMutex);
        return;
      }
      Wire.requestFrom(i2cAddr, (uint8_t)16);
      for (int i = 0; i < 16; i++) {
        if (Wire.available()) Serial.printf("%02X ", Wire.read());
      }
      Serial.println();
      vTaskDelay(pdMS_TO_TICKS(2));
    }
    xSemaphoreGive(i2cMutex);
  }
}

void handleEEPROMWrite(String input) {
  input.trim();
  int space1 = input.indexOf(' ');
  if (space1 == -1) return;
  String cmdPart = input.substring(0, space1);
  cmdPart.toUpperCase();
  if (cmdPart == "WRITE") {
      input = input.substring(space1 + 1);
      input.trim();
      space1 = input.indexOf(' ');
  }
  if (space1 == -1) return;
  uint8_t i2cAddr = (uint8_t)strtol(input.substring(0, space1).c_str(), NULL, 16);
  input = input.substring(space1 + 1);
  int space2 = input.indexOf(' ');
  if (space2 == -1) return;
  uint16_t memAddr = (uint16_t)strtol(input.substring(0, space2).c_str(), NULL, 16);
  String dataPart = input.substring(space2 + 1);
  dataPart.trim();
  if (dataPart.startsWith("\"")) {
    int lastQuote = dataPart.lastIndexOf("\"");
    String text = dataPart.substring(1, lastQuote);
    for (int i = 0; i < text.length(); i++) writeByte(i2cAddr, memAddr + i, (uint8_t)text[i]);
  } else {
    char *ptr = strtok((char*)dataPart.c_str(), " ");
    int byteCount = 0;
    while (ptr != NULL) {
      writeByte(i2cAddr, memAddr + byteCount++, (uint8_t)strtol(ptr, NULL, 0));
      ptr = strtok(NULL, " ");
    }
  }
  Serial.print(F("[EEPROM] ")); Serial.println(F("EEPROM Write Finished."));
}

// --- RFID HELPERS ---

void closeOut() { mfrc522.PICC_HaltA(); mfrc522.PCD_StopCrypto1(); }

bool authenticateCard(int block) {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return false; 
  MFRC522::StatusCode status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, block, &key, &(mfrc522.uid));
  return (status == MFRC522::STATUS_OK);
}

void runDump() {
  Serial.print(F("[RFID] ")); Serial.println(F("SCAN_CARD_NOW"));
  unsigned long start = millis();
  while (!authenticateCard(0)) {
    if (millis() - start > 5000) { Serial.print(F("[RFID] ")); Serial.println(F("TIMEOUT")); return; }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  byte buffer[18];
  byte size = sizeof(buffer);
  for (int b = 0; b < 64; b++) {
    if (b % 4 == 0) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, b, &key, &(mfrc522.uid));
    if (mfrc522.MIFARE_Read(b, buffer, &size) == MFRC522::STATUS_OK) {
      Serial.print(F("[RFID] ")); Serial.printf("BLOCK:%d:DATA:", b);
      for (byte i = 0; i < 16; i++) Serial.printf("%02X", buffer[i]);
      Serial.println();
    }
  }
  closeOut();
}

void runRead(int sector) {
  Serial.print(F("[RFID] ")); Serial.println(F("SCAN_CARD_NOW"));
  unsigned long start = millis();
  while (!authenticateCard(sector * 4)) {
    if (millis() - start > 5000) { Serial.print(F("[RFID] ")); Serial.println(F("TIMEOUT")); return; }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  byte buffer[18]; byte size = sizeof(buffer);
  for (int i = 0; i < 4; i++) {
    int block = (sector * 4) + i;
    if (mfrc522.MIFARE_Read(block, buffer, &size) == MFRC522::STATUS_OK) {
      Serial.print(F("[RFID] ")); Serial.printf("BLOCK:%d:DATA:", block);
      for (byte b = 0; b < 16; b++) Serial.printf("%02X", buffer[b]);
      Serial.println();
    }
  }
  closeOut();
}

void runWrite(int block, String hex) {
  if (hex.length() != 32) { Serial.print(F("[RFID] ")); Serial.println(F("ERR:HEX_LEN_32_REQ")); return; }
  Serial.print(F("[RFID] ")); Serial.println(F("SCAN_CARD_NOW"));
  unsigned long start = millis();
  while (!authenticateCard(block)) {
    if (millis() - start > 5000) { Serial.print(F("[RFID] ")); Serial.println(F("TIMEOUT")); return; }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  byte data[16];
  for (int i = 0; i < 16; i++) data[i] = strtol(hex.substring(i * 2, i * 2 + 2).c_str(), NULL, 16);
  if (mfrc522.MIFARE_Write(block, data, 16) == MFRC522::STATUS_OK) { Serial.print(F("[RFID] ")); Serial.println(F("WRITE_SUCCESS")); }
  else { Serial.print(F("[RFID] ")); Serial.println(F("WRITE_FAILED")); }
  closeOut();
}

// --- DOCUMENTATION SYSTEM ---

void printHelp(String target) {
  target.toUpperCase(); target.trim();
  if (target == "" || target == "HELP") {
    Serial.print(F("[HELP] ")); Serial.println(F("\n[ MODULE LIST ]"));
    Serial.print(F("[HELP] ")); Serial.println(F("  HELP, MAN, I2C, BLE, RFID, EEPROM, BRIDGE, STATUS, RESET"));
    Serial.print(F("[HELP] ")); Serial.println(F("Use 'HELP [MODULE]' for subcommands or 'MAN [COMMAND]' for full docs."));
  }
  else if (target == "MAN") {
    Serial.print(F("[HELP] ")); Serial.println(F("MAN [COMMAND] - Displays the reference manual for the specified command."));
  }
  else if (target == "BLE") {
    Serial.print(F("[HELP] ")); Serial.println(F("\n[ BLE SUBCOMMANDS ]"));
    Serial.print(F("[HELP] ")); Serial.println(F("  BLE SCAN         - Scan 5s"));
    Serial.print(F("[HELP] ")); Serial.println(F("  BLE CONNECT [MAC]- Connect and explore"));
    Serial.print(F("[HELP] ")); Serial.println(F("  BLE READ [UUID]  - Read characteristic"));
    Serial.print(F("[HELP] ")); Serial.println(F("  BLE WRITE [UUID] [DATA] - Write characteristic"));
    Serial.print(F("[HELP] ")); Serial.println(F("  BLE DISCONNECT   - Close link"));
  }
  else if (target == "BRIDGE") {
    Serial.print(F("[HELP] ")); Serial.println(F("\n[ BRIDGE SUBCOMMANDS ]"));
    Serial.print(F("[HELP] ")); Serial.println(F("  BRIDGE ON        - Activate UART throughput"));
    Serial.print(F("[HELP] ")); Serial.println(F("  BRIDGE OFF       - Deactivate UART throughput"));
    Serial.print(F("[HELP] ")); Serial.println(F("  BRIDGE BAUD [val]- Set UART1 speed (e.g. 9600)"));
  }
}

void printMan(String cmd) {
  cmd.toUpperCase(); cmd.trim();
  if (cmd == "" || cmd == "MAN") {
    Serial.print(F("[MAN] ")); Serial.println(F("\n[ MAN REFERENCE ]"));
    Serial.print(F("[MAN] ")); Serial.println(F("USAGE: MAN [COMMAND]"));
    Serial.print(F("[MAN] ")); Serial.println(F("PURPOSE: Displays detailed usage, parameters, and behavior for a tool."));
  }
  else if (cmd == "HELP") {
    Serial.print(F("[MAN] ")); Serial.println(F("\n[ HELP REFERENCE ]"));
    Serial.print(F("[MAN] ")); Serial.println(F("USAGE: HELP [MODULE]"));
    Serial.print(F("[MAN] ")); Serial.println(F("PURPOSE: Provides a quick-reference list of available sub-commands."));
  }
  else if (cmd == "BLE") {
    Serial.print(F("[MAN] ")); Serial.println(F("\n[ BLE MANUAL ]"));
    Serial.print(F("[MAN] ")); Serial.println(F("DESCRIPTION: Utility using NimBLE Client logic."));
    Serial.print(F("[MAN] ")); Serial.println(F("SCAN: Performs active scanning with real-time feedback."));
    Serial.print(F("[MAN] ")); Serial.println(F("CONNECT: Discovers all attributes and auto-subscribes to NOTIFY."));
  }
  else if (cmd == "STATUS") {
    Serial.print(F("[MAN] ")); Serial.println(F("\n[ STATUS MANUAL ]"));
    Serial.print(F("[MAN] ")); Serial.println(F("DESCRIPTION: Reports internal system health and resources."));
    Serial.print(F("[MAN] ")); Serial.println(F("OUTPUT: Hardware revision, Memory (Heap) usage, and FreeRTOS task stack safety levels."));
  }
  else if (cmd == "BRIDGE") {
    Serial.print(F("[MAN] ")); Serial.println(F("\n[ BRIDGE MANUAL ]"));
    Serial.print(F("[MAN] ")); Serial.println(F("DESCRIPTION: Serial UART Bridge between Serial0 and Serial1 (UART1)."));
    Serial.print(F("[MAN] ")); Serial.println(F("ON/OFF: Toggle bidirectional flow."));
    Serial.print(F("[MAN] ")); Serial.println(F("BAUD: Dynamically reconfigures the hardware baud rate of UART1."));
  }
  else {
    Serial.print(F("[MAN] ")); Serial.println(F("Manual page not found."));
  }
}