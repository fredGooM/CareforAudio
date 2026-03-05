'use client';

import { useState, FormEvent, useEffect } from 'react';
import { X, Edit3, Trash2, Clock, Tag, FileText, User, Save } from 'lucide-react';
import type { CalendarEvent } from '@/types';
import { EventType, EVENT_TYPE_LABELS } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EventModalProps {
    event: CalendarEvent | null;
    isOpen: boolean;
    onClose: () => void;
    isTeacher: boolean;
    onUpdate?: (id: string, data: Partial<CalendarEvent>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
}

export default function EventModal({ event, isOpen, onClose, isTeacher, onUpdate, onDelete }: EventModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', date: '', type: EventType.EVENEMENT as string, duration: 60 });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (event) {
            setForm({
                title: event.title || '',
                description: event.description || '',
                date: event.date ? format(new Date(event.date), "yyyy-MM-dd'T'HH:mm") : '',
                type: event.type || EventType.EVENEMENT,
                duration: event.duration ?? 60,
            });
        }
        setIsEditing(false);
    }, [event]);

    if (!isOpen || !event) return null;

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        if (!onUpdate) return;
        setSaving(true);
        try {
            await onUpdate(event.id, {
                title: form.title,
                description: form.description,
                date: new Date(form.date).toISOString(),
                type: form.type as EventType,
                duration: Number(form.duration),
            });
            setIsEditing(false);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        if (!confirm('Supprimer cet événement ?')) return;
        try {
            await onDelete(event.id);
            onClose();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const eventDate = new Date(event.date);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content event-modal" onClick={e => e.stopPropagation()}>
                <div className="event-modal-header">
                    <div className="event-modal-header-left">
                        <div className="event-modal-dot" />
                        {isEditing ? (
                            <h2 style={{ border: 'none', padding: 0, margin: 0 }}>Modifier l&apos;événement</h2>
                        ) : (
                            <h2 style={{ border: 'none', padding: 0, margin: 0 }}>{event.title}</h2>
                        )}
                    </div>
                    <div className="event-modal-actions-top">
                        {isTeacher && !isEditing && (
                            <>
                                <button
                                    className="event-modal-icon-btn"
                                    onClick={() => setIsEditing(true)}
                                    title="Modifier"
                                >
                                    <Edit3 size={16} />
                                </button>
                                <button
                                    className="event-modal-icon-btn danger"
                                    onClick={handleDelete}
                                    title="Supprimer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                        <button className="event-modal-icon-btn" onClick={onClose} title="Fermer">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {isEditing ? (
                    <form onSubmit={handleSave} className="event-modal-form">
                        <div className="form-group">
                            <label>Titre</label>
                            <input
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Date et heure</label>
                            <input
                                type="datetime-local"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Type</label>
                                <select
                                    value={form.type}
                                    onChange={e => setForm({ ...form, type: e.target.value })}
                                >
                                    {Object.values(EventType).map(t => (
                                        <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Durée (min)</label>
                                <input
                                    type="number"
                                    min={5}
                                    step={5}
                                    value={form.duration}
                                    onChange={e => setForm({ ...form, duration: Number(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
                                Annuler
                            </button>
                            <button type="submit" className="btn-primary" disabled={saving}>
                                <Save size={16} style={{ marginRight: '0.4rem' }} />
                                {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="event-modal-details">
                        <div className="event-modal-detail-row">
                            <Clock size={16} className="event-modal-detail-icon" />
                            <div>
                                <span className="event-modal-detail-label">Date</span>
                                <span className="event-modal-detail-value">
                                    {format(eventDate, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                                </span>
                            </div>
                        </div>
                        {event.type && (
                            <div className="event-modal-detail-row">
                                <Tag size={16} className="event-modal-detail-icon" />
                                <div>
                                    <span className="event-modal-detail-label">Type</span>
                                    <span className="event-modal-detail-value">
                                        {EVENT_TYPE_LABELS[event.type as EventType] || event.type}
                                    </span>
                                </div>
                            </div>
                        )}
                        {event.duration && (
                            <div className="event-modal-detail-row">
                                <Clock size={16} className="event-modal-detail-icon" />
                                <div>
                                    <span className="event-modal-detail-label">Durée</span>
                                    <span className="event-modal-detail-value">{event.duration} min</span>
                                </div>
                            </div>
                        )}
                        {event.description && (
                            <div className="event-modal-detail-row">
                                <FileText size={16} className="event-modal-detail-icon" />
                                <div>
                                    <span className="event-modal-detail-label">Description</span>
                                    <span className="event-modal-detail-value">{event.description}</span>
                                </div>
                            </div>
                        )}
                        {event.user && (
                            <div className="event-modal-detail-row">
                                <User size={16} className="event-modal-detail-icon" />
                                <div>
                                    <span className="event-modal-detail-label">Athlète</span>
                                    <span className="event-modal-detail-value">
                                        {event.user.firstName} {event.user.lastName}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
