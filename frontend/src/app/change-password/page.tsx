'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import apiClient from '@/lib/api-client';

export default function ChangePasswordPage() {
    const { data: session, update } = useSession();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        if (password !== confirm) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        setLoading(true);
        try {
            apiClient.setToken((session as any)?.accessToken || null);
            await apiClient.post('/auth/change-password', { password });
            await update({ mustChangePassword: false });
            router.push('/dashboard');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Erreur lors du changement de mot de passe');
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <h1>Changer le mot de passe</h1>
                    <p>Vous devez changer votre mot de passe avant de continuer</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="login-error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="password">Nouveau mot de passe</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirm">Confirmer le mot de passe</label>
                        <input
                            id="confirm"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading} className="login-button">
                        {loading ? 'Enregistrement...' : 'Changer le mot de passe'}
                    </button>
                </form>
            </div>
        </div>
    );
}
