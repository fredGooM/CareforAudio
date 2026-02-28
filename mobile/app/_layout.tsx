import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { Colors } from '../constants/theme';
import Loader from '../components/Loader';

function RootNavigator() {
    const { isLoading } = useAuth();

    if (isLoading) return <Loader />;

    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Colors.bg },
                    animation: 'fade',
                }}
            />
        </>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootNavigator />
        </AuthProvider>
    );
}
