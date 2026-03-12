import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

declare module 'next-auth' {
    interface Session extends DefaultSession {
        user: {
            id: string;
            role: string;
            mustChangePassword: boolean;
            accessToken: string;
            gender?: string;
        } & DefaultSession['user'];
        accessToken: string;
    }
    interface User {
        role: string;
        mustChangePassword: boolean;
        accessToken: string;
        refreshToken: string;
        firstName?: string;
        lastName?: string;
        gender?: string;
    }
}

declare module 'next-auth' {
    interface JWT {
        role?: string;
        mustChangePassword?: boolean;
        accessToken?: string;
        refreshToken?: string;
        gender?: string;
    }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3939';

export const authConfig: NextAuthConfig = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;
                try {
                    const res = await fetch(`${API_URL}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    });
                    if (!res.ok) return null;
                    const data = await res.json();
                    return {
                        id: data.user.id,
                        email: data.user.email,
                        name: `${data.user.firstName} ${data.user.lastName}`,
                        role: data.user.role,
                        mustChangePassword: data.user.mustChangePassword,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        firstName: data.user.firstName,
                        lastName: data.user.lastName,
                        gender: data.user.gender,
                    };
                } catch {
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }: any) {
            if (user) {
                token.role = user.role;
                token.mustChangePassword = user.mustChangePassword;
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.id = user.id;
                token.gender = user.gender;
            }
            if (trigger === 'update' && session?.mustChangePassword !== undefined) {
                token.mustChangePassword = session.mustChangePassword;
            }
            return token;
        },
        async session({ session, token }: any) {
            session.user.id = token.id as string;
            session.user.role = token.role as string;
            session.user.mustChangePassword = token.mustChangePassword as boolean;
            session.accessToken = token.accessToken as string;
            session.user.gender = token.gender as string | undefined;
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
