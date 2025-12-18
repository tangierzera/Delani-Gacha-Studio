import React, { useRef, useState, useEffect } from 'react';
import { SceneItem } from '../types';
import { X, MessageCircle, RefreshCw, Spline, Heart } from 'lucide-react';

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
  
  // Interaction State
  const [activeGesture, setActiveGesture] = useState<'none' | 'drag' | 'pinch'>('none');
  const [gestureStart, setGestureStart] = useState({ x: 0, y: 0, dist: 0 });
  const [initialItemState, setInitialItemState] = useState<{x: number, y: number, scale: number, rotation: number, angle: number} | null>(null);
  
  // Track if background failed to load (CORS error or 404)
  const [bgHasError, setBgHasError] = useState(false);

  // Reset error state when URL changes
  useEffect(() => {
    setBgHasError(false);
  }, [backgroundUrl]);

  // Helper to get distance between two touches
  const getDistance = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  // Helper to get angle between two touches
  const getAngle = (touches: React.TouchList) => {
    const dx = touches[1].clientX - touches[0].clientX;
    const dy = touches[1].clientY - touches[0].clientY;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const handlePointerDown = (e: React.PointerEvent | React.TouchEvent, itemId: string) => {
    e.stopPropagation();
    onSelectItem(itemId);

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if ('touches' in e && e.touches.length === 2) {
      // Pinch/Rotate Start
      const dist = getDistance(e.touches);
      const angle = getAngle(e.touches);
      setActiveGesture('pinch');
      setGestureStart({ x: 0, y: 0, dist });
      setInitialItemState({ 
        x: item.x, 
        y: item.y, 
        scale: item.scale, 
        rotation: item.rotation,
        angle: angle 
      });
    } else {
      // Drag Start
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;
      
      setActiveGesture('drag');
      setGestureStart({ x: clientX, y: clientY, dist: 0 });
      setInitialItemState({ 
        x: item.x, 
        y: item.y, 
        scale: item.scale, 
        rotation: item.rotation,
        angle: 0 
      });
    }
  };

  const handleStageTouchMove = (e: React.TouchEvent | React.PointerEvent) => {
    if (activeGesture === 'none' || !selectedId || !initialItemState) return;
    
    e.preventDefault();

    if (activeGesture === 'pinch' && 'touches' in e && e.touches.length === 2) {
      const currentDist = getDistance(e.touches);
      const currentAngle = getAngle(e.touches);
      
      const scaleFactor = currentDist / gestureStart.dist;
      const newScale = Math.max(0.2, Math.min(5, initialItemState.scale * scaleFactor));
      
      const angleDiff = currentAngle - initialItemState.angle;
      const newRotation = initialItemState.rotation + angleDiff;

      onUpdateItem(selectedId, { scale: newScale, rotation: newRotation });
    } 
    else if (activeGesture === 'drag') {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.PointerEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.PointerEvent).clientY;

      const deltaX = clientX - gestureStart.x;
      const deltaY = clientY - gestureStart.y;

      onUpdateItem(selectedId, {
        x: initialItemState.x + deltaX,
        y: initialItemState.y + deltaY
      });
    }
  };

  const handlePointerUp = () => {
    setActiveGesture('none');
    setInitialItemState(null);
  };

  // Helper to rotate bubble tail
  const rotateTail = (itemId: string, currentAngle: number = 0) => {
      // Rotate by 45 degrees increments
      onUpdateItem(itemId, { tailAngle: (currentAngle + 45) % 360 });
  };

  useEffect(() => {
    if (activeGesture !== 'none') {
      const handleMove = (e: Event) => handleStageTouchMove(e as unknown as React.PointerEvent);
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
  }, [activeGesture, selectedId, initialItemState]);

  return (
    <div 
      id="stage-container"
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-gacha-cream shadow-inner touch-none"
      onPointerDown={() => onSelectItem(null)}
    >
      {/* 1. Background Layer - Using IMG tag for reliable CORS capture */}
      {backgroundUrl && !bgHasError ? (
        <img 
            src={backgroundUrl} 
            crossOrigin="anonymous"
            alt="" // Empty alt to prevent ugly text if it breaks visually before onError catches it
            className="absolute inset-0 w-full h-full object-cover z-0 select-none pointer-events-none transition-opacity duration-300"
            onError={() => setBgHasError(true)}
        />
      ) : (
        <div 
            className="absolute inset-0 w-full h-full z-0 pointer-events-none transition-all duration-500"
            style={{ background: 'radial-gradient(circle, #FFF1E6 10%, #FFC4D6 100%)' }}
        />
      )}

      {(!backgroundUrl || bgHasError) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gacha-hot/50 pointer-events-none z-10 animate-pulse">
           <Heart size={64} fill="currentColor" className="mb-4" />
          <p className="text-2xl font-bold font-sans">
             {bgHasError ? "Imagem protegida :(" : 'Toque em "Fundo" ♡'}
          </p>
        </div>
      )}

      {items.map(item => (
        <div
          key={item.id}
          className={`absolute select-none group touch-none ${selectedId === item.id ? 'z-50' : 'z-20'}`}
          style={{
            transform: `translate(${item.x}px, ${item.y}px) scale(${item.scale}) rotate(${item.rotation}deg)`,
            // Force items to be above the background (z-0) and placeholder (z-10)
            zIndex: item.zIndex + 20, 
            cursor: activeGesture === 'drag' ? 'grabbing' : 'grab'
          }}
          onPointerDown={(e) => handlePointerDown(e, item.id)}
          onTouchStart={(e) => handlePointerDown(e, item.id)}
        >
            {item.type === 'character' && item.src && (
                <div className={`relative ${selectedId === item.id ? 'ring-4 ring-gacha-sky ring-dashed rounded-xl' : ''}`}>
                    <img src={item.src} alt="Character" className="pointer-events-none max-h-64 object-contain drop-shadow-xl" crossOrigin="anonymous" />
                    {selectedId === item.id && (
                        <>
                            <button 
                                className="absolute -top-4 -right-4 bg-red-400 text-white p-2 rounded-full shadow-lg hover:bg-red-500 transition-colors border-2 border-white"
                                onPointerDown={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                            >
                                <X size={16} />
                            </button>
                        </>
                    )}
                </div>
            )}

            {item.type === 'bubble' && (
                <div className="relative">
                    {/* The Tail (Rotatable) - Rendered BEHIND the bubble container for better layering */}
                    <div 
                        className="absolute top-1/2 left-1/2 w-full h-full pointer-events-none z-0"
                        style={{
                            transform: `translate(-50%, -50%) rotate(${item.tailAngle || 90}deg)`
                        }}
                    >
                        <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2">
                             {item.bubbleStyle === 'speech' ? (
                                 <svg width="40" height="50" viewBox="0 0 40 50" className="drop-shadow-sm">
                                     {/* Main triangle tail */}
                                     <path d="M 0 0 L 20 45 L 40 0 Z" fill="white" stroke="#6D597A" strokeWidth="3" />
                                     {/* White patch to hide the top border so it blends with bubble */}
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

                    {/* Bubble Container */}
                    <div 
                        className={`relative min-w-[150px] min-h-[80px] p-4 flex items-center justify-center text-center transition-all z-10
                        ${selectedId === item.id ? 'ring-4 ring-gacha-sky ring-dashed' : ''}
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

                     {/* Controls (Only when selected) */}
                     {selectedId === item.id && (
                        <>
                            {/* Delete */}
                            <button 
                                className="absolute -top-3 -right-3 z-50 bg-red-400 text-white p-2 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-transform"
                                onPointerDown={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}
                            >
                                <X size={14} />
                            </button>
                            
                            {/* Change Style */}
                            <button 
                                className="absolute -bottom-3 -right-3 z-50 bg-gacha-sky text-white p-2 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-transform"
                                onPointerDown={(e) => { 
                                    e.stopPropagation(); 
                                    onUpdateItem(item.id, { bubbleStyle: item.bubbleStyle === 'speech' ? 'thought' : 'speech'});
                                }}
                            >
                                {item.bubbleStyle === 'speech' ? <RefreshCw size={14} /> : <MessageCircle size={14} />}
                            </button>

                             {/* Rotate Tail Control */}
                             <button 
                                className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-gacha-hot text-white p-2 px-3 rounded-full shadow-lg flex items-center gap-1 text-xs font-bold border-2 border-white hover:scale-105 transition-transform"
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