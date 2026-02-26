'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, PlayCircle, Heart } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import AudioPlayer from '@/components/AudioPlayer';

interface ProgramAudio {
    id: string;
    title: string;
    duration: number;
    categoryId: string;
    type: string;
    timesListened?: number;
    url: string;
    coverUrl?: string;
}

interface ProgramDTO {
    id: string;
    name: string;
    description: string;
    audios: ProgramAudio[];
}

export default function TrainingPage() {
    const { data: session } = useSession();
    const [programs, setPrograms] = useState<ProgramDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedProgramId, setExpandedProgramId] = useState<string | null>(null);
    const [currentAudio, setCurrentAudio] = useState<ProgramAudio | null>(null);
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

    const handleHeartbeat = (position: number, sessionDuration: number) => {
        if (currentAudio) {
            apiClient.post('/analytics/heartbeat', {
                audioId: currentAudio.id,
                position,
                sessionDuration,
            });
        }
    };

    return (
        <div className="page-content">
            <h1>Mon Training</h1>

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
                                    background: 'var(--bg-card, #fff)', 
                                    borderRadius: '12px', 
                                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border)'
                                }}
                            >
                                <div 
                                    onClick={() => toggleProgram(prog.id)}
                                    style={{ 
                                        padding: '1.5rem', 
                                        cursor: 'pointer', 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        background: isExpanded ? 'var(--bg-input)' : 'transparent',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <PlayCircle size={24} className="text-primary" />
                                            {prog.name}
                                        </h2>
                                        <div style={{ color: 'var(--text-muted, #666)', fontSize: '0.9rem', display: 'flex', gap: '1rem' }}>
                                            <span>{prog.audios?.length || 0} audios</span>
                                            {prog.description && <span>• {prog.description}</span>}
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-muted, #666)' }}>
                                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid var(--border)' }}>
                                        {prog.audios?.length === 0 ? (
                                            <p className="text-muted" style={{ marginTop: '1.5rem' }}>Aucun audio dans ce programme.</p>
                                        ) : (
                                            <div className="training-list" style={{ marginTop: '1.5rem' }}>
                                                {prog.audios.map((audio) => (
                                                    <div 
                                                        key={audio.id} 
                                                        className={`training-item${currentAudio?.id === audio.id ? ' playing' : ''}`}
                                                        onClick={() => setCurrentAudio(audio)}
                                                        style={{ cursor: 'pointer', background: currentAudio?.id === audio.id ? 'var(--bg-secondary)' : 'transparent' }}
                                                    >
                                                        <div className="training-info" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            {audio.coverUrl && (
                                                                <img src={audio.coverUrl} alt={audio.title} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                                                            )}
                                                            <div>
                                                                <h3>{audio.title}</h3>
                                                                <p>{Math.round(audio.duration / 60)} min • {audio.type}</p>
                                                            </div>
                                                        </div>
                                                        <div className="training-stats" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <span>Écoutes : {audio.timesListened || 0}</span>
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
                    onHeartbeat={handleHeartbeat}
                />
            )}
        </div>
    );
}
