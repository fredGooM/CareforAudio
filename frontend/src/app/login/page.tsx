'use client';

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, FormEvent, useEffect } from 'react';

const QUICK_LOGINS: Record<string, { email: string; password: string }> = {
    admin:   { email: 'admin@careformance.com',   password: 'admin' },
    teacher: { email: 'teacher@careformance.com', password: 'admin' },
    athlete: { email: 'athlete@careformance.com', password: 'admin' },
};

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (process.env.NODE_ENV !== 'development') return;
        const ql = searchParams.get('quicklogin');
        if (!ql || !QUICK_LOGINS[ql]) return;
        const { email, password } = QUICK_LOGINS[ql];
        signIn('credentials', { email, password, redirect: false }).then(result => {
            if (!result?.error) { router.push('/'); router.refresh(); }
        });
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            setError('Email ou mot de passe incorrect');
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <img src="/logo.svg" alt="CareforAudio Logo" width="60" height="60" style={{ marginBottom: '1rem', borderRadius: '12px', display: 'inline-block' }} />
                    <h1>Careformance Audio</h1>
                    <p>Connectez-vous à votre espace</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="login-error">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@careformance.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Mot de passe</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button type="submit" disabled={loading} className="login-button">
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>
            </div>
        </div>
    );
}
