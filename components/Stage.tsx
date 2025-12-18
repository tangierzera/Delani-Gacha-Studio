import React, { useRef, useState, useEffect } from 'react';
import { SceneItem, AspectRatio } from '../types';
import { X, MessageCircle, RefreshCw, Lock, Unlock, RotateCw, Trash2, RotateCcw, Copy } from 'lucide-react';

interface StageProps {
  items: SceneItem[];
  backgroundUrl: string | null;
  selectedId: string | null;
  isBgLocked: boolean;
  isSaving: boolean;
  aspectRatio: AspectRatio;
  onToggleBgLock: () => void;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<SceneItem>) => void;
  onRemoveItem: (id: string) => void;
}

const Stage: React.FC<StageProps> = ({ 
  items, backgroundUrl, selectedId, isBgLocked, isSaving, aspectRatio,
  onToggleBgLock, onSelectItem, onUpdateItem, onRemoveItem
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1 });

  // --- Gestures State ---
  const [activeMode, setActiveMode] = useState<'none' | 'item-drag' | 'item-pinch' | 'bg-drag' | 'bg-pinch'>('none');
  const [gesture, setGesture] = useState({ 
    startX: 0, startY: 0, startDist: 0, startAngle: 0,
    initialX: 0, initialY: 0, initialScale: 1, initialRotation: 0 
  });

  // Reset bg on change
  useEffect(() => {
    if (!backgroundUrl) setBgTransform({ x: 0, y: 0, scale: 1 });
  }, [backgroundUrl, aspectRatio]);

  // --- Math Helpers ---
  const getDist = (touches: React.TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  const getAng = (touches: React.TouchList) => Math.atan2(touches[1].clientY - touches[0].clientY, touches[1].clientX - touches[0].clientX) * (180 / Math.PI);

  // --- Handlers ---
  const handlePointerDown = (e: React.PointerEvent | React.TouchEvent, itemId: string | null) => {
    // Only left click
    if ('button' in e && (e as React.PointerEvent).button !== 0) return;
    
    // Prevent default browser zooming
    // e.preventDefault(); // CAUTION: This might block scrolling if not careful, but needed for canvas

    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.PointerEvent).clientY;
    const touchCount = isTouch ? (e as React.TouchEvent).touches.length : 1;

    if (itemId) {
        e.stopPropagation();
        onSelectItem(itemId);
        
        // Bring to front logic (simple Z-index bump could be added here if we re-sorted array)
        
        const item = items.find(i => i.id === itemId);
        if (!item || item.locked) return;

        if (touchCount === 2 && isTouch) {
            const dist = getDist((e as React.TouchEvent).touches);
            const ang = getAng((e as React.TouchEvent).touches);
            setActiveMode('item-pinch');
            setGesture({
                startX: 0, startY: 0, startDist: dist, startAngle: ang,
                initialX: item.x, initialY: item.y, initialScale: item.scale, initialRotation: item.rotation
            });
        } else {
            setActiveMode('item-drag');
            setGesture({
                startX: clientX, startY: clientY, startDist: 0, startAngle: 0,
                initialX: item.x, initialY: item.y, initialScale: item.scale, initialRotation: item.rotation
            });
        }
    } else {
        // Background Logic
        onSelectItem(null);
        if (isBgLocked) return;
        
        if (touchCount === 2 && isTouch) {
            const dist = getDist((e as React.TouchEvent).touches);
            setActiveMode('bg-pinch');
            setGesture({
                startX: 0, startY: 0, startDist: dist, startAngle: 0,
                initialX: bgTransform.x, initialY: bgTransform.y, initialScale: bgTransform.scale, initialRotation: 0
            });
        } else {
            setActiveMode('bg-drag');
            setGesture({
                startX: clientX, startY: clientY, startDist: 0, startAngle: 0,
                initialX: bgTransform.x, initialY: bgTransform.y, initialScale: bgTransform.scale, initialRotation: 0
            });
        }
    }
  };

  const handlePointerMove = (e: any) => {
    if (activeMode === 'none') return;
    e.preventDefault();

    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;

    if (activeMode.startsWith('item') && selectedId) {
        if (activeMode === 'item-drag') {
            const dx = clientX - gesture.startX;
            const dy = clientY - gesture.startY;
            onUpdateItem(selectedId, { x: gesture.initialX + dx, y: gesture.initialY + dy });
        } else if (activeMode === 'item-pinch' && isTouch && e.touches.length === 2) {
            const dist = getDist(e.touches);
            const ang = getAng(e.touches);
            const scale = Math.max(0.1, gesture.initialScale * (dist / gesture.startDist));
            const rot = gesture.initialRotation + (ang - gesture.startAngle);
            onUpdateItem(selectedId, { scale, rotation: rot });
        }
    } else if (activeMode.startsWith('bg') && !isBgLocked) {
        if (activeMode === 'bg-drag') {
            const dx = clientX - gesture.startX;
            const dy = clientY - gesture.startY;
            setBgTransform(p => ({ ...p, x: gesture.initialX + dx, y: gesture.initialY + dy }));
        } else if (activeMode === 'bg-pinch' && isTouch && e.touches.length === 2) {
            const dist = getDist(e.touches);
            const scale = Math.max(0.2, gesture.initialScale * (dist / gesture.startDist));
            setBgTransform(p => ({ ...p, scale }));
        }
    }
  };

  const handlePointerUp = () => setActiveMode('none');

  // --- Global Event Listeners for smooth drag outside div ---
  useEffect(() => {
    if (activeMode !== 'none') {
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('touchmove', handlePointerMove, { passive: false });
        window.addEventListener('touchend', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('touchmove', handlePointerMove);
            window.removeEventListener('touchend', handlePointerUp);
        };
    }
  }, [activeMode, selectedId]);

  // --- Styling ---
  const getRatioClass = () => {
    if (aspectRatio === '9:16') return 'aspect-[9/16] h-[85vh]';
    if (aspectRatio === '16:9') return 'aspect-[16/9] w-full max-w-4xl';
    return 'aspect-square h-[70vh]';
  }

  // --- Render ---
  return (
    <div className="w-full h-full flex items-center justify-center p-4" onPointerDown={() => onSelectItem(null)}>
        <div 
            id="canvas-area"
            className={`relative bg-white shadow-2xl rounded-lg overflow-hidden border-4 border-white transition-all duration-300 ${getRatioClass()}`}
            onPointerDown={(e) => handlePointerDown(e, null)}
            onTouchStart={(e) => handlePointerDown(e, null)}
        >
            {/* 1. BACKGROUND LAYER */}
            <div 
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: `translate(${bgTransform.x}px, ${bgTransform.y}px) scale(${bgTransform.scale})` }}
            >
                {backgroundUrl ? (
                    <img src={backgroundUrl} className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                    <div className="w-full h-full bg-[radial-gradient(#FFC4D6_2px,transparent_2px)] [background-size:24px_24px] opacity-30" />
                )}
            </div>

            {/* Lock Indicator */}
            {backgroundUrl && !isSaving && (
                <button 
                    onClick={(e) => {e.stopPropagation(); onToggleBgLock()}} 
                    className={`absolute bottom-4 left-4 z-10 pointer-events-auto p-2 rounded-full shadow-lg border-2 border-white transition-colors ${isBgLocked ? 'bg-pink-100 text-pink-400' : 'bg-white text-green-500'}`}
                >
                    {isBgLocked ? <Lock size={16}/> : <Unlock size={16}/>}
                </button>
            )}

            {/* 2. ITEMS LAYER */}
            {items.map(item => (
                <div
                    key={item.id}
                    className={`absolute select-none group touch-none ${selectedId === item.id ? 'z-50' : 'z-20'}`}
                    style={{
                        transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale}) rotate(${item.rotation}deg)`,
                        cursor: item.locked ? 'default' : 'grab'
                    }}
                    onPointerDown={(e) => handlePointerDown(e, item.id)}
                    onTouchStart={(e) => handlePointerDown(e, item.id)}
                >
                    <div className={`relative ${selectedId === item.id && !isSaving ? 'ring-2 ring-pink-400 ring-dashed rounded-lg' : ''}`}>
                        
                        {/* --- CONTENT RENDERER --- */}
                        
                        {/* A. CHARACTERS */}
                        {item.type === 'character' && (
                            <img 
                                src={item.src} 
                                className="max-h-64 w-auto h-auto object-contain pointer-events-none drop-shadow-md" 
                                crossOrigin="anonymous"
                                draggable={false}
                            />
                        )}

                        {/* B. STICKERS */}
                        {item.type === 'sticker' && (
                            <div className="text-6xl drop-shadow-md cursor-default pointer-events-none pb-2">
                                {item.emoji}
                            </div>
                        )}

                        {/* C. BUBBLES (Fixed Spacing Tech) */}
                        {item.type === 'bubble' && (
                            <div className="relative flex items-center justify-center">
                                {/* Bubble Container */}
                                <div 
                                    className={`
                                        relative z-20 bg-white border-[3px] border-[#6D597A] shadow-md
                                        ${item.bubbleStyle === 'thought' ? 'rounded-full px-6 py-4' : 'rounded-2xl px-4 py-2'}
                                    `}
                                    // 'inline-table' is the magic CSS property here. 
                                    // Unlike 'block' or 'flex', it collapses perfectly around text content 
                                    // and renders consistently in html2canvas without bottom whitespace.
                                    style={{ display: 'inline-table', width: 'auto' }}
                                >
                                    <div 
                                        data-bubble-text 
                                        contentEditable={!item.locked && !isSaving}
                                        suppressContentEditableWarning
                                        onBlur={(e) => onUpdateItem(item.id, { text: e.currentTarget.innerText })}
                                        className="outline-none text-center font-bold text-[#6D597A] min-w-[50px] whitespace-pre-wrap break-words leading-[1.2]"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        style={{ display: 'block' }} 
                                    >
                                        {item.text}
                                    </div>
                                </div>
                                
                                {/* Tail SVG */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ transform: `rotate(${item.tailAngle || 45}deg)` }}>
                                    <div className="translate-y-[28px]">
                                        {item.bubbleStyle === 'speech' ? (
                                            <svg width="30" height="30" viewBox="0 0 32 32" className="drop-shadow-sm">
                                                <path d="M10,0 Q16,20 30,30 Q10,25 0,0 Z" fill="white" stroke="#6D597A" strokeWidth="3" />
                                                <rect x="0" y="-5" width="20" height="10" fill="white" />
                                            </svg>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 mt-1">
                                                <div className="w-4 h-4 bg-white border-2 border-[#6D597A] rounded-full"/>
                                                <div className="w-2 h-2 bg-white border-2 border-[#6D597A] rounded-full"/>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- CONTROLS --- */}
                        {selectedId === item.id && !isSaving && (
                            <>
                                <button onPointerDown={(e) => {e.stopPropagation(); onRemoveItem(item.id)}} className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full shadow-md border-2 border-white hover:scale-110 transition-transform"><Trash2 size={14}/></button>
                                <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { locked: !item.locked })}} className="absolute -top-4 -left-4 bg-yellow-400 text-white p-2 rounded-full shadow-md border-2 border-white hover:scale-110 transition-transform">{item.locked ? <Lock size={14}/> : <Unlock size={14}/>}</button>
                                
                                {item.type === 'bubble' && (
                                    <>
                                        <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { bubbleStyle: item.bubbleStyle === 'speech' ? 'thought' : 'speech' })}} className="absolute -bottom-4 -right-4 bg-blue-400 text-white p-2 rounded-full shadow-md border-2 border-white hover:scale-110"><RefreshCw size={14}/></button>
                                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-white/80 p-1 rounded-full flex gap-2 border border-pink-200">
                                            <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { tailAngle: (item.tailAngle || 0) - 15 })}} className="bg-pink-400 text-white p-1 rounded-full"><RotateCcw size={14}/></button>
                                            <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { tailAngle: (item.tailAngle || 0) + 15 })}} className="bg-pink-400 text-white p-1 rounded-full"><RotateCw size={14}/></button>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                    </div>
                </div>
            ))}

        </div>
    </div>
  );
};

export default Stage;
