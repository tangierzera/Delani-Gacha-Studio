import React from 'react';
import { SceneItem } from '../types';
import { ArrowUp, ArrowDown, Lock, Unlock, Eye, EyeOff, Trash2, MessageSquare, Smile, Image as ImageIcon } from 'lucide-react';

interface LayerPanelProps {
  items: SceneItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SceneItem>) => void;
  onRemove: (id: string) => void;
  onMoveLayer: (index: number, direction: 'up' | 'down') => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({ 
  items, selectedId, onSelect, onUpdate, onRemove, onMoveLayer 
}) => {
  // Reverse for display so "Top" layer is at the top of list
  const displayItems = [...items].reverse();

  const getIcon = (type: string) => {
    switch (type) {
      case 'character': return <ImageIcon size={14} className="text-pink-500" />;
      case 'dialogue': return <MessageSquare size={14} className="text-blue-500" />;
      case 'sticker': return <Smile size={14} className="text-yellow-500" />;
      default: return <ImageIcon size={14} />;
    }
  };

  const getLabel = (item: SceneItem) => {
    if (item.type === 'dialogue') return `Fala: "${item.text?.substring(0, 10) || ''}..."`;
    if (item.type === 'sticker') return `Sticker ${item.emoji}`;
    return 'Personagem';
  };

  return (
    <div className="flex flex-col h-full bg-white/90 backdrop-blur-md rounded-l-3xl shadow-xl border-l border-pink-100 overflow-hidden">
      <div className="p-4 bg-pink-50 border-b border-pink-100 flex justify-between items-center">
        <h3 className="font-bold text-pink-500 text-sm uppercase tracking-wider">Camadas</h3>
        <span className="text-xs text-pink-300 font-bold">{items.length} itens</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {displayItems.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50">
              <div className="text-4xl mb-2">📄</div>
              <p className="text-xs font-bold">Vazio</p>
           </div>
        ) : (
          displayItems.map((item, index) => {
            const originalIndex = items.length - 1 - index;
            const isSelected = selectedId === item.id;

            return (
              <div 
                key={item.id}
                onClick={() => onSelect(item.id)}
                className={`
                  relative flex items-center gap-2 p-2 rounded-xl border-2 transition-all cursor-pointer group
                  ${isSelected ? 'bg-pink-50 border-pink-300 shadow-sm' : 'bg-white border-transparent hover:border-pink-100'}
                `}
              >
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 flex-shrink-0 overflow-hidden">
                   {item.type === 'character' && item.src ? <img src={item.src} className="w-full h-full object-contain"/> : getIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                   <p className={`text-xs font-bold truncate ${isSelected ? 'text-pink-600' : 'text-gray-600'}`}>
                      {getLabel(item)}
                   </p>
                   <p className="text-[10px] text-gray-400 capitalize">{item.type}</p>
                </div>

                {/* Actions */}
                <div className={`flex items-center gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                   <button 
                      onClick={(e) => { e.stopPropagation(); onUpdate(item.id, { locked: !item.locked }); }}
                      className={`p-1 rounded-md ${item.locked ? 'text-red-400 bg-red-50' : 'text-gray-300 hover:text-gray-500'}`}
                   >
                      {item.locked ? <Lock size={12}/> : <Unlock size={12}/>}
                   </button>
                   
                   <button 
                      onClick={(e) => { e.stopPropagation(); onUpdate(item.id, { visible: !item.visible }); }}
                      className={`p-1 rounded-md ${!item.visible ? 'text-gray-400' : 'text-gray-300 hover:text-blue-400'}`}
                   >
                      {item.visible === false ? <EyeOff size={12}/> : <Eye size={12}/>}
                   </button>

                   <button 
                      onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                      className="p-1 text-gray-300 hover:text-red-500 rounded-md"
                   >
                      <Trash2 size={12}/>
                   </button>
                </div>

                {/* Reorder */}
                {isSelected && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 z-10">
                        {originalIndex < items.length - 1 && (
                            <button onClick={(e) => { e.stopPropagation(); onMoveLayer(originalIndex, 'up'); }} className="bg-white border border-gray-200 text-gray-500 rounded-full p-0.5 shadow hover:bg-pink-100"><ArrowUp size={8}/></button>
                        )}
                        {originalIndex > 0 && (
                            <button onClick={(e) => { e.stopPropagation(); onMoveLayer(originalIndex, 'down'); }} className="bg-white border border-gray-200 text-gray-500 rounded-full p-0.5 shadow hover:bg-pink-100"><ArrowDown size={8}/></button>
                        )}
                    </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LayerPanel;