import React, { useState, useRef, useEffect } from 'react';
import { SceneItem, BackgroundImage, AspectRatio, StoredScene } from './types';
import Stage from './components/Stage';
import EraserModal from './components/EraserModal';
import { searchPinterestBackgrounds } from './services/serpApiService';
import { 
  ImagePlus, MessageCircleHeart, Image as ImageIcon, Download, 
  Camera, Trash2, X, Heart, Sparkles, Eye, EyeOff, 
  Smartphone, Monitor, Square, RefreshCcw, Sticker, Upload
} from 'lucide-react';
import html2canvas from 'html2canvas';

// --- STICKER PACK (New Feature) ---
const STICKERS = ["❤️", "✨", "💢", "💧", "🌸", "🎀", "⭐", "🎵", "💤", "🔥", "🦋", "🍄"];

const App: React.FC = () => {
  // --- State ---
  // resetKey is the "Nuclear Option". Changing it destroys the Stage and recreates it fresh.
  const [resetKey, setResetKey] = useState(0);
  
  const [items, setItems] = useState<SceneItem[]>([]);
  const [background, setBackground] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Modals & Flows
  const [showEraser, setShowEraser] = useState(false);
  const [tempImageForEraser, setTempImageForEraser] = useState<string | null>(null);
  
  const [showBgSearch, setShowBgSearch] = useState(false);
  const [bgQuery, setBgQuery] = useState('');
  const [bgResults, setBgResults] = useState<BackgroundImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // UI Panels
  const [activeTab, setActiveTab] = useState<'none' | 'bg' | 'sticker'>('none');
  const [showHistory, setShowHistory] = useState(false);
  const [scenes, setScenes] = useState<StoredScene[]>([]);
  
  // Configs
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [isBgLocked, setIsBgLocked] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  
  // Refs
  const charInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // --- Core Logic ---

  const handleAddItem = (type: 'character' | 'bubble' | 'sticker', payload?: string) => {
    const newItem: SceneItem = {
      id: Date.now().toString(),
      type,
      x: 0, 
      y: 0, 
      scale: 1,
      rotation: 0,
      zIndex: items.length + 1,
      // Logic mapping based on type
      src: type === 'character' ? payload : undefined,
      text: type === 'bubble' ? 'Digite aqui...' : undefined,
      emoji: type === 'sticker' ? payload : undefined,
      bubbleStyle: 'speech',
      locked: false,
      tailAngle: 45
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
    setActiveTab('none'); // Close menus on add
  };

  const handleUpdateItem = (id: string, updates: Partial<SceneItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // --- THE SENIOR RESET FIX ---
  const handleClearAll = () => {
    if (window.confirm("Limpar toda a tela e começar do zero?")) {
        // We reset the data...
        setItems([]);
        setBackground(null);
        setSelectedId(null);
        setIsBgLocked(true);
        setActiveTab('none');
        
        // ... AND we increment the key to force React to unmount/remount the Stage
        setResetKey(prev => prev + 1);
    }
  };

  // --- Image Flows ---
  const handleCharUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setTempImageForEraser(ev.target.result as string);
          setShowEraser(true);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    if (charInputRef.current) charInputRef.current.value = '';
  };

  const handleEraserSave = (processedImage: string) => {
    handleAddItem('character', processedImage);
    setShowEraser(false);
    setTempImageForEraser(null);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setBackground(ev.target.result as string);
            setActiveTab('none');
          }
        };
        reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleSearchBackground = async () => {
    if(!bgQuery) return;
    setIsSearching(true);
    const results = await searchPinterestBackgrounds(bgQuery);
    setBgResults(results);
    setIsSearching(false);
  };

  // --- Capture Logic (Fixed for Bubbles) ---
  const handleCaptureScene = async () => {
    setSelectedId(null);
    setIsCapturing(true);

    // Small delay to let UI hide and React render the "clean" state
    setTimeout(async () => {
        const stageElement = document.getElementById('canvas-area');
        if (!stageElement) {
            setIsCapturing(false);
            return;
        }

        try {
            const canvas = await html2canvas(stageElement, {
                useCORS: true, 
                allowTaint: true, 
                scale: 3, // High resolution (3x)
                backgroundColor: null,
                logging: false,
                onclone: (clonedDoc) => {
                    // --- THE FIX: Force styles on the cloned DOM before painting ---
                    const bubbles = clonedDoc.querySelectorAll('[data-bubble-text]');
                    bubbles.forEach((el: any) => {
                        // Hardcode CSS for the screenshot to prevent whitespace
                        el.style.lineHeight = '1.2';
                        el.style.display = 'block'; 
                        el.style.margin = '0';
                        el.style.padding = '0';
                        el.style.height = 'auto'; 
                    });
                    
                    // Fix Image Aspect Ratios
                    const images = clonedDoc.querySelectorAll('img');
                    images.forEach((img: any) => {
                        img.style.objectFit = 'contain';
                    });
                }
            });
            
            const imgData = canvas.toDataURL('image/png', 1.0);
            
            // Add to history
            setScenes(prev => [{
                id: Date.now().toString(),
                thumbnail: imgData,
                timestamp: Date.now()
            }, ...prev]);
            
            setShowHistory(true);

        } catch (err) {
            console.error("Capture failed:", err);
            alert("Erro ao salvar imagem.");
        } finally {
            setIsCapturing(false);
        }
    }, 200); 
  };

  const downloadScene = (dataUrl: string) => {
      const link = document.createElement('a');
      link.download = `delani-studio-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#FFF0F5] font-sans overflow-hidden relative select-none">
      
      {/* --- Header --- */}
      <header 
        className={`absolute top-0 w-full z-40 transition-transform duration-300 ${uiVisible && !isCapturing ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex justify-between items-center p-4">
            {/* Title */}
            <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border-2 border-pink-200 flex items-center gap-2">
                <Heart size={20} className="text-[#FF8FAB] fill-[#FF8FAB] animate-[pulse_1.5s_infinite]" />
                <h1 className="text-lg font-bold text-[#FF8FAB] tracking-wide">Delani Studio</h1>
            </div>

            {/* Top Actions */}
            <div className="flex gap-2">
                <button 
                    onClick={handleClearAll}
                    className="w-10 h-10 bg-white text-red-400 rounded-full shadow-md flex items-center justify-center border-2 border-white active:scale-95 transition-all"
                    title="Limpar Tudo"
                >
                    <RefreshCcw size={18} />
                </button>
                
                <button 
                    onClick={handleCaptureScene}
                    disabled={isCapturing}
                    className="bg-[#FF8FAB] text-white px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 active:scale-95 transition-all border-2 border-white"
                >
                    {isCapturing ? <Sparkles className="animate-spin" size={18} /> : <Camera size={18} />} 
                    <span className="hidden sm:inline">Salvar</span>
                </button>
            </div>
        </div>

        {/* Aspect Ratio Selector (Floating) */}
        <div className="absolute top-20 right-4 flex flex-col gap-2 pointer-events-auto">
             <div className="bg-white/90 backdrop-blur p-2 rounded-2xl shadow-xl border border-pink-100 flex flex-col gap-2">
                <button onClick={() => setAspectRatio('9:16')} className={`p-2 rounded-xl transition-all ${aspectRatio === '9:16' ? 'bg-pink-100 text-pink-500' : 'text-gray-400'}`}><Smartphone size={20}/></button>
                <button onClick={() => setAspectRatio('1:1')} className={`p-2 rounded-xl transition-all ${aspectRatio === '1:1' ? 'bg-pink-100 text-pink-500' : 'text-gray-400'}`}><Square size={20}/></button>
                <button onClick={() => setAspectRatio('16:9')} className={`p-2 rounded-xl transition-all ${aspectRatio === '16:9' ? 'bg-pink-100 text-pink-500' : 'text-gray-400'}`}><Monitor size={20}/></button>
             </div>
             
             <button 
                onClick={() => setShowHistory(!showHistory)}
                className="bg-white text-pink-400 p-3 rounded-2xl shadow-xl border border-pink-100 mt-2 active:scale-95"
             >
                <ImageIcon size={20} />
             </button>
        </div>
      </header>

      {/* --- Main Stage --- */}
      <main className="flex-1 w-full h-full relative">
        <Stage 
            key={resetKey} // THE NUCLEAR RESET KEY
            items={items}
            backgroundUrl={background}
            selectedId={selectedId}
            isBgLocked={isBgLocked}
            isSaving={isCapturing}
            aspectRatio={aspectRatio}
            onToggleBgLock={() => setIsBgLocked(!isBgLocked)}
            onSelectItem={setSelectedId}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
        />
        
        {/* Helper Message (Visible only when UI is on) */}
        {uiVisible && !isCapturing && (
          <div className="absolute bottom-32 right-6 pointer-events-none opacity-80 animate-bounce-slow z-10">
              <span className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-pink-500 font-bold text-xs shadow-sm flex items-center gap-1">
                 Delani Eu te amo muito! <Heart size={10} className="fill-pink-500"/>
              </span>
          </div>
        )}
      </main>

      {/* --- Bottom Toolbar (Floating Island) --- */}
      <footer 
        className={`absolute bottom-6 left-0 right-0 z-40 transition-transform duration-300 ${uiVisible && !isCapturing ? 'translate-y-0' : 'translate-y-[150%]'}`}
      >
        <div className="flex justify-center items-end relative px-4">
            
            {/* Popups Menus */}
            {activeTab === 'bg' && (
                <div className="absolute bottom-24 bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border-2 border-pink-100 w-full max-w-sm animate-slide-up flex flex-col gap-3">
                    <div className="flex gap-2">
                        <button onClick={() => bgInputRef.current?.click()} className="flex-1 bg-purple-50 p-3 rounded-xl flex flex-col items-center gap-1 text-purple-500 hover:bg-purple-100">
                            <Upload size={20}/> <span className="text-xs font-bold">Galeria</span>
                        </button>
                        <button onClick={() => { setShowBgSearch(true); setActiveTab('none'); }} className="flex-1 bg-red-50 p-3 rounded-xl flex flex-col items-center gap-1 text-red-500 hover:bg-red-100">
                            <Sparkles size={20}/> <span className="text-xs font-bold">Pinterest</span>
                        </button>
                    </div>
                    <button onClick={() => setActiveTab('none')} className="w-full py-2 text-gray-400 text-xs font-bold">Fechar</button>
                </div>
            )}

            {activeTab === 'sticker' && (
                <div className="absolute bottom-24 bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border-2 border-pink-100 w-full max-w-sm animate-slide-up">
                    <div className="grid grid-cols-6 gap-2">
                        {STICKERS.map(s => (
                            <button key={s} onClick={() => handleAddItem('sticker', s)} className="text-2xl hover:scale-125 transition-transform p-1">
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Bar */}
            <div className="bg-white/95 backdrop-blur-xl shadow-[0_10px_40px_-10px_rgba(255,143,171,0.4)] rounded-full p-2 px-6 border border-white ring-4 ring-pink-100 flex items-center gap-4 md:gap-8">
                
                <ToolBtn 
                    icon={<ImagePlus size={24} />} 
                    label="Boneco" 
                    color="pink" 
                    onClick={() => charInputRef.current?.click()} 
                />
                <input type="file" ref={charInputRef} className="hidden" accept="image/*" onChange={handleCharUpload} />

                <ToolBtn 
                    icon={<ImageIcon size={24} />} 
                    label="Fundo" 
                    color="purple" 
                    active={activeTab === 'bg'}
                    onClick={() => setActiveTab(activeTab === 'bg' ? 'none' : 'bg')} 
                />
                <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />

                <ToolBtn 
                    icon={<MessageCircleHeart size={24} />} 
                    label="Fala" 
                    color="blue" 
                    onClick={() => handleAddItem('bubble')} 
                />

                <ToolBtn 
                    icon={<Sticker size={24} />} 
                    label="Decorar" 
                    color="yellow" 
                    active={activeTab === 'sticker'}
                    onClick={() => setActiveTab(activeTab === 'sticker' ? 'none' : 'sticker')} 
                />
                
                <div className="w-px h-8 bg-gray-200 mx-1"></div>

                <button onClick={() => setUiVisible(false)} className="opacity-50 hover:opacity-100 transition-opacity">
                    <EyeOff size={20} className="text-gray-400"/>
                </button>
            </div>
        </div>
      </footer>

      {/* --- UI Visibility Restorer --- */}
      {!uiVisible && !isCapturing && (
          <button onClick={() => setUiVisible(true)} className="absolute bottom-6 right-6 z-50 bg-white p-4 rounded-full shadow-xl animate-bounce text-pink-500">
              <Eye size={24} />
          </button>
      )}

      {/* --- Modals --- */}
      
      {/* Eraser / Cutout */}
      {showEraser && tempImageForEraser && (
        <EraserModal 
          imageSrc={tempImageForEraser}
          onSave={handleEraserSave}
          onClose={() => setShowEraser(false)}
        />
      )}

      {/* Pinterest Search */}
      {showBgSearch && (
        <div className="fixed inset-0 z-50 bg-pink-900/30 backdrop-blur-md flex items-center justify-center p-4 animate-[fadeIn_0.2s]">
            <div className="bg-[#FFF0F5] w-full max-w-4xl h-[85vh] rounded-[2rem] flex flex-col overflow-hidden shadow-2xl border-4 border-white">
                <div className="p-4 bg-white flex justify-between items-center shadow-sm z-10">
                    <h3 className="font-bold text-pink-500 text-xl flex items-center gap-2">
                        <Sparkles size={20}/> Pinterest
                    </h3>
                    <button onClick={() => setShowBgSearch(false)} className="bg-pink-100 p-2 rounded-full text-pink-400"><X/></button>
                </div>
                
                <div className="p-4 bg-white/50">
                    <div className="flex gap-2">
                        <input 
                            value={bgQuery}
                            onChange={(e) => setBgQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchBackground()}
                            placeholder="Ex: Quarto fofo anime..."
                            className="flex-1 p-3 rounded-xl border-2 border-pink-200 focus:border-pink-400 outline-none bg-white text-gray-600"
                        />
                        <button 
                            onClick={handleSearchBackground}
                            disabled={isSearching}
                            className="bg-pink-400 text-white px-6 rounded-xl font-bold hover:bg-pink-500 disabled:opacity-50"
                        >
                            {isSearching ? '...' : 'Buscar'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {bgResults.length === 0 && !isSearching && (
                            <div className="col-span-full text-center text-pink-300 mt-20 font-bold">
                                Pesquise algo fofo! ✨
                            </div>
                        )}
                        {bgResults.map((bg, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => { setBackground(bg.url); setShowBgSearch(false); }}
                                className="aspect-video rounded-xl overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform"
                            >
                                <img src={bg.url} alt="bg" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                    {/* Padding for bottom scroll */}
                    <div className="h-10"></div>
                </div>
            </div>
        </div>
      )}

      {/* History Sidebar */}
      {showHistory && (
          <div className="fixed inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
              <div className="w-80 bg-white h-full relative z-10 shadow-2xl flex flex-col animate-[slideLeft_0.3s]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-pink-50">
                      <h2 className="font-bold text-pink-500">Minhas Cenas</h2>
                      <button onClick={() => setShowHistory(false)}><X size={20} className="text-gray-400"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {scenes.length === 0 && <p className="text-center text-gray-400 mt-10 text-sm">Nenhuma cena salva ainda.</p>}
                      {scenes.map((scene, i) => (
                          <div key={scene.id} className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                              <img src={scene.thumbnail} className="w-full rounded-lg bg-white shadow-sm" />
                              <div className="flex gap-2 mt-2">
                                  <button onClick={() => downloadScene(scene.thumbnail)} className="flex-1 bg-pink-400 text-white py-1 rounded-lg text-xs font-bold">Baixar</button>
                                  <button onClick={() => setScenes(prev => prev.filter(x => x.id !== scene.id))} className="px-3 bg-white border border-red-100 text-red-400 rounded-lg"><Trash2 size={14}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

// Helper Component for Toolbar Buttons
const ToolBtn = ({ icon, label, color, onClick, active }: any) => {
    const colors: any = {
        pink: 'from-pink-400 to-rose-400',
        purple: 'from-purple-400 to-violet-400',
        blue: 'from-blue-400 to-cyan-400',
        yellow: 'from-amber-300 to-orange-300',
    };

    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center gap-1 group w-14 transition-transform active:scale-95 ${active ? '-translate-y-2' : ''}`}
        >
            <div className={`
                w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md
                bg-gradient-to-br ${colors[color]} ${active ? 'ring-4 ring-white shadow-xl' : ''}
                group-hover:scale-110 transition-all border-2 border-white
            `}>
                {icon}
            </div>
            <span className={`text-[10px] font-bold ${active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
        </button>
    )
}

export default App;
