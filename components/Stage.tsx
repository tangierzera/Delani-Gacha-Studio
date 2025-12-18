import React, { useState, useEffect } from 'react';
import { SceneItem, AspectRatio } from '../types';
import { Lock, Unlock, Trash2, Palette } from 'lucide-react';

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

const NAME_COLORS = ['#FF8FAB', '#6D597A', '#3B82F6', '#EF4444', '#10B981', '#F59E0B'];

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
                            zIndex: selectedId === item.id ? 9999 : 'auto',
                            // Ensure Dialogue is usually wide
                            width: item.type === 'dialogue' ? 'auto' : 'auto'
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

                            {/* --- PROFESSIONAL GACHA DIALOGUE BOX --- */}
                            {item.type === 'dialogue' && (
                                <div 
                                    className="relative flex flex-col items-start"
                                    style={{ width: 'min(80vw, 400px)' }}
                                >
                                    {/* Name Plate - Floats on top border */}
                                    <div 
                                        className="relative z-20 ml-4 mb-[-14px] px-4 py-1 rounded-full border-2 border-white shadow-md flex items-center justify-center min-w-[80px]"
                                        style={{ backgroundColor: item.nameColor || '#FF8FAB' }}
                                    >
                                        <div
                                            data-dialogue-name
                                            contentEditable={!item.locked && !isSaving}
                                            suppressContentEditableWarning
                                            onBlur={(e) => onUpdateItem(item.id, { dialogueName: e.currentTarget.innerText })}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            className="font-bold text-white text-sm outline-none whitespace-nowrap"
                                            style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.2)' }}
                                        >
                                            {item.dialogueName}
                                        </div>
                                    </div>

                                    {/* Main Box */}
                                    <div className="w-full bg-white/95 border-[3px] rounded-2xl shadow-lg relative z-10 p-4 pt-5 pb-3 min-h-[80px] flex flex-col justify-start"
                                         style={{ borderColor: item.nameColor || '#FF8FAB' }}
                                         data-dialogue-box
                                    >
                                        <div 
                                            data-dialogue-text 
                                            contentEditable={!item.locked && !isSaving}
                                            suppressContentEditableWarning
                                            onBlur={(e) => onUpdateItem(item.id, { text: e.currentTarget.innerText })}
                                            className="outline-none text-gray-700 font-medium text-lg leading-snug w-full"
                                            onPointerDown={(e) => e.stopPropagation()}
                                            style={{ 
                                                overflowWrap: 'anywhere',
                                                whiteSpace: 'pre-wrap',
                                                cursor: item.locked ? 'default' : 'text'
                                            }} 
                                        >
                                            {item.text}
                                        </div>
                                        
                                        {/* Next Arrow Decoration */}
                                        <div className="absolute bottom-2 right-3 animate-bounce-slow">
                                            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px]" 
                                                 style={{ borderTopColor: item.nameColor || '#FF8FAB' }}/>
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

                                    {!item.locked && item.type === 'dialogue' && (
                                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white/90 p-1.5 rounded-full shadow-md border border-pink-100 flex gap-2 pointer-events-auto z-50">
                                            {NAME_COLORS.map(color => (
                                                <button 
                                                    key={color}
                                                    onPointerDown={(e) => {e.stopPropagation(); onUpdateItem(item.id, { nameColor: color })}}
                                                    className={`w-5 h-5 rounded-full border border-gray-200 ${item.nameColor === color ? 'ring-2 ring-gray-400 scale-110' : ''}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
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