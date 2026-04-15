#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <NimBLEDevice.h>
#include <Preferences.h> 
#include <WiFi.h>
#include <ping/ping_sock.h> // ESP-IDF Ping API
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

Preferences preferences; 
String customBleName;

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

// WiFi State
String grepPattern = "";
bool useGrep = false;

// Bridge State
bool bridgeActive = false;
uint32_t bridgeBaud = 115200;

// --- PROTOTYPES ---

void taskUartBridge(void *pvParameters);
void taskCommandProcessor(void *pvParameters);

// Output Helpers
void assistantPrintf(const char* format, ...);
void assistantPrintln(String msg);

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

// WiFi Functions
void handleWiFi(String input);
void runPing(String host, int count);

// Bridge Function
void handleBridge(String input);

// Status Function
void reportSystemStatus();

// --- BLE CALLBACKS ---

class ScanCallbacks : public NimBLEScanCallbacks {
    void onResult(const NimBLEAdvertisedDevice* device) override {
        String name = device->getName().c_str();
        if (name.length() == 0) name = "<Unknown>";
        
        char buf[256];
        snprintf(buf, sizeof(buf), "[BLE] DEV: [%s] | RSSI: %d dBm | ADDR: %s | TYPE: %d", 
                      name.c_str(), 
                      device->getRSSI(), 
                      device->getAddress().toString().c_str(),
                      (int)device->getAddressType());
        assistantPrintln(buf);
        
        if (device->haveServiceUUID()) {
            snprintf(buf, sizeof(buf), "      UUID: %s", device->getServiceUUID().toString().c_str());
            assistantPrintln(buf);
        }
    }

    void onScanEnd(const NimBLEScanResults& results, int reason) override {
        char buf[64];
        snprintf(buf, sizeof(buf), "[BLE] Scan Ended. Found %d devices.", results.getCount());
        assistantPrintln(buf);
    }
} scanCallbacks;

class ClientCallbacks : public NimBLEClientCallbacks {
    void onConnect(NimBLEClient* pClient) override {
        assistantPrintln("[BLE] Status: Connected to Server");
        assistantPrintf("[BLE] MTU: %d\n", pClient->getMTU());
    }
    void onDisconnect(NimBLEClient* pClient, int reason) override {
        assistantPrintf("[BLE] Status: Disconnected (Reason: %d)\n", reason);
    }
} clientCallbacks;

void notifyCB(NimBLERemoteCharacteristic* pRemoteCharacteristic, uint8_t* pData, size_t length, bool isNotify) {
    assistantPrintf("[BLE-NOTIFY] %s: ", pRemoteCharacteristic->getUUID().toString().c_str());
    for(size_t i = 0; i < length; i++) assistantPrintf("%02X", pData[i]);
    assistantPrintf(" (ASCII: ");
    for(size_t i = 0; i < length; i++) {
        char c = (char)pData[i];
        assistantPrintf("%c", isprint(c) ? c : '.');
    }
    assistantPrintln(")");
}

// --- UTILITIES ---

// Integrated Grep filter for all serial output
void assistantPrintf(const char* format, ...) {
    char loc_buf[256];
    va_list arg;
    va_start(arg, format);
    vsnprintf(loc_buf, sizeof(loc_buf), format, arg);
    va_end(arg);
    
    String output = String(loc_buf);
    if (!useGrep || output.indexOf(grepPattern) != -1 || output.indexOf("[") == 0) {
        Serial.print(output);
    }
}

void assistantPrintln(String msg) {
    if (!useGrep || msg.indexOf(grepPattern) != -1 || msg.indexOf("[") == 0) {
        Serial.println(msg);
    }
}

// --- INITIALIZATION ---

