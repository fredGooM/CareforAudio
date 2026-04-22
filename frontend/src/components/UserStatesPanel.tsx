'use client';

import { useEffect, useRef, useState, FormEvent } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import apiClient from '@/lib/api-client';
import { StateType, STATE_TYPE_LABELS, StateFieldConfig, StateHistoryEntry } from '@/types';

const CHART_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

interface Props {
    userId: string;
    readonly?: boolean;
    chartsOnly?: boolean;
    teacherMode?: boolean;
}

/** Group history entries into submission sessions (entries saved within the same minute) */
function groupIntoSessions(entries: StateHistoryEntry[]): { date: string; values: Record<string, number> }[] {
    const groups = new Map<string, Record<string, number>>();
    for (const e of entries) {
        const key = format(new Date(e.recordedAt), 'dd/MM HH:mm', { locale: fr });
        if (!groups.has(key)) groups.set(key, {});
        groups.get(key)![e.fieldConfig.fieldKey] = e.value;
    }
    return Array.from(groups.entries())
        .map(([date, values]) => ({ date, ...values }))
        .reverse();
}

export default function UserStatesPanel({ userId, readonly, chartsOnly, teacherMode }: Props) {
    const [activeType, setActiveType] = useState<StateType>(StateType.EN_COMPETITION);
    const [configs, setConfigs] = useState<StateFieldConfig[]>([]);
    const [history, setHistory] = useState<StateHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formValues, setFormValues] = useState<Record<string, number>>({});

    const activeFields = configs
        .filter(c => c.stateType === activeType)
        .sort((a, b) => a.position - b.position);

    const activeHistory = history.filter(h => h.fieldConfig?.stateType === activeType);

    // Use a ref so loadData doesn't change identity on every render
    const userIdRef = useRef(userId);
    const teacherRef = useRef(teacherMode);
    const readonlyRef = useRef(readonly);
    userIdRef.current = userId;
    teacherRef.current = teacherMode;
    readonlyRef.current = readonly;

    const loadData = async () => {
        setLoading(true);
        const histUrl = teacherRef.current || readonlyRef.current
            ? `/user-states/user/${userIdRef.current}`
            : '/user-states/me';
        console.log('[states] loadData — userId:', userIdRef.current, 'histUrl:', histUrl);
        try {
            const [cfgs, hist] = await Promise.all([
                apiClient.get<StateFieldConfig[]>(`/user-states/configs/${userIdRef.current}`),
                apiClient.get<StateHistoryEntry[]>(histUrl),
            ]);
            console.log('[states] configs:', cfgs);
            console.log('[states] history:', hist);
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

    // Reset form values when switching tabs
    useEffect(() => {
        const defaults: Record<string, number> = {};
        configs.filter(f => f.stateType === activeType).forEach(f => { defaults[f.id] = 5; });
        setFormValues(defaults);
    }, [activeType]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const entries = activeFields.map(f => ({ fieldConfigId: f.id, value: formValues[f.id] ?? 5 }));
        const url = teacherMode ? `/user-states/submit-for/${userId}` : '/user-states/submit';
        console.log('[states] submit — url:', url, 'entries:', entries);
        try {
            const result = await apiClient.post(url, { entries });
            console.log('[states] submit result:', result);
            await loadData();
        } catch (err) {
            console.error('[states] submit error:', err);
        } finally {
            setSaving(false);
        }
    };

    const chartData = groupIntoSessions(activeHistory);

    return (
        <div>
            {/* Type tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                {Object.values(StateType).map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveType(t)}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                            border: activeType === t ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: activeType === t ? 'rgba(239,68,68,0.1)' : 'transparent',
                            color: activeType === t ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: 'pointer', fontWeight: activeType === t ? 600 : 400,
                            fontSize: '0.85rem', transition: 'var(--transition)',
                        }}
                    >
                        {STATE_TYPE_LABELS[t]}
                    </button>
                ))}
            </div>

            {/* Form — visible pour l'athlète et pour le teacher en teacherMode */}
            {(!readonly || teacherMode) && !chartsOnly && (
                <form onSubmit={handleSubmit} className="upload-form" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Nouvel enregistrement</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {activeFields.map(field => (
                            <div key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <label style={{ minWidth: '180px', fontSize: '0.85rem', color: 'var(--text)' }}>
                                    {field.label}
                                </label>
                                <input
                                    type="range" min={1} max={10}
                                    value={formValues[field.id] ?? 5}
                                    onChange={e => setFormValues(v => ({ ...v, [field.id]: parseInt(e.target.value) }))}
                                    style={{ flex: 1, accentColor: 'var(--primary)' }}
                                />
                                <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: 600, color: 'var(--primary)', fontSize: '0.95rem' }}>
                                    {formValues[field.id] ?? 5}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="form-actions" style={{ marginTop: '1rem' }}>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                    </div>
                </form>
            )}

            {loading ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Chargement...</p>
            ) : activeHistory.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                    Aucune donnée enregistrée pour ce type.
                </p>
            ) : (
                <>
                    {/* Chart */}
                    <div className="upload-form" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Évolution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                                <YAxis domain={[1, 10]} stroke="var(--text-muted)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.8rem' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                                {activeFields.map((field, i) => (
                                    <Line
                                        key={field.id} type="monotone" dataKey={field.fieldKey}
                                        name={field.label}
                                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                        strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* History table */}
                    {!chartsOnly && (
                        <div className="table-container">
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Historique</h3>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        {activeFields.map(f => <th key={f.id}>{f.label}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {chartData.map((row, i) => (
                                        <tr key={i}>
                                            <td>{row.date}</td>
                                            {activeFields.map(f => (
                                                <td key={f.id} style={{ textAlign: 'center' }}>
                                                    {(row as any)[f.fieldKey] ?? '—'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
