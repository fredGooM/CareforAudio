'use client';

import 'temporal-polyfill/global';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import { CalendarEvent, UserProfile } from '@/types';
import AppCalendar, { type SxEvent } from '@/components/AppCalendar';
import EventModal from '@/components/EventModal';
import QuickCreateModal from '@/components/QuickCreateModal';
import { Plus } from 'lucide-react';

function toZDT(d: Date): Temporal.ZonedDateTime {
    return Temporal.Instant
        .fromEpochMilliseconds(d.getTime())
        .toZonedDateTimeISO(Temporal.Now.timeZoneId());
}

export default function AdminGlobalCalendarPage() {
    const { data: session } = useSession();
    const [events, setEvents] = useState<SxEvent[]>([]);
    const [athletes, setAthletes] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [preselectedDate, setPreselectedDate] = useState<Date | null>(null);

    const loadData = useCallback(async () => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        try {
            const [evData, usersData] = await Promise.all([
                apiClient.get<CalendarEvent[]>('/events/teacher'),
                apiClient.get<UserProfile[]>('/users'),
            ]);
            setEvents(evData.map(ev => {
                const start = new Date(ev.date);
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                return {
                    id: ev.id,
                    title: `${ev.title} — ${ev.user?.firstName || ''} ${ev.user?.lastName || ''}`,
                    start: toZDT(start),
                    end: toZDT(end),
                    originalEvent: ev,
                };
            }));
            setAthletes(usersData.filter(u => u.role === 'ATHLETE'));
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

    const handleCreateEvent = async (data: { title: string; description: string; date: string; type: string; userId: string }) => {
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
