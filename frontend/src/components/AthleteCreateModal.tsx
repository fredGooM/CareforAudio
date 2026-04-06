'use client';

import { useState, FormEvent, useEffect } from 'react';
import { X, Plus, Calendar } from 'lucide-react';
import { EventType, EVENT_TYPE_LABELS } from '@/types';
import { format } from 'date-fns';

interface AthleteCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { title: string; description: string; date: string; type: string; duration: number }) => Promise<void>;
    preselectedDate?: Date | null;
}

export default function AthleteCreateModal({
    isOpen,
    onClose,
    onSubmit,
    preselectedDate,
}: AthleteCreateModalProps) {
    const nowFormatted = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");
    const [form, setForm] = useState({
        title: '',
        description: '',
        date: preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'HH:mm") : nowFormatted(),
        type: EventType.EVENEMENT as string,
        duration: 60,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm({
            title: '',
            description: '',
            date: preselectedDate ? format(preselectedDate, "yyyy-MM-dd'T'HH:mm") : nowFormatted(),
            type: EventType.EVENEMENT,
            duration: 60,
        });
    }, [isOpen, preselectedDate]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSubmit({
                ...form,
                date: new Date(form.date).toISOString(),
                duration: Number(form.duration),
            });
            onClose();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content event-modal">
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
                        <label><Calendar size={14} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />Titre</label>
                        <input
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder="ex: Compétition régionale"
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
