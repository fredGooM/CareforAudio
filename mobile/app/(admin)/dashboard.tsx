import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import Loader from '../../components/Loader';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import type { DashboardAdmin } from '../../types';

export default function AdminDashboardScreen() {
    const [data, setData] = useState<DashboardAdmin | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get<DashboardAdmin>('/analytics/dashboard').then((d) => {
            setData(d);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading || !data) return <Loader />;

    const stats = [
        { label: 'Heures d\'écoute', value: data.totalListeningHours, icon: 'time-outline' as const, color: Colors.primary },
        { label: 'Taux complétion', value: `${data.completionRate}%`, icon: 'checkmark-circle-outline' as const, color: Colors.success },
        { label: 'Athlètes actifs', value: data.activeAthletes ?? '-', icon: 'people-outline' as const, color: '#4ea8de' },
    ];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.pageTitle}>Dashboard Admin</Text>

            {/* Stats */}
            <View style={styles.statsRow}>
                {stats.map((stat, i) => (
                    <View key={i} style={styles.statCard}>
                        <Ionicons name={stat.icon} size={22} color={stat.color} />
                        <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            {/* Popular Audios */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Audios populaires</Text>
                {data.popularAudios.map((audio, i) => (
                    <View key={audio.audioId} style={styles.listItem}>
                        <View style={styles.rankBadge}>
                            <Text style={styles.rankText}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.itemTitle} numberOfLines={1}>{audio.title}</Text>
                            <Text style={styles.itemMeta}>{audio.minutes} min écoutées</Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Dropoffs */}
            {data.dropoffs.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Athlètes inactifs</Text>
                    {data.dropoffs.map((d) => (
                        <View key={d.userId} style={styles.listItem}>
                            <Ionicons name="alert-circle-outline" size={20} color={Colors.warning} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemTitle}>{d.name}</Text>
                                <Text style={styles.itemMeta}>
                                    {d.daysSince === Infinity ? 'Jamais écouté' : `${d.daysSince} jours sans écoute`}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: 100 },
    pageTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xxl, marginTop: Spacing.lg },
    statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl },
    statCard: {
        flex: 1,
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    statValue: { fontSize: FontSizes.xl, fontWeight: '800', marginTop: Spacing.xs },
    statLabel: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: Spacing.xs, textAlign: 'center' },
    section: { marginBottom: Spacing.xxl },
    sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    rankBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: Colors.primaryLight,
        justifyContent: 'center', alignItems: 'center',
    },
    rankText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '700' },
    itemTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
    itemMeta: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 1 },
});
