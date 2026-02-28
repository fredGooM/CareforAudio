import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../lib/api-client';
import Loader from '../../components/Loader';
import { Colors, FontSizes, BorderRadius, Spacing } from '../../constants/theme';
import type { CalendarEvent } from '../../types';

// French locale for calendar
LocaleConfig.locales['fr'] = {
    monthNames: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
    monthNamesShort: ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'],
    dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    today: "Aujourd'hui",
};
LocaleConfig.defaultLocale = 'fr';

export default function CalendarScreen() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        apiClient.get<CalendarEvent[]>('/events/me').then((data) => {
            setEvents(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    if (loading) return <Loader />;

    // Build marked dates
    const markedDates: Record<string, any> = {};
    events.forEach((evt) => {
        const dateKey = evt.date.slice(0, 10);
        markedDates[dateKey] = {
            marked: true,
            dotColor: Colors.primary,
            ...(selectedDate === dateKey ? { selected: true, selectedColor: Colors.primary } : {}),
        };
    });
    if (selectedDate && !markedDates[selectedDate]) {
        markedDates[selectedDate] = { selected: true, selectedColor: Colors.primaryLight };
    }

    const selectedEvents = selectedDate
        ? events.filter(e => e.date.startsWith(selectedDate)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        : [];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.pageTitle}>Calendrier</Text>

            <Calendar
                style={styles.calendar}
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
                    textDayFontSize: FontSizes.md,
                    textDayHeaderFontSize: FontSizes.sm,
                }}
                markedDates={markedDates}
                onDayPress={(day: any) => setSelectedDate(day.dateString)}
            />

            {selectedDate && (
                <View style={styles.eventsSection}>
                    <Text style={styles.dateLabel}>
                        {new Date(selectedDate).toLocaleDateString('fr-FR', {
                            weekday: 'long', day: 'numeric', month: 'long'
                        })}
                    </Text>

                    {selectedEvents.length === 0 ? (
                        <Text style={styles.noEvents}>Aucun événement</Text>
                    ) : (
                        selectedEvents.map((evt) => (
                            <View key={evt.id} style={styles.eventCard}>
                                <View style={styles.eventTime}>
                                    <Ionicons name="time-outline" size={16} color={Colors.primary} />
                                    <Text style={styles.eventTimeText}>
                                        {new Date(evt.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                                <Text style={styles.eventTitle}>{evt.title}</Text>
                                {evt.description && (
                                    <Text style={styles.eventDesc} numberOfLines={2}>{evt.description}</Text>
                                )}
                                {evt.type && (
                                    <View style={styles.typeBadge}>
                                        <Text style={styles.typeText}>{evt.type}</Text>
                                    </View>
                                )}
                            </View>
                        ))
                    )}
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    content: { padding: Spacing.xl, paddingBottom: 100 },
    pageTitle: { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xxl, marginTop: Spacing.lg },
    calendar: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    eventsSection: { marginTop: Spacing.xxl },
    dateLabel: {
        fontSize: FontSizes.lg,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.md,
        textTransform: 'capitalize',
    },
    noEvents: { color: Colors.textMuted, fontSize: FontSizes.md },
    eventCard: {
        backgroundColor: Colors.bgCard,
        borderRadius: BorderRadius.md,
        padding: Spacing.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    eventTime: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
    eventTimeText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '600' },
    eventTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '600', marginBottom: Spacing.xs },
    eventDesc: { color: Colors.textMuted, fontSize: FontSizes.sm },
    typeBadge: {
        backgroundColor: Colors.primaryLight,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        alignSelf: 'flex-start',
        marginTop: Spacing.sm,
    },
    typeText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600' },
});
