'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import type { Program } from '@/types';

interface Props {
    userId: string;
}

export default function UserProgramsPanel({ userId }: Props) {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient
            .get<Program[]>(`/programs/user/${userId}`)
            .then((p) => {
                setPrograms(p);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [userId]);

    if (loading) return null;

    return (
        <div style={{ marginTop: '2rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Programmes en cours</h2>

            {programs.length === 0 ? (
                <div
                    style={{
                        padding: '1.5rem',
                        background: 'var(--bg-input)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px dashed var(--border)',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        fontSize: '0.9rem',
                    }}
                >
                    Aucun programme assigné.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {programs.map((prog) => {
                        const pct = prog.completionPercent ?? 0;
                        const done = pct === 100;
                        return (
                            <div
                                key={prog.id}
                                style={{
                                    padding: '1rem 1.25rem',
                                    background: 'var(--bg-input)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '0.6rem',
                                        gap: '1rem',
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{prog.name}</div>
                                        {prog.description && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                {prog.description}
                                            </div>
                                        )}
                                    </div>
                                    <span
                                        style={{
                                            fontWeight: 700,
                                            fontSize: '0.95rem',
                                            color: done ? 'var(--success)' : 'var(--primary)',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {pct}%
                                    </span>
                                </div>

                                <div
                                    style={{
                                        height: '8px',
                                        borderRadius: '4px',
                                        background: 'var(--border)',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: `${pct}%`,
                                            height: '100%',
                                            borderRadius: '4px',
                                            background: done ? 'var(--success)' : 'var(--primary)',
                                            transition: 'width 0.3s ease',
                                        }}
                                    />
                                </div>

                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '1rem',
                                        marginTop: '0.5rem',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-muted)',
                                    }}
                                >
                                    <span>{prog.audios?.length ?? 0} audio{(prog.audios?.length ?? 0) !== 1 ? 's' : ''}</span>
                                    {prog.createdBy && (
                                        <span>Par {prog.createdBy.firstName} {prog.createdBy.lastName}</span>
                                    )}
                                    {done && <span style={{ color: 'var(--success)', fontWeight: 600 }}>Complété</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
