'use client';

import { useSession, signOut } from 'next-auth/react';
import { ChevronRight } from 'lucide-react';

export default function ProfilePage() {
    const { data: session } = useSession();
    const user = session?.user as any;

    return (
        <div className="page-content">
            <h1>Mon Profil</h1>

            <div className="profile-card">
                <div className="profile-avatar">
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="profile-info">
                    <h2>{user?.name || 'Utilisateur'}</h2>
                    <p className="profile-email">{user?.email}</p>
                    <span className="profile-role-badge">
                        {user?.role === 'ADMIN' ? 'Administrateur' : 'Athlète'}
                    </span>
                </div>
            </div>

            <div className="profile-section">
                <h3>Compte</h3>
                <div className="profile-actions">
                    <a href="/change-password" className="profile-action-item">
                        <span>Changer le mot de passe</span>
                        <ChevronRight size={16} />
                    </a>
                </div>
            </div>

            <div className="profile-section">
                <button
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    className="profile-logout-btn"
                >
                    Se déconnecter
                </button>
            </div>
        </div>
    );
}
