
export type ItemType = 'character' | 'bubble';
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
  // Character specific
  src?: string; 
  // Bubble specific
  text?: string;
  bubbleStyle?: 'speech' | 'thought';
  tailAngle?: number; // Changed to number for 360 rotation
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

export interface DragState {
  isDragging: boolean;
  isPinching: boolean;
  startX: number;
  startY: number;
  initialDist: number;
  initialScale: number;
  itemId: string | null;
}
