import { AppInfo } from '../types';

export const DEFAULT_APP_INFO: AppInfo[] = [
  {
    appId: 'console',
    title: 'Serial Console',
    description: 'Direct serial communication bridge to connected hardware.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Overview' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>The Serial Console provides a direct interface to your connected ESP32 or other serial devices. It supports multiple baud rates and real-time data streaming.</p>' } },
      { id: 'b3', type: 'note', data: { type: 'tip', text: 'Use the "DTR" and "RTS" toggles to reset or put the device into bootloader mode.' } }
    ])
  },
  {
    appId: 'eeprom',
    title: 'EEPROM Dumper',
    description: 'Read and write to I2C EEPROM chips.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Usage' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Connect your I2C EEPROM to the SDA/SCL pins. Select the correct device address (usually 0x50) and click "Read All" to dump the contents.</p>' } }
    ])
  },
  {
    appId: 'rfid',
    title: 'RFID Tool',
    description: 'Analyze and manipulate 13.56MHz RFID cards.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'MFRC522 Integration' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>This tool uses the MFRC522 library to interact with MIFARE Classic cards. You can read UIDs, dump sectors, and attempt to write data blocks.</p>' } }
    ])
  },
  {
    appId: 'binary',
    title: 'Binary Analysis',
    description: 'Hex viewer and string extractor for binary files.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Features' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Upload any .bin or .elf file to inspect its raw hex content. Use the "Strings" tab to find printable ASCII sequences.</p>' } }
    ])
  },
  {
    appId: 'debugger',
    title: 'X86 Debugger',
    description: 'Visual debugger for x86 assembly and shellcode.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'About' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>A specialized environment for debugging small x86 snippets. Useful for CTF challenges involving shellcode analysis.</p>' } }
    ])
  },
  {
    appId: 'cyphonator',
    title: 'Cyphonator',
    description: 'Cryptographic swiss-army knife.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Encodings & Crypto' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Convert between Base64, Hex, Binary, and Decimal. Perform XOR operations and basic hash calculations (MD5, SHA-256).</p>' } }
    ])
  },
  {
    appId: 'tutorials',
    title: 'Knowledge Base',
    description: 'Interactive documentation and tutorials.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'System Documentation' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>This app contains all system tutorials and hardware guides. Use the editor to add your own documentation.</p>' } }
    ])
  },
  {
    appId: 'flasher',
    title: 'Flash Module',
    description: 'Deploy firmware to ESP32-C3 via Web Serial.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Flashing Guide' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Select a firmware from the database or upload a custom .bin file. Ensure your device is in bootloader mode before clicking "FLASH".</p>' } }
    ])
  },
  {
    appId: 'notes',
    title: 'Data Slabs',
    description: 'Advanced note-taking with block editor.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Usage' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Create rich notes with code snippets, images, and dividers. Notes are saved to the local database.</p>' } }
    ])
  },
  {
    appId: 'my_files',
    title: 'My Files',
    description: 'Internal file management system.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'File System' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Manage your projects, dumps, and scripts here. Files are stored in the Nexus Journal database.</p>' } }
    ])
  },
  {
    appId: 'sys_monitor',
    title: 'System Monitor',
    description: 'Monitor OS resources and active windows.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Metrics' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Track CPU/RAM usage and manage running app instances.</p>' } }
    ])
  },
  {
    appId: 'settings',
    title: 'Settings',
    description: 'Configure OS theming, networking, and security.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Configuration' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Customize your experience with different themes, background images, and taskbar styles.</p>' } }
    ])
  },
  {
    appId: 'weather',
    title: 'Weather',
    description: 'Real-time weather reports and forecasts.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Data Source' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Fetches real-time weather data based on your current or configured location.</p>' } }
    ])
  },
  {
    appId: 'clock',
    title: 'Clock',
    description: 'Time, date, and uptime tracking.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Timekeeping' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Displays current system time and allows setting alarms or timers.</p>' } }
    ])
  },
  {
    appId: 'bluetooth',
    title: 'BLE Commander',
    description: 'Discover and interact with Bluetooth Low Energy devices.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Wireless Recon' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Scan for nearby BLE peripherals, explore GATT services, and read/write characteristics.</p>' } }
    ])
  },
  {
    appId: 'wifi',
    title: 'WiFi Commander',
    description: 'Network scanning and WiFi management.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Network Tools' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Scan for access points, analyze signal strength, and manage saved connections.</p>' } }
    ])
  },
  {
    appId: 'inventory',
    title: 'Inventory',
    description: 'Track your hardware components and tools.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Asset Management' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Keep a digital log of your development boards, sensors, and cables.</p>' } }
    ])
  },
  {
    appId: 'properties',
    title: 'Properties',
    description: 'Detailed information about system objects.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Metadata' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>View and edit metadata for apps, files, and shortcuts.</p>' } }
    ])
  },
  {
    appId: 'text_editor',
    title: 'Text Editor',
    description: 'Simple code and text editor.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Editing' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Edit source code or plain text files directly within the OS.</p>' } }
    ])
  },
  {
    appId: 'trash',
    title: 'Trash',
    description: 'Deleted files and recovery.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Recovery' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Manage deleted items. You can restore them or empty the trash to permanently delete files.</p>' } }
    ])
  },
  {
    appId: 'gamehub',
    title: 'Game Hub',
    description: 'A collection of retro-style games.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Gaming' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Play classic games like Snake and Tetris built specifically for Nexus Journal.</p>' } }
    ])
  },
  {
    appId: 'nexus_disk',
    title: 'Nexus Disk Mgmt',
    description: 'Low-level disk and partition management.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Storage' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Analyze disk usage and manage internal partitions.</p>' } }
    ])
  },
  {
    appId: 'shell',
    title: 'System Shell',
    description: 'Direct access to the host operating system shell.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Terminal' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Execute commands directly on your host machine via the pty bridge.</p>' } }
    ])
  },
  {
    appId: 'browser',
    title: 'Web Browser',
    description: 'Internal sandboxed web browser.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Surfing' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Browse the web or local documentation servers.</p>' } }
    ])
  },
  {
    appId: 'pdf_viewer',
    title: 'PDF Viewer',
    description: 'View and annotate PDF documents.',
    content: JSON.stringify([
      { id: 'b1', type: 'sub_heading', data: { text: 'Documentation' } },
      { id: 'b2', type: 'markdown', data: { text: '<p>Read datasheets and manuals in PDF format.</p>' } }
    ])
  }
];
