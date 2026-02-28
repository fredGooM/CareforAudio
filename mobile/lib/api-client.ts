import { getToken } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3939';

class ApiClient {
    private accessToken: string | null = null;

    setToken(token: string | null) {
        this.accessToken = token;
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        // Auto-load token from store if not set
        if (!this.accessToken) {
            this.accessToken = await getToken();
        }

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string> || {}),
        };

        if (this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
        });

        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({}));
            throw new Error(
                errorBody.message || `API error: ${res.status} ${res.statusText}`,
            );
        }

        if (res.status === 204) return {} as T;
        return res.json();
    }

    get<T>(path: string) {
        return this.request<T>(path);
    }

    post<T>(path: string, body?: any) {
        if (body instanceof FormData) {
            return this.request<T>(path, { method: 'POST', body });
        }
        return this.request<T>(path, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    put<T>(path: string, body?: any) {
        return this.request<T>(path, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    delete<T>(path: string) {
        return this.request<T>(path, { method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
export default apiClient;
