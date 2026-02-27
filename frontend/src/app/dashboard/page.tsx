'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import { CalendarHeart } from 'lucide-react';
import type { Dashboard, DashboardUser, DashboardAdmin, Program } from '@/types';

export default function DashboardPage() {
    const { data: session } = useSession();
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [programs, setPrograms] = useState<Program[]>([]);
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
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [session]);

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
                    <div className="stat-label">Complétion</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{d.streakDays}j</div>
                    <div className="stat-label">Série</div>
                </div>
            </div>

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