void setup() {
  Serial.begin(921600);
  Serial1.begin(bridgeBaud, SERIAL_8N1, RX1_PIN, TX1_PIN);
  Serial.setTimeout(50); 

  // Initialize Preferences
  preferences.begin("ble_cfg", false);
  customBleName = preferences.getString("dev_name", "ESP32_CTF_TOOL");

  // SPI / RFID Setup
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN); 
  mfrc522.PCD_Init();
  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF; 

  // I2C Setup
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  i2cMutex = xSemaphoreCreateMutex();

  // Initialize NimBLE with stored name
  NimBLEDevice::init(customBleName.c_str());
  bleInitialized = true;
  pScan = NimBLEDevice::getScan();
  
  pScan->setScanCallbacks(&scanCallbacks, false); 
  pScan->setActiveScan(true);
  pScan->setInterval(100);
  pScan->setWindow(100);

  // RTOS Tasks
  xTaskCreate(taskUartBridge, "Bridge", 8192, NULL, 3, &hBridge);
  xTaskCreate(taskCommandProcessor, "CmdProc", 16384, NULL, 1, &hCmdProc);

  Serial.println(F("\n[SYSTEM] ========================================"));
  Serial.println(F("[SYSTEM]        ESP32 CTF ASSISTANT v5.0        "));
  Serial.printf( "[SYSTEM]        IDENTITY: %s\n", customBleName.c_str());
  Serial.println(F("[SYSTEM] ========================================"));
  Serial.println(F("[SYSTEM] Ready. Type 'HELP' for a list of modules."));
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

      // Handle Grep Pipe: "COMMAND | grep pattern"
      int pipeIdx = input.indexOf('|');
      if (pipeIdx != -1) {
        String grepPart = input.substring(pipeIdx + 1);
        grepPart.trim();
        if (grepPart.startsWith("grep ")) {
            grepPattern = grepPart.substring(5);
            grepPattern.trim();
            useGrep = true;
        }
        input = input.substring(0, pipeIdx);
        input.trim();
      } else {
          useGrep = false;
      }

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
        assistantPrintln("[SYSTEM] System restarting...");
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
      else if (cmdUpper.startsWith("WIFI")) {
        handleWiFi(input);
      }
      else if (cmdUpper.startsWith("PING ")) {
        runPing(input.substring(5), 4);
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
          assistantPrintln("[SYSTEM] ERR: Unknown command. Activate BRIDGE mode to talk to UART1.");
        }
      }
      
      // Reset grep after command
      useGrep = false;
    }
    vTaskDelay(pdMS_TO_TICKS(10));
  }
}

// --- WIFI HANDLER ---

