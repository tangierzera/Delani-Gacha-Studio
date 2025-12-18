import React, { useState, useRef } from 'react';
import { SceneItem, BackgroundImage, AspectRatio, StoredScene } from './types';
import Stage from './components/Stage';
import EraserModal from './components/EraserModal';
import { searchPinterestBackgrounds } from './services/serpApiService';
import { ImagePlus, MessageSquarePlus, Image as ImageIcon, Download, Camera, Trash2, X, Heart, Sparkles, Eye, EyeOff, Smartphone, Monitor, Square, Film, History, FilePlus2, Upload } from 'lucide-react';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  // --- State ---
  const [items, setItems] = useState<SceneItem[]>([]);
  const [background, setBackground] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // RESET LOGIC: We use a boolean to physically unmount the Stage component
  const [isResetting, setIsResetting] = useState(false);

  // Eraser / Char Upload
  const [showEraser, setShowEraser] = useState(false);
  const [tempImageForEraser, setTempImageForEraser] = useState<string | null>(null);
  
  // Background Search / Upload
  const [showBgSearch, setShowBgSearch] = useState(false);
  const [bgQuery, setBgQuery] = useState('');
  const [bgResults, setBgResults] = useState<BackgroundImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Menu visibility
  const [showBgOptions, setShowBgOptions] = useState(false);

  // Storyboard State
  const [scenes, setScenes] = useState<StoredScene[]>([]);
  const [showScenesSidebar, setShowScenesSidebar] = useState(false);
  
  // Aspect Ratio State
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('9:16');
  
  // LOCK BACKGROUND BY DEFAULT
  const [isBgLocked, setIsBgLocked] = useState(true);
  
  // Saving State
  const [isCapturing, setIsCapturing] = useState(false);
  
  // UI Visibility State
  const [uiVisible, setUiVisible] = useState(true);
  
  // Refs
  const charInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleAddItem = (type: 'character' | 'bubble', src?: string) => {
    const newItem: SceneItem = {
      id: Date.now().toString(),
      type,
      x: 0, 
      y: 0, 
      scale: 1,
      rotation: 0,
      zIndex: items.length + 1,
      src: src,
      text: type === 'bubble' ? 'Digite...' : undefined,
      bubbleStyle: 'speech',
      locked: false,
      tailAngle: 45
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

  // --- RESET NUCLEAR OPTION ---
  const handleClearAll = () => {
    if (window.confirm("Deseja apagar tudo e começar um novo?")) {
        // 1. Unmount Stage
        setIsResetting(true);
        
        // 2. Clear Data
        setItems([]);
        setBackground(null);
        setSelectedId(null);
        setIsBgLocked(true);
        setShowBgOptions(false);
        setBgResults([]);
        setBgQuery('');
        
        // 3. Remount after 50ms to ensure fresh state
        setTimeout(() => {
            setIsResetting(false);
        }, 50);
    }
  };

  // --- Character Upload Flow ---
  const handleCharUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTempImageForEraser(event.target.result as string);
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

  // --- Background Upload Flow (Gallery) ---
  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setBackground(event.target.result as string);
            setShowBgOptions(false);
          }
        };
        reader.readAsDataURL(e.target.files[0]);
      }
      if (bgInputRef.current) bgInputRef.current.value = '';
  };

  // --- Background Search Flow (Pinterest) ---
  const handleSearchBackground = async () => {
    setIsSearching(true);
    const results = await searchPinterestBackgrounds(bgQuery);
    setBgResults(results);
    setIsSearching(false);
  };

  // CAPTURE SCENE
  const handleCaptureScene = async () => {
    setSelectedId(null);
    setIsCapturing(true);

    // Wait for UI to hide
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
                scale: 3, // High quality scale
                backgroundColor: null, 
                logging: false,
                onclone: (doc) => {
                    // --- CRITICAL FIXES FOR BUBBLE SAVING ---
                    
                    // 1. Target the bubble wrappers to ensure they hug content
                    const bubbleContainers = doc.querySelectorAll('[data-bubble-container]');
                    bubbleContainers.forEach((el: any) => {
                        // Force layout to collapse around text
                        el.style.height = 'auto';
                        el.style.width = 'fit-content';
                        el.style.display = 'inline-flex';
                        el.style.alignItems = 'center';
                        el.style.justifyContent = 'center';
                    });

                    // 2. Target text elements
                    const bubbles = doc.querySelectorAll('[data-bubble-text]');
                    bubbles.forEach((el: any) => {
                        el.style.lineHeight = '1.2';
                        el.style.margin = '0';
                        el.style.padding = '0';
                        // Force inline behavior to remove block spacing
                        el.style.display = 'block'; 
                        el.style.height = 'auto';
                        el.style.transform = "translateZ(0)"; 
                    });

                    // 3. Fix Image Squishing
                    const images = doc.querySelectorAll('img');
                    images.forEach((img: any) => {
                        img.style.objectFit = 'contain';
                    });
                }
            });
            
            const imgData = canvas.toDataURL('image/png', 1.0);
            
            setScenes(prev => [...prev, {
                id: Date.now().toString(),
                thumbnail: imgData,
                timestamp: Date.now()
            }]);
            
            setShowScenesSidebar(true);

        } catch (err) {
            console.error("Erro ao capturar:", err);
            alert("Erro ao capturar cena.");
        } finally {
            setIsCapturing(false);
        }
    }, 300); 
  };

  const handleDownloadScene = (dataUrl: string, index: number) => {
      const link = document.createElement('a');
      link.download = `delani-cena-${index + 1}.png`;
      link.href = dataUrl;
      link.click();
  };

  const handleDeleteScene = (id: string) => {
      setScenes(scenes.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-br from-pink-100 via-purple-100 to-blue-50 font-sans overflow-hidden relative">
      
      {/* Header */}
      <header 
        className={`absolute top-0 left-0 right-0 z-50 pointer-events-none transition-transform duration-300 ease-in-out ${uiVisible && !isCapturing ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex flex-col md:flex-row justify-between items-center p-2 md:p-4 gap-2">
            
            <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border-2 border-pink-200 pointer-events-auto flex items-center gap-2 transform hover:scale-105 transition-transform">
                <Heart size={20} className="text-pink-500 fill-pink-500 animate-pulse" />
                <h1 className="text-lg font-bold text-pink-500 tracking-wide font-sans">Delani Studio</h1>
            </div>

            <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-lg border-2 border-pink-200 pointer-events-auto flex gap-1 scale-90 md:scale-100">
                <button onClick={() => setAspectRatio('9:16')} className={`p-2 rounded-full transition-all ${aspectRatio === '9:16' ? 'bg-pink-400 text-white shadow-md' : 'text-gray-400 hover:text-pink-400'}`} title="TikTok">
                  <Smartphone size={18} />
                </button>
                <button onClick={() => setAspectRatio('16:9')} className={`p-2 rounded-full transition-all ${aspectRatio === '16:9' ? 'bg-pink-400 text-white shadow-md' : 'text-gray-400 hover:text-pink-400'}`} title="PC/YouTube">
                  <Monitor size={18} />
                </button>
                <button onClick={() => setAspectRatio('1:1')} className={`p-2 rounded-full transition-all ${aspectRatio === '1:1' ? 'bg-pink-400 text-white shadow-md' : 'text-gray-400 hover:text-pink-400'}`} title="Instagram">
                  <Square size={18} />
                </button>
            </div>
            
            <div className="flex gap-2 pointer-events-auto">
                <button 
                    onClick={handleClearAll}
                    className="bg-white/90 text-red-400 p-2 px-4 rounded-full shadow-md font-bold border-2 border-white hover:bg-red-50 hover:text-red-500 transition-colors flex items-center gap-2 active:scale-95"
                    title="Começar um Novo"
                >
                    <FilePlus2 size={20} />
                    <span className="hidden md:inline text-sm">Novo</span>
                </button>
                
                <button 
                    onClick={handleCaptureScene}
                    disabled={isCapturing}
                    className="bg-gradient-to-r from-pink-400 to-purple-400 text-white px-5 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 hover:scale-105 transition-transform border-2 border-white disabled:opacity-50 active:scale-95"
                >
                    {isCapturing ? <Sparkles className="animate-spin" size={20} /> : <Camera size={20} />} 
                    <span className="hidden md:inline">Salvar</span>
                </button>
            </div>
        </div>
      </header>

      {/* Main Stage */}
      <main className="flex-1 relative touch-none w-full h-full flex items-center justify-center">
        {/* NUCLEAR RESET: If isResetting is true, component is unmounted */}
        {!isResetting && (
            <Stage 
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
        )}
      </main>

      {/* MESSAGE FOR DELANI (Outside Stage so it isn't captured) */}
      {!isCapturing && uiVisible && (
          <div className="absolute bottom-32 right-6 z-10 pointer-events-none select-none flex items-center gap-1 opacity-90 animate-bounce-slow">
              <span className="text-pink-500 font-bold text-sm italic font-sans drop-shadow-md bg-white/50 px-2 rounded-full backdrop-blur-sm">Delani Eu te amo muito!</span>
              <Heart size={14} className="text-pink-500 fill-pink-500 animate-pulse" />
          </div>
      )}

      {/* Sidebar Toggle */}
      {!isCapturing && (
          <button 
              onClick={() => setShowScenesSidebar(!showScenesSidebar)}
              className="absolute top-1/2 right-0 transform -translate-y-1/2 z-40 bg-white p-3 rounded-l-2xl shadow-xl border-2 border-r-0 border-pink-200 text-pink-500 hover:bg-pink-50 transition-all"
          >
              {showScenesSidebar ? <X size={24} /> : <Film size={24} />}
              {scenes.length > 0 && !showScenesSidebar && (
                  <span className="absolute -top-2 -left-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-sm">
                      {scenes.length}
                  </span>
              )}
          </button>
      )}

      {/* Scenes Sidebar */}
      <div className={`absolute top-0 right-0 bottom-0 w-72 bg-white/90 backdrop-blur-xl shadow-2xl z-30 transition-transform duration-300 ease-in-out border-l border-pink-200 flex flex-col pt-20 ${showScenesSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-pink-100 flex items-center justify-between">
              <h2 className="font-bold text-pink-500 flex items-center gap-2"><History size={20}/> Histórico</h2>
              <span className="text-xs text-gray-400">{scenes.length} cenas</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {scenes.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">
                      <Camera size={40} className="mx-auto mb-3 opacity-30 text-pink-300"/>
                      <p className="text-sm font-medium text-pink-300">Tire fotos!</p>
                  </div>
              ) : (
                  scenes.map((scene, idx) => (
                      <div key={scene.id} className="relative group bg-pink-50 p-2 rounded-2xl border-2 border-pink-100 hover:border-pink-300 transition-colors">
                          <div className="text-xs font-bold text-pink-400 mb-1 ml-1">Cena {idx + 1}</div>
                          <img src={scene.thumbnail} alt={`Cena ${idx}`} className="w-full rounded-xl shadow-sm bg-white" />
                          <div className="flex gap-2 mt-2">
                              <button 
                                  onClick={() => handleDownloadScene(scene.thumbnail, idx)}
                                  className="flex-1 bg-pink-400 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-pink-500 flex items-center justify-center gap-1 shadow-sm"
                              >
                                  <Download size={14}/> Baixar
                              </button>
                              <button 
                                  onClick={() => handleDeleteScene(scene.id)}
                                  className="bg-white text-red-400 border border-red-100 p-1.5 rounded-lg hover:bg-red-50"
                              >
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>

      {/* UI Visibility Toggle */}
      {!uiVisible && !isCapturing && (
          <button 
            onClick={() => setUiVisible(true)}
            className="absolute bottom-6 right-6 z-40 bg-white/80 backdrop-blur-md p-4 rounded-full shadow-lg border-2 border-white text-pink-500 hover:scale-110 transition-all animate-bounce"
          >
              <Eye size={28} />
          </button>
      )}

      {/* Toolbar Footer */}
      <footer 
        className={`absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center justify-end pb-8 pointer-events-none transition-transform duration-300 ease-in-out ${uiVisible && !isCapturing ? 'translate-y-0' : 'translate-y-[150%]'}`}
      >
        {showBgOptions && (
            <div className="mb-4 bg-white/90 backdrop-blur-xl p-3 rounded-2xl shadow-xl flex gap-4 animate-slide-up border-2 border-pink-100 pointer-events-auto">
                <button 
                    onClick={() => bgInputRef.current?.click()}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-pink-50 rounded-xl transition-colors"
                >
                    <div className="bg-purple-100 p-3 rounded-full text-purple-500"><Upload size={20}/></div>
                    <span className="text-[10px] font-bold text-purple-400">Galeria</span>
                </button>
                <button 
                    onClick={() => { setShowBgSearch(true); setShowBgOptions(false); }}
                    className="flex flex-col items-center gap-1 p-2 hover:bg-pink-50 rounded-xl transition-colors"
                >
                    <div className="bg-red-100 p-3 rounded-full text-red-500"><Sparkles size={20}/></div>
                    <span className="text-[10px] font-bold text-red-400">Pinterest</span>
                </button>
            </div>
        )}

        <div className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-[2rem] p-3 px-6 flex items-center gap-4 md:gap-8 pointer-events-auto border-4 border-white ring-4 ring-pink-200/50 mx-4 max-w-full overflow-x-auto no-scrollbar">
            
            <button 
                onClick={() => charInputRef.current?.click()}
                className="group flex flex-col items-center justify-center gap-1 w-16 h-16 flex-shrink-0 active:scale-95 transition-transform"
            >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-300 to-pink-400 flex items-center justify-center shadow-md border-2 border-white group-hover:from-pink-400 group-hover:to-pink-500 transition-all">
                    <ImagePlus size={24} className="text-white" />
                </div>
                <span className="text-[10px] font-bold text-pink-500">Boneco</span>
            </button>
            <input 
                type="file" 
                ref={charInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleCharUpload}
            />

            <button 
                onClick={() => setShowBgOptions(!showBgOptions)}
                className="group flex flex-col items-center justify-center gap-1 w-16 h-16 flex-shrink-0 active:scale-95 transition-transform"
            >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-300 to-purple-400 flex items-center justify-center shadow-md border-2 border-white group-hover:from-purple-400 group-hover:to-purple-500 transition-all">
                    <ImageIcon size={24} className="text-white" />
                </div>
                <span className="text-[10px] font-bold text-purple-500">Fundo</span>
            </button>
            <input 
                type="file" 
                ref={bgInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleBgUpload}
            />

            <button 
                 onClick={() => handleAddItem('bubble')}
                 className="group flex flex-col items-center justify-center gap-1 w-16 h-16 flex-shrink-0 active:scale-95 transition-transform"
            >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-300 to-blue-400 flex items-center justify-center shadow-md border-2 border-white group-hover:from-blue-400 group-hover:to-blue-500 transition-all">
                    <MessageSquarePlus size={24} className="text-white" />
                </div>
                <span className="text-[10px] font-bold text-blue-500">Fala</span>
            </button>

            <div className="w-px h-10 bg-pink-200 mx-2"></div>

            <button 
                onClick={() => setUiVisible(false)}
                className="flex flex-col items-center justify-center gap-1 w-12 h-16 opacity-70 hover:opacity-100 flex-shrink-0 active:scale-95 transition-transform"
            >
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border-2 border-transparent hover:border-pink-200">
                     <EyeOff size={20} className="text-gray-500" />
                </div>
                <span className="text-[9px] font-bold text-gray-400">Esconder</span>
            </button>

        </div>
      </footer>

      {/* --- Modals --- */}
      {showEraser && tempImageForEraser && (
        <EraserModal 
          imageSrc={tempImageForEraser}
          onSave={handleEraserSave}
          onClose={() => setShowEraser(false)}
        />
      )}

      {showBgSearch && (
        <div className="fixed inset-0 z-50 bg-pink-900/40 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4">
            <div className="bg-white w-full max-w-4xl h-[90vh] md:h-[80vh] rounded-[2rem] flex flex-col overflow-hidden animate-slide-up shadow-2xl relative ring-8 ring-white/50">
                <div className="p-4 border-b border-pink-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <Sparkles size={24} className="text-pink-400" />
                        <h3 className="font-bold text-pink-500 text-xl font-sans">Pinterest</h3>
                    </div>
                    <button onClick={() => setShowBgSearch(false)} className="p-2 hover:bg-pink-50 rounded-full text-pink-400 transition-colors">
                        <X size={28} />
                    </button>
                </div>
                
                <div className="p-4 bg-pink-50/50 border-b border-pink-100">
                    <div className="flex gap-2 relative">
                        <input 
                            type="text" 
                            value={bgQuery}
                            onChange={(e) => setBgQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchBackground()}
                            placeholder="Ex: Quarto anime..."
                            className="flex-1 p-3 px-5 border-2 border-pink-200 rounded-2xl focus:border-pink-400 outline-none text-gray-600 bg-white shadow-inner placeholder-pink-200"
                        />
                        <button 
                            onClick={handleSearchBackground}
                            disabled={isSearching}
                            className="bg-pink-400 text-white px-6 py-2 rounded-2xl font-bold hover:bg-pink-500 disabled:opacity-50 transition-colors shadow-md whitespace-nowrap"
                        >
                            {isSearching ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"/> : 'Buscar'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {bgResults.length === 0 && !isSearching && (
                             <div className="col-span-full flex flex-col items-center justify-center text-pink-200 mt-20 gap-3">
                                <ImageIcon size={64} className="opacity-40" />
                                <p className="text-center font-bold text-lg">
                                    {bgQuery ? "Nadinha encontrado :(" : "Pesquise cenários!"}
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
                                className="relative aspect-video rounded-2xl overflow-hidden border-2 border-white shadow-md hover:shadow-xl hover:scale-105 transition-all group bg-gray-100"
                            >
                                <img 
                                  src={bg.url} 
                                  alt={bg.source} 
                                  className="w-full h-full object-cover" 
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-pink-500/20 transition-colors flex items-center justify-center">
                                    <Heart className="text-white opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all" size={32} fill="currentColor" />
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="h-24"></div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;