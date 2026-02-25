const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3939';

class ApiClient {
    private accessToken: string | null = null;

    setToken(token: string | null) {
        this.accessToken = token;
    }

    private async request<T>(
        path: string,
        options: RequestInit = {},
    ): Promise<T> {
        const headers: HeadersInit = {
            ...(options.headers || {}),
        };

        if (this.accessToken) {
            (headers as Record<string, string>)['Authorization'] =
                `Bearer ${this.accessToken}`;
        }

        // Only set Content-Type if body is not FormData
        if (!(options.body instanceof FormData)) {
            (headers as Record<string, string>)['Content-Type'] = 'application/json';
        }

        const res = await fetch(`${API_URL}${path}`, {
            ...options,
            headers,
        });

        if (!res.ok) {
            if (res.status === 401 && typeof window !== 'undefined') {
                // Auto-logout on 401
                import('next-auth/react').then(({ signOut }) => {
                    signOut({ callbackUrl: '/login' });
                });
            }

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
