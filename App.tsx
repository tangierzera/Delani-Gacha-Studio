import React, { useState, useRef } from 'react';
import { SceneItem, BackgroundImage, AspectRatio, StoredScene, SceneFilter } from './types';
import Stage from './components/Stage';
import EraserModal from './components/EraserModal';
import { searchPinterestBackgrounds } from './services/serpApiService';
import { 
  ImagePlus, MessageCircleHeart, Image as ImageIcon, 
  Camera, Trash2, X, Heart, Sparkles, Eye, EyeOff, 
  Smartphone, Monitor, Square, Sticker, Upload, Wand2
} from 'lucide-react';
import html2canvas from 'html2canvas';

// --- STICKER PACK ---
const STICKERS = ["❤️", "✨", "💢", "💧", "🌸", "🎀", "⭐", "🎵", "💤", "🔥", "🦋", "🍄", "🐱", "🐰", "👑", "💎"];

const App: React.FC = () => {
  const [resetKey, setResetKey] = useState(0); 
  const [items, setItems] = useState<SceneItem[]>([]);
  const [background, setBackground] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const [showEraser, setShowEraser] = useState(false);
  const [tempImageForEraser, setTempImageForEraser] = useState<string | null>(null);
  const [showBgSearch, setShowBgSearch] = useState(false);
  const [bgQuery, setBgQuery] = useState('');
  const [bgResults, setBgResults] = useState<BackgroundImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'none' | 'bg' | 'sticker' | 'filter'>('none');
  const [showHistory, setShowHistory] = useState(false);
  const [scenes, setScenes] = useState<StoredScene[]>([]);
  
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  const [activeFilter, setActiveFilter] = useState<SceneFilter>('none');
  const [isBgLocked, setIsBgLocked] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  
  const charInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleAddItem = (type: 'character' | 'dialogue' | 'sticker', payload?: string) => {
    const newItem: SceneItem = {
      id: Date.now().toString(),
      type,
      x: 0, 
      y: 0, 
      scale: 1,
      rotation: 0,
      zIndex: items.length + 1,
      visible: true,
      locked: false,
      src: type === 'character' ? payload : undefined,
      text: type === 'dialogue' ? 'Digite a fala aqui...' : undefined,
      dialogueName: type === 'dialogue' ? 'Nome' : undefined,
      nameColor: type === 'dialogue' ? '#FF8FAB' : undefined,
      dialogueStyle: 'speech', // Default
      tailAngle: 0, // Default bottom
      flipX: false,
      emoji: type === 'sticker' ? payload : undefined,
    };
    
    // Auto-position dialogue at bottom
    if (type === 'dialogue') {
        newItem.y = 200; // Lower on screen
    }

    setItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
    if(type !== 'sticker') setActiveTab('none'); 
  };

  const handleUpdateItem = (id: string, updates: Partial<SceneItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleClearAll = () => {
    if (window.confirm("Deseja apagar tudo?")) {
        setItems([]);
        setBackground(null);
        setSelectedId(null);
        setIsBgLocked(true);
        setActiveTab('none');
        setResetKey(prev => prev + 1); 
    }
  };

  // --- Uploads ---
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

  // --- CAPTURE LOGIC (SENIOR DEVELOPER FIX) ---
  const handleCaptureScene = async () => {
    setSelectedId(null);
    setIsCapturing(true);

    setTimeout(async () => {
        const stageElement = document.getElementById('canvas-area');
        if (!stageElement) { setIsCapturing(false); return; }

        try {
            const rect = stageElement.getBoundingClientRect();

            const canvas = await html2canvas(stageElement, {
                useCORS: true, 
                allowTaint: true, 
                scale: 3, // High Resolution
                backgroundColor: null,
                logging: false,
                width: rect.width,
                height: rect.height,
                scrollX: 0,
                scrollY: -window.scrollY, 
                onclone: (clonedDoc) => {
                    // 1. Fix Image containment
                    const images = clonedDoc.querySelectorAll('img');
                    images.forEach((img: any) => img.style.objectFit = 'contain');
                    
                    // 2. DIALOGUE FIX (The "Spacing" Killer)
                    const processTextField = (selector: string) => {
                        const elements = clonedDoc.querySelectorAll(selector);
                        elements.forEach((el: any) => {
                            const rawText = el.innerText;
                            // Clean contentEditable artifacts
                            el.removeAttribute('contenteditable');
                            // Ensure text fits perfectly
                            el.style.display = 'block';
                            el.style.overflowWrap = 'break-word'; 
                            el.style.whiteSpace = 'pre-wrap'; 
                            el.style.lineHeight = '1.25';
                            el.innerText = rawText.trim(); 
                        });
                    }

                    processTextField('[data-dialogue-text]');
                    processTextField('[data-dialogue-name]');
                }
            });
            
            setScenes(prev => [{
                id: Date.now().toString(),
                thumbnail: canvas.toDataURL('image/png', 1.0),
                timestamp: Date.now()
            }, ...prev]);
            
            setShowHistory(true);

        } catch (err) {
            console.error(err);
            alert("Erro ao salvar.");
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
    <div className="flex h-[100dvh] bg-[#FFF0F5] font-sans overflow-hidden relative select-none text-gray-700">
      
      {/* --- Main Area --- */}
      <div className="flex-1 flex flex-col relative w-full h-full">
          
          {/* Header */}
          <header className={`absolute top-0 w-full z-40 p-4 flex justify-between items-start transition-transform duration-300 ${uiVisible && !isCapturing ? 'translate-y-0' : '-translate-y-32'}`}>
            <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border-2 border-pink-200 flex items-center gap-2 animate-slide-up">
                <Heart size={20} className="text-[#FF8FAB] fill-[#FF8FAB] animate-[pulse_1.5s_infinite]" />
                <h1 className="text-lg font-bold text-[#FF8FAB]">Delani Studio</h1>
            </div>

            <div className="flex flex-col items-end gap-3 pointer-events-auto">
                <div className="flex gap-2">
                    <button onClick={handleClearAll} className="w-10 h-10 bg-white text-red-400 rounded-full shadow-md flex items-center justify-center border-2 border-white hover:bg-red-50" title="Limpar Tudo"><Trash2 size={18} /></button>
                    <button onClick={handleCaptureScene} disabled={isCapturing} className="bg-[#FF8FAB] text-white px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 border-2 border-white hover:scale-105 transition-transform">
                        {isCapturing ? <Sparkles className="animate-spin" size={18} /> : <Camera size={18} />} 
                        <span className="hidden sm:inline">Salvar</span>
                    </button>
                </div>
                
                {/* Ratio Controls */}
                <div className="bg-white/90 backdrop-blur p-1.5 rounded-2xl shadow-lg border border-pink-100 flex flex-col gap-1">
                    <button onClick={() => setAspectRatio('9:16')} className={`p-2 rounded-xl ${aspectRatio === '9:16' ? 'bg-pink-100 text-pink-500' : 'text-gray-400'}`}><Smartphone size={18}/></button>
                    <button onClick={() => setAspectRatio('1:1')} className={`p-2 rounded-xl ${aspectRatio === '1:1' ? 'bg-pink-100 text-pink-500' : 'text-gray-400'}`}><Square size={18}/></button>
                    <button onClick={() => setAspectRatio('16:9')} className={`p-2 rounded-xl ${aspectRatio === '16:9' ? 'bg-pink-100 text-pink-500' : 'text-gray-400'}`}><Monitor size={18}/></button>
                </div>
                
                <button onClick={() => setShowHistory(true)} className="bg-white text-pink-400 p-2.5 rounded-2xl shadow-lg border border-pink-100 mt-1"><ImageIcon size={18} /></button>
            </div>
          </header>

          {/* Stage Area */}
          <main className="flex-1 w-full h-full relative">
            <Stage 
                key={resetKey}
                items={items}
                backgroundUrl={background}
                selectedId={selectedId}
                isBgLocked={isBgLocked}
                isSaving={isCapturing}
                aspectRatio={aspectRatio}
                activeFilter={activeFilter}
                onToggleBgLock={() => setIsBgLocked(!isBgLocked)}
                onSelectItem={(id) => setSelectedId(id)}
                onUpdateItem={handleUpdateItem}
                onRemoveItem={handleRemoveItem}
            />
            {uiVisible && !isCapturing && (
              <div className="absolute bottom-28 right-6 pointer-events-none opacity-80 animate-bounce-slow z-10">
                  <span className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-pink-500 font-bold text-xs shadow-sm flex items-center gap-1">
                     Delani Eu te amo muito! <Heart size={10} className="fill-pink-500"/>
                  </span>
              </div>
            )}
          </main>

          {/* Bottom Toolbar */}
          <footer className={`absolute bottom-6 w-full z-40 transition-transform duration-300 flex justify-center pointer-events-none ${uiVisible && !isCapturing ? 'translate-y-0' : 'translate-y-[150%]'}`}>
             <div className="pointer-events-auto flex flex-col items-center gap-4 w-full max-w-lg px-4">
                
                {/* Dynamic Menus */}
                {activeTab === 'bg' && (
                    <div className="bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-2xl border border-pink-100 w-full animate-slide-up flex gap-2">
                         <button onClick={() => bgInputRef.current?.click()} className="flex-1 bg-purple-50 p-3 rounded-xl flex flex-col items-center gap-1 text-purple-500 hover:bg-purple-100 transition-colors"><Upload size={20}/><span className="text-[10px] font-bold">Upload</span></button>
                         <button onClick={() => { setShowBgSearch(true); setActiveTab('none'); }} className="flex-1 bg-red-50 p-3 rounded-xl flex flex-col items-center gap-1 text-red-500 hover:bg-red-100 transition-colors"><Sparkles size={20}/><span className="text-[10px] font-bold">Pinterest</span></button>
                    </div>
                )}
                {activeTab === 'sticker' && (
                    <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-pink-100 w-full animate-slide-up">
                        <div className="grid grid-cols-8 gap-2">
                            {STICKERS.map(s => <button key={s} onClick={() => handleAddItem('sticker', s)} className="text-2xl hover:scale-125 transition-transform">{s}</button>)}
                        </div>
                    </div>
                )}
                {activeTab === 'filter' && (
                    <div className="bg-white/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-pink-100 w-full animate-slide-up flex gap-2 overflow-x-auto">
                        <button onClick={() => setActiveFilter('none')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${activeFilter === 'none' ? 'border-pink-400 bg-pink-50 text-pink-500' : 'border-gray-100 text-gray-500'}`}>Normal</button>
                        <button onClick={() => setActiveFilter('dreamy')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${activeFilter === 'dreamy' ? 'border-purple-400 bg-purple-50 text-purple-500' : 'border-gray-100 text-gray-500'}`}>Dreamy</button>
                        <button onClick={() => setActiveFilter('vintage')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${activeFilter === 'vintage' ? 'border-amber-400 bg-amber-50 text-amber-500' : 'border-gray-100 text-gray-500'}`}>Vintage</button>
                        <button onClick={() => setActiveFilter('night')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${activeFilter === 'night' ? 'border-blue-400 bg-blue-50 text-blue-500' : 'border-gray-100 text-gray-500'}`}>Night</button>
                        <button onClick={() => setActiveFilter('warm')} className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${activeFilter === 'warm' ? 'border-orange-400 bg-orange-50 text-orange-500' : 'border-gray-100 text-gray-500'}`}>Warm</button>
                    </div>
                )}

                {/* Main Bar */}
                <div className="bg-white/95 backdrop-blur-xl shadow-2xl rounded-full p-2 px-6 border-2 border-white ring-4 ring-pink-100 flex items-center justify-between gap-2 w-full">
                    <ToolBtn icon={<ImagePlus size={22}/>} label="Boneco" color="pink" onClick={() => charInputRef.current?.click()}/>
                    <input type="file" ref={charInputRef} className="hidden" accept="image/*" onChange={handleCharUpload} />
                    
                    <ToolBtn icon={<ImageIcon size={22}/>} label="Fundo" color="purple" active={activeTab === 'bg'} onClick={() => setActiveTab(activeTab === 'bg' ? 'none' : 'bg')}/>
                    <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
                    
                    <ToolBtn icon={<MessageCircleHeart size={22}/>} label="Fala" color="blue" onClick={() => handleAddItem('dialogue')}/>
                    
                    <ToolBtn icon={<Sticker size={22}/>} label="Decorar" color="yellow" active={activeTab === 'sticker'} onClick={() => setActiveTab(activeTab === 'sticker' ? 'none' : 'sticker')}/>

                    <ToolBtn icon={<Wand2 size={22}/>} label="Filtro" color="yellow" active={activeTab === 'filter'} onClick={() => setActiveTab(activeTab === 'filter' ? 'none' : 'filter')}/>
                    
                    <div className="w-px h-8 bg-gray-200 mx-1"></div>
                    <button onClick={() => setUiVisible(false)} className="opacity-40 hover:opacity-100"><EyeOff size={20}/></button>
                </div>
             </div>
          </footer>
      </div>

      {/* --- Restorer --- */}
      {!uiVisible && !isCapturing && (
          <button onClick={() => setUiVisible(true)} className="fixed bottom-6 right-6 z-50 bg-white p-4 rounded-full shadow-xl animate-bounce text-pink-500"><Eye size={24} /></button>
      )}

      {/* --- Modals --- */}
      {showEraser && tempImageForEraser && <EraserModal imageSrc={tempImageForEraser} onSave={handleEraserSave} onClose={() => setShowEraser(false)} />}
      
      {showBgSearch && (
        <div className="fixed inset-0 z-50 bg-pink-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#FFF0F5] w-full max-w-4xl h-[85vh] rounded-[2rem] flex flex-col shadow-2xl border-4 border-white overflow-hidden">
                <div className="p-4 bg-white flex justify-between items-center shadow-sm">
                    <h3 className="font-bold text-pink-500 text-xl flex gap-2"><Sparkles/> Pinterest</h3>
                    <button onClick={() => setShowBgSearch(false)} className="bg-pink-100 p-2 rounded-full text-pink-400"><X/></button>
                </div>
                <div className="p-4 bg-white/50 flex gap-2">
                    <input value={bgQuery} onChange={(e) => setBgQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchBackground()} placeholder="Ex: Quarto anime rosa..." className="flex-1 p-3 rounded-xl border-2 border-pink-200 outline-none bg-white text-gray-800 placeholder-gray-400 shadow-inner"/>
                    <button onClick={handleSearchBackground} disabled={isSearching} className="bg-pink-400 text-white px-6 rounded-xl font-bold">{isSearching ? '...' : 'Buscar'}</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {bgResults.map((bg, idx) => (
                        <button key={idx} onClick={() => { setBackground(bg.url); setShowBgSearch(false); }} className="aspect-video rounded-xl overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform">
                            <img src={bg.url} className="w-full h-full object-cover" loading="lazy" />
                        </button>
                    ))}
                    <div className="h-10 col-span-full"></div>
                </div>
            </div>
        </div>
      )}

      {showHistory && (
          <div className="fixed inset-0 z-50 flex justify-end">
              <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
              <div className="w-80 bg-white h-full relative z-10 shadow-2xl flex flex-col animate-[slideLeft_0.3s]">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-pink-50">
                      <h2 className="font-bold text-pink-500">Galeria</h2>
                      <button onClick={() => setShowHistory(false)}><X size={20} className="text-gray-400"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {scenes.map((scene) => (
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

const ToolBtn = ({ icon, label, color, onClick, active }: any) => {
    const colors: any = { pink: 'from-pink-400 to-rose-400', purple: 'from-purple-400 to-violet-400', blue: 'from-blue-400 to-cyan-400', yellow: 'from-amber-300 to-orange-300' };
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1 group w-14 transition-transform active:scale-95 ${active ? '-translate-y-2' : ''}`}>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md bg-gradient-to-br ${colors[color]} ${active ? 'ring-4 ring-white shadow-xl' : ''} group-hover:scale-110 transition-all border-2 border-white`}>{icon}</div>
            <span className={`text-[10px] font-bold ${active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
        </button>
    )
}

export default App;