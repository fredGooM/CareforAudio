'use client';

import { useSession } from 'next-auth/react';
import Loader from '@/components/Loader';
import UserStatesPanel from '@/components/UserStatesPanel';

export default function StatesPage() {
    const { data: session } = useSession();

    if (!session) return <Loader />;

    const userId = (session.user as any)?.id;

    return (
        <div className="page-content">
            <h1>Mes États</h1>
            <UserStatesPanel userId={userId} />
        </div>
    );
}
