import React, { useState, useEffect, useRef } from 'react';
import { SceneItem, AspectRatio } from '../types';
import { Lock, Unlock, RefreshCw, RotateCcw, RotateCw, Trash2 } from 'lucide-react';

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
  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1 });

  // Gestures
  const [activeMode, setActiveMode] = useState<'none' | 'item-drag' | 'item-pinch' | 'bg-drag' | 'bg-pinch'>('none');
  const [gesture, setGesture] = useState({ 
    startX: 0, startY: 0, startDist: 0, startAngle: 0,
    initialX: 0, initialY: 0, initialScale: 1, initialRotation: 0 
  });

  useEffect(() => {
    if (!backgroundUrl) setBgTransform({ x: 0, y: 0, scale: 1 });
  }, [backgroundUrl, aspectRatio]);

  // Helpers
  const getDist = (touches: React.TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  const getAng = (touches: React.TouchList) => Math.atan2(touches[1].clientY - touches[0].clientY, touches[1].clientX - touches[0].clientX) * (180 / Math.PI);

  const handlePointerDown = (e: React.PointerEvent | React.TouchEvent, itemId: string | null) => {
    if ('button' in e && (e as React.PointerEvent).button !== 0) return;
    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.PointerEvent).clientY;
    const touchCount = isTouch ? (e as React.TouchEvent).touches.length : 1;

    if (itemId) {
        e.stopPropagation();
        onSelectItem(itemId);
        const item = items.find(i => i.id === itemId);
        if (!item || item.locked || (item.visible === false)) return; 

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

  const getRatioClass = () => {
    if (aspectRatio === '9:16') return 'aspect-[9/16] h-[85vh]';
    if (aspectRatio === '16:9') return 'aspect-[16/9] w-full max-w-4xl';
    return 'aspect-square h-[70vh]';
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4" onPointerDown={() => onSelectItem(null)}>
        <div 
            id="canvas-area"
            className={`relative bg-white shadow-2xl rounded-lg overflow-hidden border-4 border-white transition-all duration-300 ${getRatioClass()}`}
            onPointerDown={(e) => handlePointerDown(e, null)}
            onTouchStart={(e) => handlePointerDown(e, null)}
        >
            {/* BACKGROUND */}
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

            {/* ITEMS */}
            {items.map((item) => {
                if (item.visible === false) return null;

                return (
                    <div
                        key={item.id}
                        className={`absolute select-none group touch-none`}
                        style={{
                            transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale}) rotate(${item.rotation}deg)`,
                            cursor: item.locked ? 'default' : 'grab',
                            zIndex: selectedId === item.id ? 9999 : 'auto' 
                        }}
                        onPointerDown={(e) => handlePointerDown(e, item.id)}
                        onTouchStart={(e) => handlePointerDown(e, item.id)}
                    >
                        <div className={`relative ${selectedId === item.id && !isSaving ? 'ring-2 ring-pink-400 ring-dashed rounded-lg' : ''}`}>
                            
                            {/* --- CHARACTER --- */}
                            {item.type === 'character' && (
                                <img src={item.src} className="max-h-64 w-auto h-auto object-contain pointer-events-none drop-shadow-md" crossOrigin="anonymous" draggable={false}/>
                            )}

                            {/* --- STICKER --- */}
                            {item.type === 'sticker' && (
                                <div className="text-6xl drop-shadow-md cursor-default pointer-events-none pb-2 leading-none">{item.emoji}</div>
                            )}

                            {/* --- BUBBLE (PROFESSIONAL FIX) --- */}
                            {item.type === 'bubble' && (
                                /* Container with SAFE PADDING ensures tail is never cut off by html2canvas clipping */
                                <div className="relative p-12 -m-12 flex flex-col items-center justify-center">
                                    
                                    {/* The Actual Bubble Box */}
                                    <div 
                                        className={`
                                            relative z-20 bg-white border-[4px] border-[#6D597A] shadow-sm
                                            ${item.bubbleStyle === 'thought' ? 'rounded-[2rem] px-6 py-4' : 'rounded-3xl px-5 py-3'}
                                            flex items-center justify-center
                                        `}
                                        style={{ 
                                            maxWidth: 'min(70vw, 280px)', 
                                            width: 'max-content',
                                            minWidth: '60px'
                                        }}
                                        data-bubble-container 
                                    >
                                        <div 
                                            data-bubble-text 
                                            contentEditable={!item.locked && !isSaving}
                                            suppressContentEditableWarning
                                            onBlur={(e) => onUpdateItem(item.id, { text: e.currentTarget.innerText })}
                                            className="outline-none text-center font-bold text-[#6D597A]"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            style={{ 
                                                // THE FIX: "anywhere" breaks even long strings.
                                                overflowWrap: 'anywhere',
                                                wordBreak: 'break-word',
                                                whiteSpace: 'pre-wrap',
                                                lineHeight: '1.2', // Consistent line height
                                                fontSize: '16px',
                                                width: '100%',
                                                margin: 0,
                                                padding: 0,
                                                cursor: item.locked ? 'default' : 'text'
                                            }} 
                                        >
                                            {item.text}
                                        </div>
                                    </div>
                                    
                                    {/* The Tail Wrapper - Rotates around the center of the bubble */}
                                    <div 
                                        className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center" 
                                        style={{ 
                                            transform: `rotate(${item.tailAngle || 180}deg)`,
                                            // The rotation origin is strictly the center of the whole padded container
                                            transformOrigin: 'center center'
                                        }}
                                    >
                                        {/* Push tail outwards. The value matches approx half bubble height + offset */}
                                        <div className="translate-y-[calc(50%+4px)]" style={{ 
                                            marginTop: item.bubbleStyle === 'thought' ? '20px' : '15px'
                                        }}>
                                            {item.bubbleStyle === 'speech' ? (
                                                <div className="relative flex flex-col items-center">
                                                     {/* 
                                                        GACHA TAIL TRICK: 
                                                        We use a simple SVG triangle. 
                                                        We create a white rectangle to cover the border intersection.
                                                        This is the most reliable way to render in html2canvas without artifacts.
                                                     */}
                                                     
                                                     {/* 1. The Cover Patch (Hides the bubble border where tail meets) */}
                                                     {/* Increased Z-Index to ensure it covers properly */}
                                                     <div className="w-6 h-4 bg-white absolute -top-3 z-30" />
                                                     
                                                     {/* 2. The Tail SVG */}
                                                     <svg width="30" height="25" viewBox="0 0 30 25" className="z-20 overflow-visible relative">
                                                        <path 
                                                            d="M0,0 L15,25 L30,0" 
                                                            fill="white" 
                                                            stroke="#6D597A" 
                                                            strokeWidth="4" 
                                                            strokeLinejoin="round"
                                                        />
                                                        {/* Inner white fill to ensure no border bleeds through on top */}
                                                        <path d="M2,0 L15,22 L28,0 Z" fill="white" stroke="none" />
                                                     </svg>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1.5 -mt-3 relative z-30">
                                                    <div className="w-3.5 h-3.5 bg-white border-[3px] border-[#6D597A] rounded-full"/>
                                                    <div className="w-2 h-2 bg-white border-[3px] border-[#6D597A] rounded-full"/>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- CONTROLS --- */}
                            {selectedId === item.id && !isSaving && (
                                <>
                                    <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { locked: !item.locked })}} className={`absolute -top-3 -left-3 p-1.5 rounded-full shadow-md border-2 border-white hover:scale-110 transition-transform ${item.locked ? 'bg-red-500 text-white' : 'bg-yellow-400 text-white'}`}>{item.locked ? <Lock size={12}/> : <Unlock size={12}/>}</button>
                                    
                                    {!item.locked && (
                                        <button onPointerDown={(e) => {e.stopPropagation(); onRemoveItem(item.id)}} className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-md border-2 border-white hover:scale-110"><Trash2 size={12}/></button>
                                    )}

                                    {!item.locked && item.type === 'bubble' && (
                                        <>
                                            <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { bubbleStyle: item.bubbleStyle === 'speech' ? 'thought' : 'speech' })}} className="absolute -bottom-3 -right-3 bg-blue-400 text-white p-1.5 rounded-full shadow-md border-2 border-white hover:scale-110"><RefreshCw size={12}/></button>
                                            <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 bg-white/80 p-1 rounded-full flex gap-2 border border-pink-200 backdrop-blur-sm pointer-events-auto">
                                                <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { tailAngle: (item.tailAngle || 0) - 15 })}} className="bg-pink-400 text-white p-1 rounded-full"><RotateCcw size={14}/></button>
                                                <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { tailAngle: (item.tailAngle || 0) + 15 })}} className="bg-pink-400 text-white p-1 rounded-full"><RotateCw size={14}/></button>
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default Stage;