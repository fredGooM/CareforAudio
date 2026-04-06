'use client';

import 'temporal-polyfill/global';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import { CalendarEvent, UserProfile } from '@/types';
import AppCalendar, { type SxEvent } from '@/components/AppCalendar';
import EventModal from '@/components/EventModal';
import QuickCreateModal from '@/components/QuickCreateModal';
import { Plus } from 'lucide-react';

function toZDT(d: Date): Temporal.ZonedDateTime {
    return Temporal.PlainDateTime.from({
        year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
        hour: d.getHours(), minute: d.getMinutes(),
    }).toZonedDateTime('UTC');
}

/** Curated palette – works well on dark backgrounds */
const ATHLETE_COLORS: { main: string; container: string; onContainer: string }[] = [
    { main: '#7c5cfc', container: '#35285e', onContainer: '#d4c8ff' },  // violet
    { main: '#2ec4b6', container: '#153b37', onContainer: '#9ef5ea' },  // teal
    { main: '#e07a5f', container: '#4a281f', onContainer: '#ffc8b8' },  // salmon
    { main: '#f2c14e', container: '#4a3b16', onContainer: '#ffe491' },  // gold
    { main: '#4ea8de', container: '#1c3b4f', onContainer: '#b0dcf7' },  // sky
    { main: '#e05697', container: '#4a1b35', onContainer: '#ffb7d6' },  // pink
    { main: '#70c1b3', container: '#1e3f38', onContainer: '#a8e8da' },  // mint
    { main: '#f77f00', container: '#4a2a00', onContainer: '#ffc480' },  // orange
    { main: '#8ac926', container: '#2e400d', onContainer: '#c6ee7b' },  // lime
    { main: '#b185db', container: '#382952', onContainer: '#dec5f7' },  // lavender
];

export default function AdminGlobalCalendarPage() {
    const { data: session } = useSession();
    const [events, setEvents] = useState<SxEvent[]>([]);
    const [athletes, setAthletes] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [preselectedDate, setPreselectedDate] = useState<Date | null>(null);
    const [rawEvents, setRawEvents] = useState<CalendarEvent[]>([]);

    /** Build a stable userId → colorIndex map */
    const athleteColorMap = useMemo(() => {
        const map: Record<string, number> = {};
        athletes.forEach((a, i) => {
            map[a.id] = i % ATHLETE_COLORS.length;
        });
        return map;
    }, [athletes]);

    /** Schedule-X calendars config: one "calendar" per athlete for color coding */
    const calendars = useMemo(() => {
        const cals: Record<string, { colorName: string; label: string; darkColors: typeof ATHLETE_COLORS[0]; lightColors: typeof ATHLETE_COLORS[0] }> = {};
        athletes.forEach((a, i) => {
            const colors = ATHLETE_COLORS[i % ATHLETE_COLORS.length];
            const calId = `athlete-${a.id}`;
            cals[calId] = {
                colorName: calId,
                label: `${a.firstName} ${a.lastName}`,
                darkColors: colors,
                lightColors: colors,
            };
        });
        return cals;
    }, [athletes]);

    const loadData = useCallback(async () => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        try {
            const [evData, usersData] = await Promise.all([
                apiClient.get<CalendarEvent[]>('/events/teacher'),
                apiClient.get<UserProfile[]>('/users'),
            ]);
            const athleteList = usersData.filter(u => u.role === 'ATHLETE');
            setAthletes(athleteList);
            setRawEvents(evData);

            // Build color map right now (can't wait for useMemo on next render)
            const colorMap: Record<string, number> = {};
            athleteList.forEach((a, i) => { colorMap[a.id] = i % ATHLETE_COLORS.length; });

            setEvents(evData.map(ev => {
                const start = new Date(ev.date);
                const durationMs = (ev.duration ?? 60) * 60 * 1000;
                const end = new Date(start.getTime() + durationMs);
                const athleteName = ev.user ? `${ev.user.firstName} ${ev.user.lastName}` : '';
                return {
                    id: ev.id,
                    title: athleteName ? `👤 ${athleteName} — ${ev.title}` : ev.title,
                    start: toZDT(start),
                    end: toZDT(end),
                    calendarId: ev.userId ? `athlete-${ev.userId}` : undefined,
                    originalEvent: ev,
                };
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleEventClick = useCallback((event: SxEvent) => {
        setSelectedEvent(event.originalEvent as CalendarEvent);
        setModalOpen(true);
    }, []);

    const handleDateClick = useCallback((date: Date) => {
        setPreselectedDate(date);
        setCreateModalOpen(true);
    }, []);

    const handleUpdateEvent = async (id: string, data: Partial<CalendarEvent>) => {
        await apiClient.put(`/events/${id}`, data);
        await loadData();
    };

    const handleDeleteEvent = async (id: string) => {
        await apiClient.delete(`/events/${id}`);
        await loadData();
    };

    const handleCreateEvent = async (data: { title: string; description: string; date: string; type: string; duration: number; userId: string }) => {
        await apiClient.post('/events', data);
        await loadData();
    };

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Calendrier Global</h1>
                <button className="btn-primary" onClick={() => { setPreselectedDate(null); setCreateModalOpen(true); }}>
                    <Plus size={18} style={{ marginRight: '0.5rem' }} /> Ajouter événement
                </button>
            </div>

            <div className="calendar-container">
                <AppCalendar
                    events={events}
                    onEventClick={handleEventClick}
                    onDateClick={handleDateClick}
                    calendars={calendars}
                />
            </div>

            <EventModal
                event={selectedEvent}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                isTeacher={true}
                onUpdate={handleUpdateEvent}
                onDelete={handleDeleteEvent}
            />

            <QuickCreateModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                athletes={athletes}
                onSubmit={handleCreateEvent}
                preselectedDate={preselectedDate}
            />
        </div>
    );
}
