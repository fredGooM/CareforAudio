'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, PlayCircle, Heart, RefreshCw } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import AudioPlayer from '@/components/AudioPlayer';

interface ProgramAudio {
    id: string;
    title: string;
    duration: number;
    type: string;
    listenCount?: number;
    requiredListens?: number;
    order?: number;
    url: string;
    coverUrl?: string;
}

interface ProgramDTO {
    id: string;
    name: string;
    description: string;
    recurrenceDays?: number | null;
    audios: ProgramAudio[];
    completionPercent?: number;
}

export default function TrainingPage() {
    const { data: session } = useSession();
    const [programs, setPrograms] = useState<ProgramDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
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

    const toggleProgram = (id: string) => {
        setExpandedProgramId(prev => prev === id ? null : id);
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

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
                    {programs.map((prog) => {
                        const isExpanded = expandedProgramId === prog.id;
                        
                        return (
                            <div 
                                key={prog.id} 
                                className="program-card" 
                                style={{ 
                                    background: 'var(--bg-card)', 
                                    borderRadius: '12px', 
                                    boxShadow: 'var(--shadow-sm)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <div 
                                    onClick={() => toggleProgram(prog.id)}
                                    style={{ 
                                        padding: '1.25rem', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        gap: '1rem',
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        background: isExpanded ? 'var(--bg-input)' : 'transparent',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <PlayCircle size={24} className="text-primary" style={{ flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{prog.name}</span>
                                        </h2>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 1rem' }}>
                                            <span>{prog.audios?.length || 0} audios</span>
                                            {prog.description && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {prog.description}</span>}
                                            {prog.recurrenceDays && (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(124,92,252,0.12)', color: 'var(--primary)', borderRadius: '6px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, flexShrink: 0 }}>
                                                    <RefreshCw size={11} />
                                                    {prog.recurrenceDays % 30 === 0 ? `/${prog.recurrenceDays / 30} mois` : prog.recurrenceDays % 7 === 0 ? `/${prog.recurrenceDays / 7} sem.` : `/${prog.recurrenceDays}j`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '50px', height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${prog.completionPercent || 0}%`, height: '100%', borderRadius: '3px',
                                                    background: (prog.completionPercent || 0) === 100 ? 'var(--success)' : 'var(--primary)',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: (prog.completionPercent || 0) === 100 ? 'var(--success)' : 'var(--text-muted)' }}>
                                                {prog.completionPercent || 0}%
                                            </span>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)' }}>
                                            {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                        </div>
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                                        {prog.audios?.length === 0 ? (
                                            <p className="text-muted" style={{ marginTop: '1.25rem' }}>Aucun audio dans ce programme.</p>
                                        ) : (
                                            <div className="training-list" style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {prog.audios.map((audio, idx) => (
                                                    <div 
                                                        key={audio.id} 
                                                        className={`training-item${currentAudio?.id === audio.id ? ' playing' : ''}`}
                                                        onClick={() => { setCurrentAudio(audio); setCurrentProgramId(prog.id); }}
                                                        style={{ 
                                                            cursor: 'pointer', 
                                                            background: currentAudio?.id === audio.id ? 'var(--bg-input)' : 'transparent',
                                                            borderRadius: '8px',
                                                            padding: '0.75rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '1rem',
                                                            border: currentAudio?.id === audio.id ? '1px solid var(--primary)' : '1px solid transparent',
                                                            transition: 'var(--transition)'
                                                        }}
                                                    >
                                                        <div className="training-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                                                            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '1.5rem', textAlign: 'center', flexShrink: 0 }}>
                                                                {(audio.order ?? idx) + 1}
                                                            </span>
                                                            {audio.coverUrl && (
                                                                <img src={audio.coverUrl} alt={audio.title} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                                                            )}
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <h3 style={{ fontSize: '0.95rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{audio.title}</h3>
                                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(audio.duration)} • {audio.type}</p>
                                                            </div>
                                                        </div>
                                                        <div className="training-stats" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                                            <span style={{
                                                                fontSize: '0.8rem', fontWeight: 600,
                                                                color: (audio.listenCount || 0) >= (audio.requiredListens || 1) ? 'var(--success)' : 'var(--text-muted)',
                                                            }}>
                                                                {audio.listenCount || 0}/{audio.requiredListens || 1} écoutes
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleFavorite(audio.id);
                                                                }}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    cursor: 'pointer',
                                                                    padding: '0.25rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                <Heart
                                                                    size={20}
                                                                    fill={favorites.includes(audio.id) ? 'currentColor' : 'none'}
                                                                    style={{ color: favorites.includes(audio.id) ? 'var(--danger)' : 'var(--text-muted)' }}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
