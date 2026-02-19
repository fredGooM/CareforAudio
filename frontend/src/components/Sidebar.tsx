'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* ── Minimal SVG icons (monochrome, 24×24) ── */
const icons = {
    dashboard: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    ),
    catalog: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
        </svg>
    ),
    training: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20V4" />
            <path d="M2 8h4v8H2z" />
            <path d="M18 8h4v8h-4z" />
            <path d="M6 10h2v4H6z" />
            <path d="M16 10h2v4h-2z" />
        </svg>
    ),
    favorites: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
    ),
    library: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
    ),
    users: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
    ),
    program: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
        </svg>
    ),
    logout: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
    ),
};

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const role = (session?.user as any)?.role;
    const userName = session?.user?.name || 'Utilisateur';

    const isActive = (path: string) => pathname === path;

    const userLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: icons.dashboard },
        { href: '/catalog', label: 'Catalogue', icon: icons.catalog },
        { href: '/training', label: 'Training', icon: icons.training },
        { href: '/favorites', label: 'Favoris', icon: icons.favorites },
    ];

    const adminLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: icons.dashboard },
        { href: '/admin/library', label: 'Biblio', icon: icons.library },
        { href: '/admin/users', label: 'Users', icon: icons.users },
        { href: '/admin/my-program', label: 'Programme', icon: icons.program },
    ];

    const links = role === 'ADMIN' ? adminLinks : userLinks;

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="sidebar desktop-only">
                <div className="sidebar-header">
                    <h2>CareforAudio</h2>
                    <p className="sidebar-user">{userName}</p>
                    <span className="sidebar-role">{role === 'ADMIN' ? 'Admin' : 'Athlète'}</span>
                </div>

                <nav className="sidebar-nav">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`sidebar-link${isActive(link.href) ? ' active' : ''}`}
                        >
                            <span className="sidebar-icon">{link.icon}</span>
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className="sidebar-logout">
                        <span className="sidebar-icon">{icons.logout}</span>
                        Déconnexion
                    </button>
                </div>
            </aside>

            {/* Mobile bottom tab bar */}
            <nav className="mobile-tab-bar mobile-only">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`tab-item${isActive(link.href) ? ' active' : ''}`}
                    >
                        <span className="tab-icon">{link.icon}</span>
                        <span className="tab-label">{link.label}</span>
                    </Link>
                ))}
                <button
                    className="tab-item"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                >
                    <span className="tab-icon">{icons.logout}</span>
                    <span className="tab-label">Sortir</span>
                </button>
            </nav>
        </>
    );
}
