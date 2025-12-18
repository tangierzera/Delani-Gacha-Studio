import React, { useRef, useState, useEffect } from 'react';
import { SceneItem, AspectRatio } from '../types';
import { X, MessageCircle, RefreshCw, Lock, Unlock, RotateCw, Trash2, RotateCcw } from 'lucide-react';

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
  items, 
  backgroundUrl, 
  selectedId, 
  isBgLocked,
  isSaving,
  aspectRatio,
  onToggleBgLock,
  onSelectItem, 
  onUpdateItem,
  onRemoveItem
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // --- Background State ---
  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [bgHasError, setBgHasError] = useState(false);

  // --- Interaction State ---
  const [activeMode, setActiveMode] = useState<string>('none');
  
  const [gestureStart, setGestureStart] = useState({ 
    x: 0, y: 0, dist: 0, angle: 0,
    initialX: 0, initialY: 0,
    initialScale: 1, initialRotation: 0
  });

  // Reset background transform when url changes or component mounts
  useEffect(() => {
    setBgHasError(false);
    if (!backgroundUrl) {
        setBgTransform({ x: 0, y: 0, scale: 1 });
    }
  }, [backgroundUrl, aspectRatio]);

  // --- Helpers ---
  const getDistance = (touches: React.TouchList) => {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  };

  const getAngle = (touches: React.TouchList) => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  // --- Interaction Logic ---
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
      if (!item || item.locked) return;

      if (touchCount === 2 && isTouch) {
        const dist = getDistance((e as React.TouchEvent).touches);
        const angle = getAngle((e as React.TouchEvent).touches);
        setActiveMode('item-pinch');
        setGestureStart({
          x: 0, y: 0, dist, angle,
          initialX: item.x, initialY: item.y,
          initialScale: item.scale, initialRotation: item.rotation
        });
      } else {
        setActiveMode('item-drag');
        setGestureStart({
          x: clientX, y: clientY, dist: 0, angle: 0,
          initialX: item.x, initialY: item.y,
          initialScale: item.scale, initialRotation: item.rotation
        });
      }
    } else {
      onSelectItem(null);
      if (isBgLocked) return;

      if (touchCount === 2 && isTouch) {
        const dist = getDistance((e as React.TouchEvent).touches);
        setActiveMode('bg-pinch');
        setGestureStart({
            x: 0, y: 0, dist, angle: 0,
            initialX: bgTransform.x, initialY: bgTransform.y,
            initialScale: bgTransform.scale, initialRotation: 0
        });
      } else {
        setActiveMode('bg-drag');
        setGestureStart({
          x: clientX, y: clientY, dist: 0, angle: 0,
          initialX: bgTransform.x, initialY: bgTransform.y,
          initialScale: bgTransform.scale, initialRotation: 0
        });
      }
    }
  };

  const handleStageMove = (e: React.TouchEvent | React.PointerEvent) => {
    if (activeMode === 'none') return;
    if(e.cancelable) e.preventDefault();

    const isTouch = 'touches' in e;
    const touches = isTouch ? (e as React.TouchEvent).touches : null;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.PointerEvent).clientY;

    if (activeMode.startsWith('item') && selectedId) {
       const item = items.find(i => i.id === selectedId);
       if (!item || item.locked) return; 

       if (activeMode === 'item-pinch' && touches && touches.length === 2) {
         const currentDist = getDistance(touches);
         const currentAngle = getAngle(touches);
         const scaleFactor = currentDist / gestureStart.dist;
         const newScale = Math.max(0.2, Math.min(8, gestureStart.initialScale * scaleFactor));
         const angleDiff = currentAngle - gestureStart.angle;
         const newRotation = gestureStart.initialRotation + angleDiff;
         onUpdateItem(selectedId, { scale: newScale, rotation: newRotation });
       } else if (activeMode === 'item-drag') {
         const deltaX = clientX - gestureStart.x;
         const deltaY = clientY - gestureStart.y;
         onUpdateItem(selectedId, {
           x: gestureStart.initialX + deltaX,
           y: gestureStart.initialY + deltaY
         });
       }
    } else if (activeMode.startsWith('bg') && !isBgLocked) {
        if (activeMode === 'bg-pinch' && touches && touches.length === 2) {
            const currentDist = getDistance(touches);
            const scaleFactor = currentDist / gestureStart.dist;
            setBgTransform(prev => ({ ...prev, scale: Math.max(0.2, Math.min(5, gestureStart.initialScale * scaleFactor)) }));
        } else if (activeMode === 'bg-drag') {
            const deltaX = clientX - gestureStart.x;
            const deltaY = clientY - gestureStart.y;
            setBgTransform(prev => ({
                ...prev,
                x: gestureStart.initialX + deltaX,
                y: gestureStart.initialY + deltaY
            }));
        }
    }
  };

  const handlePointerUp = () => setActiveMode('none');

  const adjustTailAngle = (itemId: string, currentAngle: number | undefined, delta: number) => {
      const angle = currentAngle || 90;
      onUpdateItem(itemId, { tailAngle: (angle + delta) % 360 });
  };

  useEffect(() => {
    if (activeMode !== 'none') {
      const handleMove = (e: Event) => handleStageMove(e as unknown as React.PointerEvent);
      const handleUp = () => handlePointerUp();
      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
      return () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleUp);
      };
    }
  }, [activeMode, selectedId, bgTransform, items, isBgLocked]);

  const getContainerClass = () => {
    switch(aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] h-[85vh] w-auto max-w-full'; 
      case '16:9':
        return 'aspect-[16/9] w-[95vw] h-auto max-h-[85vh]';
      case '1:1':
        return 'aspect-[1/1] h-[80vh] w-auto max-w-full';
      default:
        return 'w-full h-full';
    }
  };

  // --- SEPARATE LAYERS ---
  const characters = items.filter(i => i.type === 'character');
  const bubbles = items.filter(i => i.type === 'bubble');

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center p-4 bg-transparent"
      onPointerDown={() => onSelectItem(null)}
    >
      <div 
        className={`relative shadow-[0_20px_60px_-10px_rgba(255,182,193,0.5)] border-4 border-white bg-white rounded-lg overflow-hidden ${getContainerClass()}`}
      >
          <div 
            id="canvas-area"
            className="w-full h-full relative touch-none bg-transparent"
            onPointerDown={(e) => handlePointerDown(e, null)}
            onTouchStart={(e) => handlePointerDown(e, null)}
          >
              {/* === LAYER 1: BACKGROUND === */}
              <div 
                className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none z-0"
                style={{
                    transform: `translate(${bgTransform.x}px, ${bgTransform.y}px) scale(${bgTransform.scale})`,
                    transition: activeMode.startsWith('bg') ? 'none' : 'transform 0.1s ease-out'
                }}
              >
                  {backgroundUrl && !bgHasError ? (
                    <img 
                        src={backgroundUrl} 
                        crossOrigin="anonymous"
                        alt="scene-background"
                        className="w-full h-full object-cover pointer-events-none select-none"
                        onError={() => setBgHasError(true)}
                        draggable={false}
                    />
                  ) : (
                     <div className="w-full h-full opacity-10 bg-[radial-gradient(circle,_#ffc4d6_2px,_transparent_2px)] [background-size:20px_20px]" /> 
                  )}
              </div>

              {/* LOCK BUTTON */}
              {backgroundUrl && !isSaving && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleBgLock(); }}
                    className={`absolute bottom-4 left-4 z-40 p-2 rounded-full shadow-lg border-2 border-white transition-all pointer-events-auto ${isBgLocked ? 'bg-pink-400 text-white opacity-60 hover:opacity-100' : 'bg-white text-pink-500 animate-bounce'}`}
                  >
                     {isBgLocked ? <Lock size={20} /> : <Unlock size={20} />}
                  </button>
              )}

              {/* === LAYER 2: CHARACTERS === */}
              {characters.map(item => (
                <div
                  key={item.id}
                  className={`absolute select-none group touch-none ${selectedId === item.id ? 'z-20' : 'z-10'}`}
                  style={{
                    transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale}) rotate(${item.rotation}deg)`,
                    cursor: item.locked ? 'default' : 'grab'
                  }}
                  onPointerDown={(e) => handlePointerDown(e, item.id)}
                  onTouchStart={(e) => handlePointerDown(e, item.id)}
                >
                    <div className={`relative ${selectedId === item.id && !isSaving ? 'ring-2 ring-pink-400 ring-dashed rounded-xl' : ''}`}>
                        <img 
                            src={item.src} 
                            alt="Character" 
                            className="pointer-events-none max-h-64 w-auto h-auto object-contain drop-shadow-xl select-none" 
                            crossOrigin="anonymous" 
                            draggable={false} 
                            style={{ maxWidth: 'none' }} 
                        />
                        
                        {item.locked && !isSaving && (
                                <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><Lock size={12} /></div>
                        )}

                        {selectedId === item.id && !item.locked && !isSaving && (
                            <button 
                                className="absolute -top-3 -right-3 bg-red-400 text-white p-1.5 rounded-full shadow-lg border-2 border-white pointer-events-auto"
                                onPointerDown={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
              ))}

              {/* === LAYER 3: BUBBLES (Fixed Spacing Logic) === */}
              {bubbles.map(item => (
                <div
                    key={item.id}
                    className={`absolute select-none group touch-none ${selectedId === item.id ? 'z-50' : 'z-40'}`}
                    style={{
                        transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale}) rotate(${item.rotation}deg)`,
                        cursor: item.locked ? 'default' : 'grab'
                    }}
                    onPointerDown={(e) => handlePointerDown(e, item.id)}
                    onTouchStart={(e) => handlePointerDown(e, item.id)}
                >
                    {/* The Bubble Wrapper - Uses inline-flex to hug content */}
                    <div className="relative flex items-center justify-center">

                        {/* --- THE BUBBLE BODY --- */}
                        <div 
                            // Add data-bubble-container to target in html2canvas
                            data-bubble-container 
                            className={`relative min-w-[100px] max-w-[300px] z-20 flex items-center justify-center
                            ${item.bubbleStyle === 'thought' 
                                ? 'bg-white rounded-full border-[3px] border-[#6D597A] px-6 py-4 shadow-lg' 
                                : 'bg-white rounded-2xl border-[3px] border-[#6D597A] px-5 py-3 shadow-lg'}
                            ${selectedId === item.id && !isSaving ? 'ring-4 ring-pink-300 ring-opacity-50' : ''}
                            `}
                        >
                             <div 
                                data-bubble-text
                                contentEditable={!item.locked && !isSaving}
                                suppressContentEditableWarning={true}
                                onBlur={(e) => onUpdateItem(item.id, { text: e.currentTarget.innerText })}
                                className="bg-transparent border-none outline-none text-center text-[#6D597A] font-sans font-bold text-lg pointer-events-auto"
                                data-placeholder="Digite..."
                                style={{ 
                                    cursor: item.locked ? 'default' : 'text',
                                    wordBreak: 'break-word', 
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: '1.2', 
                                    minWidth: '50px',
                                    display: 'inline-block', // Crucial: Behaves like text, not block
                                    margin: 0,
                                    padding: 0
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {item.text}
                            </div>
                        </div>

                         {/* --- THE TAIL (Rotatable) --- */}
                         <div 
                            className="absolute inset-0 pointer-events-none flex items-center justify-center z-10"
                            style={{
                                transform: `rotate(${item.tailAngle || 45}deg)`
                            }}
                        >
                            <div className="absolute transform translate-y-[35px]"> 
                                {item.bubbleStyle === 'speech' ? (
                                    <svg width="40" height="40" viewBox="0 0 32 32" className="drop-shadow-sm">
                                        <path 
                                            d="M10,0 Q16,20 30,30 Q10,25 0,0 Z" 
                                            fill="white" 
                                            stroke="#6D597A" 
                                            strokeWidth="3" 
                                        />
                                        <rect x="0" y="-5" width="20" height="10" fill="white" />
                                    </svg>
                                ) : (
                                    <div className="flex flex-col items-center gap-1.5 mt-2">
                                        <div className="w-5 h-5 bg-white border-[3px] border-[#6D597A] rounded-full"></div>
                                        <div className="w-3 h-3 bg-white border-[3px] border-[#6D597A] rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- CONTROLS --- */}
                        {selectedId === item.id && !isSaving && (
                            <>
                                <button 
                                    className="absolute -top-5 -left-3 z-50 bg-yellow-300 text-white p-2 rounded-full shadow-md border-2 border-white pointer-events-auto hover:scale-110 transition-transform"
                                    onPointerDown={(e) => { 
                                        e.stopPropagation(); 
                                        onUpdateItem(item.id, { locked: !item.locked });
                                    }}
                                >
                                    {item.locked ? <Lock size={14} /> : <Unlock size={14} />}
                                </button>

                                {!item.locked && (
                                    <>
                                        <button 
                                            className="absolute -top-5 -right-3 z-50 bg-red-400 text-white p-2 rounded-full shadow-md border-2 border-white pointer-events-auto hover:scale-110 transition-transform"
                                            onPointerDown={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        
                                        <button 
                                            className="absolute -bottom-5 -right-3 z-50 bg-blue-300 text-white p-2 rounded-full shadow-md border-2 border-white pointer-events-auto hover:scale-110 transition-transform"
                                            onPointerDown={(e) => { 
                                                e.stopPropagation(); 
                                                onUpdateItem(item.id, { bubbleStyle: item.bubbleStyle === 'speech' ? 'thought' : 'speech'});
                                            }}
                                        >
                                            {item.bubbleStyle === 'speech' ? <RefreshCw size={14} /> : <MessageCircle size={14} />}
                                        </button>

                                        {/* TAIL ROTATION */}
                                        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 flex gap-3 z-50 pointer-events-auto bg-white/80 p-1 rounded-full border border-pink-200 shadow-sm backdrop-blur-sm">
                                            <button 
                                                className="bg-pink-400 text-white p-2 rounded-full shadow-sm hover:bg-pink-500 active:scale-95"
                                                onPointerDown={(e) => { e.stopPropagation(); adjustTailAngle(item.id, item.tailAngle, -20); }}
                                            >
                                                <RotateCcw size={14} />
                                            </button>
                                            <button 
                                                className="bg-pink-400 text-white p-2 rounded-full shadow-sm hover:bg-pink-500 active:scale-95"
                                                onPointerDown={(e) => { e.stopPropagation(); adjustTailAngle(item.id, item.tailAngle, 20); }}
                                            >
                                                <RotateCw size={14} />
                                            </button>
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
    </div>
  );
};

export default Stage;