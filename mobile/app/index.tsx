import { Redirect } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import Loader from '../components/Loader';

export default function Index() {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) return <Loader />;

    if (!isAuthenticated) {
        return <Redirect href="/(auth)/login" />;
    }

    if (user?.mustChangePassword) {
        return <Redirect href="/(auth)/change-password" />;
    }

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'TEACHER';
    return <Redirect href={isAdmin ? '/(admin)/dashboard' : '/(tabs)/dashboard'} />;
}
