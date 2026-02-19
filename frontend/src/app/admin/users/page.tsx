'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, FormEvent } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { UserProfile, Group } from '@/types';

export default function AdminUsersPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        email: '',
        firstName: '',
        lastName: '',
        role: 'USER',
        groupIds: [] as string[],
    });

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        Promise.all([
            apiClient.get<UserProfile[]>('/users'),
            apiClient.get<Group[]>('/groups'),
        ]).then(([u, g]) => {
            setUsers(u);
            setGroups(g);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

    const handleCreate = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.post('/users', form);
            const updated = await apiClient.get<UserProfile[]>('/users');
            setUsers(updated);
            setShowCreate(false);
            setForm({ email: '', firstName: '', lastName: '', role: 'USER', groupIds: [] });
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleResetPassword = async (userId: string) => {
        if (!confirm('Réinitialiser le mot de passe ?')) return;
        await apiClient.post(`/users/${userId}/reset-password`);
        alert('Mot de passe réinitialisé à care1234!');
    };

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Gestion des utilisateurs</h1>
                <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
                    {showCreate ? 'Annuler' : '+ Nouvel utilisateur'}
                </button>
            </div>

            {showCreate && (
                <form onSubmit={handleCreate} className="upload-form">
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
                            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label>Rôle</label>
                            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                <option value="USER">Athlète</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Groupes</label>
                        <div className="checkbox-group">
                            {groups.map((g) => (
                                <label key={g.id} className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={form.groupIds.includes(g.id)}
                                        onChange={(e) => {
                                            const ids = e.target.checked
                                                ? [...form.groupIds, g.id]
                                                : form.groupIds.filter((id) => id !== g.id);
                                            setForm({ ...form, groupIds: ids });
                                        }}
                                    />
                                    {g.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="btn-primary">Créer</button>
                </form>
            )}

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
                                <td>{user.role === 'ADMIN' ? 'Admin' : 'Athlète'}</td>
                                <td>{user.isActive ? '✅' : '❌'}</td>
                                <td>
                                    <button className="btn-secondary" onClick={() => handleResetPassword(user.id)}>
                                        Reset MDP
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
