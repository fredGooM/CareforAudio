import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import apiClient from '../../lib/api-client';
import Loader from '../../components/Loader';
import { Colors, FontSizes, BorderRadius, Spacing, Shadows } from '../../constants/theme';
import type { DashboardUser, CalendarEvent } from '../../types';

export default function DashboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<DashboardUser | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            apiClient.get<DashboardUser>('/analytics/dashboard'),
            apiClient.get<CalendarEvent[]>('/events/me').catch(() => []),
        ]).then(([d, evts]) => {
            setData(d);
            const now = new Date();
            const upcoming = evts
                .filter(e => new Date(e.date) > now)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5);
            setEvents(upcoming);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading || !data) return <Loader />;

    const stats = [
        { label: 'Minutes totales', value: data.totalMinutes, icon: 'time-outline' as const, color: Colors.primary },
        { label: 'Série (jours)', value: data.streakDays, icon: 'flame-outline' as const, color: Colors.warning },
        { label: 'Complétés', value: data.completedCount, icon: 'checkmark-circle-outline' as const, color: Colors.success },
        { label: 'Progression', value: `${data.completionPercent}%`, icon: 'trending-up-outline' as const, color: '#4ea8de' },
    ];

    const formatRelative = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 0) return "Aujourd'hui";
        if (diff === 1) return 'Demain';
        return `Dans ${diff} jours`;
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.greeting}>Bonjour, {user?.firstName} 👋</Text>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                {stats.map((stat, i) => (
                    <View key={i} style={styles.statCard}>
                        <Ionicons name={stat.icon} size={24} color={stat.color} />
                        <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            {/* Programme Progress */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mon Programme</Text>
                <View style={styles.card}>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${data.myProgramProgress.percent}%` }]} />
                    </View>
                    <Text style={styles.progressText}>
                        {data.myProgramProgress.completed}/{data.myProgramProgress.total} audios complétés
                        {' · '}{data.myProgramProgress.percent}%
                    </Text>
                </View>
            </View>

            {/* Continue Listening */}
            {data.continueListening.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Continuer l'écoute</Text>
                    {data.continueListening.map((item) => (
                        <TouchableOpacity key={item.audioId} style={styles.continueCard} activeOpacity={0.8}>
                            <View style={styles.continueInfo}>
                                <Ionicons name="play-circle" size={28} color={Colors.primary} />
                                <Text style={styles.continueTitle} numberOfLines={1}>{item.title}</Text>
                            </View>
                            <View style={styles.miniProgressBg}>
                                <View style={[styles.miniProgressFill, { width: `${item.progressPercent}%` }]} />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Upcoming Events */}
            {events.length > 0 && (
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Événements à venir</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
                            <Text style={styles.seeAll}>Voir tout →</Text>
                        </TouchableOpacity>
                    </View>
                    {events.map((evt) => {
                        const d = new Date(evt.date);
                        return (
                            <View key={evt.id} style={styles.eventCard}>
                                <View style={styles.eventDateBadge}>
                                    <Text style={styles.eventDay}>{d.toLocaleDateString('fr-FR', { weekday: 'short' })}</Text>
                                    <Text style={styles.eventNum}>{d.getDate()}</Text>
                                    <Text style={styles.eventMonth}>{d.toLocaleDateString('fr-FR', { month: 'short' })}</Text>
                                </View>
                                <View style={styles.eventInfo}>
                                    <Text style={styles.eventTitle} numberOfLines={1}>{evt.title}</Text>
                                    <Text style={styles.eventTime}>
                                        {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                <Text style={styles.eventRelative}>{formatRelative(evt.date)}</Text>
                            </View>
                        );
                    })}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: 100 },
    greeting: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.xxl,
        marginTop: Spacing.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing.xxl,
    },
    statCard: {
        width: '47%',
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadows.sm,
    },
    statValue: {
        fontSize: FontSizes.xxl,
        fontWeight: '800',
        marginTop: Spacing.sm,
    },
    statLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: Spacing.xs,
        textAlign: 'center',
    },
    section: { marginBottom: Spacing.xxl },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    seeAll: {
        color: Colors.primary,
        fontSize: FontSizes.sm,
        fontWeight: '600',
        marginBottom: Spacing.md,
    },
    card: {
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: Colors.bgInput,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: Spacing.sm,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 4,
    },
    progressText: {
        color: Colors.textMuted,
        fontSize: FontSizes.sm,
    },
    continueCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    continueInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.sm,
    },
    continueTitle: {
        color: Colors.text,
        fontSize: FontSizes.md,
        fontWeight: '600',
        flex: 1,
    },
    miniProgressBg: {
        height: 4,
        backgroundColor: Colors.bgInput,
        borderRadius: 2,
        overflow: 'hidden',
    },
    miniProgressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 2,
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.md,
    },
    eventDateBadge: {
        backgroundColor: Colors.primaryLight,
        borderRadius: BorderRadius.md,
        padding: Spacing.sm,
        alignItems: 'center',
        minWidth: 52,
    },
    eventDay: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600', textTransform: 'capitalize' },
    eventNum: { color: Colors.primary, fontSize: FontSizes.xl, fontWeight: '800' },
    eventMonth: { color: Colors.primary, fontSize: FontSizes.xs, textTransform: 'capitalize' },
    eventInfo: { flex: 1 },
    eventTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
    eventTime: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
    eventRelative: { color: Colors.success, fontSize: FontSizes.xs, fontWeight: '600' },
});
