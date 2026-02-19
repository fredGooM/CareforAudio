'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const pathname = usePathname();

    const isPublic =
        pathname.startsWith('/login') || pathname.startsWith('/change-password');

    if (isPublic || status !== 'authenticated') {
        return <>{children}</>;
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">{children}</main>
        </div>
    );
}
