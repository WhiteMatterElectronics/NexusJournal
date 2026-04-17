#define F_CPU 16000000UL
#define NO_GLOBAL_SERIAL
#include <TaskScheduler.h>
#include <Wire.h>
#include <SPI.h>
#include <EEPROM.h>
#include <MFRC522.h>
#include <morse.h>
#include "fancyTerminal.h"

#include "System.h"
#include "CommandParser.h"
#include <avr/pgmspace.h>

#define RX_PIN 2
#define RT 5
#define LT 6
#define DW 7
#define UP 8
#define OK 3
#define RST_PIN 9
#define SS_PIN 10
#define LED 4
#define BIT_DURATION 200  // Durata unui bit în microsecunde (trebuie să se potrivească cu ATtiny44)
#define BUFFER_SIZE 32
#define MAN_BUF 16

#define FLAG_MORS_ADDR 2150
#define FLAG_TEMP_ADDR 2200
#define FLAG_DUMP_ADDR 2350
#define FLAG_HAF1_ADDR 2400
#define FLAG_HAF2_ADDR 2500
#define FLAG_UART_ADDR 2600
#define FLAG_GUAR_ADDR 2700
#define FLAG_MANC_ADDR 2800
#define FLAG_PWMI_ADDR 2900

#define NICE_BLUE 69
#define NICE_YELLOW 220


//void MorseTask(void);
void RFIDTask(void);
void MainTask(void);
//void RenderTask(void);
void InputTask(void);

static void checkTAG(void);
static bool isTagAuthorized(bool);

MFRC522 mfrc522(SS_PIN, RST_PIN);
//LiquidCrystal_I2C //lcd(0x20, 20, 4);
LEDMorseSender morse(LED);
Scheduler runner;
System sys;
CommandParser parser(sys);



//Task morseTask(1, TASK_FOREVER, &MorseTask);
Task rfidTask(500, TASK_FOREVER, &RFIDTask);
Task mainTask(50, TASK_FOREVER, &MainTask);
Task inputTask(20, TASK_FOREVER, &InputTask);

volatile byte bufferRead[18];
char tagDataChar[18];
volatile static bool firstHalf = false;
volatile static bool secndHalf = false;

const uint8_t screenSizeX = 120;
const uint8_t screenSizeY = 40;
const termColor frameColor = CL_GREEN;

uint8_t caesarKey;
char vigKey[7];

float lastTemp = -999;
uint16_t lastVoltage = -1;
bool lastAuth = true;
uint8_t lastAuthority = 25;

unsigned long lastTimeAlive = 250;

char globalFlagChar[20];
bool passHalf1 = false;
bool passHalf2 = false;
bool passUart = false;
bool passIntro = false;
bool passEnd = false;
//Used for scrollingMenu
unsigned long scrollTime1;
uint16_t scrollIndex = 0;
char inputBuffer[BUFFER_SIZE];
uint8_t head = 0;  // Head index for circular buffer
uint8_t tail = 0;  // Tail index for circular buffer
char globalInputCommand[BUFFER_SIZE];
uint8_t bufInd = 0;
bool inputReady = false;
uint8_t inputX = 1;
uint8_t inputY = 18;


//Collectibles
unsigned int timeFirstCollectible;
bool droppedCollectible1 = false;

const char flag[] PROGMEM = {"CTF{bighacker}"};
//I2C EEPROM MEMORY MAP
/*
10 - 280 DEC command area
300 - 600 DEC flag area
1024 - 4096 DEC 
*/

void setup() {
  Serial.begin(115200);  // myIn/myOut is your code which gets called when bytes arrive, or when a previous send-byte has complete
  SPI.begin();
  Wire.begin();
  Serial.println("write done");
  pinMode(UP, INPUT_PULLUP);
  pinMode(DW, INPUT_PULLUP);
  pinMode(LT, INPUT_PULLUP);
  pinMode(RT, INPUT_PULLUP);
  pinMode(RT, INPUT_PULLUP);
  pinMode(RX_PIN, INPUT);
  writeStringToInternalEEPROM(0, "CTF{mem328}");
  //writeStringToInternalEEPROM(100, "");
  if (!digitalRead(UP)) {
    sys.miniDebugEnable = true;
  } else {
    sys.miniDebugEnable = false;
  }
  sys.passedMiniDebug = false;
  // sys.writeCharArrayToMemory(70, "info", 20);
  // sys.writeCharArrayToMemory(90, "regs", 20);
  // sys.writeCharArrayToMemory(110, "wrmem", 20);
  // sys.writeCharArrayToMemory(170, "clear", 20);
  // sys.writeCharArrayToMemory(210, "lscmd", 20);
  // sys.writeCharArrayToMemory(250, "help", 20);
  // sys.writeCharArrayToMemory(390, "decrypt", 20);
  // sys.writeCharArrayToMemory(450, "encrypt", 20);
  // sys.writeCharArrayToMemory(350, "readmem", 20);
  // sys.writeCharArrayToMemory(480, "timeset", 20);
  //sys.writeCharArrayToMemory(500, "auth", 20);

  parser.addCommand(70, 0);    //info
  parser.addCommand(90, 1);    //regs
  parser.addCommand(110, 2);   //wrmem
  parser.addCommand(170, 3);   //clear
  parser.addCommand(210, 4);   //lscmd
  parser.addCommand(250, 5);   //help
  parser.addCommand(290, 6);   //decrypt Vig and Caes
  parser.addCommand(320, 7);   //encrypt Vig and Caes
  parser.addCommand(350, 8);   //readmem
  parser.addCommand(480, 9);   //timeset
  parser.addCommand(500, 10);  //hidden auth
  mfrc522.PCD_Init();
  //lcd.init();
  pinMode(LED, OUTPUT);
  //vigramKey.reserve(7);
  //sys.writeEEP(4200, 16);
  caesarKey = sys.readEEP(4200);
  sys.readCharArrayFromMemory(4100, vigKey, 7);
  BigDecryptionLOL(vigKey, 6, 16);
  sys.readCharArrayFromMemory(4300, tagDataChar, 17);

  //Load all necesary data from eeprom and set


  bootSeq();
}

void writeStringToInternalEEPROM(int addrOffset, const String &strToWrite) {
  byte len = strToWrite.length();
  EEPROM.write(addrOffset, len);
  for (int i = 0; i < len; i++) {
    EEPROM.write(addrOffset + 1 + i, strToWrite[i]);
  }
}

void bootSeq() {
  resetTerminalColors();
  setCursorInvisible();
  setCursorXY(0, 0);
  setBGColor(0);
  setFGColor(0);
  clearTerminalScreen();
  Serial.println();
  Serial.println();
  //ElectronLogo
  printAllLinesFromEEPROM();
  Serial.println();
  printOrangeLogo();
  delay(1000);
  set256Color(NICE_BLUE);
  set256BGColor(0);
  Serial.println();
  printTextFromMem(17000, 10);
  printTextFromMem(17100, 10);
  printTextFromMem(17200, 10);
  printTextFromMem(17300, 10);
  printTextFromMem(17400, 10);
  printTextFromMem(17500, 10);
  printTextFromMem(17600, 10);

  if (sys.miniDebugEnable) {
    printTextFromMem(29000, 10);
    printTextFromMem(30000, 10);
  }
  //lcd.clear();
  delay(1000);
  //runner.addTask(morseTask);
  runner.addTask(rfidTask);
  runner.addTask(mainTask);
  runner.addTask(inputTask);


  memset(globalFlagChar, 0, 20);
  sys.readCharArrayFromMemory(2150, globalFlagChar, 16);
  sys.morseActive = sys.readEEP(25099);
  if (sys.morseActive) {
    morse.setup();
    morse.setWPM(25);
    morse.setMessage(String(globalFlagChar));
    morse.sendBlocking();
  }
  inputTask.enable();
  mainTask.enable();
  rfidTask.enable();
  //lcd.clear();
  clearTerminalScreen();
  set256BGColor(NICE_BLUE);
  set256Color(NICE_BLUE);
  drawRect(0, 0, screenSizeX / 2, screenSizeY + 2, ' ');
  drawRect(screenSizeX / 2, 0, screenSizeX, screenSizeY + 2, ' ');
  drawHorizontalLine(0, screenSizeY / 2, screenSizeX + 1, ' ');
  set256BGColor(0);
  set256Color(0);
  drawVerticalLine(60, 21, 42, ' ');
  attachInterrupt(digitalPinToInterrupt(RX_PIN), handlePinChange, CHANGE);
}

