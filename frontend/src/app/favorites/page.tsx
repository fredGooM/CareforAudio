'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import AudioPlayer from '@/components/AudioPlayer';
import type { AudioTrack } from '@/types';
import { DOMINANCE_LABELS, PHASING_LABELS } from '@/lib/audio-labels';

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

    const handleHeartbeat = (position: number, sessionDuration: number, completed?: boolean, isSessionEnd?: boolean) => {
        if (currentAudio) {
            apiClient.post('/analytics/heartbeat', {
                audioId: currentAudio.id,
                position,
                sessionDuration,
                completed,
                isSessionEnd,
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
                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                                    {audio.type && audio.type !== 'Non spécifié' && (
                                        <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: '20px', background: 'rgba(100,116,139,0.15)', color: 'var(--text-muted)' }}>{audio.type}</span>
                                    )}
                                    {audio.dominance && audio.dominance !== 'UNSPECIFIED' && (
                                        <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: '20px', background: 'rgba(124,92,252,0.15)', color: 'var(--primary-light)' }}>
                                            {(DOMINANCE_LABELS as Record<string, string>)[audio.dominance] ?? audio.dominance}
                                        </span>
                                    )}
                                    {Array.isArray(audio.phasing) && audio.phasing.filter(p => p !== 'UNSPECIFIED').map(p => (
                                        <span key={p} style={{ fontSize: '0.68rem', fontWeight: 600, padding: '0.1rem 0.45rem', borderRadius: '20px', background: 'rgba(16,185,129,0.12)', color: 'var(--success)' }}>
                                            {(PHASING_LABELS as Record<string, string>)[p] ?? p}
                                        </span>
                                    ))}
                                </div>
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
