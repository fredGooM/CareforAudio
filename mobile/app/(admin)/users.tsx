import React, { useEffect, useState } from 'react';
import {
    View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
    Modal, Switch, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import Loader from '../../components/Loader';
import { Colors, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import type { UserProfile, Group } from '../../types';

export default function AdminUsersScreen() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newFirst, setNewFirst] = useState('');
    const [newLast, setNewLast] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newRole, setNewRole] = useState<'ATHLETE' | 'TEACHER'>('ATHLETE');

    useEffect(() => {
        reload();
    }, []);

    const reload = async () => {
        try {
            const [u, g] = await Promise.all([
                apiClient.get<UserProfile[]>('/users'),
                apiClient.get<Group[]>('/groups'),
            ]);
            setUsers(u);
            setGroups(g);
            setLoading(false);
        } catch { setLoading(false); }
    };

    const handleCreate = async () => {
        if (!newFirst || !newLast || !newEmail) return;
        try {
            await apiClient.post('/users', {
                firstName: newFirst,
                lastName: newLast,
                email: newEmail,
                role: newRole,
                password: 'change-password',
                mustChangePassword: true,
            });
            await reload();
            setShowCreate(false);
            setNewFirst(''); setNewLast(''); setNewEmail('');
        } catch (e: any) {
            Alert.alert('Erreur', e.message);
        }
    };

    const toggleActive = async (user: UserProfile) => {
        await apiClient.put(`/users/${user.id}`, { isActive: !user.isActive });
        reload();
    };

    if (loading) return <Loader />;

    const roleColor = (role: string) => {
        if (role === 'ADMIN') return Colors.danger;
        if (role === 'TEACHER') return '#4ea8de';
        return Colors.success;
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.pageTitle}>Utilisateurs</Text>
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
                        <Ionicons name="add" size={24} color={Colors.white} />
                    </TouchableOpacity>
                </View>

                {users.map((user) => (
                    <View key={user.id} style={styles.userCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user.firstName.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                            <Text style={styles.userEmail}>{user.email}</Text>
                            <View style={[styles.roleBadge, { backgroundColor: roleColor(user.role) + '22' }]}>
                                <Text style={[styles.roleText, { color: roleColor(user.role) }]}>{user.role}</Text>
                            </View>
                        </View>
                        <Switch
                            value={user.isActive}
                            onValueChange={() => toggleActive(user)}
                            trackColor={{ false: Colors.bgInput, true: Colors.successLight }}
                            thumbColor={user.isActive ? Colors.success : Colors.textMuted}
                        />
                    </View>
                ))}
            </ScrollView>

            {/* Create Modal */}
            <Modal visible={showCreate} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Nouvel utilisateur</Text>
                        <TextInput style={styles.input} placeholder="Prénom" placeholderTextColor={Colors.textMuted} value={newFirst} onChangeText={setNewFirst} />
                        <TextInput style={styles.input} placeholder="Nom" placeholderTextColor={Colors.textMuted} value={newLast} onChangeText={setNewLast} />
                        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" value={newEmail} onChangeText={setNewEmail} />

                        <View style={styles.roleRow}>
                            {(['ATHLETE', 'TEACHER'] as const).map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    style={[styles.roleChip, newRole === role && styles.roleChipActive]}
                                    onPress={() => setNewRole(role)}
                                >
                                    <Text style={[styles.roleChipText, newRole === role && styles.roleChipTextActive]}>
                                        {role === 'ATHLETE' ? '🏃 Athlète' : '👨‍🏫 Professeur'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                                <Text style={styles.cancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
                                <Text style={styles.saveText}>Créer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: 100 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xxl, marginTop: Spacing.lg },
    pageTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text },
    addBtn: { backgroundColor: Colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    userCard: {
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md, padding: Spacing.md,
        marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    },
    avatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { color: Colors.primary, fontSize: FontSizes.lg, fontWeight: '700' },
    userInfo: { flex: 1 },
    userName: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
    userEmail: { color: Colors.textMuted, fontSize: FontSizes.sm },
    roleBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 1, alignSelf: 'flex-start', marginTop: Spacing.xs },
    roleText: { fontSize: FontSizes.xs, fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalCard: { backgroundColor: Colors.bgCard, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xxl },
    modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
    input: {
        backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, padding: Spacing.lg,
        color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    },
    roleRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
    roleChip: {
        flex: 1, padding: Spacing.md, alignItems: 'center', borderRadius: BorderRadius.md,
        backgroundColor: Colors.bgInput, borderWidth: 1, borderColor: Colors.border,
    },
    roleChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    roleChipText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: '600' },
    roleChipTextActive: { color: Colors.primary },
    modalActions: { flexDirection: 'row', gap: Spacing.md },
    cancelBtn: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.bgInput },
    cancelText: { color: Colors.textMuted, fontSize: FontSizes.md, fontWeight: '600' },
    saveBtn: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
    saveText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '700' },
});