void printOrangeLogo() {
  setBGColor(0);
  set256Color(202);

  for (int i = 21400; i <= 21900; i += 100) {
    for (uint8_t indexLine = 0; indexLine < 82; indexLine++) {
      Serial.write(sys.readEEP(i + indexLine));
    }
    Serial.println();
  }

  Serial.println();
  for (int i = 22100; i <= 23300; i += 200) {
    for (uint8_t indexLine = 0; indexLine < 34; indexLine++) {
      Serial.write(sys.readEEP(i + indexLine));
    }
    Serial.println();
  }

  Serial.println();
  for (int i = 23500; i <= 24700; i += 200) {
    for (uint8_t indexLine = 0; indexLine < 68; indexLine++) {
      Serial.write(sys.readEEP(i + indexLine));
    }
    Serial.println();
  }
}


void loop() {
  runner.execute();
}


bool isUtf8Start(uint8_t byte) {
  return (byte & 0xC0) != 0x80;  // Start byte is not a continuation byte
}

int utf8CharLength(uint8_t byte) {
  if ((byte & 0x80) == 0x00) return 1;  // ASCII character (1 byte)
  if ((byte & 0xE0) == 0xC0) return 2;  // 2-byte UTF-8 character
  if ((byte & 0xF0) == 0xE0) return 3;  // 3-byte UTF-8 character
  return 0;                             // Invalid byte
}

void printUtf8FromEEPROM(uint16_t startAddress, size_t length) {
  int charLength = 0;  // Length of the current UTF-8 character
  int bytesRead = 0;   // Number of bytes read for the current character

  for (size_t i = 0; i < length; i++) {
    uint8_t data = sys.readEEP(startAddress + i);  // Read byte from EEPROM

    if (bytesRead == 0) {
      // Start of a new UTF-8 character
      if (isUtf8Start(data)) {
        charLength = utf8CharLength(data);
        bytesRead = 1;
      } else {
        charLength = 1;  // Treat as single byte if invalid UTF-8
        bytesRead = 1;
      }
    } else {
      // Continuation byte
      bytesRead++;
    }

    Serial.write(data);  // Print the byte

    // If character is complete
    if (bytesRead == charLength) {
      bytesRead = 0;  // Reset for the next character

      // Example: Perform actions on specific characters
      if (charLength == 3 && data == 0x88) {  // Check for "█" (last byte is 0x88)
        set256Color(NICE_BLUE);               // Change color to red for this character
      } else {                                // Check for "╗" (last byte is 0x97)
        set256Color(221);                     // Change color to blue for this character
      }
    }
  }
  Serial.println();  // Add a newline after printing each line
}


void printAllLinesFromEEPROM() {
  printUtf8FromEEPROM(20200, 183);  // Print first line
  printUtf8FromEEPROM(20400, 194);  // Print second line
  printUtf8FromEEPROM(20600, 159);  // Print third line
  printUtf8FromEEPROM(20800, 161);  // Print fourth line
  printUtf8FromEEPROM(21000, 189);  // Print fifth line
  printUtf8FromEEPROM(21200, 179);  // Print sixth line
}

int* measureFrequencyAndDutyCycle(int pin) {
  static int result[2];  // Static array to hold frequency and duty cycle

  // Measure HIGH and LOW durations in microseconds
  unsigned long highTime = pulseIn(pin, HIGH, 1000000);  // 1 second timeout
  unsigned long lowTime = pulseIn(pin, LOW, 1000000);    // 1 second timeout

  // Calculate total period
  unsigned long totalTime = highTime + lowTime;

  // Check for valid signal
  if (totalTime > 0) {
    // Calculate frequency in Hz
    result[0] = (int)(1000000 / totalTime);

    // Calculate duty cycle as a percentage
    result[1] = (int)((highTime * 100) / totalTime);
  } else {
    // No valid signal detected
    result[0] = 0;  // Frequency
    result[1] = 0;  // Duty cycle
  }

  return result;
}

uint16_t lastAdcVals[6];
void printADCChannels() {

  set256BGColor(0);
  setFGColor(CL_BLUE);

  for (int i = 0; i < 6; i++) {
    sys.printInMenuXY(0, 1, 4 + i, "CH" + String(sys.adc.adc[i] - 14) + ":");
  }
  resetTerminalColors();

  for (int channel = 0; channel < 6; channel++) {
    set256BGColor(0);
    set256Color(0);
    sys.adc.vals[channel] = map(sys.adc.vals[channel], 0, 1023, 0, 40);
    //Delete from finish of sys.adc.val to end
    for (int i = sys.adc.vals[channel]; i < 40; i++) {
      sys.printInMenuXY(0, i + 6, 4 + channel, "\u2588");
    }
    resetTerminalColors();
    setFGColor(channel + 1);
    setBGColor(channel + 1);
    for (int i = 0; i < sys.adc.vals[channel]; i++) {
      sys.printInMenuXY(0, i + 6, 4 + channel, "\u2588");
    }
  }
  resetTerminalColors();
}

void readAllADC() {
  for (int i = 0; i < 6; i++) {
    sys.adc.vals[i] = analogRead(sys.adc.adc[i]);
  }
  for (int i = 0; i < 6; i++) {
    setFGColor(CL_GREEN);
    set256BGColor(0);
    sys.printInMenuXY(0, 48, 4 + i, String(sys.adc.vals[i]) + "    ");
  }
  printADCChannels();
}
bool newCard = false;
static void checkTAG() {
  // Prepare key - all keys are set to FFFFFFFFFFFFh at chip delivery from the factory.
  MFRC522::MIFARE_Key key;
  MFRC522::StatusCode status;
  byte block;
  byte len;
  memset(bufferRead, 0, 18);

  for (byte i = 0; i < 6; i++) key.keyByte[i] = 0xFF;
  block = 4;
  len = 18;
  if (!mfrc522.PICC_IsNewCardPresent()) {

    return;
  }
  newCard = true;
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }
  status = mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, 4, &key, &(mfrc522.uid));  //line 834 of MFRC522.cpp file
  if (status != MFRC522::STATUS_OK) {
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
    return;
  }
  status = mfrc522.MIFARE_Read(block, bufferRead, &len);
  if (status != MFRC522::STATUS_OK) {
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
  }
  mfrc522.PICC_HaltA();
  // Stop BigEncryptionLOLion on PCD
  mfrc522.PCD_StopCrypto1();
  //setCursorXY(35, 13);
  // String buf;
  // for (int i = 0; i < 16; i++) {
  //   buf += String((char)bufferRead[i]);
  // }
}

bool isTagAuthorized() {
  checkTAG();
  if (newCard) {
    for (int i = 0; i < 9; i++) {
      if (tagDataChar[i] != bufferRead[i]) {
        firstHalf = false;
        sys.rfidTryNumber++;
        sys.writeEEP(25079, sys.rfidTryNumber);
        newCard = false;
        return false;
      }
    }
    firstHalf = true;
    for (int i = 10; i < 16; i++) {
      if (tagDataChar[i] != bufferRead[i]) {
        secndHalf = false;
        sys.rfidTryNumber++;
        sys.writeEEP(25079, sys.rfidTryNumber);
        newCard = false;
        return false;
      }
    }
    secndHalf = true;
    newCard = false;
    return true;
  }
}

// Caesar Encryption (Handles Both Uppercase and Lowercase)
static void BigEncryptionLOL(char* message, int length, uint8_t key) {
  for (int i = 0; i < length && message[i] != '\0'; i++) {
    char ch = message[i];
    if (ch >= 'a' && ch <= 'z') {
      message[i] = 'a' + (ch - 'a' + key) % 26;
    } else if (ch >= 'A' && ch <= 'Z') {
      message[i] = 'A' + (ch - 'A' + key) % 26;
    }
  }
  message[length] = '\0';  // Ensure null termination
}

// Caesar Decryption (Handles Both Uppercase and Lowercase)
static void BigDecryptionLOL(char* message, int length, uint8_t key) {
  for (int i = 0; i < length && message[i] != '\0'; i++) {
    char ch = message[i];
    if (ch >= 'a' && ch <= 'z') {
      message[i] = 'a' + (ch - 'a' - key + 26) % 26;
    } else if (ch >= 'A' && ch <= 'Z') {
      message[i] = 'A' + (ch - 'A' - key + 26) % 26;
    }
  }
  message[length] = '\0';  // Ensure null termination
}

