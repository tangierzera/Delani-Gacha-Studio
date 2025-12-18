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
      // Logic to FIT image perfectly
      const padding = 40;
      const maxWidth = window.innerWidth - padding;
      const maxHeight = window.innerHeight * 0.65;
      
      let width = img.width;
      let height = img.height;
      
      const scale = Math.min(maxWidth / width, maxHeight / height);
      const finalWidth = Math.floor(width * scale);
      const finalHeight = Math.floor(height * scale);

      canvas.width = finalWidth;
      canvas.height = finalHeight;
      
      ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
      saveState(); 
      setTimeout(() => autoDetectBackground(ctx, finalWidth, finalHeight), 100);
    };
  }, [imageSrc]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    setHistory(prev => {
        const newHistory = [...prev, ctx!.getImageData(0, 0, canvas.width, canvas.height)];
        if (newHistory.length > 10) return newHistory.slice(newHistory.length - 10);
        return newHistory;
    });
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const newHistory = [...history];
    newHistory.pop();
    const prevState = newHistory[newHistory.length - 1];
    ctx!.putImageData(prevState, 0, 0);
    setHistory(newHistory);
  };

  // --- Magic Wand Logic (Simplified for brevity but functional) ---
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
    const [startR, startG, startB, startA] = [data[pixelPos], data[pixelPos+1], data[pixelPos+2], data[pixelPos+3]];

    if (startA === 0 && !isAuto) return;

    // Simple Flood Fill
    const queue = [[Math.floor(startX), Math.floor(startY)]];
    const seen = new Uint8Array(width * height);
    
    while (queue.length > 0) {
        const [cx, cy] = queue.pop()!;
        const idx = cy * width + cx;
        if (seen[idx]) continue;
        
        const pos = idx * 4;
        const r = data[pos], g = data[pos+1], b = data[pos+2], a = data[pos+3];

        if (a !== 0 && Math.sqrt((r-startR)**2 + (g-startG)**2 + (b-startB)**2) <= tolerance) {
            data[pos + 3] = 0;
            seen[idx] = 1;
            if (cx > 0) queue.push([cx - 1, cy]);
            if (cx < width - 1) queue.push([cx + 1, cy]);
            if (cy > 0) queue.push([cx, cy - 1]);
            if (cy < height - 1) queue.push([cx, cy + 1]);
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
    saveState();
  };

  const erase = (x: number, y: number) => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  };

  const getPos = (e: any) => {
     const rect = canvasRef.current!.getBoundingClientRect();
     const clientX = e.touches ? e.touches[0].clientX : e.clientX;
     const clientY = e.touches ? e.touches[0].clientY : e.clientY;
     return { x: clientX - rect.left, y: clientY - rect.top };
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#2D1B2E] flex flex-col animate-[fadeIn_0.2s]">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white">
         <h3 className="text-lg font-bold flex gap-2 items-center"><Eraser size={20}/> Recortar</h3>
         <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={20} /></button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center bg-[url('https://media.istockphoto.com/id/1136365444/vector/transparent-background-seamless-pattern.jpg?s=612x612&w=0&k=20&c=2d6k2q9Z8g1Z8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8qZ8=')] overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => { setIsDrawing(true); if(mode==='manual') erase(getPos(e).x, getPos(e).y); else performMagicWand(getPos(e).x, getPos(e).y); }}
          onMouseMove={(e) => { if(mode==='manual' && isDrawing) erase(getPos(e).x, getPos(e).y); }}
          onMouseUp={() => { setIsDrawing(false); if(mode==='manual') saveState(); }}
          onTouchStart={(e) => { setIsDrawing(true); const {x,y} = getPos(e); if(mode==='manual') erase(x,y); else performMagicWand(x,y); }}
          onTouchMove={(e) => { if(mode==='manual') erase(getPos(e).x, getPos(e).y); }}
          onTouchEnd={() => { setIsDrawing(false); if(mode==='manual') saveState(); }}
          className="touch-none shadow-2xl"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-[#4A2B4C] p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex gap-2 mb-6">
            <button onClick={() => setMode('magic')} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${mode === 'magic' ? 'bg-[#FF8FAB] text-white shadow-lg translate-y-[-2px]' : 'bg-[#2D1B2E] text-gray-400'}`}><Wand2 size={18} /> Mágica</button>
            <button onClick={() => setMode('manual')} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${mode === 'manual' ? 'bg-[#FF8FAB] text-white shadow-lg translate-y-[-2px]' : 'bg-[#2D1B2E] text-gray-400'}`}><Eraser size={18} /> Borracha</button>
        </div>

        <div className="flex items-center gap-4 mb-6">
            <span className="text-pink-200 font-bold text-xs uppercase w-12">{mode === 'magic' ? 'Força' : 'Tamanho'}</span>
            <input 
                type="range" min="1" max="100" 
                value={mode === 'magic' ? tolerance : brushSize}
                onChange={(e) => mode === 'magic' ? setTolerance(Number(e.target.value)) : setBrushSize(Number(e.target.value))}
                className="flex-1 h-3 bg-[#2D1B2E] rounded-full appearance-none accent-[#FF8FAB]"
            />
        </div>

        <div className="flex justify-between items-center border-t border-white/10 pt-4">
            <button onClick={handleUndo} className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20"><Undo size={24} /></button>
            <button onClick={() => {const c=canvasRef.current; onSave(c!.toDataURL())}} className="px-8 py-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold shadow-lg hover:scale-105 transition-transform flex items-center gap-2"><Check size={20} /> Pronto</button>
        </div>
      </div>
    </div>
  );
};

export default EraserModal;
