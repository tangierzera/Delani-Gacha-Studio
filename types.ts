export type ItemType = 'character' | 'bubble';

export interface SceneItem {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  zIndex: number;
  // Character specific
  src?: string; 
  // Bubble specific
  text?: string;
  bubbleStyle?: 'speech' | 'thought';
  tailAngle?: number; // Angle in degrees for the speech bubble tail
}

export interface BackgroundImage {
  url: string;
  source: string;
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