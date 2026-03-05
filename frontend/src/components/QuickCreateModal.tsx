'use client';

import { useState, FormEvent, useEffect } from 'react';
import { X, Plus, Calendar, User } from 'lucide-react';
import type { UserProfile } from '@/types';
import { EventType, EVENT_TYPE_LABELS } from '@/types';
import { format } from 'date-fns';

interface QuickCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    athletes: UserProfile[];
    onSubmit: (data: { title: string; description: string; date: string; type: string; duration: number; userId: string }) => Promise<void>;
    preselectedDate?: Date | null;
    preselectedUserId?: string | null;
}

export default function QuickCreateModal({
    isOpen,
    onClose,
    athletes,
    onSubmit,
    preselectedDate,
    preselectedUserId,
}: QuickCreateModalProps) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        date: preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'HH:mm") : '',
        type: EventType.EVENEMENT as string,
        duration: 60,
        userId: preselectedUserId || '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm({
            title: '',
            description: '',
            date: preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'HH:mm") : '',
            type: EventType.EVENEMENT,
            duration: 60,
            userId: preselectedUserId || '',
        });
    }, [isOpen, preselectedDate, preselectedUserId]);

    const resetForm = () => {
        setForm({
            title: '',
            description: '',
            date: preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'HH:mm") : '',
            type: EventType.EVENEMENT,
            duration: 60,
            userId: preselectedUserId || '',
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!form.userId) {
            alert('Veuillez sélectionner un athlète.');
            return;
        }
        setSaving(true);
        try {
            await onSubmit({
                ...form,
                date: new Date(form.date).toISOString(),
                duration: Number(form.duration),
            });
            resetForm();
            onClose();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content event-modal" onClick={e => e.stopPropagation()}>
                <div className="event-modal-header">
                    <div className="event-modal-header-left">
                        <div className="event-modal-dot accent" />
                        <h2 style={{ border: 'none', padding: 0, margin: 0 }}>
                            <Plus size={18} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
                            Nouvel événement
                        </h2>
                    </div>
                    <button className="event-modal-icon-btn" onClick={onClose} title="Fermer">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="event-modal-form">
                    <div className="form-group">
                        <label><User size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />Athlète</label>
                        {preselectedUserId ? (
                            <input
                                value={athletes.find(a => a.id === preselectedUserId)?.firstName + ' ' + athletes.find(a => a.id === preselectedUserId)?.lastName || ''}
                                disabled
                            />
                        ) : (
                            <select
                                value={form.userId}
                                onChange={e => setForm({ ...form, userId: e.target.value })}
                                required
                            >
                                <option value="">Sélectionner un athlète...</option>
                                {athletes.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.firstName} {a.lastName}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="form-group">
                        <label><Calendar size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />Titre</label>
                        <input
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="ex: Séance de récupération"
                            required
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Date et heure</label>
                            <input
                                type="datetime-local"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                required
                            />
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
                        <label>Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={2}
                            placeholder="Optionnel..."
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Annuler
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            <Plus size={16} style={{ marginRight: '0.4rem' }} />
                            {saving ? 'Création...' : 'Créer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