void handleWiFi(String input) {
    String sub = input.substring(4);
    sub.trim();
    String subUpper = sub;
    subUpper.toUpperCase();

    if (subUpper == "SCAN") {
        assistantPrintln("[WIFI] Scanning networks...");
        int n = WiFi.scanNetworks();
        assistantPrintf("[WIFI] Found %d networks:\n", n);
        for (int i = 0; i < n; ++i) {
            assistantPrintf("  %2d: %s (%d dBm) [CH: %d] [%s]\n", 
                            i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i), 
                            WiFi.channel(i), (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "OPEN" : "SECURED");
        }
        WiFi.scanDelete();
    }
    else if (subUpper.startsWith("CONNECT ")) {
        String params = sub.substring(8);
        int space = params.indexOf(' ');
        String ssid = (space == -1) ? params : params.substring(0, space);
        String pass = (space == -1) ? "" : params.substring(space + 1);
        
        assistantPrintf("[WIFI] Connecting to %s...\n", ssid.c_str());
        WiFi.mode(WIFI_STA);
        WiFi.begin(ssid.c_str(), pass.c_str());
        
        int timeout = 0;
        while (WiFi.status() != WL_CONNECTED && timeout < 20) {
            vTaskDelay(pdMS_TO_TICKS(500));
            timeout++;
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            assistantPrintf("[WIFI] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
        } else {
            assistantPrintln("[WIFI] Connection Failed.");
        }
    }
    else if (subUpper.startsWith("AP ")) {
        String params = sub.substring(3);
        int space = params.indexOf(' ');
        String ssid = (space == -1) ? params : params.substring(0, space);
        String pass = (space == -1) ? "12345678" : params.substring(space + 1);
        
        WiFi.mode(WIFI_AP);
        if(WiFi.softAP(ssid.c_str(), pass.c_str())) {
            assistantPrintf("[WIFI] AP '%s' active at %s\n", ssid.c_str(), WiFi.softAPIP().toString().c_str());
        }
    }
    else if (subUpper == "OFF") {
        WiFi.disconnect(true);
        WiFi.mode(WIFI_OFF);
        assistantPrintln("[WIFI] Radios powered down.");
    }
    else if (subUpper == "STA") {
        if (WiFi.status() == WL_CONNECTED) {
            assistantPrintf("[WIFI] SSID: %s | IP: %s | RSSI: %d\n", WiFi.SSID().c_str(), WiFi.localIP().toString().c_str(), WiFi.RSSI());
        } else {
            assistantPrintln("[WIFI] Station not connected.");
        }
    }
    else {
        assistantPrintln("[WIFI] Usage: WIFI [SCAN|CONNECT <ssid> <pass>|AP <ssid> <pass>|STA|OFF]");
    }
}

// --- PING UTILITY ---

static void ping_success(void* arg, void* pdata) { assistantPrintln("[PING] Reply received."); }
static void ping_timeout(void* arg, void* pdata) { assistantPrintln("[PING] Timeout."); }

void runPing(String host, int count) {
    assistantPrintf("[PING] Pinging %s %d times...\n", host.c_str(), count);
    esp_ping_config_t config = ESP_PING_DEFAULT_CONFIG();
    
    ip_addr_t target_addr;
    struct hostent *hptr = gethostbyname(host.c_str());
    if (hptr == NULL) {
        assistantPrintln("[PING] ERR: Could not resolve host");
        return;
    }
    memcpy(&target_addr.u_addr.ip4, hptr->h_addr, 4);
    target_addr.type = IPADDR_TYPE_V4;
    
    config.target_addr = target_addr;
    config.count = count;

    esp_ping_callbacks_t cbs = { .on_ping_success = ping_success, .on_ping_timeout = ping_timeout, .on_ping_end = NULL, .cb_args = NULL };
    esp_ping_handle_t ping;
    esp_ping_new_session(&config, &cbs, &ping);
    esp_ping_start(ping);
}

// --- BRIDGE HANDLER ---

void handleBridge(String input) {
    String sub = input.substring(6);
    sub.trim();
    String subUpper = sub;
    subUpper.toUpperCase();

    if (subUpper == "ON") {
        bridgeActive = true;
        assistantPrintln("[BRIDGE] UART Bridge ACTIVATED");
    }
    else if (subUpper == "OFF") {
        bridgeActive = false;
        assistantPrintln("[BRIDGE] UART Bridge DEACTIVATED");
    }
    else if (subUpper.startsWith("BAUD ")) {
        String val = sub.substring(5);
        val.trim();
        uint32_t newBaud = val.toInt();
        if (newBaud > 0) {
            bridgeBaud = newBaud;
            Serial1.begin(bridgeBaud, SERIAL_8N1, RX1_PIN, TX1_PIN);
            assistantPrintf("[BRIDGE] Baud rate set to %d\n", bridgeBaud);
        } else {
            assistantPrintln("[BRIDGE] ERR: Invalid Baud Rate");
        }
    }
    else {
        assistantPrintf("[BRIDGE] Status: %s | Baud: %d\n", bridgeActive ? "ON" : "OFF", bridgeBaud);
        assistantPrintln("[BRIDGE] Usage: BRIDGE [ON|OFF|BAUD <value>]");
    }
}

// --- STATUS REPORTER ---

void reportSystemStatus() {
    esp_chip_info_t chip_info;
    esp_chip_info(&chip_info);

    assistantPrintln("\n[ SYSTEM STATUS REPORT ]");
    assistantPrintln("----------------------------------------");
    
    assistantPrintf("Chip Model:   %s (Rev %d)\n", ESP.getChipModel(), chip_info.revision);
    assistantPrintf("Cores:        %d\n", chip_info.cores);
    assistantPrintf("CPU Freq:     %d MHz\n", ESP.getCpuFreqMHz());
    assistantPrintf("Flash Size:   %d MB\n", ESP.getFlashChipSize() / (1024 * 1024));
    
    assistantPrintln("\n[ MEMORY USAGE ]");
    assistantPrintf("Total Heap:   %d bytes\n", ESP.getHeapSize());
    assistantPrintf("Free Heap:    %d bytes\n", ESP.getFreeHeap());
    assistantPrintf("Min Free:     %d bytes\n", ESP.getMinFreeHeap());
    
    assistantPrintln("\n[ CONNECTIVITY ]");
    assistantPrintf("BLE Active:   %s (%s)\n", bleInitialized ? "YES" : "NO", customBleName.c_str());
    assistantPrintf("WiFi Mode:    %d\n", (int)WiFi.getMode());
    if(WiFi.status() == WL_CONNECTED) assistantPrintf("WiFi IP:      %s\n", WiFi.localIP().toString().c_str());
    assistantPrintf("UART Bridge:  %s (%d baud)\n", bridgeActive ? "ON" : "OFF", bridgeBaud);
    
    assistantPrintln("----------------------------------------");
}

// --- BLE HANDLER ---

void handleBLE(String input) {
    String sub = input.substring(3);
    sub.trim();
    String subUpper = sub;
    subUpper.toUpperCase();

    if (subUpper.startsWith("SCAN")) {
        assistantPrintln("[BLE] Starting 5s scan...");
        pScan->start(5000, false); 
        assistantPrintln("[BLE] Scan routine finished.");
    }
    else if (subUpper.startsWith("NAME ")) {
        String newName = sub.substring(5);
        newName.trim();
        if (newName.length() > 0) {
            preferences.putString("dev_name", newName);
            customBleName = newName;
            assistantPrintf("[BLE] Name updated to: %s. Restarting system...\n", newName.c_str());
            vTaskDelay(pdMS_TO_TICKS(1000));
            esp_restart();
        }
    }
    else if (subUpper.equalsIgnoreCase("RSSI")) {
        if (pClient && pClient->isConnected()) {
            assistantPrintf("[BLE] Current Link RSSI: %d dBm\n", pClient->getRssi());
        } else {
            assistantPrintln("[BLE] ERR: Must be connected to measure RSSI");
        }
    }
    else if (subUpper.startsWith("CONNECT ")) {
        String addrStr = sub.substring(8);
        addrStr.trim();
        
        if (pClient) { NimBLEDevice::deleteClient(pClient); pClient = nullptr; }
        pClient = NimBLEDevice::createClient();
        pClient->setClientCallbacks(&clientCallbacks, false);
        pClient->setConnectTimeout(5000);
        
        assistantPrintf("[BLE] Connecting to %s...\n", addrStr.c_str());
        if (pClient->connect(NimBLEAddress(std::string(addrStr.c_str()), 0))) {
            assistantPrintln("[BLE] Success! Exploring services...");
            auto services = pClient->getServices(true);
            for (auto* service : services) {
                assistantPrintf("  Service: %s\n", service->getUUID().toString().c_str());
                auto chars = service->getCharacteristics(true);
                for (auto* chr : chars) {
                    assistantPrintf("    - Char: %s [", chr->getUUID().toString().c_str());
                    if (chr->canRead()) assistantPrintf("R ");
                    if (chr->canWrite()) assistantPrintf("W ");
                    if (chr->canNotify()) { assistantPrintf("N "); chr->subscribe(true, notifyCB); }
                    assistantPrintln("]");
                }
            }
        } else {
            assistantPrintln("[BLE] Connection Failed");
            NimBLEDevice::deleteClient(pClient); pClient = nullptr;
        }
    }
    else if (subUpper.startsWith("READ ")) {
        if (!pClient || !pClient->isConnected()) { assistantPrintln("[BLE] ERR: Not connected"); return; }
        String uuidStr = sub.substring(5); uuidStr.trim();
        bool found = false;
        for (auto* service : pClient->getServices(false)) {
            auto pChr = service->getCharacteristic(NimBLEUUID(uuidStr.c_str()));
            if (pChr && pChr->canRead()) {
                std::string val = pChr->readValue();
                assistantPrintf("[BLE-READ] Hex: ");
                for(size_t i=0; i<val.length(); i++) assistantPrintf("%02X", (uint8_t)val[i]);
                assistantPrintf(" | ASCII: %s\n", val.c_str());
                found = true; break;
            }
        }
        if (!found) assistantPrintln("[BLE] ERR: UUID not found/readable");
    }
    else if (subUpper.startsWith("WRITEHEX ")) {
        if (!pClient || !pClient->isConnected()) { assistantPrintln("[BLE] ERR: Not connected"); return; }
        String params = sub.substring(9); params.trim();
        int space = params.indexOf(' ');
        if (space != -1) {
            String uuidStr = params.substring(0, space);
            String hexData = params.substring(space + 1); hexData.trim();
            size_t len = hexData.length() / 2;
            uint8_t* payload = new uint8_t[len];
            for (size_t i = 0; i < len; i++) payload[i] = (uint8_t)strtol(hexData.substring(i * 2, i * 2 + 2).c_str(), NULL, 16);
            bool found = false;
            for (auto* service : pClient->getServices(false)) {
                auto pChr = service->getCharacteristic(NimBLEUUID(uuidStr.c_str()));
                if (pChr && pChr->canWrite()) { pChr->writeValue(payload, len, true); assistantPrintln("[BLE] Hex Write sent."); found = true; break; }
            }
            delete[] payload;
            if (!found) assistantPrintln("[BLE] ERR: UUID not found/writable");
        }
    }
    else if (subUpper.startsWith("WRITE ")) {
        if (!pClient || !pClient->isConnected()) { assistantPrintln("[BLE] ERR: Not connected"); return; }
        String params = sub.substring(6); params.trim();
        int space = params.indexOf(' ');
        if (space != -1) {
            String uuidStr = params.substring(0, space);
            String data = params.substring(space + 1);
            bool found = false;
            for (auto* service : pClient->getServices(false)) {
                auto pChr = service->getCharacteristic(NimBLEUUID(uuidStr.c_str()));
                if (pChr && pChr->canWrite()) { pChr->writeValue(data.c_str(), data.length(), true); assistantPrintln("[BLE] Write sent."); found = true; break; }
            }
            if (!found) assistantPrintln("[BLE] ERR: UUID not found/writable");
        }
    }
    else if (subUpper.equalsIgnoreCase("DISCONNECT")) { if (pClient) pClient->disconnect(); }
}

// --- CONSOLIDATED I2C HANDLER ---

void handleI2C(String input) {
  if (!xSemaphoreTake(i2cMutex, pdMS_TO_TICKS(1000))) return;
  char buf[128];
  input.toCharArray(buf, 128);
  char *p = strtok(buf, " "); 
  if (p == NULL) { xSemaphoreGive(i2cMutex); return; }
  String firstToken = String(p); firstToken.toUpperCase();
  char *cmd = (firstToken == "I2C") ? strtok(NULL, " ") : (char*)firstToken.c_str();
  if (cmd == NULL) { xSemaphoreGive(i2cMutex); return; }
  String subCmd = String(cmd); subCmd.toUpperCase();
  if (subCmd == "SCAN") {
    assistantPrintln("\n--- I2C BUS SCAN ---");
    int devices = 0;
    for (byte address = 1; address < 127; address++) {
      Wire.beginTransmission(address);
      if (Wire.endTransmission() == 0) { assistantPrintf("Found: 0x%02X\n", address); devices++; }
    }
    if (devices == 0) assistantPrintln("No devices found.");
  } 
  else if (subCmd == "WRITE") {
    char *addrStr = strtok(NULL, " "); char *regStr = strtok(NULL, " ");
    if (addrStr && regStr) {
      uint8_t devAddr = (uint8_t)strtol(addrStr, NULL, 0);
      uint8_t devReg = (uint8_t)strtol(regStr, NULL, 0);
      Wire.beginTransmission(devAddr); Wire.write(devReg);
      while (char *val = strtok(NULL, " ")) Wire.write((uint8_t)strtol(val, NULL, 0));
      Wire.endTransmission(); assistantPrintln("I2C Write finished.");
    }
  } 
  else if (subCmd == "READ") {
    char *addrStr = strtok(NULL, " "); char *regStr = strtok(NULL, " "); char *countStr = strtok(NULL, " ");
    if (addrStr && regStr && countStr) {
      uint8_t devAddr = (uint8_t)strtol(addrStr, NULL, 0);
      uint8_t devReg = (uint8_t)strtol(regStr, NULL, 0);
      int count = atoi(countStr);
      Wire.beginTransmission(devAddr); Wire.write(devReg); Wire.endTransmission(false); 
      uint8_t readLen = Wire.requestFrom(devAddr, (uint8_t)count);
      assistantPrintf("Data: ");
      for (int i = 0; i < readLen; i++) assistantPrintf("%02X", Wire.read());
      assistantPrintln("");
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
    assistantPrintf("\n--- EEPROM DUMP (0x%02X) ---\n", i2cAddr);
    for (uint32_t addr = 0; addr < EEPROM_SIZE; addr += 16) {
      assistantPrintf("0x%04X: ", addr);
      Wire.beginTransmission(i2cAddr);
      Wire.write((uint8_t)(addr >> 8)); Wire.write((uint8_t)(addr & 0xFF));
      if (Wire.endTransmission() != 0) { assistantPrintln("\nERR: Connection lost."); xSemaphoreGive(i2cMutex); return; }
      Wire.requestFrom(i2cAddr, (uint8_t)16);
      for (int i = 0; i < 16; i++) { if (Wire.available()) assistantPrintf("%02X ", Wire.read()); }
      assistantPrintln("");
      vTaskDelay(pdMS_TO_TICKS(2));
    }
    xSemaphoreGive(i2cMutex);
  }
}

void handleEEPROMWrite(String input) {
  input.trim();
  int space1 = input.indexOf(' '); if (space1 == -1) return;
  String cmdPart = input.substring(0, space1); cmdPart.toUpperCase();
  if (cmdPart == "WRITE") { input = input.substring(space1 + 1); input.trim(); space1 = input.indexOf(' '); }
  if (space1 == -1) return;
  uint8_t i2cAddr = (uint8_t)strtol(input.substring(0, space1).c_str(), NULL, 16);
  input = input.substring(space1 + 1);
  int space2 = input.indexOf(' '); if (space2 == -1) return;
  uint16_t memAddr = (uint16_t)strtol(input.substring(0, space2).c_str(), NULL, 16);
  String dataPart = input.substring(space2 + 1); dataPart.trim();
  if (dataPart.startsWith("\"")) {
    int lastQuote = dataPart.lastIndexOf("\"");
    String text = dataPart.substring(1, lastQuote);
    for (int i = 0; i < text.length(); i++) writeByte(i2cAddr, memAddr + i, (uint8_t)text[i]);
  } else {
    char *ptr = strtok((char*)dataPart.c_str(), " ");
    int byteCount = 0;
    while (ptr != NULL) { writeByte(i2cAddr, memAddr + byteCount++, (uint8_t)strtol(ptr, NULL, 0)); ptr = strtok(NULL, " "); }
  }
  assistantPrintln("EEPROM Write Finished.");
}

// --- RFID HELPERS ---

void closeOut() { mfrc522.PICC_HaltA(); mfrc522.PCD_StopCrypto1(); }

bool authenticateCard(int block) {
  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return false; 
  MFRC522::StatusCode status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, block, &key, &(mfrc522.uid));
  return (status == MFRC522::STATUS_OK);
}

void runDump() {
  assistantPrintln("SCAN_CARD_NOW");
  unsigned long start = millis();
  while (!authenticateCard(0)) {
    if (millis() - start > 5000) { assistantPrintln("TIMEOUT"); return; }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  byte buffer[18]; byte size = sizeof(buffer);
  for (int b = 0; b < 64; b++) {
    if (b % 4 == 0) mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, b, &key, &(mfrc522.uid));
    if (mfrc522.MIFARE_Read(b, buffer, &size) == MFRC522::STATUS_OK) {
      assistantPrintf("BLOCK:%d:DATA:", b);
      for (byte i = 0; i < 16; i++) assistantPrintf("%02X", buffer[i]);
      assistantPrintln("");
    }
  }
  closeOut();
}

void runRead(int sector) {
  assistantPrintln("SCAN_CARD_NOW");
  unsigned long start = millis();
  while (!authenticateCard(sector * 4)) {
    if (millis() - start > 5000) { assistantPrintln("TIMEOUT"); return; }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  byte buffer[18]; byte size = sizeof(buffer);
  for (int i = 0; i < 4; i++) {
    int block = (sector * 4) + i;
    if (mfrc522.MIFARE_Read(block, buffer, &size) == MFRC522::STATUS_OK) {
      assistantPrintf("BLOCK:%d:DATA:", block);
      for (byte b = 0; b < 16; b++) assistantPrintf("%02X", buffer[b]);
      assistantPrintln("");
    }
  }
  closeOut();
}

void runWrite(int block, String hex) {
  if (hex.length() != 32) { assistantPrintln("ERR:HEX_LEN_32_REQ"); return; }
  assistantPrintln("SCAN_CARD_NOW");
  unsigned long start = millis();
  while (!authenticateCard(block)) {
    if (millis() - start > 5000) { assistantPrintln("TIMEOUT"); return; }
    vTaskDelay(pdMS_TO_TICKS(100));
  }
  byte data[16];
  for (int i = 0; i < 16; i++) data[i] = strtol(hex.substring(i * 2, i * 2 + 2).c_str(), NULL, 16);
  if (mfrc522.MIFARE_Write(block, data, 16) == MFRC522::STATUS_OK) { assistantPrintln("WRITE_SUCCESS"); }
  else { assistantPrintln("WRITE_FAILED"); }
  closeOut();
}

// --- DOCUMENTATION SYSTEM ---

void printHelp(String target) {
  target.toUpperCase(); target.trim();
  if (target == "" || target == "HELP") {
    assistantPrintln("\n[ MODULE LIST ]");
    assistantPrintln("  HELP, MAN, I2C, BLE, WIFI, RFID, EEPROM, BRIDGE, STATUS, PING, RESET");
    assistantPrintln("Use 'HELP [MODULE]' or pipe output: 'WIFI SCAN | grep SSID'");
  }
  else if (target == "WIFI") {
    assistantPrintln("\n[ WIFI SUBCOMMANDS ]");
    assistantPrintln("  WIFI SCAN         - Scan APs");
    assistantPrintln("  WIFI CONNECT [S] [P] - Join Network");
    assistantPrintln("  WIFI AP [S] [P]   - Create AP");
    assistantPrintln("  WIFI STA          - Show Connection");
    assistantPrintln("  WIFI OFF          - Kill Radio");
  }
  else if (target == "BLE") {
    assistantPrintln("\n[ BLE SUBCOMMANDS ]");
    assistantPrintln("  BLE SCAN, CONNECT, RSSI, READ, WRITE, WRITEHEX, NAME, DISCONNECT");
  }
}

void printMan(String cmd) {
  cmd.toUpperCase(); cmd.trim();
  if (cmd == "WIFI") {
    assistantPrintln("\n[ WIFI MANUAL ]");
    assistantPrintln("SCAN: Lists SSID, RSSI, and Channel info for nearby networks.");
    assistantPrintln("CONNECT: Joins a network. Usage: WIFI CONNECT HomeSSID Password123");
    assistantPrintln("AP: Starts an Access Point. Default pass is 12345678 if omitted.");
  }
  else if (cmd == "PING") {
    assistantPrintln("\n[ PING MANUAL ]");
    assistantPrintln("USAGE: PING <host/ip>");
    assistantPrintln("PURPOSE: Tests network connectivity to a remote host.");
  }
  else if (cmd == "GREP") {
    assistantPrintln("\n[ GREP MANUAL ]");
    assistantPrintln("USAGE: <CMD> | grep <pattern>");
    assistantPrintln("EXAMPLE: BLE SCAN | grep iPhone");
    assistantPrintln("PURPOSE: Filters any command output to lines containing the pattern.");
  }
  else {
    assistantPrintln("Manual page not found.");
  }
}