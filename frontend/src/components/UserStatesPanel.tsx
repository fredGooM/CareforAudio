'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis,
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { CheckCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { StateType, STATE_TYPE_LABELS, StateFieldConfig, StateHistoryEntry } from '@/types';

const CHART_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

interface Props {
    userId: string;
    readonly?: boolean;
    chartsOnly?: boolean;
    teacherMode?: boolean;
}

function valueColor(v: number) {
    if (v <= 3) return '#ef4444';
    if (v <= 6) return '#f59e0b';
    return '#22c55e';
}
function valueBg(v: number) {
    if (v <= 3) return 'rgba(239,68,68,0.12)';
    if (v <= 6) return 'rgba(245,158,11,0.12)';
    return 'rgba(34,197,94,0.12)';
}
function toFieldKey(label: string) {
    return label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field';
}

function groupIntoSessions(entries: StateHistoryEntry[]) {
    const groups = new Map<string, Record<string, number>>();
    // entries are DESC (newest first) — use "if not set" so newest value wins on collision
    for (const e of entries) {
        const key = format(new Date(e.recordedAt), 'dd/MM HH:mm:ss');
        if (!groups.has(key)) groups.set(key, {});
        const grp = groups.get(key)!;
        if (!(e.fieldConfig.fieldKey in grp)) grp[e.fieldConfig.fieldKey] = e.value;
    }
    // Map preserves DESC insertion order — reverse for chronological display, strip seconds for label
    return Array.from(groups.entries())
        .reverse()
        .map(([key, values]) => ({ date: key.slice(0, -3), ...values }));
}

function getLatestValues(entries: StateHistoryEntry[], fields: StateFieldConfig[]) {
    const latest: Record<string, number> = {};
    for (const field of fields) {
        const entry = entries.find(e => e.fieldConfigId === field.id);
        if (entry) latest[field.id] = entry.value;
    }
    return latest;
}

/* ─── Field Editor Modal ─────────────────────────────────────────── */
function FieldEditorModal({ athleteId, stateType, onClose, onSaved }: {
    athleteId: string; stateType: StateType; onClose: () => void; onSaved: () => void;
}) {
    const [labels, setLabels] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        apiClient.get<StateFieldConfig[]>(`/user-states/configs/${athleteId}`)
            .then(cfgs => setLabels(
                cfgs.filter(c => c.stateType === stateType).sort((a, b) => a.position - b.position).map(c => c.label)
            ))
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
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>Indicateurs — {STATE_TYPE_LABELS[stateType]}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
                </div>
                {loading ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Chargement...</p> : (
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
                                    <button onClick={() => setLabels(prev => prev.filter((_, idx) => idx !== i))} disabled={labels.length <= 1}
                                        style={{ background: 'none', border: 'none', color: labels.length <= 1 ? 'var(--border)' : 'var(--text-muted)', cursor: labels.length <= 1 ? 'default' : 'pointer', padding: '0.25rem', flexShrink: 0 }}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {labels.length < 8 && (
                            <button onClick={() => setLabels(prev => [...prev, ''])}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem 0.75rem', fontSize: '0.85rem', width: '100%', justifyContent: 'center', marginBottom: '1rem', transition: 'var(--transition)', fontFamily: 'var(--font)' }}>
                                <Plus size={14} /> Ajouter un indicateur
                            </button>
                        )}
                        <div className="modal-actions">
                            <button onClick={onClose} className="btn-secondary">Annuler</button>
                            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ─── Panel ──────────────────────────────────────────────────────── */
export default function UserStatesPanel({ userId, readonly, chartsOnly, teacherMode }: Props) {
    const [activeType, setActiveType] = useState<StateType>(StateType.EN_COMPETITION);
    const [configs, setConfigs] = useState<StateFieldConfig[]>([]);
    const [history, setHistory] = useState<StateHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [formValues, setFormValues] = useState<Record<string, number>>({});
    const [editingType, setEditingType] = useState<StateType | null>(null);

    const userIdRef = useRef(userId);
    const teacherRef = useRef(teacherMode);
    const readonlyRef = useRef(readonly);
    userIdRef.current = userId;
    teacherRef.current = teacherMode;
    readonlyRef.current = readonly;

    const activeFields = configs.filter(c => c.stateType === activeType).sort((a, b) => a.position - b.position);
    const activeHistory = history.filter(h => h.fieldConfig?.stateType === activeType);
    const latestValues = getLatestValues(activeHistory, activeFields);
    const chartData = groupIntoSessions(activeHistory);
    const hasHistory = activeHistory.length > 0;
    const radarData = activeFields.map(f => ({ field: f.label, value: latestValues[f.id] ?? 0, fullMark: 10 }));

    const loadData = async () => {
        setLoading(true);
        const histUrl = teacherRef.current || readonlyRef.current
            ? `/user-states/user/${userIdRef.current}`
            : '/user-states/me';
        try {
            const [cfgs, hist] = await Promise.all([
                apiClient.get<StateFieldConfig[]>(`/user-states/configs/${userIdRef.current}`),
                apiClient.get<StateHistoryEntry[]>(histUrl),
            ]);
            setConfigs(cfgs);
            setHistory(hist);
            const defaults: Record<string, number> = {};
            cfgs.forEach(f => { defaults[f.id] = 5; });
            setFormValues(defaults);
        } catch (err) {
            console.error('[states] loadData error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [userId]);

    useEffect(() => {
        const defaults: Record<string, number> = {};
        configs.filter(f => f.stateType === activeType).forEach(f => { defaults[f.id] = 5; });
        setFormValues(defaults);
    }, [activeType]);

    const handleSubmit = async (e: { preventDefault(): void }) => {
        e.preventDefault();
        setSaving(true);
        const entries = activeFields.map(f => ({ fieldConfigId: f.id, value: formValues[f.id] ?? 5 }));
        const url = teacherMode ? `/user-states/submit-for/${userId}` : '/user-states/submit';
        const histUrl = teacherRef.current || readonlyRef.current
            ? `/user-states/user/${userIdRef.current}`
            : '/user-states/me';
        try {
            await apiClient.post(url, { entries });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            const hist = await apiClient.get<StateHistoryEntry[]>(histUrl);
            setHistory(hist);
        } catch (err) {
            console.error('[states] submit error:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            Chargement...
        </div>
    );

    const showForm = (!readonly || teacherMode) && !chartsOnly;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* ── Tabs ── */}
            <div className="states-tabs">
                {Object.values(StateType).map(t => (
                    <div key={t} style={{
                        display: 'flex', alignItems: 'center', borderRadius: '9px',
                        background: activeType === t ? 'var(--bg-card)' : 'transparent',
                        boxShadow: activeType === t ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                        transition: 'var(--transition)',
                    }}>
                        <button onClick={() => setActiveType(t)} className="states-tab-btn" style={{
                            paddingLeft: teacherMode ? '1.1rem' : undefined,
                            paddingRight: teacherMode ? '0.5rem' : undefined,
                            color: activeType === t ? 'var(--text)' : 'var(--text-muted)',
                            fontWeight: activeType === t ? 600 : 400,
                        }}>
                            {STATE_TYPE_LABELS[t]}
                        </button>
                        {teacherMode && (
                            <button
                                onClick={e => { e.stopPropagation(); setEditingType(t); }}
                                title="Modifier les indicateurs"
                                className="states-tab-edit-btn"
                                style={{ color: activeType === t ? 'var(--text-dim)' : 'transparent' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary-light)')}
                                onMouseLeave={e => (e.currentTarget.style.color = activeType === t ? 'var(--text-dim)' : 'transparent')}
                            >
                                <Pencil size={12} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {/* ── Form + Snapshot row ── */}
            {showForm && (
                <div className="states-row">
                    <form onSubmit={handleSubmit} className="states-form-col">
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                            {activeFields.map((field, i) => {
                                const v = formValues[field.id] ?? 5;
                                const color = valueColor(v);
                                const fillPct = ((v - 1) / 9) * 100;
                                return (
                                    <div key={field.id} className="states-field-row" style={{
                                        borderBottom: i < activeFields.length - 1 ? '1px solid rgba(51,65,85,0.35)' : 'none',
                                    }}>
                                        <div className="states-field-top">
                                            <span className="states-field-label">{field.label}</span>
                                            <span className="states-field-value" style={{ color }}>{v}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={1}
                                            max={10}
                                            step={1}
                                            value={v}
                                            onChange={e => setFormValues(prev => ({ ...prev, [field.id]: Number(e.target.value) }))}
                                            className="state-slider"
                                            aria-label={field.label}
                                            style={{ background: `linear-gradient(to right, ${color} ${fillPct}%, rgba(51,65,85,0.5) ${fillPct}%)` }}
                                        />
                                    </div>
                                );
                            })}
                            <div className="states-submit-row">
                                <button type="submit" disabled={saving || saved} className="states-submit-btn" style={{
                                    background: saved
                                        ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                                        : 'linear-gradient(135deg,var(--primary),var(--primary-dark))',
                                    cursor: saving || saved ? 'default' : 'pointer',
                                }}>
                                    {saved ? <><CheckCircle size={15} /> Enregistré</> : saving ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </div>
                    </form>

                    {hasHistory && (
                        <div className="states-snapshot-col">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: 0 }}>Dernier enregistrement</p>
                                {activeHistory[0] && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                        {format(new Date(activeHistory[0].recordedAt), 'dd MMM à HH:mm', { locale: fr })}
                                    </span>
                                )}
                            </div>
                            <div className="states-snapshot-grid">
                                {activeFields.map(field => {
                                    const v = latestValues[field.id];
                                    if (v === undefined) return null;
                                    const color = valueColor(v);
                                    return (
                                        <div key={field.id} className="states-snapshot-item" style={{ background: valueBg(v), border: `1px solid ${color}25` }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `conic-gradient(${color} ${(v / 10) * 360}deg, rgba(51,65,85,0.5) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', color }}>
                                                    {v}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{field.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Standalone snapshot (when form is hidden but history exists) ── */}
            {!showForm && hasHistory && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: 0 }}>Dernier enregistrement</p>
                        {activeHistory[0] && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                {format(new Date(activeHistory[0].recordedAt), 'dd MMM à HH:mm', { locale: fr })}
                            </span>
                        )}
                    </div>
                    <div className="states-snapshot-grid">
                        {activeFields.map(field => {
                            const v = latestValues[field.id];
                            if (v === undefined) return null;
                            const color = valueColor(v);
                            return (
                                <div key={field.id} className="states-snapshot-item" style={{ background: valueBg(v), border: `1px solid ${color}25` }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `conic-gradient(${color} ${(v / 10) * 360}deg, rgba(51,65,85,0.5) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem', color }}>
                                            {v}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{field.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── No data ── */}
            {!hasHistory && (
                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.4 }}>📊</div>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Aucune donnée enregistrée pour ce type.</p>
                </div>
            )}

            {/* ── Charts ── */}
            {hasHistory && !chartsOnly && chartData.length > 0 && (
                <div className={`states-charts-grid${activeFields.length >= 3 ? ' has-radar' : ''}`}>
                    {activeFields.length >= 3 && (
                        <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '1.25rem' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Profil actuel</p>
                            <ResponsiveContainer width="100%" height={220}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="var(--border)" />
                                    <PolarAngleAxis dataKey="field" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                    <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} strokeWidth={2} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '1.25rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>Évolution</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.5)" />
                                <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                                <YAxis domain={[1, 10]} stroke="var(--text-dim)" fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }} labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }} />
                                {activeFields.map((field, i) => (
                                    <Line key={field.id} type="monotone" dataKey={field.fieldKey} name={field.label}
                                        stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── History ── */}
            {hasHistory && !chartsOnly && chartData.length > 1 && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', margin: 0 }}>Historique</p>
                    </div>
                    <div className="states-history-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Date</th>
                                    {activeFields.map(f => (
                                        <th key={f.id} style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{f.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[...chartData].reverse().map((row, i) => (
                                    <tr key={i} style={{ borderBottom: i < chartData.length - 1 ? '1px solid rgba(51,65,85,0.4)' : 'none' }}>
                                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.date}</td>
                                        {activeFields.map(f => {
                                            const v = (row as any)[f.fieldKey];
                                            return (
                                                <td key={f.id} style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                    {v !== undefined ? (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: valueBg(v), color: valueColor(v), fontWeight: 700, fontSize: '0.78rem' }}>{v}</span>
                                                    ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Field editor modal ── */}
            {editingType && (
                <FieldEditorModal
                    athleteId={userId}
                    stateType={editingType}
                    onClose={() => setEditingType(null)}
                    onSaved={() => { setEditingType(null); loadData(); }}
                />
            )}
        </div>
    );
}
