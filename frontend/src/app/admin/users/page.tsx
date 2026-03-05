'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, FormEvent } from 'react';
import { Edit, KeyRound, Mail, Check, X, Calendar as CalendarIcon, Activity } from 'lucide-react';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { UserProfile, Group } from '@/types';

interface UserDTO extends UserProfile {
    groupIds: string[];
}

export default function AdminUsersPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<UserDTO[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
    const [actionMsg, setActionMsg] = useState('');

    const emptyForm = {
        email: '',
        firstName: '',
        lastName: '',
        role: 'ATHLETE',
        groupIds: [] as string[],
        predominanceAnalytique: 0,
        predominanceAffectif: 0,
        predominanceInstinctif: 0,
    };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        Promise.all([
            apiClient.get<UserDTO[]>('/users'),
            apiClient.get<Group[]>('/groups'),
        ]).then(([u, g]) => {
            setUsers(u);
            setGroups(g);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

    const reload = async () => {
        const u = await apiClient.get<UserDTO[]>('/users');
        setUsers(u);
    };

    /* ── Create ── */
    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/users', form);
            await reload();
            setShowCreate(false);
            setForm(emptyForm);
        } catch (err: any) {
            alert(err.message);
        }
    };

    /* ── Edit ── */
    const openEdit = (user: UserDTO) => {
        setEditingUser(user);
        setForm({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            groupIds: user.groupIds || [],
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
                groupIds: form.groupIds,
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

    const toggleActive = async (user: UserDTO) => {
        await apiClient.put(`/users/${user.id}`, { isActive: !user.isActive });
        await reload();
    };

    const showMsg = (msg: string) => {
        setActionMsg(msg);
        setTimeout(() => setActionMsg(''), 4000);
    };

    const toggleGroup = (gid: string) => {
        setForm((f) => ({
            ...f,
            groupIds: f.groupIds.includes(gid)
                ? f.groupIds.filter((id) => id !== gid)
                : [...f.groupIds, gid],
        }));
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
                    <div className="form-group">
                        <label>Groupes</label>
                        <div className="checkbox-group">
                            {groups.map((g) => (
                                <label key={g.id} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={form.groupIds.includes(g.id)}
                                        onChange={() => toggleGroup(g.id)}
                                    />
                                    {g.name}
                                </label>
                            ))}
                            {groups.length === 0 && <span className="text-muted">Aucun groupe créé</span>}
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn-primary">{isEditing ? 'Enregistrer' : 'Créer'}</button>
                        <button type="button" className="btn-secondary" onClick={isEditing ? cancelEdit : () => setShowCreate(false)}>Annuler</button>
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
                            <th>Groupes</th>
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
                                    {user.groupIds?.length
                                        ? user.groupIds.map((gid) => {
                                            const g = groups.find((gr) => gr.id === gid);
                                            return g ? g.name : gid;
                                        }).join(', ')
                                        : '—'
                                    }
                                </td>
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
                                    <div className="action-btns">
                                        <button className="btn-secondary" onClick={() => openEdit(user)} title="Modifier">
                                            <Edit size={16} />
                                        </button>
                                        <button className="btn-secondary" onClick={() => handleResetPassword(user.id)} title="Reset MDP">
                                            <KeyRound size={16} />
                                        </button>
                                        <button className="btn-secondary" onClick={() => handleSendWelcome(user.id)} title="Envoyer identifiants">
                                            <Mail size={16} />
                                        </button>
                                        <Link href={`/admin/calendar/${user.id}`} className="btn-secondary" title="Gérer le calendrier" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CalendarIcon size={16} />
                                        </Link>
                                        {user.role === 'ATHLETE' && (
                                            <Link href={`/admin/users/${user.id}/states`} className="btn-secondary" title="Voir les états" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Activity size={16} />
                                            </Link>
                                        )}
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
