'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState, FormEvent } from 'react';
import { Edit, KeyRound, Mail, Check, X, Calendar as CalendarIcon, LayoutDashboard, MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { UserProfile } from '@/types';

export default function AdminUsersPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [actionMsg, setActionMsg] = useState('');
    const [formError, setFormError] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const emptyForm = {
        email: '',
        firstName: '',
        lastName: '',
        role: 'ATHLETE',
        predominanceAnalytique: 0,
        predominanceAffectif: 0,
        predominanceInstinctif: 0,
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        apiClient.get<UserProfile[]>('/users').then((u) => {
            setUsers(u);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

    const reload = async () => {
        const u = await apiClient.get<UserProfile[]>('/users');
        setUsers(u);
    };

    /* ── Create ── */
    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        setFormError('');
        try {
            await apiClient.post('/users', form);
            await reload();
            setShowCreate(false);
            setForm(emptyForm);
        } catch (err: any) {
            setFormError(err.message);
        }
    };

    /* ── Edit ── */
    const openEdit = (user: UserProfile) => {
        setEditingUser(user);
        setForm({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            predominanceAnalytique: (user as any).predominanceAnalytique || 0,
            predominanceAffectif: (user as any).predominanceAffectif || 0,
            predominanceInstinctif: (user as any).predominanceInstinctif || 0,
        });
        setShowCreate(false);
    };

    const handleEdit = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            await apiClient.put(`/users/${editingUser.id}`, {
                firstName: form.firstName,
                lastName: form.lastName,
                role: form.role,
                predominanceAnalytique: form.predominanceAnalytique,
                predominanceAffectif: form.predominanceAffectif,
                predominanceInstinctif: form.predominanceInstinctif,
            });
            await reload();
            setEditingUser(null);
            setForm(emptyForm);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const cancelEdit = () => {
        setEditingUser(null);
        setForm(emptyForm);
    };

    /* ── Actions ── */
    const handleResetPassword = async (userId: string) => {
        if (!confirm('Réinitialiser le mot de passe ?')) return;
        await apiClient.post(`/users/${userId}/reset-password`);
        showMsg('Mot de passe réinitialisé à care1234!');
    };

    const handleSendWelcome = async (userId: string) => {
        if (!confirm('Envoyer les identifiants par email ?')) return;
        try {
            const result = await apiClient.post<{ success: boolean; message: string }>(`/users/${userId}/send-welcome`);
            showMsg(result.message || (result.success ? 'Email envoyé !' : "Échec de l'envoi"));
        } catch (err: any) {
            showMsg(err.message || "Échec de l'envoi");
        }
    };

    const toggleActive = async (user: UserProfile) => {
        await apiClient.put(`/users/${user.id}`, { isActive: !user.isActive });
        await reload();
    };

    const handleDelete = async (userId: string, name: string) => {
        if (!confirm(`Supprimer définitivement ${name} ? Cette action est irréversible.`)) return;
        try {
            await apiClient.delete(`/users/${userId}`);
            setUsers(users.filter(u => u.id !== userId));
            showMsg('Utilisateur supprimé.');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const showMsg = (msg: string) => {
        setActionMsg(msg);
        setTimeout(() => setActionMsg(''), 4000);
    };

    if (loading) return <Loader />;

    const isEditing = !!editingUser;
    const isFormOpen = showCreate || isEditing;

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Gestion des utilisateurs</h1>
                {!isFormOpen && (
                    <button className="btn-primary" onClick={() => { setShowCreate(true); setForm(emptyForm); }}>
                        + Nouvel utilisateur
                    </button>
                )}
            </div>

            {actionMsg && <div className="action-toast">{actionMsg}</div>}

            {/* ── Create / Edit form ── */}
            {isFormOpen && (
                <form onSubmit={isEditing ? handleEdit : handleCreate} className="upload-form">
                    <h2>{isEditing ? `Modifier ${editingUser!.firstName} ${editingUser!.lastName}` : 'Nouvel utilisateur'}</h2>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Prénom</label>
                            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Nom</label>
                            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={isEditing} />
                        </div>
                        <div className="form-group">
                            <label>Rôle</label>
                            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} disabled={(session?.user as any)?.role !== 'ADMIN'}>
                                {((session?.user as any)?.role === 'ADMIN') ? (
                                    <>
                                        <option value="ATHLETE">Athlète</option>
                                        <option value="TEACHER">Professeur</option>
                                        <option value="ADMIN">Admin</option>
                                    </>
                                ) : (
                                    <option value="ATHLETE">Athlète</option>
                                )}
                            </select>
                        </div>
                    </div>
                    {form.role === 'ATHLETE' && (
                        <>
                            <h3 style={{ fontSize: '1rem', marginTop: '0.5rem', marginBottom: '0.25rem' }}>Prédominances (%)</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Analytique</label>
                                    <input type="number" min="0" max="100" value={form.predominanceAnalytique} onChange={(e) => setForm({ ...form, predominanceAnalytique: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label>Affectif</label>
                                    <input type="number" min="0" max="100" value={form.predominanceAffectif} onChange={(e) => setForm({ ...form, predominanceAffectif: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="form-group">
                                    <label>Instinctif</label>
                                    <input type="number" min="0" max="100" value={form.predominanceInstinctif} onChange={(e) => setForm({ ...form, predominanceInstinctif: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                        </>
                    )}
                    {formError && <p style={{ color: 'var(--danger, #ef4444)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{formError}</p>}
                    <div className="form-actions">
                        <button type="submit" className="btn-primary">{isEditing ? 'Enregistrer' : 'Créer'}</button>
                        <button type="button" className="btn-secondary" onClick={isEditing ? cancelEdit : () => { setShowCreate(false); setFormError(''); }}>Annuler</button>
                    </div>
                </form>
            )}

            {/* ── Users table ── */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Rôle</th>
                            <th>Actif</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td>{user.firstName} {user.lastName}</td>
                                <td>{user.email}</td>
                                <td>{user.role === 'ADMIN' ? 'Admin' : user.role === 'TEACHER' ? 'Professeur' : 'Athlète'}</td>
                                <td>
                                    <button className="btn-toggle" onClick={() => toggleActive(user)} title={user.isActive ? 'Désactiver' : 'Activer'}>
                                        {user.isActive ? (
                                            <Check className="text-success" size={20} />
                                        ) : (
                                            <X className="text-muted" size={20} />
                                        )}
                                    </button>
                                </td>
                                <td>
                                    <div className="action-btns" ref={openMenuId === user.id ? menuRef : undefined}>

                                        {/* Calendrier */}
                                        <Link href={`/admin/calendar/${user.id}`} className="btn-secondary" title="Gérer le calendrier" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CalendarIcon size={16} />
                                        </Link>

                                        {/* Indicateurs */}
                                        {user.role === 'ATHLETE' && (
                                            <Link href={`/admin/users/${user.id}/states`} className="btn-secondary" title="Voir les indicateurs" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <LayoutDashboard size={16} />
                                            </Link>
                                        )}

                                        {/* ··· menu */}
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                className="btn-secondary"
                                                title="Plus d'actions"
                                                onClick={(e) => {
                                                    if (openMenuId === user.id) {
                                                        setOpenMenuId(null);
                                                        setMenuPos(null);
                                                    } else {
                                                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                        setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                                        setOpenMenuId(user.id);
                                                    }
                                                }}
                                            >
                                                <MoreHorizontal size={16} />
                                            </button>
                                            {openMenuId === user.id && menuPos && (
                                                <div style={{
                                                    position: 'fixed',
                                                    top: menuPos.top,
                                                    right: menuPos.right,
                                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                                    borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow)',
                                                    zIndex: 1000, minWidth: '170px', overflow: 'hidden',
                                                    animation: 'fadeIn 0.12s ease',
                                                }}>
                                                    {[
                                                        { icon: <Edit size={14} />, label: 'Modifier', onClick: () => { openEdit(user); setOpenMenuId(null); } },
                                                        { icon: <KeyRound size={14} />, label: 'Reset mot de passe', onClick: () => { handleResetPassword(user.id); setOpenMenuId(null); } },
                                                        { icon: <Mail size={14} />, label: 'Envoyer identifiants', onClick: () => { handleSendWelcome(user.id); setOpenMenuId(null); } },
                                                        ...((session?.user as any)?.role === 'ADMIN' && user.id !== (session?.user as any)?.id ? [{
                                                            icon: <Trash2 size={14} />, label: 'Supprimer', danger: true,
                                                            onClick: () => { handleDelete(user.id, `${user.firstName} ${user.lastName}`); setOpenMenuId(null); }
                                                        }] : []),
                                                    ].map((item, i, arr) => (
                                                        <button key={item.label} onClick={item.onClick} style={{
                                                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                            padding: '0.6rem 0.875rem', background: 'none', border: 'none',
                                                            borderBottom: i < arr.length - 1 ? '1px solid rgba(51,65,85,0.4)' : 'none',
                                                            color: (item as any).danger ? '#ef4444' : 'var(--text)', cursor: 'pointer',
                                                            fontFamily: 'var(--font)', fontSize: '0.825rem', textAlign: 'left',
                                                            transition: 'var(--transition)',
                                                        }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                                        >
                                                            <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
                                                            {item.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
