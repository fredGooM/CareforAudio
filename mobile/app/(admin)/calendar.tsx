import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import Loader from '../../components/Loader';
import { Colors, FontSizes, BorderRadius, Spacing, AthleteColors } from '../../constants/theme';
import type { CalendarEvent, UserProfile } from '../../types';

LocaleConfig.locales['fr'] = {
    monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
    dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = 'fr';

export default function AdminCalendarScreen() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newUserId, setNewUserId] = useState('');
    const [newDate, setNewDate] = useState('');

    useEffect(() => {
        Promise.all([
            apiClient.get<CalendarEvent[]>('/events/teacher'),
            apiClient.get<UserProfile[]>('/users'),
        ]).then(([evts, u]) => {
            setEvents(evts);
            setUsers(u.filter(usr => usr.role === 'ATHLETE'));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const athleteColorMap = new Map<string, typeof AthleteColors[0]>();
    users.forEach((u, i) => {
        athleteColorMap.set(u.id, AthleteColors[i % AthleteColors.length]);
    });

    if (loading) return <Loader />;

    const markedDates: Record<string, any> = {};
    events.forEach((evt) => {
        const dateKey = evt.date.slice(0, 10);
        const color = athleteColorMap.get(evt.userId)?.main || Colors.primary;
        if (markedDates[dateKey]) {
            markedDates[dateKey].dots?.push({ color });
        } else {
            markedDates[dateKey] = {
                dots: [{ color }],
                ...(selectedDate === dateKey ? { selected: true, selectedColor: Colors.primaryLight } : {}),
            };
        }
    });
    if (selectedDate && !markedDates[selectedDate]) {
        markedDates[selectedDate] = { selected: true, selectedColor: Colors.primaryLight };
    }

    const selectedEvents = selectedDate
        ? events.filter(e => e.date.startsWith(selectedDate)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    const handleCreate = async () => {
        if (!newTitle || !newUserId || !newDate) return;
        try {
            await apiClient.post('/events', {
                title: newTitle,
                description: newDesc,
                date: newDate,
                userId: newUserId,
            });
            // Refresh events
            const evts = await apiClient.get<CalendarEvent[]>('/events/teacher');
            setEvents(evts);
            setShowCreate(false);
            setNewTitle('');
            setNewDesc('');
        } catch (e: any) {
            Alert.alert('Erreur', e.message);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerRow}>
                    <Text style={styles.pageTitle}>Calendrier Global</Text>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => {
                            setNewDate(selectedDate || new Date().toISOString());
                            setShowCreate(true);
                        }}
                    >
                        <Ionicons name="add" size={24} color={Colors.white} />
                    </TouchableOpacity>
                </View>

                <Calendar
                    style={styles.calendar}
                    markingType="multi-dot"
                    theme={{
                        backgroundColor: Colors.bgCard,
                        calendarBackground: Colors.bgCard,
                        textSectionTitleColor: Colors.textMuted,
                        selectedDayBackgroundColor: Colors.primary,
                        selectedDayTextColor: Colors.white,
                        todayTextColor: Colors.primary,
                        dayTextColor: Colors.text,
                        textDisabledColor: Colors.textMuted,
                        arrowColor: Colors.primary,
                        monthTextColor: Colors.text,
                        textMonthFontWeight: '700',
                        textMonthFontSize: FontSizes.lg,
                    }}
                    markedDates={markedDates}
                    onDayPress={(day: any) => setSelectedDate(day.dateString)}
                />

                {selectedDate && (
                    <View style={styles.eventsSection}>
                        <Text style={styles.dateLabel}>
                            {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </Text>
                        {selectedEvents.length === 0 ? (
                            <Text style={styles.noEvents}>Aucun événement</Text>
                        ) : (
                            selectedEvents.map((evt) => {
                                const color = athleteColorMap.get(evt.userId)?.main || Colors.primary;
                                const athleteName = evt.user ? `${evt.user.firstName} ${evt.user.lastName}` : '';
                                return (
                                    <View key={evt.id} style={[styles.eventCard, { borderLeftColor: color }]}>
                                        <View style={styles.eventHeader}>
                                            <Text style={styles.eventTime}>
                                                {new Date(evt.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            {athleteName ? (
                                                <View style={[styles.athleteBadge, { backgroundColor: color + '22' }]}>
                                                    <Text style={[styles.athleteName, { color }]}>👤 {athleteName}</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <Text style={styles.eventTitle}>{evt.title}</Text>
                                        {evt.description && <Text style={styles.eventDesc}>{evt.description}</Text>}
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Quick Create Modal */}
            <Modal visible={showCreate} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Nouvel événement</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Titre"
                            placeholderTextColor={Colors.textMuted}
                            value={newTitle}
                            onChangeText={setNewTitle}
                        />
                        <TextInput
                            style={[styles.modalInput, { height: 80 }]}
                            placeholder="Description (optionnel)"
                            placeholderTextColor={Colors.textMuted}
                            multiline
                            value={newDesc}
                            onChangeText={setNewDesc}
                        />

                        <Text style={styles.modalLabel}>Athlète</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.athleteScroll}>
                            {users.map((u) => (
                                <TouchableOpacity
                                    key={u.id}
                                    style={[styles.athleteChip, newUserId === u.id && styles.athleteChipActive]}
                                    onPress={() => setNewUserId(u.id)}
                                >
                                    <Text style={[styles.athleteChipText, newUserId === u.id && styles.athleteChipTextActive]}>
                                        {u.firstName} {u.lastName}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                                <Text style={styles.cancelText}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                                <Text style={styles.submitText}>Créer</Text>
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
    calendar: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
    eventsSection: { marginTop: Spacing.xxl },
    dateLabel: { fontSize: FontSizes.lg, fontWeight: '600', color: Colors.text, marginBottom: Spacing.md, textTransform: 'capitalize' },
    noEvents: { color: Colors.textMuted, fontSize: FontSizes.md },
    eventCard: {
        backgroundColor: Colors.bgCard, borderRadius: BorderRadius.md, padding: Spacing.lg,
        marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderLeftWidth: 3,
    },
    eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
    eventTime: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
    athleteBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
    athleteName: { fontSize: FontSizes.xs, fontWeight: '600' },
    eventTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600' },
    eventDesc: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: Spacing.xs },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalCard: { backgroundColor: Colors.bgCard, borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.xxl },
    modalTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.lg },
    modalInput: {
        backgroundColor: Colors.bgInput, borderRadius: BorderRadius.md, padding: Spacing.lg,
        color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    },
    modalLabel: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: Spacing.sm },
    athleteScroll: { marginBottom: Spacing.lg },
    athleteChip: {
        backgroundColor: Colors.bgInput, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm, marginRight: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    },
    athleteChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
    athleteChipText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: '600' },
    athleteChipTextActive: { color: Colors.primary },
    modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
    cancelBtn: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.bgInput },
    cancelText: { color: Colors.textMuted, fontSize: FontSizes.md, fontWeight: '600' },
    submitBtn: { flex: 1, padding: Spacing.lg, alignItems: 'center', borderRadius: BorderRadius.md, backgroundColor: Colors.primary },
    submitText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: '700' },
});
