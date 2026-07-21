'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import UserStatesPanel from '@/components/UserStatesPanel';

export default function StatesPage() {
    const { data: session } = useSession();

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
    }, [session]);

    if (!session) return <Loader />;

    const userId = (session.user as any)?.id;

    return (
        <div className="page-content">
            <h1>Mes États</h1>
            <UserStatesPanel userId={userId} />
        </div>
    );
}
