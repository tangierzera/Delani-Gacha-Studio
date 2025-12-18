import React, { useRef, useState, useEffect } from 'react';
import { SceneItem } from '../types';
import { X, MessageCircle, RefreshCw, Spline, Heart, Move } from 'lucide-react';

interface StageProps {
  items: SceneItem[];
  backgroundUrl: string | null;
  selectedId: string | null;
  onSelectItem: (id: string | null) => void;
  onUpdateItem: (id: string, updates: Partial<SceneItem>) => void;
  onRemoveItem: (id: string) => void;
}

const Stage: React.FC<StageProps> = ({ 
  items, 
  backgroundUrl, 
  selectedId, 
  onSelectItem, 
  onUpdateItem,
  onRemoveItem
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // --- Background State ---
  // Controls position and zoom of the background image
  const [bgTransform, setBgTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [bgHasError, setBgHasError] = useState(false);

  // --- Interaction State ---
  // 'bg-drag' | 'bg-pinch' | 'item-drag' | 'item-pinch' | 'none'
  const [activeMode, setActiveMode] = useState<string>('none');
  
  // Stores initial values when a gesture starts
  const [gestureStart, setGestureStart] = useState({ 
    x: 0, 
    y: 0, 
    dist: 0, 
    angle: 0,
    // Store initial state of the object being manipulated (item or bg)
    initialX: 0,
    initialY: 0,
    initialScale: 1,
    initialRotation: 0
  });

  // Reset background position when a new URL is loaded
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
    // If it's a mouse event (not touch), strictly use primary button
    if ('button' in e && (e as React.PointerEvent).button !== 0) return;

    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.PointerEvent).clientY;
    const touchCount = isTouch ? (e as React.TouchEvent).touches.length : 1;

    // 1. Determine Target
    if (itemId) {
      e.stopPropagation(); // Stop bubbling to background
      onSelectItem(itemId);
      
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      if (touchCount === 2 && isTouch) {
        // Item Pinch/Rotate
        const dist = getDistance((e as React.TouchEvent).touches);
        const angle = getAngle((e as React.TouchEvent).touches);
        setActiveMode('item-pinch');
        setGestureStart({
          x: 0, y: 0, dist, angle,
          initialX: item.x, initialY: item.y,
          initialScale: item.scale, initialRotation: item.rotation
        });
      } else {
        // Item Drag
        setActiveMode('item-drag');
        setGestureStart({
          x: clientX, y: clientY, dist: 0, angle: 0,
          initialX: item.x, initialY: item.y,
          initialScale: item.scale, initialRotation: item.rotation
        });
      }
    } else {
      // 2. Background Interaction (Clicked on empty stage)
      // Deselect item if clicking background
      onSelectItem(null);

      if (touchCount === 2 && isTouch) {
        // Background Pinch (Zoom)
        const dist = getDistance((e as React.TouchEvent).touches);
        setActiveMode('bg-pinch');
        setGestureStart({
          x: 0, y: 0, dist, angle: 0,
          initialX: bgTransform.x, initialY: bgTransform.y,
          initialScale: bgTransform.scale, initialRotation: 0
        });
      } else {
        // Background Drag (Pan)
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
    
    // Prevent scrolling while editing
    if(e.cancelable) e.preventDefault();

    const isTouch = 'touches' in e;
    const touches = isTouch ? (e as React.TouchEvent).touches : null;
    const clientX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.PointerEvent).clientX;
    const clientY = isTouch ? (e as React.TouchEvent).touches[0].clientY : (e as React.PointerEvent).clientY;

    // --- ITEM LOGIC ---
    if (activeMode.startsWith('item') && selectedId) {
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
    
    // --- BACKGROUND LOGIC ---
    else if (activeMode.startsWith('bg')) {
        if (activeMode === 'bg-pinch' && touches && touches.length === 2) {
            const currentDist = getDistance(touches);
            const scaleFactor = currentDist / gestureStart.dist;
            // Limit background zoom between 0.5x and 5x
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

  // Helper to rotate bubble tail
  const rotateTail = (itemId: string, currentAngle: number = 0) => {
      onUpdateItem(itemId, { tailAngle: (currentAngle + 45) % 360 });
  };

  // Global event listeners for smooth dragging outside element bounds
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
  }, [activeMode, selectedId, bgTransform]);

  return (
    <div 
      id="stage-container"
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-gacha-cream shadow-inner touch-none select-none"
      onPointerDown={(e) => handlePointerDown(e, null)}
      onTouchStart={(e) => handlePointerDown(e, null)}
    >
      {/* 
        1. BACKGROUND LAYER 
        Now acts as a transformable object instead of object-fit: cover 
      */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
            // Apply the user's pan and zoom
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
                className="min-w-full min-h-full object-cover pointer-events-none shadow-2xl"
                // Initial size ensures it covers the screen, then user transforms it
                style={{ maxWidth: 'none' }} 
                onError={() => setBgHasError(true)}
            />
          ) : (
             // Gradient Placeholder
            <div 
                className="w-[150vw] h-[150vh]"
                style={{ background: 'radial-gradient(circle, #FFF1E6 10%, #FFC4D6 100%)' }}
            />
          )}
      </div>

      {/* Empty State / Error Message */}
      {(!backgroundUrl || bgHasError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gacha-hot/50 pointer-events-none z-10 animate-pulse">
           <Heart size={64} fill="currentColor" className="mb-4" />
          <p className="text-2xl font-bold font-sans">
             {bgHasError ? "Imagem protegida :(" : 'Toque em "Fundo" ♡'}
          </p>
        </div>
      )}

      {/* Helper hint for background movement (visible briefly when nothing is selected) */}
      {backgroundUrl && !selectedId && activeMode === 'none' && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center opacity-40 pointer-events-none">
              <span className="bg-black/20 text-white px-2 py-1 rounded-full text-[10px] flex items-center gap-1">
                 <Move size={10} /> Mova o fundo
              </span>
          </div>
      )}

      {/* 
        2. ITEMS LAYER
      */}
      {items.map(item => (
        <div
          key={item.id}
          className={`absolute select-none group touch-none ${selectedId === item.id ? 'z-50' : 'z-20'}`}
          style={{
            transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale}) rotate(${item.rotation}deg)`,
            zIndex: item.zIndex + 20, 
            cursor: 'grab'
          }}
          onPointerDown={(e) => handlePointerDown(e, item.id)}
          onTouchStart={(e) => handlePointerDown(e, item.id)}
        >
            {item.type === 'character' && item.src && (
                <div className={`relative ${selectedId === item.id ? 'ring-2 ring-gacha-sky ring-dashed rounded-xl' : ''}`}>
                    <img src={item.src} alt="Character" className="pointer-events-none max-h-64 object-contain drop-shadow-xl" crossOrigin="anonymous" />
                    {selectedId === item.id && (
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
                <div className="relative">
                    {/* Tail */}
                    <div 
                        className="absolute top-1/2 left-1/2 w-full h-full pointer-events-none z-0"
                        style={{ transform: `translate(-50%, -50%) rotate(${item.tailAngle || 90}deg)` }}
                    >
                        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                             {item.bubbleStyle === 'speech' ? (
                                 <svg width="40" height="50" viewBox="0 0 40 50" className="drop-shadow-sm">
                                     <path d="M 0 0 L 20 45 L 40 0 Z" fill="white" stroke="#6D597A" strokeWidth="3" />
                                     <path d="M 2 0 L 38 0 L 20 20 Z" fill="white" stroke="none" />
                                 </svg>
                             ) : (
                                 <div className="flex flex-col items-center gap-1">
                                     <div className="w-4 h-4 bg-white border-2 border-gacha-text rounded-full shadow-sm"></div>
                                     <div className="w-2 h-2 bg-white border-2 border-gacha-text rounded-full shadow-sm"></div>
                                 </div>
                             )}
                        </div>
                    </div>

                    {/* Bubble Content */}
                    <div 
                        className={`relative min-w-[150px] min-h-[80px] p-4 flex items-center justify-center text-center transition-all z-10
                        ${selectedId === item.id ? 'ring-2 ring-gacha-sky ring-dashed' : ''}
                        ${item.bubbleStyle === 'thought' 
                            ? 'bg-white rounded-[50%] border-4 border-gacha-text' 
                            : 'bg-white rounded-2xl border-4 border-gacha-text'} 
                        shadow-xl`}
                    >
                        <textarea 
                            value={item.text}
                            onChange={(e) => onUpdateItem(item.id, { text: e.target.value })}
                            className="w-full h-full bg-transparent border-none resize-none text-center focus:outline-none text-gacha-text font-sans font-bold text-lg pointer-events-auto leading-tight placeholder-gacha-text/30"
                            placeholder="Digite..."
                            onPointerDown={(e) => e.stopPropagation()} 
                        />
                    </div>

                     {/* Controls */}
                     {selectedId === item.id && (
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
                </div>
            )}
        </div>
      ))}
    </div>
  );
};

export default Stage;