#include <Wire.h>

#define EEPROM_SIZE 4096 // Adjust based on your chip capacity
#define SDA_PIN 8
#define SCL_PIN 9

void setup() {
  Serial.begin(115200);
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);
  Serial.println("\nReady. Usage: DUMP 0x50 or DUMP 0x51");
}

void dumpEEPROM(uint8_t i2cAddr) {
  Serial.print("\n--- DUMPING DEVICE ");
  Serial.print("0x");
  Serial.print(i2cAddr, HEX);
  Serial.println(" ---");

  for (uint32_t addr = 0; addr < EEPROM_SIZE; addr += 16) {
    // Print address header
    char addrBuf[15];
    sprintf(addrBuf, "0x%04X:  ", addr);
    Serial.print(addrBuf);

    // Set internal memory pointer
    Wire.beginTransmission(i2cAddr);
    Wire.write((uint8_t)(addr >> 8));   // MSB
    Wire.write((uint8_t)(addr & 0xFF)); // LSB
    if (Wire.endTransmission() != 0) {
      Serial.println("DEVICE NOT FOUND AT ADDRESS!");
      return; 
    }

    // Request 16 bytes
    Wire.requestFrom(i2cAddr, (uint8_t)16);

    for (int i = 0; i < 16; i++) {
      if (Wire.available()) {
        uint8_t val = Wire.read();
        if (val < 0x10) Serial.print("0");
        Serial.print(val, HEX);
        Serial.print(" ");
      }
    }
    Serial.println();
  }
  Serial.println("--- DUMP COMPLETE ---");
}

void loop() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    input.toUpperCase();

    if (input.startsWith("DUMP ")) {
      String addrStr = input.substring(5); // Get the part after "DUMP "
      
      // Convert hex string to integer
      uint8_t targetAddr;
      if (addrStr.startsWith("0X")) {
        targetAddr = (uint8_t)strtol(addrStr.c_str(), NULL, 16);
      } else {
        targetAddr = (uint8_t)strtol(addrStr.c_str(), NULL, 16);
      }

      if (targetAddr > 0) {
        dumpEEPROM(targetAddr);
      } else {
        Serial.println("Invalid Address.");
      }
    }
  }
}