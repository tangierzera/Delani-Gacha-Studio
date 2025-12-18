import React, { useState, useEffect, useRef } from 'react';
import { SceneItem, AspectRatio, SceneFilter } from '../types';
import { Lock, Unlock, Trash2, Cloud, MessageSquare, RotateCw, RotateCcw, ArrowRightLeft } from 'lucide-react';

interface StageProps {
  items: SceneItem[];
  backgroundUrl: string | null;
  selectedId: string | null;
  isBgLocked: boolean;
  isSaving: boolean;
  aspectRatio: AspectRatio;
  activeFilter: SceneFilter;
  onToggleBgLock: () => void;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<SceneItem>) => void;
  onRemoveItem: (id: string) => void;
}

const NAME_COLORS = ['#FF8FAB', '#6D597A', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#333333'];

const Stage: React.FC<StageProps> = ({ 
  items, backgroundUrl, selectedId, isBgLocked, isSaving, aspectRatio, activeFilter,
  onToggleBgLock, onSelectItem, onUpdateItem, onRemoveItem
}) => {
  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  // Ref for dialogue width calculation
  const textRef = useRef<HTMLDivElement>(null);

  // Gestures
  const [activeMode, setActiveMode] = useState<'none' | 'item-drag' | 'item-pinch' | 'bg-drag' | 'bg-pinch'>('none');
  const [gesture, setGesture] = useState({ 
    startX: 0, startY: 0, startDist: 0, startAngle: 0,
    initialX: 0, initialY: 0, initialScale: 1, initialRotation: 0 
  });

  useEffect(() => {
    if (!backgroundUrl) setBgTransform({ x: 0, y: 0, scale: 1 });
  }, [backgroundUrl, aspectRatio]);

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

  // Filters logic
  const getFilterStyle = () => {
      switch(activeFilter) {
          case 'dreamy': return 'contrast-110 brightness-110 saturate-50 sepia-20';
          case 'vintage': return 'sepia contrast-90 brightness-90';
          case 'night': return 'brightness-75 contrast-125 hue-rotate-15';
          case 'warm': return 'sepia-50 saturate-150 contrast-100';
          default: return '';
      }
  }

  const getFilterOverlay = () => {
      if (activeFilter === 'dreamy') return <div className="absolute inset-0 bg-pink-200/10 pointer-events-none mix-blend-screen z-0" />;
      if (activeFilter === 'night') return <div className="absolute inset-0 bg-blue-900/20 pointer-events-none mix-blend-overlay z-0" />;
      return null;
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4" onPointerDown={() => onSelectItem(null)}>
        <div 
            id="canvas-area"
            className={`relative bg-white shadow-2xl rounded-lg overflow-hidden border-4 border-white transition-all duration-300 ${getRatioClass()} ${getFilterStyle()}`}
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

            {getFilterOverlay()}

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
                const isSpeech = item.dialogueStyle !== 'thought';
                const tailAngle = item.tailAngle || 0;
                
                return (
                    <div
                        key={item.id}
                        className={`absolute select-none group touch-none`}
                        style={{
                            transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale}) rotate(${item.rotation}deg)`,
                            cursor: item.locked ? 'default' : 'grab',
                            zIndex: selectedId === item.id ? 9999 : item.zIndex,
                        }}
                        onPointerDown={(e) => handlePointerDown(e, item.id)}
                        onTouchStart={(e) => handlePointerDown(e, item.id)}
                    >
                        <div className={`relative ${selectedId === item.id && !isSaving ? 'ring-2 ring-pink-400 ring-dashed rounded-lg' : ''}`}>
                            
                            {/* --- CHARACTER (With Flip Support) --- */}
                            {item.type === 'character' && (
                                <img 
                                    src={item.src} 
                                    className="max-h-64 w-auto h-auto object-contain pointer-events-none drop-shadow-md" 
                                    style={{ transform: item.flipX ? 'scaleX(-1)' : 'none' }}
                                    crossOrigin="anonymous" 
                                    draggable={false}
                                />
                            )}

                            {/* --- STICKER --- */}
                            {item.type === 'sticker' && (
                                <div className="text-6xl drop-shadow-md cursor-default pointer-events-none pb-2 leading-none">{item.emoji}</div>
                            )}

                            {/* --- DIALOGUE (SVG BASED FOR PERFECT SAVE) --- */}
                            {item.type === 'dialogue' && (
                                <div 
                                    className="relative flex flex-col items-start"
                                    style={{ width: 'min(80vw, 400px)' }}
                                >
                                    {/* Name Plate */}
                                    <div 
                                        className={`relative z-20 ml-6 mb-[-14px] px-4 py-1 rounded-full border-2 border-white shadow-md flex items-center justify-center min-w-[80px]`}
                                        style={{ backgroundColor: item.nameColor || '#FF8FAB' }}
                                    >
                                        <div
                                            data-dialogue-name
                                            contentEditable={!item.locked && !isSaving}
                                            suppressContentEditableWarning
                                            onBlur={(e) => onUpdateItem(item.id, { dialogueName: e.currentTarget.innerText })}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="font-bold text-white text-sm outline-none whitespace-nowrap leading-relaxed"
                                            style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.2)' }}
                                        >
                                            {item.dialogueName}
                                        </div>
                                    </div>

                                    {/* SVG Background Container */}
                                    <div className="relative w-full z-10 pt-4">
                                        {/* SVG Border/Fill - Positioned Absolutely to match text height */}
                                        <div className="absolute inset-0 top-4 w-full h-full pointer-events-none">
                                           <svg width="100%" height="100%" className="overflow-visible">
                                              {/* The Tail */}
                                              <g transform={`translate(0, 0)`} style={{ transformOrigin: 'center center' }}>
                                                  {isSpeech ? (
                                                     // Calculate position based on width/height roughly or just center it and rotate
                                                     // Using a foreignObject or simple math is hard in SVG dynamic width
                                                     // STRATEGY: Render tail as separate div rotated, BUT inside the SVG context if possible?
                                                     // No, let's keep the tail as a div rotated, but using an SVG graphic inside it.
                                                     <></>
                                                  ) : null}
                                              </g>
                                              
                                              {/* The Box */}
                                              <rect 
                                                x="1" y="1" width="99%" height="98%" 
                                                rx={isSpeech ? 20 : 30} 
                                                fill="white" fillOpacity="0.95"
                                                stroke={item.nameColor || '#FF8FAB'} 
                                                strokeWidth="3" 
                                                strokeDasharray="8 6"
                                              />
                                           </svg>
                                        </div>

                                        {/* TEXT CONTENT */}
                                        <div 
                                            data-dialogue-text 
                                            contentEditable={!item.locked && !isSaving}
                                            suppressContentEditableWarning
                                            onBlur={(e) => onUpdateItem(item.id, { text: e.currentTarget.innerText })}
                                            className="relative z-10 outline-none text-gray-700 font-medium text-lg w-full p-4 min-h-[60px]"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            style={{ 
                                                overflowWrap: 'break-word',
                                                wordBreak: 'break-word',
                                                whiteSpace: 'pre-wrap',
                                                cursor: item.locked ? 'default' : 'text',
                                                lineHeight: '1.25', 
                                            }} 
                                        >
                                            {item.text}
                                        </div>

                                        {/* TAIL (Rotatable Wrapper) */}
                                        <div 
                                            className="absolute inset-0 pointer-events-none z-20 flex justify-center items-end top-4"
                                            style={{ 
                                                transform: `rotate(${tailAngle}deg)`,
                                                margin: '-1px'
                                            }}
                                        >
                                            {isSpeech ? (
                                                <div className="translate-y-[100%] drop-shadow-sm mt-[-4px]">
                                                    <svg width="30" height="30" viewBox="0 0 30 30" className="overflow-visible">
                                                        <path d="M5,0 Q15,25 25,0" fill="white" stroke={item.nameColor || '#FF8FAB'} strokeWidth="3" strokeDasharray="8 6" />
                                                        {/* Patch to hide border line */}
                                                        <rect x="6" y="-5" width="18" height="10" fill="white" />
                                                    </svg>
                                                </div>
                                            ) : (
                                                 <div className="flex flex-col gap-1 items-center translate-y-[100%] pt-2">
                                                    <div className="w-3 h-3 rounded-full bg-white border-[3px]" style={{ borderColor: item.nameColor || '#FF8FAB' }}/>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white border-[3px]" style={{ borderColor: item.nameColor || '#FF8FAB' }}/>
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

                                    {/* New FLIP Button for Characters */}
                                    {!item.locked && item.type === 'character' && (
                                         <button 
                                            onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { flipX: !item.flipX })}} 
                                            className="absolute -top-3 right-6 bg-purple-500 text-white p-1.5 rounded-full shadow-md border-2 border-white hover:scale-110"
                                         >
                                            <ArrowRightLeft size={12}/>
                                         </button>
                                    )}

                                    {!item.locked && item.type === 'dialogue' && (
                                        <>
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
                                                <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { tailAngle: (item.tailAngle || 0) - 15 })}} className="bg-white text-pink-500 p-1.5 rounded-full shadow border border-pink-100"><RotateCcw size={14}/></button>
                                                <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { tailAngle: (item.tailAngle || 0) + 15 })}} className="bg-white text-pink-500 p-1.5 rounded-full shadow border border-pink-100"><RotateCw size={14}/></button>
                                                <button onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { dialogueStyle: isSpeech ? 'thought' : 'speech' })}} className="bg-blue-500 text-white p-1.5 rounded-full shadow border-2 border-white">{isSpeech ? <MessageSquare size={14}/> : <Cloud size={14}/>}</button>
                                            </div>
                                            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white/90 p-1.5 rounded-full shadow-md border border-pink-100 flex gap-2 pointer-events-auto z-50">
                                                {NAME_COLORS.map(color => (
                                                    <button key={color} onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { nameColor: color })}} className={`w-5 h-5 rounded-full border border-gray-200 ${item.nameColor === color ? 'ring-2 ring-gray-400 scale-110' : ''}`} style={{ backgroundColor: color }}/>
                                                ))}
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