// Vigenere Encryption (Handles Both Uppercase and Lowercase)
void VigenereEncrypt(char* message, int length, const char* key, int keyLength) {
  int keyIndex = 0;
  for (int i = 0; i < length; i++) {
    char ch = message[i];
    char keyChar = key[keyIndex % keyLength];

    // Normalize key character
    if (keyChar >= 'a' && keyChar <= 'z') keyChar = keyChar - 'a';
    else if (keyChar >= 'A' && keyChar <= 'Z') keyChar = keyChar - 'A';

    // Encrypt the message character
    if (ch >= 'a' && ch <= 'z') {
      message[i] = 'a' + (ch - 'a' + keyChar) % 26;
      keyIndex++;
    } else if (ch >= 'A' && ch <= 'Z') {
      message[i] = 'A' + (ch - 'A' + keyChar) % 26;
      keyIndex++;
    }
  }
  message[length] = '\0';  // Ensure null termination
}

void myIn(int c) {
  uint8_t nextHead = (head + 1) % BUFFER_SIZE;
  if (nextHead != tail) {   // Check for buffer overflow
    inputBuffer[head] = c;  // Store received byte
    head = nextHead;        // Advance head pointer
  } else {
    // Handle buffer overflow if needed
    // For example: Set a flag or overwrite the oldest data
  }
}

uint8_t available() {
  return (uint8_t)(head - tail + BUFFER_SIZE) % BUFFER_SIZE;
}

// Vigenere Decryption (Handles Both Uppercase and Lowercase)
void VigenereDecrypt(char* message, int length, const char* key, int keyLength) {
  int keyIndex = 0;
  for (int i = 0; i < length; i++) {
    char ch = message[i];
    char keyChar = key[keyIndex % keyLength];

    // Normalize key character
    if (keyChar >= 'a' && keyChar <= 'z') keyChar = keyChar - 'a';
    else if (keyChar >= 'A' && keyChar <= 'Z') keyChar = keyChar - 'A';

    // Decrypt the message character
    if (ch >= 'a' && ch <= 'z') {
      message[i] = 'a' + (ch - 'a' - keyChar + 26) % 26;
      keyIndex++;
    } else if (ch >= 'A' && ch <= 'Z') {
      message[i] = 'A' + (ch - 'A' - keyChar + 26) % 26;
      keyIndex++;
    }
  }
  message[length] = '\0';  // Ensure null termination
}


void set256Color(uint8_t colorCode) {
  char colorSeq[16];
  sprintf(colorSeq, "\033[38;5;%dm", colorCode);
  Serial.print(colorSeq);
}

void set256BGColor(uint8_t colorCode) {
  char colorSeq[16];
  sprintf(colorSeq, "\033[48;5;%dm", colorCode);  // 48 is for background color
  Serial.print(colorSeq);
}

void printTextFromMem(unsigned int addr, uint8_t menu) {
  char storyLine[65];  // Buffer for storing the read string (64 characters + null terminator)

  // Read the first 32 characters from base address
  for (int i = 0; i < 32; ++i) {
    storyLine[i] = sys.readEEP(addr + i);
  }

  // Read the next 32 characters from base address + 32
  for (int i = 32; i < 64; ++i) {
    storyLine[i] = sys.readEEP(addr + i);
  }

  // Null-terminate the string
  storyLine[64] = '\0';

  switch (menu) {
    case 1:
      sys.printInStoryMenu(storyLine);
      break;
    case 2:
      Serial.print(storyLine);
      break;
    case 3:
      sys.printInUartMenu(storyLine);
      break;
    default:
      Serial.print(storyLine);
      break;
  }
}


















//////////////////////////////separate file from this example project 

void helpCommand(char **args, int argCount) {
  set256Color(145);
  set256BGColor(0);
  printTextFromMem(14300, 3);
  printTextFromMem(14400, 3);
  printTextFromMem(14500, 3);
}

void regsCommand(char **args, int argCount) {
  if (argCount == 0) {
    setFGColor(CL_RED);
    set256BGColor(0);
    printTextFromMem(15900, 3);

  } else {
    if (sys.passedMiniDebug) {
      uint8_t regNumber;
      uint8_t value;
      regNumber = atoi(args[1]);
      value = atoi(args[2]);
      if (strcmp(args[0], "write") == 0) {
        switch (regNumber) {
          case 0:
            sys.writeEEP(25019, value);
            sys.bypasGuardian = sys.readEEP(25019);
            break;
          case 1:
            sys.writeEEP(25039, value);
            sys.systemLock = sys.readEEP(25039);
            break;
          case 2:
            sys.writeEEP(25059, value);
            sys.enableDebugPrints = sys.readEEP(25059);
            break;
          case 3:
            sys.writeEEP(25079, value);
            sys.rfidTryNumber = sys.readEEP(25079);
            break;
          case 4:
            sys.writeEEP(25099, value);
            sys.morseActive = sys.readEEP(25099);
            break;
          case 5:
            sys.writeEEP(25119, value);
            sys.bypassRFID = sys.readEEP(25119);
            break;
        }
      }
    }
  }
  //drawRegs();
}

void drawRegs() {
  set256BGColor(110);
  set256Color(110);
  drawRect(98, screenSizeY / 2 + 1, screenSizeX - 1, screenSizeY / 2 + 8, ' ');
  setCursorXY(119, 28);
  Serial.print(" ");
  for (int i = 25000; i <= 25100; i += 20) {  // Increment by 20 each iteration
    int yOffset = 22 + (i - 25000) / 20;      // Calculate the Y position for each iteration
    // Draw the text from memory
    set256BGColor(0);
    set256Color(210);
    setCursorXY(99, yOffset);  // Use calculated Y position
    printTextFromMem(i, 10);   // Read and print text from memory


    // Read the value from an offset of 19 from the current address
    set256BGColor(NICE_BLUE);
    set256Color(NICE_YELLOW);
    setCursorXY(113, yOffset);

    uint8_t value = sys.readEEP(i + 19);  // Read from offset 19
    if (value >= '0' && value <= '9') {   // Check if value is an ASCII digit
      value -= '0';                       // Convert ASCII to numeric
    }
    Serial.print(value);
  }
}


void infoCommand(char **args, int argCount) {
  if (argCount == 0) {
    setFGColor(CL_RED);
    set256BGColor(0);
    printTextFromMem(30600, 3);
  } else {
    sys.clearStoryMenu();
    set256Color(81);
    set256BGColor(0);
    if (strcmp(args[0], "1") == 0) {
      printTextFromMem(18700, 1);
      printTextFromMem(18800, 1);
      printTextFromMem(18900, 1);
      printTextFromMem(19000, 1);
      printTextFromMem(19100, 1);
      printTextFromMem(19200, 1);
      printTextFromMem(19300, 1);
      printTextFromMem(19400, 1);
      printTextFromMem(19500, 1);
      printTextFromMem(19600, 1);
      printTextFromMem(19700, 1);
    } else if (strcmp(args[0], "2") == 0) {
      printTextFromMem(9800, 1);
      printTextFromMem(9900, 1);
      printTextFromMem(10000, 1);
      printTextFromMem(10100, 1);
      printTextFromMem(10200, 1);
      printTextFromMem(10300, 1);
      printTextFromMem(10400, 1);
      printTextFromMem(10500, 1);
      printTextFromMem(10600, 1);
      printTextFromMem(10700, 1);
      printTextFromMem(10800, 1);
      printTextFromMem(10900, 1);
      printTextFromMem(11000, 1);
      printTextFromMem(11100, 1);
    } else if (strcmp(args[0], "3") == 0) {
      printTextFromMem(17700, 1);
      printTextFromMem(17800, 1);
      printTextFromMem(17900, 1);
      printTextFromMem(18000, 1);
      printTextFromMem(18100, 1);
      printTextFromMem(18200, 1);
      printTextFromMem(14600, 1);
      printTextFromMem(14700, 1);
      printTextFromMem(14800, 1);
      printTextFromMem(14900, 1);
      printTextFromMem(15000, 1);
      printTextFromMem(15100, 1);
    } else if (strcmp(args[0], "5") == 0) {
      printTextFromMem(27000, 1);
      printTextFromMem(27100, 1);
      printTextFromMem(27200, 1);
      printTextFromMem(27300, 1);
      printTextFromMem(27400, 1);
      printTextFromMem(27500, 1);
      printTextFromMem(27600, 1);
      printTextFromMem(27700, 1);
      printTextFromMem(27800, 1);
    }
  }
}


