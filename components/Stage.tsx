import React, { useRef, useState, useEffect } from 'react';
import { SceneItem } from '../types';
import { X, MessageCircle, RefreshCw, Spline, Heart, Move, Lock, Unlock } from 'lucide-react';

interface StageProps {
  items: SceneItem[];
  backgroundUrl: string | null;
  selectedId: string | null;
  isBgLocked: boolean;
  isSaving: boolean; // Prop to know when we are snapshotting
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

  useEffect(() => {
    setBgHasError(false);
    setBgTransform({ x: 0, y: 0, scale: 1 });
  }, [backgroundUrl]);

  // --- Math Helpers ---
  const getDistance = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const getAngle = (touches: React.TouchList) => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  // --- Input Handlers ---

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
      if (!item) return;

      if (item.locked) return;

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
    }
    else if (activeMode.startsWith('bg') && !isBgLocked) {
        if (activeMode === 'bg-pinch' && touches && touches.length === 2) {
            const currentDist = getDistance(touches);
            const scaleFactor = currentDist / gestureStart.dist;
            const newScale = Math.max(0.5, Math.min(5, gestureStart.initialScale * scaleFactor));
            setBgTransform(prev => ({ ...prev, scale: newScale }));
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

  const handlePointerUp = () => {
    setActiveMode('none');
  };

  const rotateTail = (itemId: string, currentAngle: number = 0) => {
      onUpdateItem(itemId, { tailAngle: (currentAngle + 45) % 360 });
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

  return (
    <div 
      id="stage-container"
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-gacha-cream shadow-inner touch-none select-none"
      onPointerDown={(e) => handlePointerDown(e, null)}
      onTouchStart={(e) => handlePointerDown(e, null)}
    >
      {/* BACKGROUND LAYER */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
            transform: `translate(${bgTransform.x}px, ${bgTransform.y}px) scale(${bgTransform.scale})`,
            transformOrigin: 'center center',
            transition: activeMode.startsWith('bg') ? 'none' : 'transform 0.1s ease-out'
        }}
      >
          {backgroundUrl && !bgHasError ? (
            <img 
                id="stage-background-img"
                src={backgroundUrl} 
                crossOrigin="anonymous"
                alt="scene-background"
                // object-center: ensure it centers
                className="h-full w-auto max-w-none min-w-full object-cover object-center pointer-events-none shadow-2xl"
                onError={() => setBgHasError(true)}
                draggable={false}
            />
          ) : (
            <div 
                className="w-[150vw] h-[150vh]"
                style={{ background: 'radial-gradient(circle, #FFF1E6 10%, #FFC4D6 100%)' }}
            />
          )}
      </div>

      {(!backgroundUrl || bgHasError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gacha-hot/50 pointer-events-none z-10 animate-pulse">
           <Heart size={64} fill="currentColor" className="mb-4" />
          <p className="text-2xl font-bold font-sans">
             {bgHasError ? "Imagem protegida :(" : 'Toque em "Fundo" ♡'}
          </p>
        </div>
      )}

      {/* BACKGROUND LOCK BUTTON - Hidden when saving */}
      {backgroundUrl && activeMode === 'none' && !selectedId && !isSaving && (
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleBgLock(); }}
            className={`absolute bottom-4 left-4 z-40 p-2 rounded-full shadow-lg border-2 border-white transition-all ${isBgLocked ? 'bg-gacha-hot text-white' : 'bg-white/80 text-gacha-text'}`}
          >
             {isBgLocked ? <Lock size={20} /> : <Unlock size={20} />}
          </button>
      )}

      {/* ITEMS LAYER */}
      {items.map(item => (
        <div
          key={item.id}
          className={`absolute select-none group touch-none ${selectedId === item.id ? 'z-50' : 'z-20'}`}
          style={{
            transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale}) rotate(${item.rotation}deg)`,
            zIndex: item.zIndex + 20, 
            cursor: item.locked ? 'default' : 'grab'
          }}
          onPointerDown={(e) => handlePointerDown(e, item.id)}
          onTouchStart={(e) => handlePointerDown(e, item.id)}
        >
            {item.type === 'character' && item.src && (
                <div className={`relative ${selectedId === item.id && !isSaving ? 'ring-2 ring-gacha-sky ring-dashed rounded-xl' : ''}`}>
                    <img src={item.src} alt="Character" className="pointer-events-none max-h-64 object-contain drop-shadow-xl" crossOrigin="anonymous" />
                    
                    {/* Locked Indicator - Hidden when saving */}
                    {item.locked && !isSaving && (
                         <div className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full">
                            <Lock size={12} />
                         </div>
                    )}

                    {selectedId === item.id && !item.locked && !isSaving && (
                        <button 
                            className="absolute -top-4 -right-4 bg-red-400 text-white p-2 rounded-full shadow-lg hover:bg-red-500 transition-colors border-2 border-white pointer-events-auto"
                            onPointerDown={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            )}

            {item.type === 'bubble' && (
                <div className="relative group flex items-center justify-center">
                     {/* Locked Indicator for Bubble - Hidden when saving */}
                     {item.locked && !isSaving && (
                         <div className="absolute -top-4 right-1/2 transform translate-x-1/2 z-50 bg-black/50 text-white p-1 rounded-full shadow-sm pointer-events-none">
                            <Lock size={12} />
                         </div>
                    )}

                    {/* Tail - Positioned Absolute to the container, not fixed to SVG */}
                    <div 
                        className="absolute w-full h-full pointer-events-none z-0 flex items-center justify-center"
                        style={{ transform: `rotate(${item.tailAngle || 90}deg)` }}
                    >
                        <div className="absolute translate-y-[60%]">
                             {item.bubbleStyle === 'speech' ? (
                                 <svg width="30" height="40" viewBox="0 0 40 50" className="drop-shadow-sm">
                                     <path d="M 0 0 L 20 45 L 40 0 Z" fill="white" stroke="#6D597A" strokeWidth="4" />
                                     <path d="M 2 0 L 38 0 L 20 15 Z" fill="white" stroke="none" />
                                 </svg>
                             ) : (
                                 <div className="flex flex-col items-center gap-1 opacity-90">
                                     <div className="w-3 h-3 bg-white border-2 border-gacha-text rounded-full"></div>
                                     <div className="w-2 h-2 bg-white border-2 border-gacha-text rounded-full"></div>
                                 </div>
                             )}
                        </div>
                    </div>

                    {/* Bubble Content - PURE CSS BOX THAT GROWS */}
                    {/* Added min-w to ensure it has width even if empty */}
                    <div 
                        className={`relative min-w-[120px] max-w-[400px] z-10 transition-all
                        ${selectedId === item.id && !isSaving ? 'ring-2 ring-gacha-sky ring-dashed' : ''}
                        ${item.bubbleStyle === 'thought' 
                            ? 'bg-white rounded-[50%] border-4 border-gacha-text px-6 py-4' 
                            : 'bg-white rounded-2xl border-4 border-gacha-text px-4 py-3'} 
                        shadow-xl flex items-center justify-center`}
                    >
                        <div 
                            contentEditable={!item.locked && !isSaving}
                            suppressContentEditableWarning={true}
                            onBlur={(e) => onUpdateItem(item.id, { text: e.currentTarget.innerText })}
                            className="w-full h-full bg-transparent border-none outline-none text-center text-gacha-text font-sans font-bold text-lg pointer-events-auto leading-normal whitespace-pre-wrap break-words empty:before:content-[attr(data-placeholder)] empty:before:text-gacha-text/30"
                            data-placeholder="Digite..."
                            style={{ 
                                cursor: item.locked ? 'default' : 'text',
                                wordBreak: 'break-word', 
                                overflowWrap: 'break-word',
                                minHeight: '1.2em' // Ensure at least one line height
                            }}
                            onPointerDown={(e) => {
                                // Allow focus only if not dragging
                                e.stopPropagation();
                            }}
                        >
                            {item.text}
                        </div>
                    </div>

                     {/* Controls (Only if NOT Locked and NOT Saving) */}
                     {selectedId === item.id && !isSaving && (
                        <>
                             <button 
                                className="absolute -top-3 -left-3 z-50 bg-yellow-400 text-white p-2 rounded-full shadow-lg border-2 border-white pointer-events-auto"
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
                                        className="absolute -top-3 -right-3 z-50 bg-red-400 text-white p-2 rounded-full shadow-lg border-2 border-white pointer-events-auto"
                                        onPointerDown={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                                    >
                                        <X size={14} />
                                    </button>
                                    
                                    <button 
                                        className="absolute -bottom-3 -right-3 z-50 bg-gacha-sky text-white p-2 rounded-full shadow-lg border-2 border-white pointer-events-auto"
                                        onPointerDown={(e) => { 
                                            e.stopPropagation(); 
                                            onUpdateItem(item.id, { bubbleStyle: item.bubbleStyle === 'speech' ? 'thought' : 'speech'});
                                        }}
                                    >
                                        {item.bubbleStyle === 'speech' ? <RefreshCw size={14} /> : <MessageCircle size={14} />}
                                    </button>

                                    <button 
                                        className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-gacha-hot text-white p-2 px-3 rounded-full shadow-lg flex items-center gap-1 text-xs font-bold border-2 border-white pointer-events-auto whitespace-nowrap"
                                        onPointerDown={(e) => { 
                                            e.stopPropagation(); 
                                            rotateTail(item.id, item.tailAngle);
                                        }}
                                    >
                                        <Spline size={14} /> Gira Rabo
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
      ))}
    </div>
  );
};

export default Stage;