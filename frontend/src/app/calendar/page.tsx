'use client';

import 'temporal-polyfill/global';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import { CalendarEvent } from '@/types';
import AppCalendar, { type SxEvent } from '@/components/AppCalendar';
import EventModal from '@/components/EventModal';
import AthleteCreateModal from '@/components/AthleteCreateModal';
import { Plus } from 'lucide-react';

// Build ZonedDateTime from local time components in UTC so schedule-X
// displays the time as-is without any timezone conversion.
function toZDT(d: Date): Temporal.ZonedDateTime {
    return Temporal.PlainDateTime.from({
        year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(),
        hour: d.getHours(), minute: d.getMinutes(),
    }).toZonedDateTime('UTC');
}

export default function CalendarPage() {
    const { data: session } = useSession();
    const [events, setEvents] = useState<SxEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [preselectedDate, setPreselectedDate] = useState<Date | null>(null);

    const fetchEvents = useCallback(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        apiClient.get<CalendarEvent[]>('/events/me')
            .then(data => {
                setEvents(data.map(ev => {
                    const start = new Date(ev.date);
                    const end = new Date(start.getTime() + (ev.duration ?? 60) * 60 * 1000);
                    return {
                        id: ev.id,
                        title: ev.title + (ev.type ? ` (${ev.type})` : ''),
                        start: toZDT(start),
                        end: toZDT(end),
                        originalEvent: ev,
                    };
                }));
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [session]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleEventClick = useCallback((event: SxEvent) => {
        setSelectedEvent(event.originalEvent as CalendarEvent);
        setModalOpen(true);
    }, []);

    const handleDateClick = useCallback((date: Date) => {
        setPreselectedDate(date);
        setCreateOpen(true);
    }, []);

    const handleCreate = async (data: { title: string; description: string; date: string; type: string; duration: number }) => {
        await apiClient.post('/events/me', data);
        fetchEvents();
    };

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h1 style={{ margin: 0 }}>Mon Calendrier</h1>
                <button
                    className="btn-primary"
                    onClick={() => { setPreselectedDate(null); setCreateOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                    <Plus size={16} />
                    Créer un événement
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
                isTeacher={false}
            />

            <AthleteCreateModal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onSubmit={handleCreate}
                preselectedDate={preselectedDate}
            />
        </div>
    );
}
