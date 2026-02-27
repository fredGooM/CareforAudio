'use client';

import 'temporal-polyfill/global';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import { CalendarEvent } from '@/types';
import AppCalendar, { type SxEvent } from '@/components/AppCalendar';
import EventModal from '@/components/EventModal';

function toZDT(d: Date): Temporal.ZonedDateTime {
    return Temporal.Instant
        .fromEpochMilliseconds(d.getTime())
        .toZonedDateTimeISO(Temporal.Now.timeZoneId());
}

export default function CalendarPage() {
    const { data: session } = useSession();
    const [events, setEvents] = useState<SxEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        apiClient.get<CalendarEvent[]>('/events/me')
            .then(data => {
                setEvents(data.map(ev => {
                    const start = new Date(ev.date);
                    const end = new Date(start.getTime() + 60 * 60 * 1000);
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

    const handleEventClick = useCallback((event: SxEvent) => {
        setSelectedEvent(event.originalEvent as CalendarEvent);
        setModalOpen(true);
    }, []);

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <h1>Mon Calendrier</h1>
            <div className="calendar-container">
                <AppCalendar
                    events={events}
                    onEventClick={handleEventClick}
                />
            </div>

            <EventModal
                event={selectedEvent}
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                isTeacher={false}
            />
        </div>
    );
}
