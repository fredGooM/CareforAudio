'use client';

import 'temporal-polyfill/global';
import { useSession } from 'next-auth/react';
import { useEffect, useState, use, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { CalendarEvent, UserProfile } from '@/types';
import { EventType, EVENT_TYPE_LABELS } from '@/types';
import Link from 'next/link';
import AppCalendar, { type SxEvent } from '@/components/AppCalendar';
import EventModal from '@/components/EventModal';
import QuickCreateModal from '@/components/QuickCreateModal';

function toZDT(d: Date): Temporal.ZonedDateTime {
    return Temporal.Instant
        .fromEpochMilliseconds(d.getTime())
        .toZonedDateTimeISO(Temporal.Now.timeZoneId());
}

export default function AdminUserCalendarPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const { data: session } = useSession();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<SxEvent[]>([]);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [preselectedDate, setPreselectedDate] = useState<Date | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [evs, u] = await Promise.all([
                apiClient.get<CalendarEvent[]>(`/events/user/${userId}`),
                apiClient.get<UserProfile>(`/users/${userId}`)
            ]);
            setEvents(evs);
            setUser(u);
            setCalendarEvents(evs.map(ev => {
                const start = new Date(ev.date);
                const durationMs = (ev.duration ?? 60) * 60 * 1000;
                const end = new Date(start.getTime() + durationMs);
                return {
                    id: ev.id,
                    title: ev.title + (ev.type ? ` (${ev.type})` : ''),
                    start: toZDT(start),
                    end: toZDT(end),
                    originalEvent: ev,
                };
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        loadData();
    }, [session, loadData]);

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
        setModalOpen(false);
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
                <div>
                    <Link href="/admin/users" className="text-muted" style={{ display: 'inline-block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>← Retour aux utilisateurs</Link>
                    <h1>Calendrier de {user?.firstName} {user?.lastName}</h1>
                </div>
                <button className="btn-primary" onClick={() => { setPreselectedDate(null); setCreateModalOpen(true); }}>
                    <Plus size={18} style={{ marginRight: '0.5rem' }} /> Ajouter événement
                </button>
            </div>

            <div className="calendar-container">
                <AppCalendar
                    events={calendarEvents}
                    onEventClick={handleEventClick}
                    onDateClick={handleDateClick}
                />
            </div>

            {events.length > 0 && (
                <div className="table-container" style={{ marginTop: '2rem' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Titre</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.map(ev => (
                                <tr key={ev.id}>
                                    <td>{new Date(ev.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                    <td>
                                        <strong>{ev.title}</strong>
                                        {ev.description && <div className="text-muted" style={{ fontSize: '0.85rem' }}>{ev.description}</div>}
                                    </td>
                                    <td>{ev.type ? (EVENT_TYPE_LABELS[ev.type as EventType] || ev.type) : '-'}</td>
                                    <td>
                                        <button className="btn-secondary" onClick={() => handleDeleteEvent(ev.id)} title="Supprimer">
                                            <Trash2 size={16} className="text-danger" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
                athletes={user ? [user] : []}
                onSubmit={handleCreateEvent}
                preselectedDate={preselectedDate}
                preselectedUserId={userId}
            />
        </div>
    );
}
