'use client';

import { useEffect, useState, FormEvent } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import apiClient from '@/lib/api-client';
import {
    StateType,
    STATE_TYPE_LABELS,
    STATE_FIELD_LABELS,
    UserStateEntry,
} from '@/types';

const CHART_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

interface Props {
    userId: string;
    readonly?: boolean;
    chartsOnly?: boolean;
    teacherMode?: boolean;
}

export default function UserStatesPanel({ userId, readonly, chartsOnly, teacherMode }: Props) {
    const [activeType, setActiveType] = useState<StateType>(StateType.EN_COMPETITION);
    const [entries, setEntries] = useState<UserStateEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<Record<string, number>>({});

    const fieldLabels = STATE_FIELD_LABELS[activeType];
    const fieldKeys = Object.keys(fieldLabels);

    const resetForm = () => {
        const defaults: Record<string, number> = {};
        fieldKeys.forEach((k) => (defaults[k] = 5));
        setFormData(defaults);
    };

    const fetchEntries = async () => {
        setLoading(true);
        try {
            const url = (readonly || teacherMode) && !chartsOnly
                ? `/user-states/user/${userId}?type=${activeType}`
                : `/user-states/me?type=${activeType}`;
            const data = await apiClient.get<UserStateEntry[]>(url);
            setEntries(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        resetForm();
        fetchEntries();
    }, [activeType, userId]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = teacherMode
                ? `/user-states/for/${userId}`
                : '/user-states';
            await apiClient.post(url, { type: activeType, data: formData });
            await fetchEntries();
            resetForm();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const chartData = [...entries]
        .reverse()
        .map((entry) => ({
            date: format(new Date(entry.createdAt), 'dd/MM', { locale: fr }),
            ...entry.data,
        }));

    return (
        <div>
            {/* Sub-tabs */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '0.75rem',
            }}>
                {Object.values(StateType).map((t) => (
                    <button
                        key={t}
                        onClick={() => setActiveType(t)}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            border: activeType === t ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: activeType === t ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                            color: activeType === t ? 'var(--primary)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontWeight: activeType === t ? 600 : 400,
                            fontSize: '0.85rem',
                            transition: 'var(--transition)',
                        }}
                    >
                        {STATE_TYPE_LABELS[t]}
                    </button>
                ))}
            </div>

            {/* Form (hidden in readonly or chartsOnly mode) */}
            {(!readonly || teacherMode) && !chartsOnly && (
                <form onSubmit={handleSubmit} className="upload-form" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Nouvel enregistrement</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {fieldKeys.map((key) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <label style={{
                                    minWidth: '180px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text)',
                                }}>
                                    {fieldLabels[key]}
                                </label>
                                <input
                                    type="range"
                                    min={1}
                                    max={10}
                                    value={formData[key] ?? 5}
                                    onChange={(e) =>
                                        setFormData({ ...formData, [key]: parseInt(e.target.value) })
                                    }
                                    style={{ flex: 1, accentColor: 'var(--primary)' }}
                                />
                                <span style={{
                                    minWidth: '28px',
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    color: 'var(--primary)',
                                    fontSize: '0.95rem',
                                }}>
                                    {formData[key] ?? 5}
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
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                    Chargement...
                </p>
            ) : entries.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                    Aucune donnée enregistrée pour ce questionnaire.
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
                                    contentStyle={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text)',
                                        fontSize: '0.8rem',
                                    }}
                                    formatter={(value: number | undefined, name: string | undefined) => [
                                        value ?? 0,
                                        fieldLabels[name ?? ''] || (name ?? ''),
                                    ]}
                                />
                                <Legend
                                    formatter={(value: string) => fieldLabels[value] || value}
                                    wrapperStyle={{ fontSize: '0.8rem' }}
                                />
                                {fieldKeys.map((key, i) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* History table */}
                    {!chartsOnly && <div className="table-container">
                        <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Historique</h3>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    {fieldKeys.map((key) => (
                                        <th key={key}>{fieldLabels[key]}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>
                                            {format(new Date(entry.createdAt), 'dd MMM yyyy HH:mm', {
                                                locale: fr,
                                            })}
                                        </td>
                                        {fieldKeys.map((key) => (
                                            <td key={key} style={{ textAlign: 'center' }}>
                                                {entry.data[key] ?? '—'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>}
                </>
            )}
        </div>
    );
}
