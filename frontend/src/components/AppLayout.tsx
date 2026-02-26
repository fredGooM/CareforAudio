'use client';

import { useSession, signIn } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { status } = useSession();
    const pathname = usePathname();

    const isPublic =
        pathname.startsWith('/login') || pathname.startsWith('/change-password');

    const devQuickLog = process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50">
            <h3 className="text-sm font-medium text-gray-800 mb-3 text-center">Développement Rapide</h3>
            <div className="flex flex-col gap-2">
                <button
                    onClick={async () => {
                        await signIn('credentials', { email: 'admin@careformance.com', password: 'admin', redirect: false });
                        window.location.href = '/dashboard';
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-md text-xs font-medium hover:bg-red-200 transition-colors"
                >
                    🚀 Admin
                </button>
                <button
                    onClick={async () => {
                        await signIn('credentials', { email: 'teacher@careformance.com', password: 'change-password', redirect: false });
                        window.location.href = '/dashboard';
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-200 transition-colors"
                >
                    👨‍🏫 Teacher
                </button>
                <button
                    onClick={async () => {
                        await signIn('credentials', { email: 'athlete@careformance.com', password: 'change-password', redirect: false });
                        window.location.href = '/dashboard';
                    }}
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-md text-xs font-medium hover:bg-green-200 transition-colors"
                >
                    🏃 Athlete
                </button>
            </div>
        </div>
    );

    if (isPublic || status !== 'authenticated') {
        return (
            <>
                {children}
                {devQuickLog}
            </>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">{children}</main>
            {devQuickLog}
        </div>
    );
}
