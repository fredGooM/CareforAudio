'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import apiClient from '@/lib/api-client';
import AudioPlayer from '@/components/AudioPlayer';
import Loader from '@/components/Loader';
import type { AudioTrack, Category } from '@/types';

export default function CatalogPage() {
    const { data: session } = useSession();
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [currentAudio, setCurrentAudio] = useState<AudioTrack | null>(null);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        Promise.all([
            apiClient.get<AudioTrack[]>('/audios'),
            apiClient.get<Category[]>('/categories'),
            apiClient.get<string[]>('/users/me/favorites'),
        ]).then(([a, c, f]) => {
            setAudios(a);
            setCategories(c);
            setFavorites(f);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

    const toggleFavorite = async (audioId: string) => {
        const isFav = favorites.includes(audioId);
        const result = await apiClient.put<string[]>('/users/me/favorites', {
            audioId,
            isFavorite: !isFav,
        });
        setFavorites(result);
    };

    const filtered =
        selectedCategory === 'all'
            ? audios
            : audios.filter((a) => a.categoryId === selectedCategory);

    const handleHeartbeat = (position: number, sessionDuration: number) => {
        if (currentAudio) {
            apiClient.post('/analytics/heartbeat', {
                audioId: currentAudio.id,
                position,
                sessionDuration,
            });
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <h1>Catalogue</h1>

            <div className="category-filters">
                <button
                    className={`category-btn${selectedCategory === 'all' ? ' active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                >
                    Tous
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        className={`category-btn${selectedCategory === cat.id ? ' active' : ''}`}
                        onClick={() => setSelectedCategory(cat.id)}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            <div className="audio-grid">
                {filtered.map((audio) => (
                    <div
                        key={audio.id}
                        className={`audio-card${currentAudio?.id === audio.id ? ' playing' : ''}`}
                        onClick={() => setCurrentAudio(audio)}
                    >
                        <img src={audio.coverUrl} alt={audio.title} className="audio-card-cover" />
                        <div className="audio-card-info">
                            <h3>{audio.title}</h3>
                            <p>{Math.round(audio.duration / 60)} min</p>
                        </div>
                        <button
                            className={`fav-btn${favorites.includes(audio.id) ? ' active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(audio.id);
                            }}
                        >
                            <Heart
                                size={24}
                                fill={favorites.includes(audio.id) ? 'currentColor' : 'none'}
                                className={favorites.includes(audio.id) ? 'text-red-500' : 'text-gray-400'}
                            />
                        </button>
                    </div>
                ))}
            </div>

            {currentAudio && (
                <AudioPlayer
                    src={currentAudio.url}
                    title={currentAudio.title}
                    coverUrl={currentAudio.coverUrl}
                    onHeartbeat={handleHeartbeat}
                />
            )}
        </div>
    );
}
