import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from './api-client';
import { saveToken, getToken, deleteToken, saveUser, getUser, deleteUser } from './storage';
import type { UserProfile } from '../types';

interface AuthState {
    user: UserProfile | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<{ success: boolean; mustChangePassword?: boolean; error?: string }>;
    logout: () => Promise<void>;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        token: null,
        isLoading: true,
        isAuthenticated: false,
    });

    // Load persisted auth on mount
    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                const user = await getUser();
                if (token && user) {
                    apiClient.setToken(token);
                    setState({ user, token, isLoading: false, isAuthenticated: true });
                } else {
                    setState(prev => ({ ...prev, isLoading: false }));
                }
            } catch {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        })();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const res = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3939'}/auth/login`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                },
            );

            if (!res.ok) {
                return { success: false, error: 'Email ou mot de passe incorrect' };
            }

            const data = await res.json();
            const { accessToken, user } = data;

            if (user.mustChangePassword) {
                // Store token temporarily for password change
                await saveToken(accessToken);
                apiClient.setToken(accessToken);
                return { success: true, mustChangePassword: true };
            }

            await saveToken(accessToken);
            await saveUser(user);
            apiClient.setToken(accessToken);

            setState({
                user,
                token: accessToken,
                isLoading: false,
                isAuthenticated: true,
            });

            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Erreur de connexion' };
        }
    };

    const logout = async () => {
        await deleteToken();
        await deleteUser();
        apiClient.setToken(null);
        setState({
            user: null,
            token: null,
            isLoading: false,
            isAuthenticated: false,
        });
    };

    const changePassword = async (currentPassword: string, newPassword: string) => {
        try {
            await apiClient.put('/auth/change-password', { currentPassword, newPassword });
            // After changing password, fetch user profile to update mustChangePassword
            const user = await apiClient.get<UserProfile>('/users/me');
            await saveUser(user);
            setState(prev => ({ ...prev, user, isAuthenticated: true }));
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Erreur' };
        }
    };

    return (
        <AuthContext.Provider value={{ ...state, login, logout, changePassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
