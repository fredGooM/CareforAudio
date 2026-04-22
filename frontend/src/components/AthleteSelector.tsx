'use client';

import { useRef, useState, useEffect } from 'react';
import { Users, ChevronDown } from 'lucide-react';

function initials(name: string) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

interface Props {
    athletes: { id: string; name: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
    allLabel?: string;
}

export default function AthleteSelector({ athletes, selectedId, onSelect, allLabel = 'Tous les athlètes' }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const selected = athletes.find(a => a.id === selectedId);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.5rem 0.75rem 0.5rem 0.6rem',
                    background: selectedId ? 'rgba(239,68,68,0.12)' : 'var(--bg-input)',
                    border: `1px solid ${selectedId ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: '10px',
                    color: selectedId ? 'var(--text)' : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.875rem', fontWeight: 500,
                    transition: 'var(--transition)', minWidth: '210px',
                }}
            >
                {selected ? (
                    <>
                        <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                            {initials(selected.name)}
                        </span>
                        <span style={{ flex: 1, textAlign: 'left' }}>{selected.name}</span>
                    </>
                ) : (
                    <><Users size={16} style={{ flexShrink: 0 }} /><span style={{ flex: 1, textAlign: 'left' }}>{allLabel}</span></>
                )}
                <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow)', zIndex: 50, overflow: 'hidden', animation: 'fadeIn 0.15s ease' }}>
                    <button
                        onClick={() => { onSelect(''); setOpen(false); }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.875rem', background: !selectedId ? 'rgba(239,68,68,0.1)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: !selectedId ? 'var(--primary-light)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.85rem', textAlign: 'left', transition: 'var(--transition)' }}
                    >
                        <Users size={15} />{allLabel}
                    </button>
                    {athletes.map(a => (
                        <button
                            key={a.id}
                            onClick={() => { onSelect(a.id); setOpen(false); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.875rem', background: selectedId === a.id ? 'rgba(239,68,68,0.1)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(51,65,85,0.4)', color: selectedId === a.id ? 'var(--primary-light)' : 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.85rem', textAlign: 'left', transition: 'var(--transition)' }}
                        >
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                {initials(a.name)}
                            </span>
                            {a.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