void wrmemCommand(char **args, int argCount) {
  if (argCount == 0) {
    setFGColor(CL_RED);
    set256BGColor(0);
    printTextFromMem(15700, 3);
  }
  else if (argCount >= 2) {
    set256Color(NICE_YELLOW);
    set256BGColor(0);
    sys.writeEEP(atoi(args[0]), atoi(args[1]));
    sys.printInUartMenu(F("Done"));
  }
}


void printDataBlock(uint16_t startAddress, bool printAsHex) {
  sys.clearUartMenu();  // Clear the screen
  setFGColor(CL_GREEN);

  // We assume a 16-bit address space, so max address will be 4 hex digits (0xFFFF)
  // Directly use 4 characters to print the address with leading zeros
  int addressWidth = 4;

  // Now print the 16x16 block of data
  for (int row = 0; row < 16; row++) {
    // Print the address for the row in the first column in hex format
    setCursorXY(2, 22 + row + 1);  // Set cursor for each new row
    Serial.print(F(" 0x"));

    // Print the address in 4-digit hexadecimal format with leading zeros
    Serial.print(startAddress + (row * 16), HEX);

    // Print leading zeros to match the address width (4 hex digits)
    if (startAddress + (row * 16) < 0x10) {
      Serial.print(F("000"));
    } else if (startAddress + (row * 16) < 0x100) {
      Serial.print(F("00"));
    } else if (startAddress + (row * 16) < 0x1000) {
      Serial.print(F("0"));
    }

    Serial.print(F(" "));

    // Print the data from the memory address, byte by byte
    for (int col = 0; col < 16; col++) {
      uint16_t addr = startAddress + (row * 16) + col;  // Calculate the address
      uint8_t byte = sys.readEEP(addr);                 // Read the byte from the address

      if (printAsHex) {
        // Print data as hex with two digits (e.g., 01, 0F, etc.)
        Serial.print(F(" "));
        if (byte < 16) {
          Serial.print(F("0"));  // Add leading zero for values less than 0x10
        }
        Serial.print(byte, HEX);
        Serial.print(F(" "));
      } else {
        // Print data as ASCII
        Serial.print(F("  "));
        if (byte >= 32 && byte <= 126) {  // ASCII printable characters
          Serial.print((char)byte);
        } else {
          Serial.print(F("."));
        }
      }
    }
    Serial.println();  // Move to the next line
  }
}



void readmemCommand(char **args, int argCount) {
  if (argCount == 0) {
    setFGColor(CL_RED);
    set256BGColor(0);
    printTextFromMem(15800, 3);
  }
  if (argCount == 2) {
    sys.clearUartMenu();
    setFGColor(CL_MAGENTA);
    set256BGColor(0);
    // Parse the arguments once and store them in variables
    unsigned int startAddress = atoi(args[0]);
    unsigned int format = atoi(args[1]);

    printDataBlock(startAddress, format);
    sys.setUartLine16();
  }
}



void clearCommand(char **args, int argCount) {
  setFGColor(CL_BLUE);
  set256BGColor(0);
  sys.clearUartMenu();
}

void listcmdCommand(char **args, int argCount) {
  sys.clearUartMenu();
  setFGColor(CL_BLUE);
  set256BGColor(0);
  sys.printInUartMenu(F("Available commands are:"));
  parser.printCommands();
}

void encryptCommand(char **args, int argCount) {
  // Check if enough arguments are provided
  if (argCount < 3) {
    setFGColor(CL_RED);
    set256BGColor(0);
    printTextFromMem(15100, 3);
    //sys.printInUartMenu(F("Usage: encrypt <caesar/vigenere> <key> <message>"));
    return;
  }
  // Get the decryption type (caesar or vigenere)
  char *decryptionType = args[0];
  // Get the key argument
  char *keyArg = args[1];
  // Get the message argument
  char *message = args[2];
  uint8_t messageLength = strlen(message);
  uint8_t keyLength = strlen(keyArg);

  if (strcmp(decryptionType, "caesar") == 0) {
    // Convert the key to an integer
    int key = atoi(keyArg);
    if (key == 0 && keyArg[0] != '0') {
      setFGColor(CL_YELLOW);
      set256BGColor(0);
      printTextFromMem(15200, 3);
      //sys.printInUartMenu(F("Invalid key. Key must be numeric."));
      return;
    }
    // Perform Caesar decryption
    BigEncryptionLOL(message, messageLength, key);
    setFGColor(CL_YELLOW);
    set256BGColor(0);
    sys.printInUartMenu(String(message));
  } else if (strcmp(decryptionType, "vigenere") == 0) {
    // Use the key as a string (keyword for Vigenere)
    int keyLength = strlen(keyArg);
    if (keyLength == 0) {
      setFGColor(CL_RED);
      set256BGColor(0);
      printTextFromMem(15300, 3);
      //sys.printInUartMenu(F("Invalid key. Vigenere key cannot be empty."));
      return;
    }
    VigenereEncrypt(message, messageLength, keyArg, keyLength);
    setFGColor(CL_RED);
    set256BGColor(0);
    sys.printInUartMenu(message);
  } else {
    setFGColor(CL_RED);
    set256BGColor(0);
    printTextFromMem(15400, 3);
    //sys.printInUartMenu(F("Invalid encryption type. Use 'caesar' or 'vigenere'."));
    return;
  }
}

void decryptCommand(char **args, int argCount) {
  // Check if enough arguments are provided
  if (argCount < 3) {
    setFGColor(CL_RED);
    set256BGColor(0);
    printTextFromMem(15500, 3);
    //sys.printInUartMenu(F("Usage: decrypt <caesar/vigenere> <key> <message>"));
    return;
  }
  // Get the decryption type (caesar or vigenere)
  char *decryptionType = args[0];
  // Get the key argument
  char *keyArg = args[1];
  // Get the message argument
  char *message = args[2];
  int messageLength = strlen(message);
  int keyLength = strlen(keyArg);

  if (strcmp(decryptionType, "caesar") == 0) {
    // Convert the key to an integer
    int key = atoi(keyArg);
    if (key == 0 && keyArg[0] != '0') {
      setFGColor(CL_YELLOW);
      set256BGColor(0);
      printTextFromMem(15200, 3);
      //sys.printInUartMenu(F("Invalid key. Key must be numeric."));
      return;
    }
    // Perform Caesar decryption
    BigDecryptionLOL(message, messageLength, key);
    setFGColor(CL_YELLOW);
    set256BGColor(0);
    sys.printInUartMenu(String(message));
    set256BGColor(0);
  } else if (strcmp(decryptionType, "vigenere") == 0) {
    // Use the key as a string (keyword for Vigenere)
    int keyLength = strlen(keyArg);
    if (keyLength == 0) {
      setFGColor(CL_RED);
      printTextFromMem(15300, 3);
      //sys.printInUartMenu(F("Invalid key. Vigenere key cannot be empty."));
      return;
    }
    VigenereDecrypt(message, messageLength, keyArg, keyLength);
    setFGColor(CL_RED);
    sys.printInUartMenu(String(message));
  } else {
    setFGColor(CL_RED);
    printTextFromMem(15600, 3);
    return;
  }
}

void setTimeCommand(char **args, int argCount) {
  if (argCount == 0) {
    setFGColor(CL_RED);
    set256BGColor(0);
    printTextFromMem(27900, 3);
  } else {
    sys.date.day = atoi(args[0]);
    sys.date.month = atoi(args[1]);
    sys.date.year = atoi(args[2]);
    setFGColor(CL_BLUE);
    set256BGColor(CL_BLACK);
  }
}

void authCommand(char **args, int argCount) {
  char auth[11];
  char pass[11];
  sys.readCharArrayFromMemory(4005, auth, 11);
  BigDecryptionLOL(auth, 11, caesarKey);
  if (strcmp(auth, args[0]) == 0) {
    sys.readCharArrayFromMemory(4025, pass, 11);
    BigDecryptionLOL(pass, 11, caesarKey);
    if (strcmp(pass, args[1]) == 0) {
      sys.passedMiniDebug = true;
      sys.readCharArrayFromMemory(3050, globalFlagChar, 17);
      VigenereDecrypt(globalFlagChar, 17, vigKey, 6);
      setFGColor(CL_CYAN);
      setBGColor(CL_BLACK);
      sys.printInUartMenu(String(globalFlagChar));
    }
  }
}















//////////////////other 


#include "CommandParser.h"
#include <string.h>

// Define your callback functions

