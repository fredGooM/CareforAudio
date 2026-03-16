'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import AudioPlayer from '@/components/AudioPlayer';
import ProgramCard, { type ProgramAudioItem, type ProgramCardData } from '@/components/ProgramCard';

type ProgramAudio = ProgramAudioItem;
type ProgramDTO = ProgramCardData & { audios: ProgramAudio[] };

export default function TrainingPage() {
    const { data: session } = useSession();
    const [programs, setPrograms] = useState<ProgramDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentAudio, setCurrentAudio] = useState<ProgramAudio | null>(null);
    const [currentProgramId, setCurrentProgramId] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<string[]>([]);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        Promise.all([
            apiClient.get<ProgramDTO[]>('/programs'),
            apiClient.get<string[]>('/users/me/favorites'),
        ]).then(([p, f]) => {
            setPrograms(p);
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

    if (loading) return <Loader />;

    const handleHeartbeat = (position: number, sessionDuration: number, completed?: boolean, isSessionEnd?: boolean) => {
        if (!currentAudio) return;
        apiClient.post('/analytics/heartbeat', {
            audioId: currentAudio.id,
            position,
            sessionDuration,
            completed,
            isSessionEnd,
            programId: currentProgramId ?? undefined,
        });

        // Optimistic update on completion
        if (completed && currentProgramId) {
            setPrograms(prev => prev.map(prog => {
                if (prog.id !== currentProgramId) return prog;
                const updatedAudios = prog.audios.map(a => {
                    if (a.id !== currentAudio.id) return a;
                    const newCount = (a.listenCount || 0) + 1;
                    return { ...a, listenCount: newCount };
                });
                const totalRequired = updatedAudios.reduce((s, a) => s + (a.requiredListens || 1), 0);
                const totalDone = updatedAudios.reduce((s, a) => s + Math.min(a.listenCount || 0, a.requiredListens || 1), 0);
                const completionPercent = totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0;
                return { ...prog, audios: updatedAudios, completionPercent };
            }));
        }
    };

    return (
        <div className="page-content">
            <h1>Mes Programmes</h1>

            {programs.length === 0 ? (
                <p className="empty-state">Aucun programme ne vous a été affecté pour le moment.</p>
            ) : (
                <div className="programs-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {programs.map((prog) => (
                        <ProgramCard
                            key={prog.id}
                            program={prog}
                            onPlayAudio={(audio, programId) => { setCurrentAudio(audio); setCurrentProgramId(programId); }}
                            currentAudioId={currentAudio?.id}
                            favorites={favorites}
                            onToggleFavorite={toggleFavorite}
                        />
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
