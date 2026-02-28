import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { Colors, FontSizes } from '../../constants/theme';
import Loader from '../../components/Loader';

export default function AdminLayout() {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) return <Loader />;
    if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

    // Athletes should use athlete tabs
    if (user?.role === 'ATHLETE') {
        return <Redirect href="/(tabs)/dashboard" />;
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
                name="calendar"
                options={{
                    title: 'Calendrier',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="calendar-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: 'Biblio',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="library-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="users"
                options={{
                    title: 'Users',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="people-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="programs"
                options={{
                    title: 'Programmes',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="albums-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
