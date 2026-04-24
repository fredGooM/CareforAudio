'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, PlayCircle, Heart, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { DOMINANCE_LABELS, PHASING_LABELS } from '@/lib/audio-labels';

export interface ProgramAudioItem {
    id: string;
    title: string;
    duration: number;
    type: string;
    dominance?: string;
    phasing?: string[];
    listenCount?: number;
    requiredListens?: number;
    order?: number;
    url: string;
    coverUrl?: string;
}

export interface ProgramCardData {
    id: string;
    name: string;
    description?: string;
    recurrenceDays?: number | null;
    audios?: ProgramAudioItem[];
    completionPercent?: number;
}

interface ProgramCardProps {
    program: ProgramCardData;
    /** If provided, clicking an audio item calls this instead of navigating */
    onPlayAudio?: (audio: ProgramAudioItem, programId: string) => void;
    currentAudioId?: string;
    favorites?: string[];
    onToggleFavorite?: (audioId: string) => void;
    /** When no onPlayAudio is given, audio items link to this URL (defaults to /training) */
    playHref?: string;
    defaultExpanded?: boolean;
}

function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ProgramCard({
    program,
    onPlayAudio,
    currentAudioId,
    favorites = [],
    onToggleFavorite,
    playHref = '/training',
    defaultExpanded = false,
}: ProgramCardProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const completion = program.completionPercent ?? 0;

    return (
        <div
            className="program-card"
            style={{
                background: 'var(--bg-card)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
                border: '1px solid var(--border)',
            }}
        >
            {/* Header — click to expand */}
            <div
                onClick={() => setIsExpanded(prev => !prev)}
                style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: isExpanded ? 'var(--bg-input)' : 'transparent',
                    transition: 'background 0.2s',
                }}
            >
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <PlayCircle size={24} className="text-primary" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{program.name}</span>
                    </h2>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem 1rem' }}>
                        <span>{program.audios?.length ?? 0} audios</span>
                        {program.description && (
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>• {program.description}</span>
                        )}
                        {program.recurrenceDays && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(124,92,252,0.12)', color: 'var(--primary)', borderRadius: '6px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', fontWeight: 500, flexShrink: 0 }}>
                                <RefreshCw size={11} />
                                {program.recurrenceDays % 30 === 0
                                    ? `/${program.recurrenceDays / 30} mois`
                                    : program.recurrenceDays % 7 === 0
                                        ? `/${program.recurrenceDays / 7} sem.`
                                        : `/${program.recurrenceDays}j`}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    {/* Completion bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '50px', height: '6px', borderRadius: '3px', background: 'var(--border)', overflow: 'hidden' }}>
                            <div style={{
                                width: `${completion}%`,
                                height: '100%',
                                borderRadius: '3px',
                                background: completion === 100 ? 'var(--success)' : 'var(--primary)',
                            }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: completion === 100 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {completion}%
                        </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                    </div>
                </div>
            </div>

            {/* Expanded audio list */}
            {isExpanded && (
                <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', borderTop: '1px solid var(--border)' }}>
                    {!program.audios?.length ? (
                        <p className="text-muted" style={{ marginTop: '1.25rem' }}>Aucun audio dans ce programme.</p>
                    ) : (
                        <div className="training-list" style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {program.audios.map((audio, idx) => {
                                const isPlaying = currentAudioId === audio.id;
                                const isFav = favorites.includes(audio.id);

                                const inner = (
                                    <div
                                        className={`training-item${isPlaying ? ' playing' : ''}`}
                                        style={{
                                            cursor: 'pointer',
                                            background: isPlaying ? 'var(--bg-input)' : 'transparent',
                                            borderRadius: '8px',
                                            padding: '0.75rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '1rem',
                                            border: isPlaying ? '1px solid var(--primary)' : '1px solid transparent',
                                            transition: 'var(--transition)',
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
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                                    {formatDuration(audio.duration)}
                                                </p>
                                                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
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

                                        <div className="training-stats" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                            <span style={{
                                                fontSize: '0.8rem', fontWeight: 600,
                                                color: (audio.listenCount ?? 0) >= (audio.requiredListens ?? 1) ? 'var(--success)' : 'var(--text-muted)',
                                            }}>
                                                {audio.listenCount ?? 0}/{audio.requiredListens ?? 1} écoutes
                                            </span>
                                            {onToggleFavorite && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(audio.id); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Heart
                                                        size={20}
                                                        fill={isFav ? 'currentColor' : 'none'}
                                                        style={{ color: isFav ? 'var(--danger)' : 'var(--text-muted)' }}
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );

                                if (onPlayAudio) {
                                    return (
                                        <div key={audio.id} onClick={() => onPlayAudio(audio, program.id)}>
                                            {inner}
                                        </div>
                                    );
                                }

                                return (
                                    <Link key={audio.id} href={playHref} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                                        {inner}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
