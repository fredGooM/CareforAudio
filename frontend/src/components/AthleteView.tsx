'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart2, Calendar, TrendingUp, X, ExternalLink } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import apiClient from '@/lib/api-client';
import UserProgramsPanel from './UserProgramsPanel';
import UserStatesPanel from './UserStatesPanel';
import type { CalendarEvent, EventType } from '@/types';
import { EVENT_TYPE_LABELS } from '@/types';

interface EngagementDay { date: string; minutes: number; }

interface Props {
    userId: string;
    athleteName: string;
    /** Si fourni, affiche le bouton ✕ dans la barre d'identité */
    onBack?: () => void;
}

function initials(name: string) {
    return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

/* ─── Widget shell ───────────────────────────────────────────── */
function Widget({ title, icon, action, children, style }: {
    title?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
    style?: React.CSSProperties;
}) {
    return (
        <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', ...style,
        }}>
            {title && (
                <div style={{ padding: '0.875rem 1.125rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {icon && <span style={{ color: 'var(--primary-light)', display: 'flex' }}>{icon}</span>}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', flex: 1 }}>{title}</span>
                    {action}
                </div>
            )}
            <div style={{ flex: 1, padding: '1rem 1.125rem', overflowY: 'auto' }}>
                {children}
            </div>
        </div>
    );
}

/* ─── AthleteView ────────────────────────────────────────────── */
export default function AthleteView({ userId, athleteName, onBack }: Props) {
    const [athleteEvents, setAthleteEvents] = useState<CalendarEvent[]>([]);
    const [engagement, setEngagement] = useState<EngagementDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            apiClient.get<CalendarEvent[]>(`/events/user/${userId}`),
            apiClient.get<EngagementDay[]>(`/analytics/engagement/${userId}`),
        ])
            .then(([ev, eng]) => { setAthleteEvents(ev); setEngagement(eng); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userId]);

    const now = new Date();
    const upcomingEvents = athleteEvents.filter(ev => new Date(ev.date) >= now).slice(0, 10);
    const engagementWeek = engagement.slice(-7).reduce((s, d) => s + d.minutes, 0);
    const hasEngagement = engagement.some(d => d.minutes > 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Identity bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {initials(athleteName)}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{athleteName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Athlète</div>
                </div>
                <div style={{ display: 'flex', gap: '2rem', paddingRight: '1rem', borderRight: '1px solid var(--border)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,var(--primary),var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            {engagementWeek}<span style={{ fontSize: '0.7rem' }}> min</span>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Cette semaine</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, background: 'linear-gradient(135deg,var(--primary),var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            {upcomingEvents.length}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Événements</div>
                    </div>
                </div>
                {onBack && (
                    <button onClick={onBack} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0, transition: 'var(--transition)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary-light)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Row 2 — Engagement + Événements (même hauteur, scroll interne events) */}
            {!loading && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', alignItems: 'stretch' }}>

                    <Widget title="Engagement quotidien — 30 jours" icon={<BarChart2 size={15} />}>
                        {!hasEngagement ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Aucune écoute sur les 30 derniers jours.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={170}>
                                <BarChart data={engagement} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={4} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="m" axisLine={false} tickLine={false} />
                                    <Tooltip formatter={(v: number | undefined) => [`${v ?? 0} min`, 'Écoute']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }} cursor={{ fill: 'rgba(239,68,68,0.06)' }} />
                                    <Bar dataKey="minutes" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Widget>

                    <Widget
                        title="Événements à venir"
                        icon={<Calendar size={15} />}
                        action={
                            <Link href={`/admin/calendar/${userId}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none', padding: '0.2rem 0.5rem', border: '1px solid var(--border)', borderRadius: '6px', transition: 'var(--transition)' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLElement).style.color = 'var(--primary-light)'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                            >
                                <ExternalLink size={11} /> Calendrier
                            </Link>
                        }
                    >
                        {upcomingEvents.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Aucun événement prévu.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {upcomingEvents.map(ev => (
                                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.625rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(51,65,85,0.4)', flexShrink: 0 }}>
                                        <div style={{ background: 'rgba(239,68,68,0.12)', borderRadius: '6px', padding: '0.3rem 0.45rem', textAlign: 'center', flexShrink: 0 }}>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-light)', lineHeight: 1 }}>{new Date(ev.date).getDate()}</div>
                                            <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{new Date(ev.date).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {new Date(ev.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                {ev.type && ` · ${EVENT_TYPE_LABELS[ev.type as EventType] ?? ev.type}`}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Widget>
                </div>
            )}

            {/* Row 3 — Programmes */}
            <Widget title="Programmes" icon={<TrendingUp size={15} />}>
                <UserProgramsPanel userId={userId} standalone={false} />
            </Widget>

            {/* Row 4 — États */}
            <Widget title="États & indicateurs" icon={<BarChart2 size={15} />}>
                <UserStatesPanel userId={userId} readonly />
            </Widget>
        </div>
    );
}
