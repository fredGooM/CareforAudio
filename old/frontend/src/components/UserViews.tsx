import React, { useEffect, useMemo, useState } from 'react';
import { Play, Clock, Heart, Search } from 'lucide-react';
import { AudioTrack, Category, MyProgramAudio } from '../types';
import { CATEGORIES, dataService } from '../services/apiClient';

interface UserCatalogProps {
  audios: AudioTrack[];
  onPlay: (audio: AudioTrack) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  title?: string;
  subtitle?: string;
  showGroupFilters?: boolean;
  showGroupName?: boolean;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1506126197922-bcaa2d3d31bb?auto=format&fit=crop&w=800&q=60';

export const UserCatalog: React.FC<UserCatalogProps> = ({
  audios,
  onPlay,
  favorites,
  onToggleFavorite,
  title = 'Mes programmes',
  subtitle = 'Sélectionnez votre programme et suivez-le pas à pas.',
  showGroupFilters = true,
  showGroupName = true
}) => {
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const initialCategory = categories[0]?.id || '';
  const [filterCategory, setFilterCategory] = useState<string>(
    showGroupFilters ? initialCategory : ''
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setFilterCategory(showGroupFilters ? initialCategory : '');
  }, [showGroupFilters, initialCategory]);

  useEffect(() => {
    dataService.getCategories().then(setCategories).catch(() => undefined);
  }, []);

  const orderMap = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach(category => {
      const list = audios
        .filter(audio => audio.categoryId === category.id)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      list.forEach((audio, index) =>
        map.set(`${category.id}-${audio.id}`, index + 1)
      );
    });
    return map;
  }, [audios, categories]);

  const filteredAudios = useMemo(() => {
    return audios
      .filter(audio => {
        if (filterCategory && audio.categoryId !== filterCategory) return false;
        const matchesSearch =
          audio.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          audio.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => {
        const keyA = `${filterCategory}-${a.id}`;
        const keyB = `${filterCategory}-${b.id}`;
        const orderA = orderMap.get(keyA) ?? Number.MAX_SAFE_INTEGER;
        const orderB = orderMap.get(keyB) ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
  }, [audios, filterCategory, searchQuery, orderMap]);

  return (
    <div className="space-y-8 animate-fade-in pb-24">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 mt-1">{subtitle}</p>
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

      {showGroupFilters && (
        <div className="flex flex-wrap gap-3 pb-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setFilterCategory(category.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition ${
                filterCategory === category.id
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      {filteredAudios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAudios.map(audio => {
            const category = categories.find(c => c.id === audio.categoryId);
            const orderNumber = filterCategory
              ? orderMap.get(`${filterCategory}-${audio.id}`)
              : undefined;

            return (
              <div key={audio.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    {showGroupName && (
                      <p className="text-xs uppercase font-semibold text-slate-500 tracking-wide">
                        {category?.name || 'Programme'}
                      </p>
                    )}
                    <h3
                      className="text-base text-slate-900 mt-1 leading-tight cursor-pointer hover:text-primary-600 font-medium"
                      onClick={() => onPlay(audio)}
                    >
                      {audio.title}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {orderNumber && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        #{orderNumber.toString().padStart(2, '0')}
                      </span>
                    )}
                    <button
                      onClick={() => onToggleFavorite(audio.id)}
                      className={`p-1.5 rounded-full border text-slate-400 hover:text-pink-500 transition ${
                        favorites.includes(audio.id) ? 'text-pink-500 border-pink-200' : 'border-slate-200'
                      }`}
                    >
                      <Heart
                        size={14}
                        fill={favorites.includes(audio.id) ? 'currentColor' : 'none'}
                        stroke={favorites.includes(audio.id) ? 'none' : 'currentColor'}
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {Math.floor(audio.duration / 60)} min
                  </div>
                  <button
                    onClick={() => onPlay(audio)}
                    className="inline-flex items-center gap-1 text-primary-600 font-semibold text-sm hover:text-primary-800"
                  >
                    <Play size={12} /> Écouter
                  </button>
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

export const MyProgramList: React.FC<{ items: MyProgramAudio[]; favorites: string[]; onToggleFavorite: (id: string) => void; onPlay: (id: string) => void }> = ({ items, favorites, onToggleFavorite, onPlay }) => {
  const categoryLabel = (id: string) => CATEGORIES.find(c => c.id === id)?.name || id;
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mon Training</h1>
        <p className="text-slate-500 mt-1">Vos audios personnalisés.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-14"></th>
                <th className="px-6 py-4">Audio</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Durée</th>
                <th className="px-6 py-4">Écoutes</th>
                <th className="px-6 py-4 text-right">Favori</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => onPlay(item.id)}
                      className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-primary-600 hover:text-white transition-all shadow-sm"
                    >
                      <Play size={14} fill="currentColor" className="ml-0.5" />
                    </button>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">{item.title}</td>
                  <td className="px-6 py-4">{item.type || 'Training'}</td>
                  <td className="px-6 py-4">{categoryLabel(item.categoryId)}</td>
                  <td className="px-6 py-4">{formatTime(item.duration)}</td>
                  <td className="px-6 py-4">{item.timesListened}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onToggleFavorite(item.id)}
                      className={`p-1.5 rounded-full border text-slate-400 hover:text-pink-500 transition ${
                        favorites.includes(item.id) ? 'text-pink-500 border-pink-200' : 'border-slate-200'
                      }`}
                    >
                      <Heart
                        size={14}
                        fill={favorites.includes(item.id) ? 'currentColor' : 'none'}
                        stroke={favorites.includes(item.id) ? 'none' : 'currentColor'}
                      />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">Aucun audio dans Mon Programme.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
