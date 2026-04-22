'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import UserStatesPanel from '@/components/UserStatesPanel';
import AthleteSelector from '@/components/AthleteSelector';
import { UserProfile, StateFieldConfig, StateType, STATE_TYPE_LABELS } from '@/types';
import { Activity, Settings, Plus, Trash2, X } from 'lucide-react';

function toFieldKey(label: string): string {
    return label.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '') || 'field';
}

/* ─── Field Editor Modal ─────────────────────────────────────────── */
function FieldEditorModal({
    athleteId,
    stateType,
    onClose,
    onSaved,
}: {
    athleteId: string;
    stateType: StateType;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [labels, setLabels] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiClient.get<StateFieldConfig[]>(`/user-states/configs/${athleteId}`)
            .then(configs => {
                setLabels(
                    configs
                        .filter(c => c.stateType === stateType)
                        .sort((a, b) => a.position - b.position)
                        .map(c => c.label)
                );
            })
            .finally(() => setLoading(false));
    }, [athleteId, stateType]);

    const handleSave = async () => {
        const valid = labels.map(l => l.trim()).filter(Boolean);
        if (!valid.length) return;
        setSaving(true);
        try {
            await apiClient.put(`/user-states/configs/${athleteId}/${stateType}`, {
                fields: valid.map(label => ({ label, fieldKey: toFieldKey(label) })),
            });
            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem', width: '100%', maxWidth: '420px', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>
                        Indicateurs — {STATE_TYPE_LABELS[stateType]}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Chargement...</p>
                ) : (
                    <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            {labels.map((label, i) => (
                                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        autoFocus={i === labels.length - 1 && !label}
                                        placeholder={`Indicateur ${i + 1}`}
                                        value={label}
                                        onChange={e => setLabels(prev => prev.map((l, idx) => idx === i ? e.target.value : l))}
                                        style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.875rem', fontFamily: 'var(--font)' }}
                                    />
                                    <button
                                        onClick={() => setLabels(prev => prev.filter((_, idx) => idx !== i))}
                                        disabled={labels.length <= 1}
                                        style={{ background: 'none', border: 'none', color: labels.length <= 1 ? 'var(--border)' : 'var(--text-muted)', cursor: labels.length <= 1 ? 'default' : 'pointer', padding: '0.25rem', flexShrink: 0 }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {labels.length < 8 && (
                            <button
                                onClick={() => setLabels(prev => [...prev, ''])}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '100%', justifyContent: 'center', marginBottom: '1.25rem', transition: 'var(--transition)' }}
                            >
                                <Plus size={15} /> Ajouter un indicateur
                            </button>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button onClick={onClose} style={{ padding: '0.5rem 1rem', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>
                                Annuler
                            </button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary">
                                {saving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function AdminStatesPage() {
    const { data: session } = useSession();
    const [athletes, setAthletes] = useState<UserProfile[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingType, setEditingType] = useState<StateType | null>(null);
    const [panelKey, setPanelKey] = useState(0);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        apiClient.get<UserProfile[]>('/users')
            .then(data => setAthletes(data.filter(u => u.role === 'ATHLETE')))
            .finally(() => setLoading(false));
    }, [session]);

    const athleteOptions = athletes.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }));

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>États des athlètes</h1>
                <AthleteSelector athletes={athleteOptions} selectedId={selectedId} onSelect={setSelectedId} />
            </div>

            {selectedId ? (
                <>
                    {/* Config buttons per type */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        {Object.values(StateType).map(t => (
                            <button
                                key={t}
                                onClick={() => setEditingType(t)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', transition: 'var(--transition)' }}
                            >
                                <Settings size={14} /> Configurer {STATE_TYPE_LABELS[t]}
                            </button>
                        ))}
                    </div>

                    <UserStatesPanel key={panelKey} userId={selectedId} readonly teacherMode />
                </>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', gap: '1rem', color: 'var(--text-muted)' }}>
                    <Activity size={52} style={{ opacity: 0.25 }} />
                    <p style={{ fontSize: '1rem', margin: 0 }}>Sélectionne un athlète pour voir ses états</p>
                </div>
            )}

            {editingType && selectedId && (
                <FieldEditorModal
                    athleteId={selectedId}
                    stateType={editingType}
                    onClose={() => setEditingType(null)}
                    onSaved={() => setPanelKey(k => k + 1)}
                />
            )}
        </div>
    );
}
