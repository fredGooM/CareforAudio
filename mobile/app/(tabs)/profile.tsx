import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.replace('/(auth)/login');
    };

    const displayRole = user?.role === 'ADMIN' ? 'Administrateur' : user?.role === 'TEACHER' ? 'Professeur' : 'Athlète';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.pageTitle}>Mon Profil</Text>

            <View style={styles.card}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {user?.firstName?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                </View>
                <Text style={styles.userName}>
                    {user?.firstName} {user?.lastName}
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{displayRole}</Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Compte</Text>

                <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => router.push('/(auth)/change-password')}
                    activeOpacity={0.7}
                >
                    <View style={styles.menuItemLeft}>
                        <Ionicons name="key-outline" size={20} color={Colors.textSecondary} />
                        <Text style={styles.menuItemText}>Changer le mot de passe</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                <Text style={styles.logoutText}>Se déconnecter</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: 100 },
    pageTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xxl, marginTop: Spacing.lg },
    card: {
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.xl,
        padding: Spacing.xxxl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.md,
        marginBottom: Spacing.xxl,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    avatarText: {
        fontSize: FontSizes.xxxl,
        fontWeight: '700',
        color: Colors.primary,
    },
    userName: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
    userEmail: { fontSize: FontSizes.md, color: Colors.textMuted, marginBottom: Spacing.md },
    roleBadge: {
        backgroundColor: Colors.primaryLight,
        borderRadius: BorderRadius.full,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs,
    },
    roleText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
    section: { marginBottom: Spacing.xxl },
    sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    menuItemText: { color: Colors.text, fontSize: FontSizes.md },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.dangerLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
    },
    logoutText: { color: Colors.danger, fontSize: FontSizes.md, fontWeight: '600' },
});
