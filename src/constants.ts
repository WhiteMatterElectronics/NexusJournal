import { Settings, BookOpen, Zap, Terminal, Database, Radio, FileCode, Lock, Activity, Cloud, Clock, Bluetooth, Wifi, Flag, Package, Info, Folder, FileText, Globe, Trash2, Gamepad2, HardDrive } from 'lucide-react';
import { AppView } from './types';

export interface AppDefinition {
  id: AppView;
  icon: any;
  label: string;
}

export const APPS: AppDefinition[] = [
  { id: 'console', icon: Terminal, label: 'SERIAL_CONSOLE' },
  { id: 'eeprom', icon: Database, label: 'EEPROM_DUMPER' },
  { id: 'rfid', icon: Radio, label: 'RFID_TOOL' },
  { id: 'binary', icon: FileCode, label: 'BINARY_ANALYSIS' },
  { id: 'debugger', icon: Terminal, label: 'X86_DEBUGGER' },
  { id: 'cyphonator', icon: Lock, label: 'CYPHONATOR' },
  { id: 'tutorials', icon: BookOpen, label: 'KNOWLEDGE_BASE' },
  { id: 'flasher', icon: Zap, label: 'FLASH_MODULE' },
  { id: 'notes', icon: FileCode, label: 'DATA_SLABS' },
  { id: 'my_files', icon: Folder, label: 'MY_FILES' },
  { id: 'sys_monitor', icon: Activity, label: 'SYS_MONITOR' },
  { id: 'admin', icon: Settings, label: 'SYS_CONFIG' },
  { id: 'settings', icon: Settings, label: 'SETTINGS' },
  { id: 'weather', icon: Cloud, label: 'WEATHER' },
  { id: 'clock', icon: Clock, label: 'CLOCK' },
  { id: 'bluetooth', icon: Bluetooth, label: 'BLE_COMMANDER' },
  { id: 'wifi', icon: Wifi, label: 'WIFI_COMMANDER' },
  { id: 'inventory', icon: Package, label: 'INVENTORY' },
  { id: 'properties', icon: Info, label: 'PROPERTIES' },
  { id: 'text_editor', icon: FileText, label: 'TEXT_EDITOR' },
  { id: 'trash', icon: Trash2, label: 'TRASH' },
  { id: 'gamehub', icon: Gamepad2, label: 'GAME_HUB' },
  { id: 'nexus_disk', icon: HardDrive, label: 'NEXUS_DISK_MGMT' },
];
