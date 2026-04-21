export type BlockType = 'markdown' | 'code' | 'image' | 'file_download' | 'sub_heading' | 'divider' | 'video_embed' | 'image_gallery' | 'note' | 'attached_note' | 'tip' | 'warning' | 'app_link';

export interface TutorialBlock {
  id: string;
  type: BlockType;
  data: any;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  content: string; // Can be raw markdown string OR JSON stringified TutorialBlock[]
  category: 'protocol' | 'component' | 'theory';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  attachments?: string; // JSON string of { url: string, name: string, type: string }[]
  firmwareId?: string;
}

export interface Firmware {
  id: string;
  name: string;
  version: string;
  description: string;
  binaryUrl: string;
  target: string;
  uploadedAt: string;
}

export interface AppInfo {
  appId: string;
  title: string;
  description: string;
  content: string; // JSON stringified TutorialBlock[]
}

export type AppView = 'tutorials' | 'flasher' | 'console' | 'eeprom' | 'rfid' | 'binary' | 'debugger' | 'cyphonator' | 'settings' | 'notes' | 'sys_monitor' | 'weather' | 'clock' | 'bluetooth' | 'wifi' | 'inventory' | 'properties' | 'my_files' | 'text_editor' | 'trash' | 'gamehub' | 'nexus_disk' | 'shell' | 'browser' | 'pdf_viewer';
