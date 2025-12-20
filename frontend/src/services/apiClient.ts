import axios from 'axios';
import { User, AudioTrack, Group, DashboardResponse } from '../types';

// En utilisant une chaîne vide, axios utilisera l'origine actuelle.
// En dev, le proxy Vite redirigera vers le backend.
const API_URL = (import.meta as any).env.VITE_API_URL || '';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export default api;
const client = axios.create({
  baseURL: API_URL,
});

// --- FIX CRITIQUE POUR MOBILE ---
// Cette fonction remplace 'localhost' ou '127.0.0.1' par l'adresse IP réelle
// du PC qui sert l'application (ex: 192.168.1.x), détectée via le navigateur.
const fixMediaUrl = (url: string | undefined) => {
    if (!url) return '';
    
    try {
        // Si l'URL n'est pas absolue, on ne touche pas
        if (!url.startsWith('http')) return url;

        const urlObj = new URL(url);
        const browserHostname = window.location.hostname;

        // Liste des hôtes locaux à remplacer par l'IP du réseau
        const localHosts = ['localhost', '127.0.0.1', 'minio', '0.0.0.0'];

        // Si l'URL de l'image pointe vers localhost MAIS que le navigateur est sur une vraie IP (mobile)
        if (localHosts.includes(urlObj.hostname) && !localHosts.includes(browserHostname)) {
            // On remplace l'hôte de l'image par l'hôte du navigateur (l'IP du PC)
            urlObj.hostname = browserHostname;
            return urlObj.toString();
        }
    } catch (e) {
        console.error("Erreur URL transformation", e);
    }
    return url;
};

// Add Token to requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle Responses & Fix URLs
client.interceptors.response.use(
  (response) => {
    // Correction automatique des URLs dans les listes d'audios
    if (response.config.url?.includes('/audios') && Array.isArray(response.data)) {
        response.data = response.data.map((audio: any) => ({
            ...audio,
            url: fixMediaUrl(audio.url),
            coverUrl: fixMediaUrl(audio.coverUrl)
        }));
    }
    // Correction pour un upload ou une création unique
    if (response.data && (response.data.url || response.data.coverUrl)) {
        if (response.data.url) response.data.url = fixMediaUrl(response.data.url);
        if (response.data.coverUrl) response.data.coverUrl = fixMediaUrl(response.data.coverUrl);
    }
    // Correction pour les avatars utilisateurs
    if (response.config.url?.includes('/users') && Array.isArray(response.data)) {
        response.data = response.data.map((u: any) => ({
            ...u,
            avatar: fixMediaUrl(u.avatar)
        }));
    } else if (response.data && response.data.avatar) {
        response.data.avatar = fixMediaUrl(response.data.avatar);
    }

    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string) => {
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    return res.data.user;
  },
  changePassword: async (userId: string, newPass: string) => {
    await client.post('/auth/change-password', { password: newPass });
  },
  resetUserPassword: async (userId: string) => {
     await client.post(`/users/${userId}/reset-password`);
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
  }
};

export const dataService = {
  getAudiosForUser: async (user: User): Promise<AudioTrack[]> => {
    const res = await client.get('/audios');
    return res.data;
  },
  getAllAudios: async (): Promise<AudioTrack[]> => {
    const res = await client.get('/audios');
    return res.data;
  },
  getUsers: async (): Promise<User[]> => {
    const res = await client.get('/users');
    return res.data;
  },
  addAudio: async (audioData: any) => {
    const formData = new FormData();
    formData.append('title', audioData.title);
    formData.append('description', audioData.description || '');
    formData.append('categoryId', audioData.categoryId || 'c1');
    formData.append('published', String(audioData.published));
    formData.append('duration', String(audioData.duration || 0));
    
    if (audioData.file) {
        formData.append('file', audioData.file);
    }
    if (audioData.allowedGroupIds) {
        formData.append('allowedGroupIds', JSON.stringify(audioData.allowedGroupIds));
    }
    if (audioData.allowedUserIds) {
        formData.append('allowedUserIds', JSON.stringify(audioData.allowedUserIds));
    }

    const res = await client.post('/audios', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  updateAudio: async (audioData: AudioTrack) => {
    await client.put(`/audios/${audioData.id}`, audioData);
  },
  deleteAudio: async (audioId: string) => {
    await client.delete(`/audios/${audioId}`);
  },
  addUser: async (userData: any) => {
    await client.post('/users', userData);
  },
  updateUser: async (updatedUser: User) => {
    await client.put(`/users/${updatedUser.id}`, updatedUser);
  },
  updateUserAudioAccess: async (userId: string, directAudioIds: string[]) => {
      // Backend handles sync usually, but kept for interface compat if needed
  },
  sendWelcomeEmail: async (userId: string) => {
    await client.post(`/users/${userId}/send-welcome`);
  },
  sendHeartbeat: async (payload: { audioId: string; position: number; sessionDuration: number }) => {
    await client.post('/analytics/heartbeat', payload);
  },
  getAnalyticsDashboard: async (userId?: string): Promise<DashboardResponse> => {
    const res = await client.get('/analytics/dashboard', {
      params: userId ? { userId } : undefined
    });
    return res.data;
  }
};

export const CATEGORIES = [
  { id: 'c1', name: 'Pré-compétition', color: 'bg-blue-100 text-blue-800' },
  { id: 'c2', name: 'Récupération', color: 'bg-green-100 text-green-800' },
  { id: 'c3', name: 'Sommeil', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'c4', name: 'Concentration', color: 'bg-purple-100 text-purple-800' },
];

export const GROUPS = [
  { id: 'g1', name: 'Équipe A - Olympique' },
  { id: 'g2', name: 'Athlètes Endurance' },
  { id: 'g3', name: 'Réhabilitation' },
];
