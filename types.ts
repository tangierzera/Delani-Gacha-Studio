
export type ItemType = 'character' | 'dialogue' | 'sticker';
export type AspectRatio = '9:16' | '16:9' | '1:1';
export type SceneFilter = 'none' | 'dreamy' | 'vintage' | 'night' | 'warm';

export interface SceneItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  visible?: boolean;
  locked?: boolean;
  
  // Character/Sticker specific
  src?: string; 
  emoji?: string; 
  flipX?: boolean; // New: Mirror characters
  
  // Dialogue specific (Gacha Style)
  text?: string;
  dialogueName?: string;
  nameColor?: string;
  dialogueStyle?: 'speech' | 'thought'; 
  tailAngle?: number; 
}

export interface BackgroundImage {
  url: string;
  source: string;
}

export interface StoredScene {
  id: string;
  thumbnail: string; 
  timestamp: number;
}