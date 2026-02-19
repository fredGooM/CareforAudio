'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import type { Dashboard, DashboardUser, DashboardAdmin } from '@/types';

export default function DashboardPage() {
    const { data: session } = useSession();
    const [dashboard, setDashboard] = useState<Dashboard | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        apiClient.get<Dashboard>('/analytics/dashboard').then((data) => {
            setDashboard(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

    if (loading) return <div className="page-loading">Chargement...</div>;
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
                <h2>Mon Programme</h2>
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${d.myProgramProgress.percent}%` }} />
                </div>
                <p>{d.myProgramProgress.completed}/{d.myProgramProgress.total} audios complétés</p>
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
