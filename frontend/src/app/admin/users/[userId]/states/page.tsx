'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import AthleteView from '@/components/AthleteView';
import type { UserProfile } from '@/types';

export default function AdminUserStatesPage() {
    const { data: session } = useSession();
    const params = useParams();
    const router = useRouter();
    const userId = params.userId as string;

    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        apiClient
            .get<UserProfile>(`/users/${userId}`)
            .then((u) => { setUser(u); setLoading(false); })
            .catch(() => setLoading(false));
    }, [session, userId]);

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <div className="page-header">
                <button
                    onClick={() => router.push('/admin/users')}
                    className="btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <ArrowLeft size={16} /> Retour
                </button>
            </div>

            <AthleteView
                userId={userId}
                athleteName={user ? `${user.firstName} ${user.lastName}` : ''}
            />
        </div>
    );
}
