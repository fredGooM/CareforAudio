export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  groupIds: string[];
  password?: string;
  mustChangePassword?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
  image?: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  description: string;
  duration: number;
  url: string;
  mimeType?: string;
  coverUrl: string;
  categoryId: string;
  tags: string[];
  createdAt: string;
  published: boolean;
  allowedGroupIds: string[];
  allowedUserIds: string[];
  listenCount: number;
}

export interface UserProgress {
  audioId: string;
  position: number;
  lastListenedAt: string;
  isCompleted: boolean;
  isFavorite: boolean;
}

export type ViewState =
  | 'LOGIN'
  | 'CHANGE_PASSWORD'
  | 'USER_DASHBOARD'
  | 'CATALOG'
  | 'FAVORITES'
  | 'AUDIO_DETAIL'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_AUDIOS'
  | 'ADMIN_USERS';

export interface UserDashboardData {
  totalMinutes: number;
  last7DaysMinutes: number;
  completionPercent: number;
  streakDays: number;
  completedCount: number;
  categoryProgress: Array<{ categoryId: string; percent: number }>;
  continueListening: Array<{ audioId: string; title: string; progressPercent: number }>;
}

export interface AdminDashboardData {
  totalListeningHours: number;
  completionRate: number;
  activeAthletes: number | null;
  engagementTrend: Array<{ date: string; minutes: number }>;
  popularAudios: Array<{ audioId: string; title: string; minutes: number; completionRate: number }>;
  dropoffs: Array<{ userId: string; name: string; daysSince: number }>;
  athletes: Array<{ id: string; name: string }>;
  filterUserId: string | null;
}

export type DashboardResponse =
  | ({ role: 'USER' } & UserDashboardData)
  | ({ role: 'ADMIN' } & AdminDashboardData);
