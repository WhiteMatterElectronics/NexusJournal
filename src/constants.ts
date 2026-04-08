import { Tutorial } from './types';

export const INITIAL_TUTORIALS: Tutorial[] = [
  {
    id: 'i2c-memories',
    title: 'I2C Memories',
    category: 'protocol',
    difficulty: 'intermediate',
    description: 'Learn how to interface with EEPROMs and other I2C memory devices.',
    content: `
# I2C Memories (EEPROM)

I2C (Inter-Integrated Circuit) is a synchronous, multi-master, multi-slave, packet switched, single-ended, serial communication bus.

## Key Concepts
- **SDA (Serial Data)**: The line for master and slave to send and receive data.
- **SCL (Serial Clock)**: The line that carries the clock signal.

## Interfacing with 24C02 EEPROM
The 24C02 is a common 2Kbit I2C EEPROM.
1. **Address**: Usually 0x50.
2. **Write**: Send device address + write bit, then memory address, then data.
3. **Read**: Send device address + write bit, then memory address, then restart, then device address + read bit.
    `
  },
  {
    id: 'uart-basics',
    title: 'UART Communication',
    category: 'protocol',
    difficulty: 'beginner',
    description: 'The bread and butter of hardware debugging and communication.',
    content: `
# UART Basics

Universal Asynchronous Receiver-Transmitter (UART) is a physical circuit in a microcontroller or a stand-alone IC used for serial communication.

## Wiring
- **TX (Transmit)** -> **RX (Receive)**
- **RX (Receive)** -> **TX (Transmit)**
- **GND** -> **GND**

## Parameters
- **Baud Rate**: 9600, 115200 (most common).
- **Data Bits**: Usually 8.
- **Parity**: Usually None.
- **Stop Bits**: Usually 1.
    `
  },
  {
    id: 'spi-protocol',
    title: 'SPI Protocol',
    category: 'protocol',
    difficulty: 'intermediate',
    description: 'High-speed synchronous serial communication.',
    content: `
# SPI (Serial Peripheral Interface)

SPI is a synchronous serial communication interface specification used for short-distance communication, primarily in embedded systems.

## Lines
- **SCLK**: Serial Clock (output from master).
- **MOSI**: Master Out Slave In (data output from master).
- **MISO**: Master In Slave Out (data output from slave).
- **SS/CS**: Slave Select (active low, used to select the slave).
    `
  },
  {
    id: 'mfrc522-rfid',
    title: 'RFID with MFRC522',
    category: 'component',
    difficulty: 'intermediate',
    description: 'How to read and write RFID tags using the popular MFRC522 module.',
    content: `
# MFRC522 RFID Module

The MFRC522 is a highly integrated reader/writer IC for contactless communication at 13.56 MHz.

## Features
- Support for ISO/IEC 14443 A/MIFARE.
- Communication via SPI, I2C, or UART.
- Typical operating distance: 50 mm.

## Common Use Cases
- Access control systems.
- Inventory tracking.
- Interactive hackathon badges.
    `
  },
  {
    id: 'atmega328p-theory',
    title: 'ATmega328P Architecture',
    category: 'theory',
    difficulty: 'advanced',
    description: 'Deep dive into the heart of the Arduino Uno.',
    content: `
# ATmega328P Theory

The ATmega328P is a high-performance Microchip 8-bit AVR RISC-based microcontroller.

## Architecture
- **Flash Memory**: 32 KB.
- **SRAM**: 2 KB.
- **EEPROM**: 1 KB.
- **Clock Speed**: Up to 20 MHz.

## Pinout Highlights
- **Digital I/O**: 14 pins (6 provide PWM).
- **Analog Inputs**: 6 pins.
- **Interrupts**: 2 external interrupts.
    `
  }
];
