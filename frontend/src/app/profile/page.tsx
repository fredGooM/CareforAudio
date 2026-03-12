'use client';

import { useSession, signOut } from 'next-auth/react';
import { ChevronRight } from 'lucide-react';
import { useEffect, useState, FormEvent } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';

interface ProfileDTO {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar: string;
    gender?: string;
    birthDate?: string;
    preferredTrainingDays?: string[];
    predominanceAnalytique?: number;
    predominanceAffectif?: number;
    predominanceInstinctif?: number;
}


export default function ProfilePage() {
    const { data: session, update } = useSession();
    const [profile, setProfile] = useState<ProfileDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actionMsg, setActionMsg] = useState('');
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        gender: '',
        birthDate: '',
        preferredTrainingDays: [] as string[],
    });

    const fetchProfile = async () => {
        try {
            const data = await apiClient.get<ProfileDTO>('/users/me/profile');
            setProfile(data);
            setForm({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                gender: data.gender || '',
                birthDate: data.birthDate ? String(data.birthDate).split('T')[0] : '',
                preferredTrainingDays: data.preferredTrainingDays || [],
            });
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        fetchProfile();
    }, [session]);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await apiClient.put('/users/me/profile', form);
            setActionMsg('Profil mis à jour');
            setTimeout(() => setActionMsg(''), 4000);

            if (session) {
                await update({
                    ...session,
                    user: {
                        ...session.user,
                        name: `${form.firstName} ${form.lastName}`
                    }
                });
            }
            fetchProfile();
        } catch (err: any) {
            setActionMsg(err.message || 'Erreur lors de la mise à jour');
            setTimeout(() => setActionMsg(''), 4000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <h1>Mon Profil</h1>

            {actionMsg && <div className="action-toast">{actionMsg}</div>}

            <div className="profile-card">
                <div className="profile-avatar">
                    {profile?.firstName?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="profile-info">
                    <h2>{profile?.firstName} {profile?.lastName}</h2>
                    <p className="profile-email">{profile?.email}</p>
                    <span className="profile-role-badge">
                        {profile?.role === 'ADMIN' ? 'Administrateur' : profile?.role === 'TEACHER' ? 'Professeur' : 'Athlète'}
                    </span>
                </div>
            </div>

            <>
                    <div className="profile-section">
                        <h3>Mes informations</h3>
                        <form onSubmit={handleSave} className="upload-form" style={{ marginBottom: '1.5rem' }}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Prénom</label>
                                    <input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Nom</label>
                                    <input required value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Sexe</label>
                                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                                        <option value="">Sélectionner</option>
                                        <option value="H">Homme</option>
                                        <option value="F">Femme</option>
                                        <option value="Autre">Autre</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Date de naissance</label>
                                    <input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })} />
                                </div>
                            </div>

                            {profile?.role === 'ATHLETE' && (
                                <div className="form-group">
                                    <label>Jours d&apos;entraînement préférés</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(day => {
                                            const isSelected = form.preferredTrainingDays.includes(day);
                                            return (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => {
                                                        const days = isSelected
                                                            ? form.preferredTrainingDays.filter(d => d !== day)
                                                            : [...form.preferredTrainingDays, day];
                                                        setForm({ ...form, preferredTrainingDays: days });
                                                    }}
                                                    style={{
                                                        padding: '0.75rem 0',
                                                        borderRadius: 'var(--radius-sm)',
                                                        border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                                        background: isSelected ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
                                                        color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        transition: 'var(--transition)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: isSelected ? 600 : 500,
                                                    }}
                                                >
                                                    {day.substring(0, 3)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="form-actions">
                                <button type="submit" disabled={saving} className="btn-primary">
                                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {profile?.role === 'ATHLETE' && (
                        <div className="profile-section">
                            <h3>Mes Prédominances</h3>
                            <div className="upload-form" style={{ marginBottom: '1.5rem' }}>
                                <div className="stats-grid" style={{ marginBottom: 0 }}>
                                    <div className="stat-card">
                                        <div className="stat-value">{profile.predominanceAnalytique || 0}%</div>
                                        <div className="stat-label">Analytique</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{profile.predominanceAffectif || 0}%</div>
                                        <div className="stat-label">Affectif</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{profile.predominanceInstinctif || 0}%</div>
                                        <div className="stat-label">Instinctif</div>
                                    </div>
                                </div>
                                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '1rem', textAlign: 'center' }}>
                                    * Vos prédominances sont définies par votre professeur.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="profile-section">
                        <h3>Compte</h3>
                        <div className="profile-actions">
                            <a href="/change-password" className="profile-action-item">
                                <span>Changer le mot de passe</span>
                                <ChevronRight size={16} />
                            </a>
                        </div>
                    </div>

                    <div className="profile-section" style={{ marginTop: '2rem' }}>
                        <button
                            onClick={() => signOut({ callbackUrl: '/login' })}
                            className="profile-logout-btn"
                        >
                            Se déconnecter
                        </button>
                    </div>
            </>

        </div>
    );
}
