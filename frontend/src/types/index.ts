export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'TEACHER' | 'ATHLETE';
    isActive: boolean;
    mustChangePassword: boolean;
    groupIds: string[];
    avatar?: string;
    createdById?: string;
}

export interface AudioTrack {
    id: string;
    title: string;
    description?: string;
    duration: number;
    url: string;
    coverUrl: string;
    categoryIds: string[];
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

export interface Program {
    id: string;
    name: string;
    description?: string;
    createdById?: string;
    createdBy?: UserProfile;
    audios?: AudioTrack[];
    createdAt: string;
    updatedAt: string;
}

export interface ProgramShare {
    id: string;
    programId: string;
    program?: Program;
    userId: string;
    user?: UserProfile;
    sharedById?: string;
    sharedBy?: UserProfile;
    createdAt: string;
}

export interface DashboardUser {
    role: 'ATHLETE';
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

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    date: string;
    type?: string;
    userId: string;
    user?: UserProfile;
    createdById?: string;
    createdAt?: string;
    updatedAt?: string;
}
