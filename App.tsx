import React, { useState, useRef } from 'react';
import { SceneItem, BackgroundImage } from './types';
import Stage from './components/Stage';
import EraserModal from './components/EraserModal';
import { searchPinterestBackgrounds } from './services/serpApiService';
import { ImagePlus, MessageSquarePlus, Image as ImageIcon, Download, Scissors, Wand2, X, Heart, Star, Sparkles, Eye, EyeOff, Menu } from 'lucide-react';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  // --- State ---
  const [items, setItems] = useState<SceneItem[]>([]);
  const [background, setBackground] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEraser, setShowEraser] = useState(false);
  const [tempImageForEraser, setTempImageForEraser] = useState<string | null>(null);
  const [showBgSearch, setShowBgSearch] = useState(false);
  const [bgQuery, setBgQuery] = useState('');
  const [bgResults, setBgResults] = useState<BackgroundImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isBgLocked, setIsBgLocked] = useState(false);
  
  // UI Visibility State (Toggle to hide menus)
  const [uiVisible, setUiVisible] = useState(true);
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleAddItem = (type: 'character' | 'bubble', src?: string) => {
    // Spawn slightly higher (y - 100) to avoid being covered by the bottom bar initially
    const newItem: SceneItem = {
      id: Date.now().toString(),
      type,
      x: window.innerWidth / 2 - 50,
      y: window.innerHeight / 2 - 120, 
      scale: 1,
      rotation: 0,
      zIndex: items.length + 1,
      src: src,
      text: type === 'bubble' ? 'Olá!' : undefined,
      bubbleStyle: 'speech',
      locked: false
    };
    setItems([...items, newItem]);
    setSelectedId(newItem.id);
  };

  const handleUpdateItem = (id: string, updates: Partial<SceneItem>) => {
    setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Image Upload Flow
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // Open Eraser Modal first
          setTempImageForEraser(event.target.result as string);
          setShowEraser(true);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
    // Reset value so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEraserSave = (processedImage: string) => {
    handleAddItem('character', processedImage);
    setShowEraser(false);
    setTempImageForEraser(null);
  };

  // Background Search Flow
  const handleSearchBackground = async () => {
    setIsSearching(true);
    const results = await searchPinterestBackgrounds(bgQuery);
    setBgResults(results);
    setIsSearching(false);
  };

  // SAVE IMAGE LOGIC (FIXED FOR MOBILE DISTORTION)
  const handleSaveScene = async () => {
    // Deselect item to remove dashed lines/buttons before saving
    setSelectedId(null);

    // Small delay to allow React to remove the selection indicators
    setTimeout(async () => {
        const stageElement = document.getElementById('stage-container');
        if (!stageElement) return;

        try {
            // CRITICAL FIX FOR MOBILE:
            // 1. We do NOT pass width/height explicitly. This forces html2canvas to capture the "natural" size of the element.
            // 2. We set scrollX/Y to 0 to avoid offsets.
            // 3. We use a high scale for quality.
            
            const canvas = await html2canvas(stageElement, {
                useCORS: true, 
                allowTaint: true, 
                scale: 3, // 3x Resolution (HD)
                backgroundColor: null,
                logging: false,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                // These settings ensure it captures exactly what's in the DOM
                windowWidth: stageElement.scrollWidth,
                windowHeight: stageElement.scrollHeight
            });
            
            // Create download link
            const link = document.createElement('a');
            link.download = `delani-gacha-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (err) {
            console.error("Erro ao salvar:", err);
            alert("Ops! Não consegui salvar a imagem. Tente novamente.");
        }
    }, 100);
  };

  return (
    // Use h-[100dvh] (Dynamic Viewport Height) to fix mobile browser bar issues
    <div className="flex flex-col h-[100dvh] bg-gacha-cream font-sans overflow-hidden relative">
      
      {/* Header - Slides up when UI hidden */}
      <header 
        className={`absolute top-0 left-0 right-0 z-30 pointer-events-none transition-transform duration-300 ease-in-out ${uiVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex justify-between items-center p-4">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border-2 border-gacha-pink pointer-events-auto flex items-center gap-2">
                <Heart size={20} className="text-gacha-hot fill-gacha-hot animate-pulse" />
                <h1 className="text-lg md:text-xl font-bold text-gacha-text">
                Delani Gacha
                </h1>
            </div>
            
            <button 
                onClick={handleSaveScene}
                className="bg-gradient-to-r from-gacha-hot to-purple-400 text-white px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 pointer-events-auto hover:scale-105 transition-transform border-2 border-white"
            >
                <Download size={18} /> <span className="hidden md:inline">Salvar</span>
            </button>
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 relative touch-none w-full h-full">
        <Stage 
          items={items}
          backgroundUrl={background}
          selectedId={selectedId}
          isBgLocked={isBgLocked}
          onToggleBgLock={() => setIsBgLocked(!isBgLocked)}
          onSelectItem={setSelectedId}
          onUpdateItem={handleUpdateItem}
          onRemoveItem={handleRemoveItem}
        />
      </main>

      {/* "Show UI" Toggle Button (Only visible when UI is hidden) */}
      {!uiVisible && (
          <button 
            onClick={() => setUiVisible(true)}
            className="absolute bottom-6 right-6 z-40 bg-white/50 backdrop-blur-sm p-3 rounded-full shadow-lg border-2 border-white/50 text-gacha-text hover:bg-white transition-all animate-fade-in"
          >
              <Eye size={24} />
          </button>
      )}

      {/* Toolbar Footer - Slides down when UI hidden */}
      <footer 
        className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center justify-end pb-6 pointer-events-none transition-transform duration-300 ease-in-out ${uiVisible ? 'translate-y-0' : 'translate-y-[150%]'}`}
      >
        {/* Main Control Bar */}
        <div className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-2 px-4 md:px-6 flex items-center gap-3 md:gap-6 pointer-events-auto border-2 border-white ring-2 ring-gacha-pink/20 mx-4 max-w-full overflow-x-auto no-scrollbar">
            
            {/* Add Character Button */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center gap-1 w-14 h-14 md:w-16 md:h-16 transition-all hover:-translate-y-2 flex-shrink-0"
            >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gacha-pink flex items-center justify-center shadow-md group-hover:shadow-lg border-2 border-white group-hover:bg-gacha-hot transition-colors">
                    <ImagePlus size={20} className="text-white md:w-6 md:h-6" />
                </div>
                <span className="text-[10px] font-bold text-gacha-text bg-white px-2 py-0.5 rounded-full shadow-sm">Boneco</span>
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload}
            />

            {/* Background Button */}
            <button 
                onClick={() => setShowBgSearch(true)}
                className="group relative flex flex-col items-center justify-center gap-1 w-14 h-14 md:w-16 md:h-16 transition-all hover:-translate-y-2 flex-shrink-0"
            >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gacha-lavender flex items-center justify-center shadow-md group-hover:shadow-lg border-2 border-white group-hover:bg-purple-400 transition-colors">
                    <ImageIcon size={20} className="text-white md:w-6 md:h-6" />
                </div>
                <span className="text-[10px] font-bold text-gacha-text bg-white px-2 py-0.5 rounded-full shadow-sm">Fundo</span>
            </button>

            {/* Bubble Button */}
            <button 
                 onClick={() => handleAddItem('bubble')}
                 className="group relative flex flex-col items-center justify-center gap-1 w-14 h-14 md:w-16 md:h-16 transition-all hover:-translate-y-2 flex-shrink-0"
            >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gacha-sky flex items-center justify-center shadow-md group-hover:shadow-lg border-2 border-white group-hover:bg-blue-400 transition-colors">
                    <MessageSquarePlus size={20} className="text-white md:w-6 md:h-6" />
                </div>
                <span className="text-[10px] font-bold text-gacha-text bg-white px-2 py-0.5 rounded-full shadow-sm">Fala</span>
            </button>

            {/* Divider */}
            <div className="w-px h-10 bg-gacha-pink/30 mx-1"></div>

            {/* Hide UI Button */}
            <button 
                onClick={() => setUiVisible(false)}
                className="flex flex-col items-center justify-center gap-1 w-12 h-14 transition-all opacity-70 hover:opacity-100 flex-shrink-0"
            >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-transparent hover:border-gacha-text/20">
                     <EyeOff size={18} className="text-gacha-text" />
                </div>
                <span className="text-[9px] font-bold text-gacha-text">Esconder</span>
            </button>

        </div>
      </footer>

      {/* --- Modals --- */}

      {/* Manual Eraser Modal */}
      {showEraser && tempImageForEraser && (
        <EraserModal 
          imageSrc={tempImageForEraser}
          onSave={handleEraserSave}
          onClose={() => setShowEraser(false)}
        />
      )}

      {/* Background Search Modal */}
      {showBgSearch && (
        <div className="fixed inset-0 z-50 bg-gacha-text/40 backdrop-blur-sm flex items-end md:items-center justify-center animate-fade-in p-4 pb-0 md:p-0">
            <div className="bg-white w-full md:w-[600px] h-[85dvh] md:h-[600px] rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden animate-slide-up shadow-2xl">
                <div className="p-4 border-b border-gacha-pink/30 flex justify-between items-center bg-gacha-pink/10">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-gacha-hot" />
                        <h3 className="font-bold text-gacha-text text-lg">Escolher Fundo</h3>
                    </div>
                    <button onClick={() => setShowBgSearch(false)} className="p-2 hover:bg-red-100 rounded-full text-gacha-hot transition-colors">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-4 bg-white border-b border-gacha-pink/10">
                    <div className="flex gap-2 relative">
                        <input 
                            type="text" 
                            value={bgQuery}
                            onChange={(e) => setBgQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchBackground()}
                            placeholder="Pesquise: parque, escola, quarto..."
                            className="flex-1 p-3 px-4 border-2 border-gacha-lavender rounded-full focus:border-gacha-hot outline-none text-gacha-text bg-gacha-cream/30"
                        />
                        <button 
                            onClick={handleSearchBackground}
                            disabled={isSearching}
                            className="bg-gacha-hot text-white px-6 py-2 rounded-full font-bold hover:bg-pink-500 disabled:opacity-50 transition-colors shadow-md"
                        >
                            {isSearching ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/> : 'Buscar'}
                        </button>
                    </div>
                    <p className="text-xs text-gacha-text/60 mt-3 text-center flex items-center justify-center gap-1">
                        <Star size={10} /> Busca direto do Pinterest!
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gacha-cream/30">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {bgResults.length === 0 && !isSearching && (
                             <div className="col-span-full flex flex-col items-center justify-center text-gacha-text/40 mt-10 gap-2">
                                <Sparkles size={40} />
                                <p className="text-center font-medium">
                                    {bgQuery ? "Não achei nada fofo com esse nome :(" : "Escreva algo fofo para buscar!"}
                                </p>
                             </div>
                        )}
                        {bgResults.map((bg, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => {
                                    setBackground(bg.url);
                                    setShowBgSearch(false);
                                }}
                                className="relative aspect-video rounded-xl overflow-hidden border-4 border-white hover:border-gacha-hot shadow-sm hover:shadow-lg transition-all group"
                            >
                                <img 
                                  src={bg.url} 
                                  alt={bg.source} 
                                  className="w-full h-full object-cover" 
                                  loading="lazy" 
                                  onError={(e) => {
                                    // Hide broken search results
                                    e.currentTarget.parentElement!.style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-gacha-hot/20 transition-colors flex items-center justify-center">
                                    <Heart className="text-white opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-110 transition-all drop-shadow-md" fill="currentColor" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;