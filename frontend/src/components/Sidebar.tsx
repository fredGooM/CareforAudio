'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { 
    LayoutDashboard, 
    ListMusic, 
    Heart,
    Library, 
    UsersRound, 
    CalendarCheck, 
    CalendarHeart,
    Calendar,
    User, 
    LogOut 
} from 'lucide-react';

/* ── Modern Lucide icons (24x24) ── */
const icons = {
    dashboard: <LayoutDashboard size={24} />,
    catalog: <ListMusic size={24} />,
    training: <CalendarHeart size={24} />,
    favorites: <Heart size={24} />,
    library: <Library size={24} />,
    users: <UsersRound size={24} />,
    program: <CalendarCheck size={24} />,
    profile: <User size={24} />,
    logout: <LogOut size={24} />,
    calendar: <Calendar size={24} />,
};

export default function Sidebar() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const role = (session?.user as any)?.role;
    const userName = session?.user?.name || 'Utilisateur';

    const isActive = (path: string) => pathname === path;

    const athleteLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: icons.dashboard },
        { href: '/training', label: 'Programmes', icon: icons.training },
        { href: '/calendar', label: 'Calendrier', icon: icons.calendar },
        { href: '/favorites', label: 'Favoris', icon: icons.favorites },
    ];

    const adminOrTeacherLinks = [
        { href: '/dashboard', label: 'Dashboard', icon: icons.dashboard },
        { href: '/admin/calendar', label: 'Calendrier', icon: icons.calendar },
        { href: '/admin/library', label: 'Biblio', icon: icons.library },
        { href: '/admin/users', label: 'Users', icon: icons.users },
        { href: '/admin/programs', label: 'Programmes', icon: icons.program },
    ];

    const links = (role === 'ADMIN' || role === 'TEACHER') ? adminOrTeacherLinks : athleteLinks;

    const displayRole = role === 'ADMIN' ? 'Admin' : role === 'TEACHER' ? 'Professeur' : 'Athlète';

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="sidebar desktop-only">
                <div className="sidebar-header">
                    <h2>CareforAudio</h2>
                    <p className="sidebar-user">{userName}</p>
                    <span className="sidebar-role">{displayRole}</span>
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
                <Link
                    href="/profile"
                    className={`tab-item${isActive('/profile') ? ' active' : ''}`}
                >
                    <span className="tab-icon">{icons.profile}</span>
                    <span className="tab-label">Profil</span>
                </Link>
            </nav>
        </>
    );
}
