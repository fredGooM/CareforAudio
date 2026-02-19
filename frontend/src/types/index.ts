export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'USER';
    isActive: boolean;
    mustChangePassword: boolean;
    groupIds: string[];
    avatar?: string;
}

export interface AudioTrack {
    id: string;
    title: string;
    description?: string;
    duration: number;
    url: string;
    coverUrl: string;
    categoryId: string;
    mimeType: string;
    type: string;
    orderToListen: number;
    tags: string[];
    createdAt: string;
    published: boolean;
    allowedGroupIds?: string[];
    allowedUserIds?: string[];
    listenCount?: number;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    image: string;
}

export interface Group {
    id: string;
    name: string;
}

export interface DashboardUser {
    role: 'USER';
    totalMinutes: number;
    last7DaysMinutes: number;
    completionPercent: number;
    streakDays: number;
    completedCount: number;
    categoryProgress: { categoryId: string; percent: number }[];
    myProgramProgress: { percent: number; total: number; completed: number };
    continueListening: { audioId: string; title: string; progressPercent: number }[];
}

export interface DashboardAdmin {
    role: 'ADMIN';
    totalListeningHours: number;
    completionRate: number;
    activeAthletes: number | null;
    engagementTrend: { date: string; minutes: number }[];
    popularAudios: { audioId: string; title: string; minutes: number; completionRate: number }[];
    dropoffs: { userId: string; name: string; daysSince: number }[];
    athletes: { id: string; name: string }[];
    filterUserId: string | null;
}

export type Dashboard = DashboardUser | DashboardAdmin;
