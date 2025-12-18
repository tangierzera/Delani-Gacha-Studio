import React, { useState, useRef } from 'react';
import { SceneItem, BackgroundImage } from './types';
import Stage from './components/Stage';
import EraserModal from './components/EraserModal';
import { searchPinterestBackgrounds } from './services/serpApiService';
import { ImagePlus, MessageSquarePlus, Image as ImageIcon, Download, Scissors, Wand2, X, Heart, Star, Sparkles } from 'lucide-react';
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
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleAddItem = (type: 'character' | 'bubble', src?: string) => {
    const newItem: SceneItem = {
      id: Date.now().toString(),
      type,
      x: window.innerWidth / 2 - 50,
      y: window.innerHeight / 2 - 50,
      scale: 1,
      rotation: 0,
      zIndex: items.length + 1,
      src: src,
      text: type === 'bubble' ? 'Olá!' : undefined,
      bubbleStyle: 'speech'
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

  // SAVE IMAGE LOGIC
  const handleSaveScene = () => {
    // 1. Deselect everything so controls don't show up
    setSelectedId(null);

    // 2. Wait a moment for React to render the deselection
    setTimeout(async () => {
        const stageElement = document.getElementById('stage-container');
        if (stageElement) {
            try {
                const canvas = await html2canvas(stageElement, {
                    useCORS: true, // Allow loading cross-origin images (like pinterest ones)
                    scale: 2, // High quality
                    backgroundColor: null,
                    logging: false
                });
                
                // Create download link
                const link = document.createElement('a');
                link.download = `delani-gacha-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            } catch (err) {
                console.error("Erro ao salvar:", err);
                alert("Ops! Não consegui salvar a imagem. Tente novamente ou verifique se as imagens do Pinterest carregaram bem.");
            }
        }
    }, 100);
  };

  return (
    <div className="flex flex-col h-screen bg-gacha-cream font-sans overflow-hidden">
      {/* Header */}
      <header className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-none">
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
      </header>

      {/* Main Stage */}
      <main className="flex-1 relative touch-none">
        <Stage 
          items={items}
          backgroundUrl={background}
          selectedId={selectedId}
          onSelectItem={setSelectedId}
          onUpdateItem={handleUpdateItem}
          onRemoveItem={handleRemoveItem}
        />
      </main>

      {/* Toolbar */}
      <footer className="absolute bottom-6 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl p-2 px-6 flex items-center gap-4 pointer-events-auto border-2 border-white ring-2 ring-gacha-pink/20">
            
            {/* Add Character Button */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex flex-col items-center justify-center gap-1 w-16 h-16 transition-all hover:-translate-y-2"
            >
                <div className="w-12 h-12 rounded-full bg-gacha-pink flex items-center justify-center shadow-md group-hover:shadow-lg border-2 border-white group-hover:bg-gacha-hot transition-colors">
                    <ImagePlus size={24} className="text-white" />
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
                className="group relative flex flex-col items-center justify-center gap-1 w-16 h-16 transition-all hover:-translate-y-2"
            >
                <div className="w-12 h-12 rounded-full bg-gacha-lavender flex items-center justify-center shadow-md group-hover:shadow-lg border-2 border-white group-hover:bg-purple-400 transition-colors">
                    <ImageIcon size={24} className="text-white" />
                </div>
                <span className="text-[10px] font-bold text-gacha-text bg-white px-2 py-0.5 rounded-full shadow-sm">Fundo</span>
            </button>

            {/* Bubble Button */}
            <button 
                 onClick={() => handleAddItem('bubble')}
                 className="group relative flex flex-col items-center justify-center gap-1 w-16 h-16 transition-all hover:-translate-y-2"
            >
                <div className="w-12 h-12 rounded-full bg-gacha-sky flex items-center justify-center shadow-md group-hover:shadow-lg border-2 border-white group-hover:bg-blue-400 transition-colors">
                    <MessageSquarePlus size={24} className="text-white" />
                </div>
                <span className="text-[10px] font-bold text-gacha-text bg-white px-2 py-0.5 rounded-full shadow-sm">Fala</span>
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
        <div className="fixed inset-0 z-50 bg-gacha-text/40 backdrop-blur-sm flex items-end md:items-center justify-center animate-fade-in">
            <div className="bg-white w-full md:w-[600px] h-[85vh] md:h-[600px] rounded-t-3xl md:rounded-3xl flex flex-col overflow-hidden animate-slide-up shadow-2xl">
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
                                <img src={bg.url} alt={bg.source} className="w-full h-full object-cover" loading="lazy" />
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