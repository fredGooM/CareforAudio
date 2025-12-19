import React, { useMemo, useState } from 'react';
import { Play, Clock, Heart, Search, Music } from 'lucide-react';
import { AudioTrack } from '../types';
import { CATEGORIES } from '../services/apiClient';

interface UserCatalogProps {
  audios: AudioTrack[];
  onPlay: (audio: AudioTrack) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export const UserCatalog: React.FC<UserCatalogProps> = ({ audios, onPlay, favorites, onToggleFavorite }) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAudios = useMemo(() => {
    return audios.filter(audio => {
      const matchesCategory = filterCategory === 'all' || audio.categoryId === filterCategory;
      const matchesSearch = audio.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            audio.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [audios, filterCategory, searchQuery]);

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mon Catalogue</h1>
          <p className="text-slate-500 mt-1">Préparez votre mental pour la performance.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
             <input 
               type="text" 
               placeholder="Rechercher..." 
               className="pl-9 pr-4 py-2 text-sm bg-transparent outline-none w-full md:w-64"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
           </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <button 
          onClick={() => setFilterCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterCategory === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          Tout
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterCategory === cat.id ? 'ring-2 ring-offset-1 ring-slate-900 ' + cat.color : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredAudios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAudios.map(audio => {
            const category = CATEGORIES.find(c => c.id === audio.categoryId);
            return (
              <div key={audio.id} className="group bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                {/* Visual Placeholder instead of Image */}
                <div className={`relative w-full h-48 md:h-40 overflow-hidden flex items-center justify-center ${category ? category.color.replace('text', 'bg').replace('800', '100') : 'bg-slate-100'}`}>
                  <Music size={40} className="text-slate-400 opacity-60" />
                  
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button 
                      onClick={() => onPlay(audio)}
                      className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-primary-600 shadow-lg transform scale-90 group-hover:scale-100 transition-all hover:bg-white"
                    >
                      <Play size={22} fill="currentColor" className="ml-0.5" />
                    </button>
                  </div>
                  <div className="absolute top-3 right-3">
                     <button 
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(audio.id); }}
                      className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${favorites.includes(audio.id) ? 'bg-pink-500/90 text-white' : 'bg-black/10 text-white hover:bg-black/30'}`}
                     >
                       <Heart size={14} fill={favorites.includes(audio.id) ? "currentColor" : "none"} stroke={favorites.includes(audio.id) ? "none" : "currentColor"} />
                     </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                     {audio.tags.slice(0, 2).map(tag => (
                       <span key={tag} className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                         {tag}
                       </span>
                     ))}
                  </div>
                  <h3 className="font-bold text-lg text-slate-900 mb-1 leading-tight group-hover:text-primary-600 transition-colors cursor-pointer" onClick={() => onPlay(audio)}>
                    {audio.title}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                    {audio.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                     <div className="flex items-center text-slate-400 text-xs font-medium">
                       <Clock size={14} className="mr-1" />
                       {Math.floor(audio.duration / 60)} min
                     </div>
                     <button 
                      onClick={() => onPlay(audio)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-800 uppercase tracking-wide"
                     >
                       Écouter
                     </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">
          <p>Aucun audio trouvé pour ces critères.</p>
        </div>
      )}
    </div>
  );
};
