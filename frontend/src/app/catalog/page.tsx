'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import apiClient from '@/lib/api-client';
import AudioPlayer from '@/components/AudioPlayer';
import Loader from '@/components/Loader';
import type { AudioTrack } from '@/types';

export default function CatalogPage() {
    const { data: session } = useSession();
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [currentAudio, setCurrentAudio] = useState<AudioTrack | null>(null);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!session) return;
        const role = (session.user as any)?.role;
        if (role === 'ATHLETE') {
            router.replace('/training');
            return;
        }

        apiClient.setToken((session as any).accessToken);
        Promise.all([
            apiClient.get<AudioTrack[]>('/audios'),
            apiClient.get<string[]>('/users/me/favorites'),
        ]).then(([a, f]) => {
            setAudios(a);
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

    const handleHeartbeat = (position: number, sessionDuration: number, completed?: boolean) => {
        if (currentAudio) {
            apiClient.post('/analytics/heartbeat', {
                audioId: currentAudio.id,
                position,
                sessionDuration,
                completed,
            });
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <h1>Catalogue</h1>

            <div className="audio-grid">
                {audios.map((audio) => (
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
                    duration={currentAudio.duration}
                    onHeartbeat={handleHeartbeat}
                />
            )}
        </div>
    );
}
