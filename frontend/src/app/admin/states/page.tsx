'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import UserStatesPanel from '@/components/UserStatesPanel';
import AthleteSelector from '@/components/AthleteSelector';
import { UserProfile } from '@/types';
import { Activity } from 'lucide-react';

export default function AdminStatesPage() {
    const { data: session } = useSession();
    const [athletes, setAthletes] = useState<UserProfile[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        apiClient.get<UserProfile[]>('/users')
            .then(data => setAthletes(data.filter(u => u.role === 'ATHLETE')))
            .finally(() => setLoading(false));
    }, [session]);

    const athleteOptions = athletes.map(a => ({
        id: a.id,
        name: `${a.firstName} ${a.lastName}`,
    }));

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>États des athlètes</h1>
                <AthleteSelector
                    athletes={athleteOptions}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                />
            </div>

            {selectedId ? (
                <UserStatesPanel userId={selectedId} readonly teacherMode />
            ) : (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '5rem 2rem', gap: '1rem', color: 'var(--text-muted)',
                }}>
                    <Activity size={52} style={{ opacity: 0.25 }} />
                    <p style={{ fontSize: '1rem', margin: 0 }}>Sélectionne un athlète pour voir ses états</p>
                </div>
            )}
        </div>
    );
}
