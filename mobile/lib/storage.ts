import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export async function saveToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.setItem(TOKEN_KEY, token);
    } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
}

export async function getToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
        return localStorage.getItem(TOKEN_KEY);
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.removeItem(TOKEN_KEY);
    } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
}

export async function saveUser(user: any): Promise<void> {
    const json = JSON.stringify(user);
    if (Platform.OS === 'web') {
        localStorage.setItem(USER_KEY, json);
    } else {
        await SecureStore.setItemAsync(USER_KEY, json);
    }
}

export async function getUser(): Promise<any | null> {
    let json: string | null;
    if (Platform.OS === 'web') {
        json = localStorage.getItem(USER_KEY);
    } else {
        json = await SecureStore.getItemAsync(USER_KEY);
    }
    return json ? JSON.parse(json) : null;
}

export async function deleteUser(): Promise<void> {
    if (Platform.OS === 'web') {
        localStorage.removeItem(USER_KEY);
    } else {
        await SecureStore.deleteItemAsync(USER_KEY);
    }
}
