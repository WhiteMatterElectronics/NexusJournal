# Electron Assistant (formerly NexusJournal)

The Electron Assistant is a comprehensive hardware and software platform designed to streamline your embedded development and hardware hacking workflow. At its core, it consists of a custom PCB powered by the ESP32-C3 microcontroller, seamlessly integrated with a powerful web-based interactive console.

## ⚠️ Licensing & Usage Restrictions

**This software is provided for PERSONAL, NON-COMMERCIAL USE ONLY.**

You are free to use, modify, and explore this platform for your own personal research and learning. 

**STRICT PROHIBITIONS:**
* **Commercialization:** You may **NOT** sell, monetize, or generate any form of profit from this software.
* **Events & Promotion:** You may **NOT** use this software to promote, run, or feature in any events (including CTFs, institutional workshops, exhibitions, or corporate training) without explicit prior written consent.
* **Redistribution:** You may not repackage and distribute this software as part of a paid product or service.

**Permissions & Licensing Inquiries:**
If you wish to use this platform for an event, institutional education, or any profit-generating or commercial purpose, you **MUST** contact the author to negotiate a proper license:
📧 **Contact:** [white.matter.electronics@protonmail.com](mailto:white.matter.electronics@protonmail.com)

*Note: The core functionality is provided without warranties. See the `LICENSE` file for the full custom license text (which incorporates MIT liability equivalents for protection).*

---

## Features

*   **📚 Knowledge Base:** Interactive tutorials, documentation, and guides for hardware protocols (I2C, UART, SPI, RFID, etc.) with embedded executable app links.
*   **⚡ Flash Module:** Upload pre-compiled `.bin` firmware files directly to your ESP32-C3 board from the browser using the Web Serial API.
*   **🔬 The Lab (Serial Console):** A real-time serial monitor to view logs, sensor data, and debug messages coming from your board. Forward commands in Bridge Mode directly to UART targets.
*   **⚙️ System Config:** Manage the platform, upload new firmware binaries (supports sizes up to 50MB+), write new tutorials using a block-based editor, and link tutorials to specific firmware versions.
*   **📡 Hardware Tooling:** BLE/WiFi Commanders, MFRC522 RFID dumping, and 32KB EEPROM extraction built-in.

## Prerequisites & Installation Guide

Before you begin, you must ensure your local system is properly set up.

### 1. Install Node.js
You must have Node.js installed to run the local server.
1. Download Node.js (v18 or higher is recommended) from the official website: [https://nodejs.org/](https://nodejs.org/)
2. Run the installer for your operating system (Windows, macOS, or Linux).
3. Verify the installation by opening your terminal (or Command Prompt) and running:
   ```bash
   node -v
   npm -v
   ```
   Both commands should return a version number.

### 2. Browser Requirements
You **MUST** use a Chromium-based browser (Google Chrome, Microsoft Edge, Opera, or Brave). Safari and Firefox **do not support** the Web Serial API or Web Bluetooth API, which are absolutely critical to communicate with the hardware.

### 3. Cloning the Repository

Open your terminal or Git bash and run the following commands to download the code:

```bash
git clone https://github.com/WhiteMatterElectronics/NexusJournal.git
cd nexus-journal
```
*(Note: Replace the URL with your actual repository URL)*

### 4. Installing Dependencies

Run the following command inside the `electron-assistant` directory to install all required npm packages:

```bash
npm install
```

> **Troubleshooting `npm install` Errors:**
> *   **EACCES / Permission Denied:** Fix your npm permissions, or try running `sudo npm install` (if on Linux/macOS).
> *   **ENOENT (Missing package.json):** You are likely in the wrong directory. Make sure you have run `cd electron-assistant` to enter the project folder.
> *   **node-gyp rebuild errors:** (Common on Windows). You might need the C++ build tools. Open a terminal as Administrator and run: `npm install --global windows-build-tools`
> *   **Dependency Conflicts:** If packages fail to resolve or download, forcefully clean your npm cache: `npm cache clean --force` and re-run `npm install`.

### 5. Running the Application

Start the local development server (which spins up both the Vite frontend and the Express backend API simultaneously):

```bash
npm run dev
```

The terminal will provide a local URL (typically `http://localhost:3000`). Open this URL in your Chromium-based browser. The SQLite database (`nexus_journal.db`) will be automatically created and populated with default hardware tutorials on the first run.

---

## 🚀 First Tutorial: Flashing Your Firmware

To use the hardware functionalities, you must first upload the compiled firmware (`.bin` file) to your ESP32-C3 device. You can do this through our built-in Web Interface or manually using `esptool`.

### Method 1: Using the Built-In Web Interface (Recommended)

1. **Upload Firmware to the Database:**
   - Open the web platform (e.g., `http://localhost:3000`).
   - Launch the **System Config** app from the desktop.
   - Navigate to the **Web Firmware Loader** tab.
   - Fill in the firmware name, version, and target (e.g., ESP32-C3).
   - Select your `.bin` firmware file and click **UPLOAD FIRMWARE**.
   - *(Note: Your firmware is now securely saved in the local SQLite database and protected from development reloads).*

2. **Deploy to Device:**
   - Launch the **Flash Module** application from the dashboard.
   - In the **Firmware Selection** panel, select the firmware you just uploaded.
   - In the **Serial Configuration** panel, set your Baud Rate (default: `115200`), click **SELECT PORT**, and grant Chrome permission to connect to your ESP32's USB/COM port.
   - Put your device into Bootloader mode (Hold `BOOT`, press `RESET`, release `BOOT`).
   - Click **EXECUTE FLASH** and wait for the successful deployment message.

### Method 2: Manual Upload (esptool)

If you prefer the command line, you can flash the provided `.bin` file directly using `esptool`.

1. **Install esptool:**
   Ensure you have Python installed, then run:
   ```bash
   pip install esptool
   ```
2. **Flash the Binary:**
   Connect your ESP32-C3 device via USB, put it in bootloader mode, and run the following command (replace `<PORT>` with your actual port, e.g., `COM3` or `/dev/ttyUSB0`, and `<firmware_file>` with your actual `.bin` filename):
   ```bash
   esptool.py -p <PORT> -b 115200 --before default_reset --after hard_reset write_flash --flash_mode dio --flash_size detect --flash_freq 40m 0x0 <firmware_file>.bin
   ```

---

## Building for Production


To compile an optimized build of the application:
```bash
npm run build
```

To start the production Express server serving the compiled static files:
```bash
npm start
```

## Hardware Ecosystem Compatibility

This platform is specifically designed to interface perfectly with the custom **ESP32-C3 Supermini adapter board**. However, the Web Serial API and Flash Module can theoretically interact with and flash other ESP32-based development boards, provided they are wired with proper strapping pins and put into the correct bootloader mode.