void infoCommand(char **args, int argCount);
void regsCommand(char **args, int argCount);
void wrmemCommand(char **args, int argCount);
void clearCommand(char **args, int argCount);
void listcmdCommand(char **args, int argCount);
void helpCommand(char **args, int argCount);
void decryptCommand(char **args, int argCount);
void encryptCommand(char **args, int argCount);
void readmemCommand(char **args, int argCount);
void setTimeCommand(char **args, int argCount);
void authCommand(char **args, int argCount);

// Initialize the callback table
CommandCallback CommandParser::callbackTable[] = {
  infoCommand,
  regsCommand,
  wrmemCommand,
  clearCommand,
  listcmdCommand,
  helpCommand,
  decryptCommand,
  encryptCommand,
  readmemCommand,
  setTimeCommand,
  authCommand,
};

CommandParser::CommandParser(System &systemRef)
  : system(systemRef), commandCount(0) {}

void CommandParser::addCommand(uint16_t eepromAddress, uint8_t callbackIndex) {
  uint16_t metadataAddr;
  //system.printInUartMenu(CL_RED, "ADDING COMMAND AT INDEX:" + String(commandCount));
  if (commandCount == 0) {
    metadataAddr = 0;
  } else metadataAddr = commandCount * 3;
  //system.printInUartMenu(CL_RED, "METADATA ADDRESS:" + String(metadataAddr));

  system.writeEEP(metadataAddr, (eepromAddress >> 8) & 0xFF);  // MSB of eepromAddress
  system.writeEEP(metadataAddr + 1, eepromAddress & 0xFF);     // LSB of eepromAddress
  system.writeEEP(metadataAddr + 2, callbackIndex);
  commandCount++;
}

void CommandParser::parse(char *input) {
  int tokenCount = tokenize(input);
  if (tokenCount == 0) return;

  char commandBuffer[32];
  uint16_t eepromAddress;
  uint8_t callbackIndex;

  for (int i = 0; i < commandCount; i++) {
    uint16_t metadataAddr = i * 3;
    eepromAddress = (system.readEEP(metadataAddr) << 8) | system.readEEP(metadataAddr + 1);
    callbackIndex = system.readEEP(metadataAddr + 2);

    if (readCommandFromMemory(eepromAddress, commandBuffer, sizeof(commandBuffer))) {
      if (strcmp(commandBuffer, tokens[0]) == 0) {
        executeCallback(callbackIndex, tokens + 1, tokenCount - 1);
        return;
      }
    }
  }

  //Serial.println("Unknown command. Type 'help' to see available commands.");
}

int CommandParser::tokenize(char *input) {
  int index = 0;
  char *token = strtok(input, " ");
  while (token != NULL && index < MAX_TOKENS) {
    tokens[index++] = token;
    token = strtok(NULL, " ");
  }
  return index;
}

bool CommandParser::readCommandFromMemory(uint16_t address, char *buffer, size_t bufferSize) {
  system.readCharArrayFromMemory(address, buffer, bufferSize);
  return (strlen(buffer) > 0);
}

void CommandParser::executeCallback(uint8_t callbackIndex, char **args, int argCount) {
  CommandCallback callback = getCallback(callbackIndex);
  if (callback) {
    callback(args, argCount);
  }
}

CommandCallback CommandParser::getCallback(uint8_t callbackIndex) {
  if (callbackIndex < sizeof(callbackTable) / sizeof(callbackTable[0])) {
    return callbackTable[callbackIndex];
  }
  return nullptr;
}

void CommandParser::printCommands() {
  char commandBuffer[32];
  uint16_t eepromAddress;
  uint8_t callbackIndex;

  //Serial.println("Available commands:");
  for (int i = 0; i < commandCount; i++) {
    uint16_t metadataAddr = i * 3;
    eepromAddress = (system.readEEP(metadataAddr) << 8) | system.readEEP(metadataAddr + 1);
    callbackIndex = system.readEEP(metadataAddr + 2);

    if (readCommandFromMemory(eepromAddress, commandBuffer, sizeof(commandBuffer))) {
      //Serial.print("- ");
      if (strcmp(commandBuffer, "auth") != 0)
        system.printInUartMenu("\t" + String(commandBuffer));
    }
  }
}










#include <Arduino.h>
#include "System.h"
#include <Wire.h>
#include <fancyTerminal.h>
#include <stdint.h>

uint8_t System::lineCountUart = 1;
//uint8_t System::lineCountDeb = 1;
uint8_t System::lineCountStory = 1;

System::System() {
  Wire.begin();
  initTerminalInput();
  setAuthLevel(0);
  temp = 20;
  timeAlive = 0;
  for (int i = 0; i < 6; i++)
    adc.vals[i] = 0;
  voltage = 5;
  date.day = 28;
  date.month = 11;
  date.year = 2090;
}

void System::updateTimeAlive() {
  timeAlive = millis() / 1000;
}

void System::setUartLine16(){
  lineCountUart = 18;
}

unsigned long System::getTimeAlive() {
  updateTimeAlive();
  return timeAlive;
}

void System::setScreenSize(uint8_t x, uint8_t y) {
  screenSizeX = x;
  screenSizeY = y;
}

uint8_t System::getAuthLevel() {
  return authLevel;
}

void System::setAuthLevel(uint8_t authLvl) {
  authLevel = authLvl;
}


void System::setCursorInMenuXY(uint8_t menu, uint8_t x, uint8_t y) {
  screenSizeX = 120;
  screenSizeY = 40;
  if (menu == 0) {
    setCursorXY(x + 2, y + 2);
  }  //TOP LEFT

  if (menu == 1) {
    setCursorXY(x + screenSizeX / 2 + 2, y + 2);
  }  //TOP RIGHT

  if (menu == 2) {
    setCursorXY(x + screenSizeX / 2 + 2, y + screenSizeY / 2 + 2);
  }  //BOTTOM RIGHT

  if (menu == 3) {
    setCursorXY(x + 2, y + screenSizeY / 2 + 2);
  }  //BOTTOM LEFT


  terminalFlush();
}

void System::printInMenuXY(uint8_t menu, uint8_t x, uint8_t y, String text) {
  screenSizeX = 120;
  screenSizeY = 40;
  if (menu == 0) {
    setCursorXY(x + 2, y + 2);
    terminalOutput(text);
  }  //TOP LEFT

  if (menu == 1) {
    setCursorXY(x + screenSizeX / 2 + 2, y + 2);
    terminalOutput(text);
  }  //TOP RIGHT

  if (menu == 2) {
    setCursorXY(x + screenSizeX / 2 + 2, y + screenSizeY / 2 + 1);
    terminalOutput(text);
  }  //BOTTOM RIGHT

  if (menu == 3) {
    setCursorXY(x + 2, y + screenSizeY / 2 + 1);
    terminalOutput(text);
  }  //BOTTOM LEFT


  terminalFlush();
}

void System::readVcc() {
  uint8_t originalADMUX = ADMUX;
  uint8_t originalADCSRA = ADCSRA;
  ADMUX = (1 << REFS0) | (1 << MUX3) | (1 << MUX2) | (1 << MUX1);
  delay(5);
  ADCSRA |= (1 << ADSC);
  while (ADCSRA & (1 << ADSC))
    ;
  int adcValue = ADC;
  long vcc = (1100L * 1024) / adcValue;

  ADCSRA = originalADCSRA;
  ADMUX = originalADMUX;
  voltage = vcc;
}


void System::getTemp(void) {
  uint8_t originalADMUX = ADMUX;
  uint8_t originalADCSRA = ADCSRA;
  unsigned int wADC;
  double t;
  ADMUX = (_BV(REFS1) | _BV(REFS0) | _BV(MUX3));

  delay(5);
  ADCSRA |= _BV(ADSC);
  while (bit_is_set(ADCSRA, ADSC))
    ;
  wADC = ADCW;
  // The offset of 324.31 could be wrong. It is just an indication.
  t = (wADC - 324.31) / 1.22;

  ADCSRA = originalADCSRA;
  ADMUX = originalADMUX;
  temp = t - 10;
  // The returned temperature is in degrees Celcius.
}

void System::writeCharArrayToMemory(unsigned int addr, const char *str, size_t size) {
  Wire.beginTransmission(EEPROM_ADDR);
  Wire.write((byte)(addr >> 8));    // MSB of address
  Wire.write((byte)(addr & 0xFF));  // LSB of address

  for (size_t i = 0; i < size - 1 && str[i] != '\0'; ++i) {
    Wire.write(str[i]);
  }

  // Write null terminator explicitly
  Wire.write('\0');

  Wire.endTransmission();
  delay(5);  // delay for write cycle completion
}

