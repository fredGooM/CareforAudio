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
  color: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  description: string;
  duration: number;
  url: string;
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
  | 'CATALOG'
  | 'FAVORITES'
  | 'AUDIO_DETAIL'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_AUDIOS'
  | 'ADMIN_USERS';
