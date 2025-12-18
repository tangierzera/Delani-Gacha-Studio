
export type ItemType = 'character' | 'dialogue' | 'sticker';
export type AspectRatio = '9:16' | '16:9' | '1:1';

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
  emoji?: string; // For native stickers
  
  // Dialogue specific (Gacha Style)
  text?: string;
  dialogueName?: string;
  nameColor?: string;
}

export interface BackgroundImage {
  url: string;
  source: string;
}

export interface StoredScene {
  id: string;
  thumbnail: string; // Base64 image
  timestamp: number;
}