'use client';

import { useEffect, useRef, useState } from 'react';
import { Users, AlertTriangle, CalendarClock, ChevronDown } from 'lucide-react';
import apiClient from '@/lib/api-client';
import AthleteView from './AthleteView';
import type { CalendarEvent, EventType } from '@/types';
import { EVENT_TYPE_LABELS } from '@/types';

interface TeacherOverview {
    athletes: { id: string; name: string }[];
    dropoffs: { userId: string; name: string; daysSince: number | null }[];
}

const RDV_TYPES: string[] = ['RDV_LIVE_COACH', 'RDV_TRAINING'];

function initials(name: string) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

/* ─── Athlete Selector ───────────────────────────────────────────── */
function AthleteSelector({ athletes, selectedId, onSelect }: {
    athletes: { id: string; name: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
}) {
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
            <button onClick={() => setOpen(o => !o)} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
                padding: '0.5rem 0.75rem 0.5rem 0.6rem',
                background: selectedId ? 'rgba(239,68,68,0.12)' : 'var(--bg-input)',
                border: `1px solid ${selectedId ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '10px',
                color: selectedId ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.875rem', fontWeight: 500,
                transition: 'var(--transition)', minWidth: '210px',
            }}>
                {selected ? (
                    <><span style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(selected.name)}</span>
                        <span style={{ flex: 1, textAlign: 'left' }}>{selected.name}</span></>
                ) : (
                    <><Users size={16} style={{ flexShrink: 0 }} /><span style={{ flex: 1, textAlign: 'left' }}>Tous les athlètes</span></>
                )}
                <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {open && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow)', zIndex: 50, overflow: 'hidden', animation: 'fadeIn 0.15s ease' }}>
                    <button onClick={() => { onSelect(''); setOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.875rem', background: !selectedId ? 'rgba(239,68,68,0.1)' : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', color: !selectedId ? 'var(--primary-light)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.85rem', textAlign: 'left', transition: 'var(--transition)' }}>
                        <Users size={15} />Tous les athlètes
                    </button>
                    {athletes.map(a => (
                        <button key={a.id} onClick={() => { onSelect(a.id); setOpen(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.875rem', background: selectedId === a.id ? 'rgba(239,68,68,0.1)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(51,65,85,0.4)', color: selectedId === a.id ? 'var(--primary-light)' : 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '0.85rem', textAlign: 'left', transition: 'var(--transition)' }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(a.name)}</span>
                            {a.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Widget shell ───────────────────────────────────────────────── */
function Widget({ title, icon, children, style }: {
    title?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    style?: React.CSSProperties;
}) {
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden', ...style }}>
            {title && (
                <div style={{ padding: '0.875rem 1.125rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {icon && <span style={{ color: 'var(--primary-light)', display: 'flex' }}>{icon}</span>}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{title}</span>
                </div>
            )}
            <div style={{ flex: 1, padding: '1rem 1.125rem', overflow: 'auto' }}>
                {children}
            </div>
        </div>
    );
}

/* ─── Stat card ──────────────────────────────────────────────────── */
function StatCard({ value, label, color }: { value: string | number; label: string; color?: string }) {
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, background: color ?? 'linear-gradient(135deg,var(--primary),var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{label}</div>
        </div>
    );
}

/* ─── Main ───────────────────────────────────────────────────────── */
export default function TeacherDashboard({ accessToken }: { accessToken: string }) {
    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const [overview, setOverview] = useState<TeacherOverview | null>(null);
    const [teacherEvents, setTeacherEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.setToken(accessToken);
        Promise.all([
            apiClient.get<TeacherOverview>('/analytics/teacher-overview'),
            apiClient.get<CalendarEvent[]>('/events/teacher'),
        ]).then(([ov, ev]) => { setOverview(ov); setTeacherEvents(ev); setLoading(false); })
            .catch(() => setLoading(false));
    }, [accessToken]);

    if (loading) return null;

    const now = new Date();
    const upcomingRdv = teacherEvents.filter(ev => RDV_TYPES.includes(ev.type as string) && new Date(ev.date) >= now).slice(0, 8);
    const selectedAthlete = overview?.athletes.find(a => a.id === selectedAthleteId);
    const alertCount = overview?.dropoffs.filter(d => d.daysSince === null || d.daysSince > 15).length ?? 0;

    return (
        <div className="page-content">

            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                <h1 style={{ margin: 0 }}>Mon Dashboard</h1>
                <AthleteSelector athletes={overview?.athletes ?? []} selectedId={selectedAthleteId} onSelect={setSelectedAthleteId} />
            </div>

            {!selectedAthleteId ? (

                /* ══════════════ VUE GLOBALE ══════════════ */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Row 1 — stat cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                        <StatCard value={overview?.athletes.length ?? 0} label="Athlètes" />
                        <StatCard value={upcomingRdv.length} label="RDV à venir" />
                        <StatCard
                            value={alertCount}
                            label="Alertes décrochage"
                            color={alertCount > 0 ? 'linear-gradient(135deg,var(--warning),var(--danger))' : undefined}
                        />
                    </div>

                    {/* Row 2 — RDV + Alertes */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', alignItems: 'start' }}>

                        <Widget title="Rendez-vous à venir" icon={<CalendarClock size={15} />}>
                            {upcomingRdv.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Aucun rendez-vous prévu.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {upcomingRdv.map(ev => (
                                        <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(51,65,85,0.4)' }}>
                                            <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 36 }}>
                                                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-light)', lineHeight: 1 }}>{new Date(ev.date).getDate()}</div>
                                                <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{new Date(ev.date).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(ev.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                    {ev.user && <> · <button onClick={() => setSelectedAthleteId(ev.userId)} style={{ background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 'inherit', padding: 0, fontWeight: 500 }}>{ev.user.firstName} {ev.user.lastName}</button></>}
                                                </div>
                                            </div>
                                            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 500, background: 'rgba(239,68,68,0.1)', color: 'var(--primary-light)', flexShrink: 0 }}>
                                                {EVENT_TYPE_LABELS[ev.type as EventType] ?? ev.type}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Widget>

                        <Widget title="Alertes décrochage" icon={<AlertTriangle size={15} />}>
                            {overview?.dropoffs.length === 0 ? (
                                <p style={{ color: 'var(--success)', fontSize: '0.875rem', margin: 0 }}>Tous les athlètes sont actifs.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {overview?.dropoffs.map(d => {
                                        const crit = d.daysSince === null || d.daysSince > 30;
                                        const warn = !crit && d.daysSince !== null && d.daysSince > 15;
                                        return (
                                            <button key={d.userId} onClick={() => setSelectedAthleteId(d.userId)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.75rem', background: crit ? 'rgba(239,68,68,0.07)' : warn ? 'rgba(245,158,11,0.07)' : 'rgba(0,0,0,0.12)', border: `1px solid ${crit ? 'rgba(239,68,68,0.2)' : warn ? 'rgba(245,158,11,0.2)' : 'rgba(51,65,85,0.4)'}`, borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'var(--transition)', textAlign: 'left', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>{d.name}</span>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: crit ? 'var(--danger)' : warn ? 'var(--warning)' : 'var(--text-muted)', flexShrink: 0 }}>
                                                    {d.daysSince === null ? 'Jamais' : `${d.daysSince}j`}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </Widget>
                    </div>

                    {/* Row 3 — Athletes grid */}
                    <Widget title={`Mes athlètes (${overview?.athletes.length ?? 0})`} icon={<Users size={15} />}>
                        {overview?.athletes.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Aucun athlète.</p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                                {overview?.athletes.map(a => (
                                    <button key={a.id} onClick={() => setSelectedAthleteId(a.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.6rem 0.75rem', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(51,65,85,0.4)', borderRadius: '8px', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'var(--transition)', textAlign: 'left' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.07)'; }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(51,65,85,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.15)'; }}
                                    >
                                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(a.name)}</span>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </Widget>
                </div>

            ) : (
                <AthleteView
                    userId={selectedAthleteId}
                    athleteName={selectedAthlete?.name ?? ''}
                    onBack={() => setSelectedAthleteId('')}
                />
            )}
        </div>
    );
}
