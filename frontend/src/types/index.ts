export interface UserProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'TEACHER' | 'ATHLETE';
    isActive: boolean;
    mustChangePassword: boolean;
    avatar?: string;
    createdById?: string;
}

export enum AudioDominance {
    MIND = 'MIND',
    BODY = 'BODY',
    EMOTION = 'EMOTION',
}

export enum AudioPhasing {
    PRE_COMPETITION = 'PRE_COMPETITION',
    DURING_COMPETITION = 'DURING_COMPETITION',
    POST_COMPETITION = 'POST_COMPETITION',
}

export enum AudioLanguage {
    FRENCH = 'FRENCH',
    ENGLISH = 'ENGLISH',
}

export enum AudioVoiceType {
    MALE = 'MALE',
    FEMALE = 'FEMALE',
}

export interface AudioTrack {
    id: string;
    title: string;
    description?: string;
    duration: number;
    url: string;
    coverUrl: string;
    mimeType: string;
    type: string;
    orderToListen: number;
    tags: string[];
    dominance?: AudioDominance;
    phasing?: AudioPhasing[];
    language?: AudioLanguage;
    voiceType?: AudioVoiceType;
    createdAt: string;
    published: boolean;
    allowedUserIds?: string[];
    listenCount?: number;
    createdBy?: { id: string; firstName: string; lastName: string } | null;
}

export interface Group {
    id: string;
    name: string;
}

export interface ProgramAudioItem extends AudioTrack {
    order: number;
    requiredListens: number;
}

export interface Program {
    id: string;
    name: string;
    description?: string;
    recurrenceDays?: number | null;
    createdById?: string;
    createdBy?: UserProfile;
    audios?: ProgramAudioItem[];
    completionPercent?: number;
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
    totalSeconds: number;
    last7DaysMinutes: number;
    last7DaysSeconds: number;
    completionPercent: number;
    completedCount: number;
    continueListening: { audioId: string; title: string; progressPercent: number }[];
    lastListenedAt: string | null;
    lastListenedInfo?: { audioId: string; audioTitle: string; programName?: string; programId?: string } | null;
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

export enum EventType {
    EVENEMENT = 'EVENEMENT',
    COMPETITION = 'COMPETITION',
    RDV_LIVE_COACH = 'RDV_LIVE_COACH',
    RDV_TRAINING = 'RDV_TRAINING',
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
    [EventType.EVENEMENT]: 'Événement',
    [EventType.COMPETITION]: 'Compétition',
    [EventType.RDV_LIVE_COACH]: 'Rendez-vous live coach',
    [EventType.RDV_TRAINING]: 'Rendez-vous training',
};

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    date: string;
    type?: EventType;
    duration?: number;
    userId: string;
    user?: UserProfile;
    createdById?: string;
    createdAt?: string;
    updatedAt?: string;
}

export enum StateType {
    EN_COMPETITION = 'EN_COMPETITION',
    AU_QUOTIDIEN = 'AU_QUOTIDIEN',
}

export const STATE_TYPE_LABELS: Record<StateType, string> = {
    [StateType.EN_COMPETITION]: 'En compétition',
    [StateType.AU_QUOTIDIEN]: 'Au quotidien',
};

export const STATE_FIELD_LABELS: Record<StateType, Record<string, string>> = {
    [StateType.EN_COMPETITION]: {
        plaisir: 'Plaisir',
        confiance: 'Confiance',
        concentration: 'Concentration',
        precision: 'Précision',
        gestionEmotions: 'Gestion émotions',
        sommeil: 'Sommeil',
    },
    [StateType.AU_QUOTIDIEN]: {
        stress: 'Stress',
        sommeil: 'Sommeil',
        motivation: 'Motivation',
        confiance: 'Confiance',
        apaisement: 'Apaisement',
    },
};

export interface UserStateEntry {
    id: string;
    userId: string;
    type: StateType;
    data: Record<string, number>;
    createdAt: string;
}
