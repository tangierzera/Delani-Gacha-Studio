
export type ItemType = 'character' | 'bubble' | 'sticker';
export type AspectRatio = '9:16' | '16:9' | '1:1';

export interface SceneItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  locked?: boolean;
  
  // Character/Sticker specific
  src?: string; 
  emoji?: string; // For native stickers
  
  // Bubble specific
  text?: string;
  bubbleStyle?: 'speech' | 'thought';
  tailAngle?: number; 
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