void System::readCharArrayFromMemory(unsigned int addr, char *buffer, size_t size) {
  Wire.beginTransmission(EEPROM_ADDR);
  Wire.write((byte)(addr >> 8));    // MSB of address
  Wire.write((byte)(addr & 0xFF));  // LSB of address
  Wire.endTransmission();

  Wire.requestFrom(EEPROM_ADDR, size);
  size_t index = 0;
  while (Wire.available() && index < size - 1) {
    buffer[index++] = Wire.read();
  }
  buffer[index] = '\0';  // Null-terminate the char array
}

byte System::readEEP(unsigned int addr) {
  Wire.beginTransmission(EEPROM_ADDR);
  Wire.write((byte)(addr >> 8));    // MSB of address
  Wire.write((byte)(addr & 0xFF));  // LSB of address
  Wire.endTransmission();
  Wire.requestFrom(EEPROM_ADDR, 1);  // Request 1 byte
  if (Wire.available()) {
    return Wire.read();  // Return the read data
  } else {
    return 0xFF;  // Return an error value if data not available
  }
}

String System::readMemStr(unsigned int addr, size_t bufferSize) {
  Wire.beginTransmission(EEPROM_ADDR);
  Wire.write((byte)(addr >> 8));    // MSB of address
  Wire.write((byte)(addr & 0xFF));  // LSB of address
  Wire.endTransmission();

  Wire.requestFrom(EEPROM_ADDR, bufferSize);  // Request the string data

  String result = "";
  result.reserve(32);
  while (Wire.available()) {
    result += (char)Wire.read();  // Append each character to the result string
  }
  return result;
}

void System::writeStringToMemory(unsigned int addr, const char *str) {
  Wire.beginTransmission(EEPROM_ADDR);
  Wire.write((byte)(addr >> 8));    // MSB of address
  Wire.write((byte)(addr & 0xFF));  // LSB of address

  // Write each character of the string
  for (int i = 0; str[i] != '\0'; ++i) {
    Wire.write(str[i]);
  }

  Wire.endTransmission();
  delay(5);  // delay for write cycle completion
}

void System::writeEEP(unsigned int addr, byte data) {
  Wire.beginTransmission(EEPROM_ADDR);
  Wire.write((byte)(addr >> 8));    // MSB of address
  Wire.write((byte)(addr & 0xFF));  // LSB of address
  Wire.write(data);                 // Data to be written
  Wire.endTransmission();
  delay(5);  // delay for write cycle completion
}

void System::printInUartMenu(String text) {
  System::printInMenuXY(3, 0, lineCountUart, text);
  lineCountUart++;
  if (lineCountUart > 18) {
    lineCountUart = 1;
    clearUartMenu();
    resetTerminalColors();
  }
}

// void System::printInDebugMenu(String text) {
//   System::printInMenuXY(2, 0, lineCountDeb, text);
//   lineCountDeb++;
//   if (lineCountDeb > 18) {
//     lineCountDeb = 1;
//     clearDebugMenu();
//     resetTerminalColors();
//   }
// }

void System::printInStoryMenu(String text) {
  System::printInMenuXY(1, 0, lineCountStory, text);
  lineCountStory++;
  if (lineCountStory > 18) {
    lineCountStory = 1;
    clearStoryMenu();
    resetTerminalColors();
  }
}

// void System::clearDebugMenu() {
//   lineCountDeb = 1;
//   setBGColor(CL_BLACK);
//   setFGColor(CL_BLACK);
//   fillRect(screenSizeX / 2 + 1, screenSizeY/2-1, screenSizeX / 2 - 1, screenSizeY - 1, ' ');
// }

void System::clearUartMenu() {
  lineCountUart = 1;
  setBGColor(CL_BLACK);
  setFGColor(CL_BLACK);
  fillRect(2, screenSizeY / 2 + 2, screenSizeX  - 22 , screenSizeY - 1, ' ');
}

void System::clearStoryMenu() {
  //TOP RIGHT CORNER
  lineCountStory = 1;
  setBGColor(0);
  setFGColor(0);
  fillRect(screenSizeX / 2 + 1, 3, screenSizeX -1, screenSizeY/2  - 1, ' ');
}

void System::exitTerminal() {
  clearTerminalScreen();
  setCursorXY(1, screenSizeY + 1);
  deInitTerminalInput();
  resetTerminalColors();
  setCursorVisible();
}












/////////////////////////////////////




// Define the message as a `const char` array in PROGMEM (Flash memory)
//const char message[] PROGMEM = "Provided by Electron. Built by WhiteMatterElectronics. Powered by Orange";
#define MESSAGE_LENGTH 232

// Define a buffer for displaying a portion of the message
#define DISPLAY_LENGTH 57
char displayBuffer[DISPLAY_LENGTH + 1];

void scrollText() {
  // Set foreground and background colors
  setFGColor(CL_WHITE);
  set256BGColor(NICE_BLUE);

  // Fill the display buffer with the scrolling message
  for (uint8_t i = 0; i < DISPLAY_LENGTH; i++) {
    // Calculate the global message index with wrapping
    int16_t msgIndex = (scrollIndex + i) % MESSAGE_LENGTH;

    // Determine the address to read, skipping null terminators
    uint16_t currentAddr = 19800 + msgIndex;
    char c = (char)sys.readEEP(currentAddr);

    // Skip null terminators and move to the next character
    while (c == '\0') {
      msgIndex++;
      currentAddr = 19800 + (msgIndex % MESSAGE_LENGTH);  // Wrap around
      c = (char)sys.readEEP(currentAddr);
    }

    displayBuffer[i] = c;  // Add the valid character to the buffer
  }
  displayBuffer[DISPLAY_LENGTH] = '\0';  // Null-terminate the buffer

  // Set cursor position and print the text
  setCursorXY(32, 0);  // Adjust x and y as needed
  terminalOutput(displayBuffer);

  // Reset colors to default (optional)
  setFGColor(CL_DEFAULT);
  setBGColor(CL_DEFAULT);

  // Increment the scroll index with wrapping
  scrollIndex = (scrollIndex + 1) % MESSAGE_LENGTH;
}

int *pwm;
unsigned long lastEnergyCheck;
bool passedPwm = false;
unsigned long lastAdcTime;

bool lastGuardianStatus = true;

uint8_t lastDay;
uint8_t lastMonth;
uint8_t lastYear;
char toPrint[30];

bool finalOpenDoor = false;
bool passedFinalDoor = false;
bool passedGuardian = false;

void memoryMonitor() {
}  // Preset date for comparison (e.g., comparing with 2092-01-01)
#define PRESET_YEAR 2092
#define PRESET_MONTH 1
#define PRESET_DAY 1

bool isDateGreaterThanPreset() {
  // Compare year first
  if (sys.date.year > PRESET_YEAR) {
    return true;  // The date is greater
  }
  // If the years are the same, compare the month
  else if (sys.date.year == PRESET_YEAR) {
    if (sys.date.month > PRESET_MONTH) {
      return true;  // The date is greater
    }
    // If the months are the same, compare the day
    else if (sys.date.month == PRESET_MONTH) {
      if (sys.date.day > PRESET_DAY) {
        return true;  // The date is greater
      }
    }
  }

  // If all conditions fail, the date is not greater
  return false;
}

void endGame() {
  bool endGame = false;
  if (sys.enterServiceMode == true) {
    printTextFromMem(30100, 3);
    sys.readCharArrayFromMemory(3500, globalFlagChar, 16);
    VigenereDecrypt(globalFlagChar, 16, vigKey, 6);
    setBGColor(0);
    setFGColor(NICE_YELLOW);
    sys.printInUartMenu(String(globalFlagChar));
    ringBell();
    endGame = true;
    passEnd = true;
  }
  if (sys.bypasGuardian && passedGuardian == false) {
    ringBell();
    sys.clearUartMenu();
    memset(globalFlagChar, 0, 20);
    sys.readCharArrayFromMemory(2700, globalFlagChar, 13);
    VigenereDecrypt(globalFlagChar, 13, vigKey, 6);
    set256Color(NICE_BLUE);
    set256BGColor(0);
    printTextFromMem(28800, 3);
    set256Color(NICE_YELLOW);
    set256BGColor(0);
    sys.printInUartMenu(String(globalFlagChar));
    ringBell();
    printTextFromMem(30700, 3);
    printTextFromMem(30800, 3);
    printTextFromMem(30900, 3);
    endGame = true;
    passedGuardian = true;
    passEnd = true;
  }
  if (endGame && passEnd == false) {
    sys.clearStoryMenu();
    set256Color(NICE_YELLOW);
    printTextFromMem(30200, 1);
    printTextFromMem(30300, 1);
    printTextFromMem(30400, 1);
    printTextFromMem(30500, 1);
    passEnd = true;
  }
}

