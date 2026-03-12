'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import { CalendarHeart, CalendarDays, Clock, ArrowRight, BarChart2, AlertTriangle } from 'lucide-react';
import type { Dashboard, DashboardUser, DashboardAdmin, Program, CalendarEvent } from '@/types';
import Link from 'next/link';
import TeacherDashboard from '@/components/TeacherDashboard';
import UserStatesPanel from '@/components/UserStatesPanel';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface EngagementDay { date: string; minutes: number; }

export default function DashboardPage() {
    const { data: session } = useSession();
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
    const [engagement, setEngagement] = useState<EngagementDay[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        const init = async () => {
            try {
                apiClient.setToken((session as any).accessToken);
                const [dashData, progsData] = await Promise.all([
                    apiClient.get<Dashboard>('/analytics/dashboard'),
                    apiClient.get<Program[]>('/programs')
                ]);
                setDashboard(dashData);
                setPrograms(progsData);

                // Fetch upcoming events and engagement for athletes
                if (dashData.role === 'ATHLETE') {
                    try {
                        const eventsData = await apiClient.get<CalendarEvent[]>('/events/me');
                        const now = new Date();
                        const upcoming = eventsData
                            .filter(ev => new Date(ev.date) >= now)
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                            .slice(0, 5);
                        setUpcomingEvents(upcoming);
                    } catch {
                        // Events might not be available
                    }
                    try {
                        const userId = (session.user as any)?.id;
                        if (userId) {
                            const engData = await apiClient.get<EngagementDay[]>(`/analytics/engagement/${userId}`);
                            setEngagement(engData);
                        }
                    } catch {
                        // engagement not available
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [session]);

    const sessionRole = (session?.user as any)?.role;

    if (sessionRole === 'TEACHER') {
        if (!session) return <Loader />;
        return <TeacherDashboard accessToken={(session as any).accessToken} />;
    }

    if (loading) return <Loader />;
    if (!dashboard) return <div className="page-error">Erreur de chargement</div>;

    if (dashboard.role === 'ADMIN') {
        const d = dashboard as DashboardAdmin;
        return (
            <div className="page-content">
                <h1>Dashboard Admin</h1>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-value">{d.totalListeningHours}h</div>
                        <div className="stat-label">Heures d&#39;écoute totales</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{d.completionRate}%</div>
                        <div className="stat-label">Taux de complétion</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{d.activeAthletes ?? '-'}</div>
                        <div className="stat-label">Athlètes actifs (7j)</div>
                    </div>
                </div>

                <div className="section">
                    <h2>Audios populaires</h2>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Titre</th><th>Minutes</th></tr>
                            </thead>
                            <tbody>
                                {d.popularAudios.map((a) => (
                                    <tr key={a.audioId}>
                                        <td>{a.title}</td>
                                        <td>{a.minutes} min</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {d.dropoffs.length > 0 && (
                    <div className="section">
                        <h2>Décrochages</h2>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr><th>Athlète</th><th>Inactif depuis</th></tr>
                                </thead>
                                <tbody>
                                    {d.dropoffs.map((item) => (
                                        <tr key={item.userId}>
                                            <td>{item.name}</td>
                                            <td>{item.daysSince} jours</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>
        );
    }

    // User dashboard
    const d = dashboard as DashboardUser;

    const hasEngagement = engagement.some(day => day.minutes > 0);
    const lastListenedAt = d.lastListenedAt ? new Date(d.lastListenedAt) : null;
    const daysSinceLastListen = lastListenedAt
        ? Math.floor((Date.now() - lastListenedAt.getTime()) / (1000 * 60 * 60 * 24))
        : null;
    const isInactive = daysSinceLastListen === null || daysSinceLastListen >= 7;

    /** Format relative date label */
    function formatEventDate(dateStr: string): { day: string; time: string; relative: string } {
        const date = new Date(dateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.round((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const day = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
        const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        let relative = '';
        if (diffDays === 0) relative = "Aujourd'hui";
        else if (diffDays === 1) relative = 'Demain';
        else if (diffDays < 7) relative = `Dans ${diffDays} jours`;
        else relative = `Dans ${Math.ceil(diffDays / 7)} sem.`;

        return { day, time, relative };
    }

    return (
        <div className="page-content">
            <h1>Mon Dashboard</h1>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{d.totalMinutes} min</div>
                    <div className="stat-label">Écoute totale</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{d.last7DaysMinutes} min</div>
                    <div className="stat-label">7 derniers jours</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{d.completionPercent}%</div>
                    <div className="stat-label">Complétion programmes</div>
                </div>

            </div>

            {/* ── Last listen + inactivity alert ── */}
            <div style={{
                background: isInactive ? 'rgba(234, 179, 8, 0.08)' : 'var(--bg-card)',
                border: `1px solid ${isInactive ? 'rgba(234, 179, 8, 0.4)' : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '2rem',
            }}>
                {isInactive
                    ? <AlertTriangle size={20} style={{ flexShrink: 0, color: '#ca8a04' }} />
                    : <Clock size={20} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                }
                <div>
                    <strong style={{ fontSize: '0.95rem', color: isInactive ? '#ca8a04' : 'inherit' }}>
                        {isInactive ? 'Alerte décrochage' : 'Dernière écoute'}
                    </strong>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {lastListenedAt
                            ? `${lastListenedAt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}${isInactive ? ` — ${daysSinceLastListen} jour${daysSinceLastListen! > 1 ? 's' : ''} sans écoute` : ''}`
                            : 'Aucune écoute enregistrée dans vos programmes.'
                        }
                    </p>
                </div>
            </div>

            {/* ── Daily Engagement Chart ── */}
            <div className="section">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <BarChart2 size={20} />
                    Engagement quotidien — 30 jours
                </h2>
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: 'var(--shadow-sm)',
                }}>
                    {!hasEngagement ? (
                        <p className="text-muted" style={{ margin: 0 }}>Aucune écoute sur les 30 derniers jours.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={170}>
                            <BarChart data={engagement} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={4} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="m" axisLine={false} tickLine={false} />
                                <Tooltip formatter={(v: number) => [`${v} min`, 'Écoute']} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }} cursor={{ fill: 'rgba(124,92,252,0.06)' }} />
                                <Bar dataKey="minutes" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={18} minPointSize={3} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Upcoming Events Section ── */}
            {upcomingEvents.length > 0 && (
                <div className="section">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h2 style={{ margin: 0 }}>
                            <CalendarDays size={22} style={{ marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                            Événements à venir
                        </h2>
                        <Link href="/calendar" className="text-primary" style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
                            Voir tout <ArrowRight size={14} />
                        </Link>
                    </div>
                    <div className="upcoming-events-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {upcomingEvents.map(ev => {
                            const { day, time, relative } = formatEventDate(ev.date);
                            return (
                                <div
                                    key={ev.id}
                                    className="upcoming-event-card"
                                    style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '12px',
                                        padding: '1rem 1.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        transition: 'var(--transition)',
                                        boxShadow: 'var(--shadow-sm)',
                                    }}
                                >
                                    {/* Left date badge */}
                                    <div
                                        style={{
                                            background: 'linear-gradient(135deg, var(--primary), var(--primary-hover, #6041e0))',
                                            borderRadius: '10px',
                                            padding: '0.6rem 0.75rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            minWidth: '68px',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {day.split(' ')[0]}
                                        </span>
                                        <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
                                            {day.split(' ')[1]}
                                        </span>
                                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                            {day.split(' ')[2]}
                                        </span>
                                    </div>

                                    {/* Event details */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {ev.title}
                                        </div>
                                        {ev.description && (
                                            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {ev.description}
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.3rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <Clock size={13} /> {time}
                                            </span>
                                            {ev.type && (
                                                <span style={{
                                                    background: 'rgba(124, 92, 252, 0.15)',
                                                    color: 'var(--primary)',
                                                    padding: '0.1rem 0.5rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                }}>
                                                    {ev.type}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Relative badge */}
                                    <div
                                        style={{
                                            fontSize: '0.78rem',
                                            fontWeight: 500,
                                            color: relative === "Aujourd'hui" ? '#2ec4b6' : relative === 'Demain' ? '#f2c14e' : 'var(--text-muted)',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}
                                    >
                                        {relative}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="section">
                <h2>Mes Programmes ({programs.length})</h2>
                {programs.length > 0 ? (
                    <div className="programs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {programs.map(prog => (
                            <div key={prog.id} style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'var(--transition)', boxShadow: 'var(--shadow-sm)' }}>
                                <CalendarHeart className="text-primary" size={28} style={{ flexShrink: 0 }} />
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <h3 style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prog.name}</h3>
                                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {prog.audios?.length || 0} séances {prog.description ? `— ${prog.description}` : ''}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted">Aucun programme assigné pour le moment.</p>
                )}
            </div>

            {/* ── States Panel ── */}
            {session && (session?.user as any)?.id && (
                <div className="section">
                    <h2>Mes États</h2>
                    <UserStatesPanel userId={(session.user as any).id} />
                </div>
            )}

            {d.continueListening.length > 0 && (
                <div className="section">
                    <h2>Continuer l&#39;écoute</h2>
                    <div className="continue-list">
                        {d.continueListening.map((item) => (
                            <div key={item.audioId} className="continue-item">
                                <span>{item.title}</span>
                                <div className="progress-bar-container small">
                                    <div className="progress-bar" style={{ width: `${item.progressPercent}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
