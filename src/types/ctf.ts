export interface SerialTrigger {
  id: string;
  matchRegex: string;
  action: 'complete' | 'unlock_hint' | 'send_serial';
  payload?: string;
}

export interface CtfFlag {
  id: string;
  title: string;
  value: string;
  points: number;
}

export interface CtfChallenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  points: number;
  category: string;
  tutorials: string[]; // Array of tutorial IDs
  notes?: string[]; // Array of note IDs
  flags?: CtfFlag[];
  solvedFlags?: string[]; // Array of solved flag IDs
  flagJournal?: Record<string, string>; // Journaled flag values
  serialTriggers: SerialTrigger[];
  customCode?: string; // Custom HTML/JS to render in iframe
  inventoryItems?: string[]; // Array of required inventory item IDs
  status: 'locked' | 'active' | 'solved';
}
