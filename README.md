# NexusJournal

NexusJournal is a comprehensive hardware and software platform designed to streamline your embedded development workflow. At its core, it consists of a custom PCB powered by the ESP32-C3 microcontroller, seamlessly integrated with a powerful web-based platform.

## Features

*   **📚 Knowledge Base:** Interactive tutorials, documentation, and guides for hardware protocols (I2C, UART, SPI, RFID, etc.).
*   **⚡ Flash Module:** Upload pre-compiled `.bin` firmware files directly to your ESP32-C3 board from the browser using the Web Serial API.
*   **🔬 The Lab (Serial Console):** A real-time serial monitor to view logs, sensor data, and debug messages coming from your board. Send commands back to the device.
*   **⚙️ System Config:** Manage the platform, upload new firmware binaries, write new tutorials using a block-based editor, and link tutorials to specific firmware versions.

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:

*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   npm (comes with Node.js)
*   A Chromium-based browser (Chrome, Edge, Opera) for **Web Serial API** support.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/nexus-journal.git
cd nexus-journal
```
*(Note: Replace the URL with your actual repository URL)*

### 2. Install dependencies

Run the following command to install all required npm packages:

```bash
npm install
```

### 3. Run the development server

Start the local development server (which includes both the Vite frontend and the Express backend):

```bash
npm run dev
```

The server will start, and the application will typically be available at `http://localhost:3000`. The SQLite database (`database.sqlite`) will be automatically created and seeded with default tutorials on the first run.

## Building for Production

To build the application for production, run:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Hardware Compatibility

This platform is specifically designed to interface with the **NexusJournal ESP32-C3 Custom PCB**. However, the Web Serial API and Flash Module can theoretically work with other ESP32-based development boards, provided they are put into the correct bootloader mode.

## License

This project is licensed under the Apache 2.0 License.