void mainApp(void) {
  sys.updateTimeAlive();
  setBGColor(CL_BLUE);
  setFGColor(CL_WHITE);
  setCursorXY(0, 20);
  sys.bypasGuardian = sys.readEEP(25019);
  sys.enableDebugPrints = sys.readEEP(25059);
  sys.rfidTryNumber = sys.readEEP(25079);
  sys.morseActive = sys.readEEP(25099);
  sys.bypassRFID = sys.readEEP(25119);

  if (lastDay != sys.date.day || lastMonth != sys.date.month || lastYear != sys.date.year) {
    setCursorXY(50, 2);
    setBGColor(CL_BLUE);
    setFGColor(CL_WHITE);
    Serial.print(sys.date.day);
    Serial.print("/");
    Serial.print(sys.date.month);
    Serial.print("/");
    Serial.print(sys.date.year);
    if (isDateGreaterThanPreset()) {
      sys.enterServiceMode = true;
    }
    lastDay = sys.date.day;
    lastMonth = sys.date.month;
    lastYear = sys.date.year;
  }
  //PWM FLAG
  if ((sys.timeAlive - lastEnergyCheck > 120) && passedPwm == false) {
    set256Color(110);
    set256BGColor(0);
    printTextFromMem(18500, 3);
    set256Color(110);
    set256BGColor(0);
    printTextFromMem(18600, 3);
    lastEnergyCheck = sys.timeAlive;
  }

  if (sys.bypasGuardian == false && passedGuardian == false) {
    char *bufferMan = checkForCompleteMessage();
    if (bufferMan != 0) {

      setBGColor(CL_BLUE);
      setFGColor(CL_WHITE);

      // Print the message only after validating it's complete (ends with \r\n)
      if (strlen(bufferMan) == 6) {
        // We know that the message ends with \r\n, so we check for that
        if (bufferMan[strlen(bufferMan) - 2] == '\r' && bufferMan[strlen(bufferMan) - 1] == '\n') {

          // Check if the message is a 4-bit binary message (exactly 4 bits of '0'/'1')
          if (strlen(bufferMan) == 6 && bufferMan[0] != '\r' && bufferMan[1] != '\n') {
            // Check the first 4 characters
            if (bufferMan[0] == '0' || bufferMan[0] == '1' && bufferMan[1] == '0' || bufferMan[1] == '1' && bufferMan[2] == '0' || bufferMan[2] == '1' && bufferMan[3] == '0' || bufferMan[3] == '1') {

              // Handle 4-bit binary message
              setBGColor(CL_WHITE);
              set256Color(25);
              setCursorXY(89, 0);
              sys.readCharArrayFromMemory(28900, toPrint, 25);
              Serial.print(toPrint);
              setCursorXY(60, 20);

              for (uint8_t i = 0; i < 4; i++) {
                if (bufferMan[i] == '0') {
                  set256BGColor(18);
                  set256Color(18);
                  setCursorXY(113 + 2 * i, 0);
                  Serial.print(" ");
                } else if (bufferMan[i] == '1') {
                  set256BGColor(38);
                  set256Color(38);
                  setCursorXY(113 + 2 * i, 0);
                  Serial.print(" ");
                }
              }
            }
          } else {
            // Empty else if, no changes needed here, keep this structure intact
          }

          // Check if the 4-bit message is specifically "1101" and sys.numberOfTries > 10

          if (bufferMan[0] != '0' && bufferMan[1] != '0' && bufferMan[2] != '0' && bufferMan[3] != '0') {
            sys.systemLock = true;  // Lock the system if conditions match
            sys.writeEEP(25039, 1);
          }


          // Reset buffer after processing
          memset(bufferMan, 0, strlen(bufferMan));
        }
      }
    }
  }


  if (lastTimeAlive != sys.timeAlive) {
    drawRegs();
    setFGColor(CL_WHITE);
    setBGColor(CL_WHITE);
    setCursorXY(14, 2);
    Serial.print(F("       "));
    set256Color(25);
    setCursorXY(2, 2);
    Serial.print(F("Time alive:"));
    Serial.print(sys.timeAlive);
  }


  if (digitalRead(OK) == LOW && passedPwm == false) {
    pwm = measureFrequencyAndDutyCycle(OK);
    if ((pwm[0] > 975) && (pwm[0] < 1025) && (pwm[1] > 22) && (pwm[2] < 28)) {
      ringBell();
      set256Color(NICE_YELLOW);
      set256BGColor(0);
      memset(globalFlagChar, 0, 20);
      sys.readCharArrayFromMemory(2900, globalFlagChar, 16);
      VigenereDecrypt(globalFlagChar, 16, vigKey, 6);
      sys.printInUartMenu("> " + String(globalFlagChar));
      ringBell();
      passedPwm = true;
    } else {
      set256Color(110);
      set256BGColor(0);
      //sys.printInUartMenu(String(pwm[0]) + " " + String(pwm[1]));
    }
  }


  if (sys.getAuthLevel() != lastAuthority) {
    //sys.printInMenuXY(1, 1, 16, String(tagDataChar));
    set256BGColor(0);
    setFGColor(CL_WHITE);
    memset(toPrint, 0, 20);
    //sys.readMemStr(unsigned int addr, size_t bufferSize)
    sys.printInMenuXY(0, 1, 3, F("Authority level status: "));
    set256BGColor(NICE_YELLOW);
    setFGColor(CL_BLACK);
    Serial.print("\t");
    Serial.print(sys.authLevel);

    lastAuthority = sys.authLevel;

    setFGColor(CL_BLUE);
    set256BGColor(0);
    sys.printInMenuXY(3, 0, 20, ">");
    sys.printInUartMenu("> Waiting NFC");
  }

  if (sys.authLevel == 1 || sys.authLevel == 2 || sys.authLevel == 3) {
    if (lastTimeAlive != sys.timeAlive) {
      if (sys.timeAlive - lastAdcTime > 2) {
        readAllADC();
        sys.readVcc();
        sys.getTemp();
        lastAdcTime = sys.timeAlive;
      }
      resetTerminalColors();
      lastTimeAlive = sys.timeAlive;
      if (droppedCollectible1 == false) {
        if (sys.authLevel > 0) {
          if (((sys.timeAlive - timeFirstCollectible) > 150)) {
            setFGColor(CL_MAGENTA);
            set256BGColor(0);
            sys.printInStoryMenu("Collectible 1/3 droppped COL {now you can}");
            droppedCollectible1 = true;
          }
        }
      }
      lastTimeAlive = sys.timeAlive;
    }
    if (sys.temp > 37) {
    }
    //System internal temperature
    if (sys.temp != lastTemp) {
      set256BGColor(0);
      setFGColor(CL_WHITE);
      setCursorXY(3, 12);
      Serial.print("Internal Temp  :   ");
      setFGColor(CL_WHITE);
      Serial.print("\t" + String(sys.temp) + "*C");

      if (sys.temp > 37) {
        setBGColor(CL_RED);
        setFGColor(CL_WHITE);
        sys.printInUartMenu("\tCRITICAL TEMP REACHED, BYPASS SEC\t\t");
        ringBell();
        setBGColor(CL_RED);
        memset(globalFlagChar, 0, 20);
        sys.readCharArrayFromMemory(2200, globalFlagChar, 16);
        VigenereDecrypt(globalFlagChar, 16, vigKey, 6);
        set256Color(NICE_YELLOW);
        set256BGColor(0);
        sys.printInUartMenu("TEMP ANOMALY: " + String(globalFlagChar));
      } else {
        setBGColor(CL_GREEN);
      }
      set256BGColor(0);
      set256Color(NICE_YELLOW);
      sys.printInMenuXY(0, 30, 10, "\t\t\t [-70, 40]");
      lastTemp = sys.temp;
    }
    //System Voltage in millivolts
    if (sys.voltage != lastVoltage) {
      setFGColor(CL_WHITE);
      set256BGColor(0);
      sys.printInMenuXY(0, 1, 11, "System voltage: ");
      if (sys.voltage > 5000 || sys.voltage < 4800) {
        setBGColor(CL_RED);
      } else {
        setBGColor(CL_GREEN);
      }
      terminalOutput("\t" + String(sys.voltage) + " mV");
      set256BGColor(0);
      set256Color(NICE_YELLOW);
      Serial.print("\t\t\t [2.8,5.5]");
      resetTerminalColors();
      lastVoltage = sys.voltage;
    }
  }
  if (sys.authLevel == 2) {
    resetTerminalColors();
  }
}

