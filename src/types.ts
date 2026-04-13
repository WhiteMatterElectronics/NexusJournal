export type BlockType = 'markdown' | 'code' | 'image' | 'file_download' | 'sub_heading' | 'divider' | 'video_embed' | 'image_gallery' | 'note';

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

export type AppView = 'tutorials' | 'flasher' | 'admin' | 'console' | 'eeprom' | 'rfid' | 'binary' | 'cyphonator' | 'settings' | 'notes';
