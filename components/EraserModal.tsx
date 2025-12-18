import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, X, Undo, Wand2, RefreshCcw } from 'lucide-react';

interface EraserModalProps {
  imageSrc: string;
  onSave: (processedImageSrc: string) => void;
  onClose: () => void;
}

type ToolMode = 'manual' | 'magic';

const EraserModal: React.FC<EraserModalProps> = ({ imageSrc, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [tolerance, setTolerance] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [mode, setMode] = useState<ToolMode>('magic');
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      // Logic to FIT image within 85% of screen width/height without cropping
      const padding = 20;
      const maxWidth = window.innerWidth - (padding * 2);
      const maxHeight = window.innerHeight * 0.6; // Leave space for controls
      
      let width = img.width;
      let height = img.height;
      
      const scale = Math.min(maxWidth / width, maxHeight / height);
      
      // If image is smaller than screen, keep original, otherwise scale down
      const finalWidth = Math.floor(width * scale);
      const finalHeight = Math.floor(height * scale);

      canvas.width = finalWidth;
      canvas.height = finalHeight;
      
      // Draw scaled image
      ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
      saveState(); 
      
      setTimeout(() => autoDetectBackground(ctx, finalWidth, finalHeight), 100);
    };
  }, [imageSrc]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setHistory(prev => {
        const newHistory = [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)];
        if (newHistory.length > 15) return newHistory.slice(newHistory.length - 15);
        return newHistory;
    });
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop();
    const prevState = newHistory[newHistory.length - 1];
    ctx.putImageData(prevState, 0, 0);
    setHistory(newHistory);
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      
      let clientX, clientY;
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }
      
      return {
          x: Math.round(clientX - rect.left),
          y: Math.round(clientY - rect.top)
      };
  };

  // --- Magic Wand / Flood Fill Logic ---
  
  const autoDetectBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      performMagicWand(0, 0, true);
  };

  const performMagicWand = (startX: number, startY: number, isAuto = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const pixelPos = (Math.floor(startY) * width + Math.floor(startX)) * 4;
    const startR = data[pixelPos];
    const startG = data[pixelPos + 1];
    const startB = data[pixelPos + 2];
    const startA = data[pixelPos + 3];

    if (startA === 0 && !isAuto) return;

    const isSimilar = (pos: number) => {
        const r = data[pos];
        const g = data[pos + 1];
        const b = data[pos + 2];
        const a = data[pos + 3];
        
        if (a === 0) return true;

        const dist = Math.sqrt(
            Math.pow(r - startR, 2) + 
            Math.pow(g - startG, 2) + 
            Math.pow(b - startB, 2)
        );
        return dist <= tolerance;
    };

    const queue = [[Math.floor(startX), Math.floor(startY)]];
    const seen = new Uint8Array(width * height);
    let pixelsRemoved = 0;
    
    while (queue.length > 0) {
        const [cx, cy] = queue.pop()!;
        const idx = cy * width + cx;
        
        if (seen[idx]) continue;
        
        const pos = idx * 4;
        if (isSimilar(pos)) {
            data[pos + 3] = 0;
            seen[idx] = 1;
            pixelsRemoved++;

            if (cx > 0) queue.push([cx - 1, cy]);
            if (cx < width - 1) queue.push([cx + 1, cy]);
            if (cy > 0) queue.push([cx, cy - 1]);
            if (cy < height - 1) queue.push([cx, cy + 1]);
        }
    }
    
    if (pixelsRemoved > 0) {
        ctx.putImageData(imageData, 0, 0);
        saveState();
    }
  };

  // --- Interaction Handlers ---

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const { x, y } = getCoordinates(e);
    if (mode === 'magic') {
       performMagicWand(x, y);
    } else {
       setIsDrawing(true);
       erase(x, y);
    }
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode === 'manual' && isDrawing) {
        const { x, y } = getCoordinates(e);
        erase(x, y);
    }
  };

  const handlePointerUp = () => {
    if (mode === 'manual' && isDrawing) {
        setIsDrawing(false);
        saveState();
    }
  };

  const erase = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  const triggerAutoRemove = () => {
     const canvas = canvasRef.current;
     if(!canvas) return;
     const ctx = canvas.getContext('2d');
     if(!ctx) return;
     autoDetectBackground(ctx, canvas.width, canvas.height);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-0 animate-fade-in touch-none">
      <div className="w-full flex justify-between items-center text-white p-4 absolute top-0 bg-gradient-to-b from-black/80 to-transparent">
         <div>
            <h3 className="text-lg font-bold">Recorte</h3>
         </div>
         <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
            <X size={20} />
         </button>
      </div>

      <div className="relative w-full h-full flex items-center justify-center bg-[url('https://media.istockphoto.com/id/1136365444/vector/transparent-background-seamless-pattern.jpg?s=612x612&w=0&k=20&c=2d6k2q9Z8g1Z8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8=')]">
        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className={`touch-none max-w-full max-h-full ${mode === 'magic' ? 'cursor-crosshair' : 'cursor-cell'}`}
        />
      </div>

      {/* Toolbar */}
      <div className="absolute bottom-0 w-full bg-gray-900/90 backdrop-blur-md rounded-t-2xl p-4 border-t border-gray-700">
        
        {/* Tool Selection */}
        <div className="flex gap-2 mb-4 bg-gray-800 p-1 rounded-lg">
            <button 
                onClick={() => setMode('magic')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${mode === 'magic' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                <Wand2 size={18} /> Mágica
            </button>
            <button 
                onClick={() => setMode('manual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-all ${mode === 'manual' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                <Eraser size={18} /> Manual
            </button>
        </div>

        {/* Controls */}
        <div className="mb-4">
            {mode === 'magic' ? (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <span className="text-purple-300 text-xs w-16 font-bold">Força</span>
                        <input
                            type="range"
                            min="1"
                            max="100"
                            value={tolerance}
                            onChange={(e) => setTolerance(Number(e.target.value))}
                            className="flex-1 accent-purple-500 h-2 rounded-lg cursor-pointer bg-gray-700"
                        />
                    </div>
                    <button 
                        onClick={triggerAutoRemove}
                        className="w-full py-2 bg-purple-500/30 border border-purple-500/50 rounded-lg text-purple-200 text-xs hover:bg-purple-500/50 flex items-center justify-center gap-2"
                    >
                        <RefreshCcw size={12} /> Tentar Auto-Remover
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    <span className="text-pink-300 text-xs w-16 font-bold">Tamanho</span>
                    <input
                        type="range"
                        min="5"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="flex-1 accent-pink-500 h-2 rounded-lg cursor-pointer bg-gray-700"
                    />
                </div>
            )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-700">
            <button onClick={handleUndo} className="p-3 rounded-full bg-gray-800 text-white hover:bg-gray-700 transition-colors" title="Desfazer">
                <Undo size={20} />
            </button>

            <button onClick={handleSave} className="px-8 py-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                <Check size={20} /> Concluir
            </button>
        </div>
      </div>
    </div>
  );
};

export default EraserModal;