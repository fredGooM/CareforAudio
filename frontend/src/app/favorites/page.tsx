'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import AudioPlayer from '@/components/AudioPlayer';
import type { AudioTrack } from '@/types';

export default function FavoritesPage() {
    const { data: session } = useSession();
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [currentAudio, setCurrentAudio] = useState<AudioTrack | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        apiClient.get<AudioTrack[]>('/audios/favorites').then((data) => {
            setAudios(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

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
            <h1>Mes Favoris</h1>

            {audios.length === 0 ? (
                <p className="empty-state">Aucun favori pour le moment.</p>
            ) : (
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
                        </div>
                    ))}
                </div>
            )}

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