void MainTask(void) {
  if (sys.rfidTryNumber > 15) {
    sys.systemLock = true;
  } else {
    mainApp();
  }
  endGame();
}

void trimInput(char *input) {
  size_t length = strlen(input);
  // Remove trailing newline and carriage return characters
  while (length > 0 && (input[length - 1] == '\n' || input[length - 1] == '\r')) {
    input[length - 1] = '\0';
    length--;
  }
}

void InputTask(void) {

  if (millis() - scrollTime1 > 100) {
    scrollText();
    scrollTime1 = millis();
  }
  setBGColor(CL_BLUE);
  setFGColor(CL_WHITE);
  setCursorXY(0, 20);
  set256BGColor(0);
  set256Color(0);
  // Read incoming characters and store them in the circular buffer
  while (Serial.available() > 0) {
    char c = Serial.read();

    // Add the character to the circular buffer if it's not full
    uint8_t nextHead = (head + 1) % BUFFER_SIZE;
    if (nextHead != tail) {
      inputBuffer[head] = c;
      head = nextHead;
    }
  }

  // Process characters from the circular buffer
  while (tail != head) {
    char c = inputBuffer[tail];
    tail = (tail + 1) % BUFFER_SIZE;



    set256BGColor(0);
    setFGColor(CL_WHITE);
    // Handle backspace
    if (c == '\b' || c == 127) {
      if (bufInd > 0) {
        bufInd--;
        globalInputCommand[bufInd] = '\0';
        sys.setCursorInMenuXY(3, inputX + bufInd, inputY + 1);
        Serial.print(" ");
        sys.setCursorInMenuXY(3, inputX + bufInd, inputY + 1);
      }
    }
    // Handle Enter (end of input)
    else if (c == '\n' || c == '\r') {

      globalInputCommand[bufInd] = '\0';
      inputReady = true;
      trimInput(globalInputCommand);
      memset(globalFlagChar, 0, 16);
      sys.readCharArrayFromMemory(2150, globalFlagChar, 16);
      VigenereDecrypt(globalFlagChar, 16, vigKey, 6);
      //sys.printInMenuXY(1, 1, 16, String(globalFlagChar));
      //Check for morseflag
      if (strcmp(globalInputCommand, globalFlagChar) == 0) {
        sys.clearUartMenu();
        set256Color(NICE_BLUE);
        setBGColor(0);
        printTextFromMem(28300, 3);
        printTextFromMem(28400, 3);
        printTextFromMem(28500, 3);
      } else {
        parser.parse(globalInputCommand);
      }

      // Clear input area
      memset(globalInputCommand, 0, BUFFER_SIZE);
      for (int i = 0; i < bufInd + 5; i++) {
        set256BGColor(0);
        set256Color(0);
        sys.setCursorInMenuXY(3, inputX + i, inputY + 1);
        terminalOutput(" ");
      }
      bufInd = 0;
      sys.setCursorInMenuXY(3, inputX, inputY + 1);
      yield();
    }
    // Handle printable ASCII characters
    else if (c >= 0x20 && c <= 0x7E) {
      if (bufInd < BUFFER_SIZE - 1) {
        globalInputCommand[bufInd++] = c;
        globalInputCommand[bufInd] = '\0';

        // Update the display
        sys.setCursorInMenuXY(3, inputX, inputY + 1);
        Serial.print(globalInputCommand);
      }
    }
    yield();
  }

  // Check if there is any serial input available
}


void RFIDTask() {


  setBGColor(CL_BLUE);
  setFGColor(CL_WHITE);
  setCursorXY(0, 20);
  isTagAuthorized();  //FIRST HALF
  set256BGColor(NICE_YELLOW);
  setFGColor(CL_BLACK);
  sys.printInMenuXY(0, 25, 2, "\tWAITING");
  yield();
  if (firstHalf != lastAuth) {
    setCursorXY(2, 13);
    setFGColor(CL_WHITE);
    set256BGColor(0);
    sys.printInMenuXY(0, 1, 2, F("RFID is active. Status: "));
    if (firstHalf) {
      if (sys.getAuthLevel() == 0) {
        //Base Auth Level - //Allows Reading Status And Monitoring a few things related to the challenge
        sys.setAuthLevel(1);
        sys.updateTimeAlive();
        timeFirstCollectible = sys.timeAlive;
        sys.clearStoryMenu();
        memset(globalFlagChar, 0, 20);
        sys.readCharArrayFromMemory(FLAG_HAF1_ADDR, globalFlagChar, 16);
        VigenereDecrypt(globalFlagChar, 16, vigKey, 6);
        set256Color(81);

        printTextFromMem(14000, 1);  //> You’re now in the outer layer—a seemingly basic,
        printTextFromMem(14100, 1);  //operational part of the system. It feels like the
        printTextFromMem(14200, 1);  //outer edges of a vast labyrinth.

        sys.clearUartMenu();
        set256Color(81);
        printTextFromMem(7800, 3);  //> Welcome to the Outer Layer of the Vault.
        printTextFromMem(7900, 3);  //> System Overview:
        printTextFromMem(8000, 3);  // - Sector 1: Access Granted
        printTextFromMem(8100, 3);  // - Sector 2: Restricted Access
        printTextFromMem(8200, 3);  // - Core Vault: Unreachable

        set256Color(NICE_YELLOW);
        set256BGColor(0);
        sys.printInUartMenu("> " + String(globalFlagChar));
        ringBell();
      }
      setBGColor(CL_BLUE);
      setFGColor(CL_WHITE);
      sys.printInMenuXY(0, 25, 2, F("\tREADING"));

      char uidBuffer[13];  // Buffer for "XX:XX:XX:XX\0"
      // Format the UID directly into the buffer
      for (uint8_t i = 0; i < 4; i++) {
        sprintf(uidBuffer + (i * 3), "%02X", mfrc522.uid.uidByte[i]);
        if (i < 3) {
          uidBuffer[(i * 3) + 2] = ':';  // Add colon separator
        } else {
          uidBuffer[(i * 3) + 2] = '\0';  // Null-terminate the string
        }
      }
      setBGColor(CL_BLUE);
      setFGColor(CL_WHITE);
      setCursorXY(40, 4);
      Serial.print(F("TAG UID: "));
      setBGColor(CL_WHITE);
      setFGColor(CL_BLUE);
      setCursorXY(49, 4);
      Serial.print(uidBuffer);
    } else {

      // UART FLAG AFTER PASSING INTRO
      //
      if (passIntro == false) {
        set256BGColor(0);
        set256Color(0);
        sys.setCursorInMenuXY(0, 0, 16);
        printTextFromMem(18400, 10);
        set256BGColor(0);
        set256Color(NICE_BLUE);

        printTextFromMem(28100, 3);
        printTextFromMem(9600, 1);  //[Challenge Initiated: Sector 1 Access]
        printTextFromMem(7000, 1);
        printTextFromMem(7100, 1);
        printTextFromMem(7200, 3);
        printTextFromMem(7300, 1);
        printTextFromMem(7400, 1);
        printTextFromMem(7500, 1);
        printTextFromMem(18300, 3);

        memset(globalFlagChar, 0, 20);
        sys.readCharArrayFromMemory(FLAG_UART_ADDR, globalFlagChar, 13);
        VigenereDecrypt(globalFlagChar, 13, vigKey, 6);
        set256Color(NICE_YELLOW);
        set256BGColor(0);
        sys.printInUartMenu("> " + String(globalFlagChar));


        passIntro = true;
      }
    }
    lastAuth = firstHalf;
  }
  if (secndHalf) {
    if (sys.getAuthLevel() == 1) {
      //Able to do more things, interact with the board etc.
      sys.setAuthLevel(2);
      memset(globalFlagChar, 0, 20);
      sys.readCharArrayFromMemory(FLAG_HAF2_ADDR, globalFlagChar, 16);
      VigenereDecrypt(globalFlagChar, 16, vigKey, 6);
      printTextFromMem(13100, 1);

      set256Color(NICE_YELLOW);
      set256BGColor(0);
      sys.printInUartMenu("> " + String(globalFlagChar));
    }
  }
  resetTerminalColors();
}

// void MorseTask() {
//   if (!morse.continueSending()) {
//     runner.deleteTask(morseTask);
//   }
// }






