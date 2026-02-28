import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { Colors, FontSizes } from '../../constants/theme';
import Loader from '../../components/Loader';

export default function TabsLayout() {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) return <Loader />;
    if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

    // Admin/Teacher should use the admin layout
    if (user?.role === 'ADMIN' || user?.role === 'TEACHER') {
        return <Redirect href="/(admin)/dashboard" />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: Colors.bgCard,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    height: 85,
                    paddingBottom: 20,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: FontSizes.xs,
                    fontWeight: '600',
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="training"
                options={{
                    title: 'Programmes',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="musical-notes-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="calendar"
                options={{
                    title: 'Calendrier',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="favorites"
                options={{
                    title: 'Favoris',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="heart-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
