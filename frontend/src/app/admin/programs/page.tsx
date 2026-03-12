'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, useMemo, FormEvent } from 'react';
import { Edit, Trash2, Share2, Plus, Users, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { Program, AudioTrack, UserProfile, ProgramShare } from '@/types';
import { AudioDominance, AudioPhasing } from '@/types';

interface AudioItemForm {
    audioId: string;
    order: number;
    requiredListens: number;
}

export default function AdminProgramsPage() {
    const { data: session } = useSession();
    const currentUser = session?.user as any;
    const [programs, setPrograms] = useState<Program[]>([]);
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [shares, setShares] = useState<Record<string, ProgramShare[]>>({});
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [sharingProgram, setSharingProgram] = useState<Program | null>(null);

    const initialForm = { name: '', description: '', recurrenceDays: null as number | null, audioItems: [] as AudioItemForm[] };
    const [form, setForm] = useState(initialForm);
    const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
    const [recurrenceValue, setRecurrenceValue] = useState(1);
    const [recurrenceUnit, setRecurrenceUnit] = useState<'days' | 'weeks' | 'months'>('weeks');

    const unitMultiplier = { days: 1, weeks: 7, months: 30 };
    const computedRecurrenceDays = recurrenceEnabled ? recurrenceValue * unitMultiplier[recurrenceUnit] : null;
    const [shareUserId, setShareUserId] = useState('');

    // Audio picker filters
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerType, setPickerType] = useState('');
    const [pickerDominance, setPickerDominance] = useState('');
    const [pickerPhasing, setPickerPhasing] = useState('');
    const [pickerSort, setPickerSort] = useState<'title-asc' | 'title-desc' | 'dur-asc' | 'dur-desc'>('title-asc');

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        fetchData();
    }, [session]);

    const fetchData = async () => {
        try {
            const [p, a, u] = await Promise.all([
                apiClient.get<Program[]>('/programs'),
                apiClient.get<AudioTrack[]>('/audios'),
                apiClient.get<UserProfile[]>('/users'),
            ]);
            setPrograms(p);
            setAudios(a);
            setUsers(u);

            const sharesResults = await Promise.all(
                p.map(prog => apiClient.get<ProgramShare[]>(`/programs/${prog.id}/share`))
            );
            const sharesMap: Record<string, ProgramShare[]> = {};
            p.forEach((prog, idx) => { sharesMap[prog.id] = sharesResults[idx]; });
            setShares(sharesMap);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const resetPicker = () => { setPickerSearch(''); setPickerType(''); setPickerDominance(''); setPickerPhasing(''); setPickerSort('title-asc'); };

    const openCreate = () => {
        setEditingProgram(null);
        setForm(initialForm);
        setRecurrenceEnabled(false);
        setRecurrenceValue(1);
        setRecurrenceUnit('weeks');
        resetPicker();
        setShowModal(true);
    };

    const openEdit = (program: Program) => {
        setEditingProgram(program);
        resetPicker();
        const days = program.recurrenceDays ?? null;
        if (days) {
            setRecurrenceEnabled(true);
            if (days % 30 === 0) { setRecurrenceValue(days / 30); setRecurrenceUnit('months'); }
            else if (days % 7 === 0) { setRecurrenceValue(days / 7); setRecurrenceUnit('weeks'); }
            else { setRecurrenceValue(days); setRecurrenceUnit('days'); }
        } else {
            setRecurrenceEnabled(false);
            setRecurrenceValue(1);
            setRecurrenceUnit('weeks');
        }
        setForm({
            name: program.name,
            description: program.description || '',
            recurrenceDays: days,
            audioItems: (program.audios || []).map(a => ({
                audioId: a.id,
                order: a.order,
                requiredListens: a.requiredListens,
            })),
        });
        setShowModal(true);
    };

    const openShare = (program: Program) => {
        setSharingProgram(program);
        setShowShareModal(true);
    };

    // Audio items management
    const addAudio = (audioId: string) => {
        if (form.audioItems.find(i => i.audioId === audioId)) return;
        setForm({
            ...form,
            audioItems: [...form.audioItems, { audioId, order: form.audioItems.length, requiredListens: 1 }],
        });
    };

    const removeAudio = (audioId: string) => {
        const filtered = form.audioItems.filter(i => i.audioId !== audioId);
        setForm({ ...form, audioItems: filtered.map((item, i) => ({ ...item, order: i })) });
    };

    const moveAudio = (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= form.audioItems.length) return;
        const items = [...form.audioItems];
        [items[index], items[newIndex]] = [items[newIndex], items[index]];
        setForm({ ...form, audioItems: items.map((item, i) => ({ ...item, order: i })) });
    };

    const updateRequiredListens = (audioId: string, value: number) => {
        setForm({
            ...form,
            audioItems: form.audioItems.map(i =>
                i.audioId === audioId ? { ...i, requiredListens: Math.max(1, value) } : i
            ),
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const payload = { ...form, recurrenceDays: computedRecurrenceDays };
        try {
            if (editingProgram) {
                await apiClient.put(`/programs/${editingProgram.id}`, payload);
            } else {
                await apiClient.post('/programs', payload);
            }
            await fetchData();
            setShowModal(false);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce programme ?')) return;
        try {
            await apiClient.delete(`/programs/${id}`);
            await fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleShare = async (e: FormEvent) => {
        e.preventDefault();
        if (!sharingProgram || !shareUserId) return;
        try {
            await apiClient.post(`/programs/${sharingProgram.id}/share`, { userId: shareUserId });
            await fetchData();
            setShareUserId('');
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleRemoveShare = async (programId: string, userId: string) => {
        try {
            await apiClient.delete(`/programs/${programId}/share/${userId}`);
            await fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const getAudioTitle = (audioId: string) => audios.find(a => a.id === audioId)?.title || 'Audio inconnu';
    const getAudioDuration = (audioId: string) => {
        const a = audios.find(a => a.id === audioId);
        if (!a) return '—';
        const h = Math.floor(a.duration / 3600);
        const m = Math.floor((a.duration % 3600) / 60);
        const s = a.duration % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const availableAudios = useMemo(() => {
        let list = audios.filter(a => !form.audioItems.find(i => i.audioId === a.id));
        if (pickerSearch) list = list.filter(a => a.title.toLowerCase().includes(pickerSearch.toLowerCase()));
        if (pickerType) list = list.filter(a => a.type === pickerType);
        if (pickerDominance) list = list.filter(a => a.dominance === pickerDominance);
        if (pickerPhasing) list = list.filter(a => Array.isArray(a.phasing) && (a.phasing as string[]).includes(pickerPhasing));
        list.sort((a, b) => {
            if (pickerSort === 'title-asc') return a.title.localeCompare(b.title);
            if (pickerSort === 'title-desc') return b.title.localeCompare(a.title);
            if (pickerSort === 'dur-asc') return a.duration - b.duration;
            return b.duration - a.duration;
        });
        return list;
    }, [audios, form.audioItems, pickerSearch, pickerType, pickerDominance, pickerPhasing, pickerSort]);

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Programmes</h1>
                <button className="btn-primary" onClick={openCreate}>
                    <Plus size={18} style={{ marginRight: 8 }} />
                    Créer un programme
                </button>
            </div>

            {/* CREATE / EDIT MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h2>{editingProgram ? 'Modifier le programme' : 'Nouveau Programme'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label>Nom</label>
                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Nom du programme" />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détails du programme..." />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={recurrenceEnabled}
                                        onChange={e => setRecurrenceEnabled(e.target.checked)}
                                        style={{ width: 'auto', cursor: 'pointer' }}
                                    />
                                    Programme récurrent
                                </label>
                                {recurrenceEnabled && (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tous les</span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={recurrenceValue}
                                            onChange={e => setRecurrenceValue(Math.max(1, Number(e.target.value)))}
                                            style={{ width: '70px' }}
                                        />
                                        <select
                                            value={recurrenceUnit}
                                            onChange={e => setRecurrenceUnit(e.target.value as 'days' | 'weeks' | 'months')}
                                            style={{ flex: 1 }}
                                        >
                                            <option value="days">jour(s)</option>
                                            <option value="weeks">semaine(s)</option>
                                            <option value="months">mois</option>
                                        </select>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            = {computedRecurrenceDays}j
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Audio picker */}
                            <div className="form-group">
                                <label>Ajouter un audio</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                    <input
                                        placeholder="Rechercher..."
                                        value={pickerSearch}
                                        onChange={e => setPickerSearch(e.target.value)}
                                        style={{ flex: '1 1 120px', minWidth: '100px', fontSize: '0.82rem' }}
                                    />
                                    <select value={pickerType} onChange={e => setPickerType(e.target.value)} style={{ fontSize: '0.82rem', flex: '0 0 auto' }}>
                                        <option value="">Catégorie</option>
                                        <option value="Performance">Performance</option>
                                        <option value="Sommeil">Sommeil</option>
                                        <option value="Activation">Activation</option>
                                        <option value="Compétition">Compétition</option>
                                        <option value="Concentration">Concentration</option>
                                        <option value="Récupération">Récupération</option>
                                        <option value="Confiance">Confiance</option>
                                        <option value="Gestion du stress">Gestion du stress</option>
                                        <option value="Blessure">Blessure</option>
                                        <option value="Motivation">Motivation</option>
                                    </select>
                                    <select value={pickerDominance} onChange={e => setPickerDominance(e.target.value)} style={{ fontSize: '0.82rem', flex: '0 0 auto' }}>
                                        <option value="">Dominance</option>
                                        <option value={AudioDominance.MIND}>Pensée</option>
                                        <option value={AudioDominance.BODY}>Corps</option>
                                        <option value={AudioDominance.EMOTION}>Émotion</option>
                                    </select>
                                    <select value={pickerPhasing} onChange={e => setPickerPhasing(e.target.value)} style={{ fontSize: '0.82rem', flex: '0 0 auto' }}>
                                        <option value="">Phasing</option>
                                        <option value={AudioPhasing.PRE_COMPETITION}>Pré-compétition</option>
                                        <option value={AudioPhasing.DURING_COMPETITION}>Pendant</option>
                                        <option value={AudioPhasing.POST_COMPETITION}>Post</option>
                                    </select>
                                    <select value={pickerSort} onChange={e => setPickerSort(e.target.value as any)} style={{ fontSize: '0.82rem', flex: '0 0 auto' }}>
                                        <option value="title-asc">A→Z</option>
                                        <option value="title-desc">Z→A</option>
                                        <option value="dur-asc">Durée ↑</option>
                                        <option value="dur-desc">Durée ↓</option>
                                    </select>
                                </div>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
                                    {availableAudios.length === 0 ? (
                                        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aucun audio disponible</div>
                                    ) : (
                                        availableAudios.map(a => (
                                            <div key={a.id} onClick={() => addAudio(a.id)} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                padding: '0.5rem 0.75rem', cursor: 'pointer',
                                                borderBottom: '1px solid rgba(51,65,85,0.3)',
                                                transition: 'var(--transition)',
                                            }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.07)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <Plus size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                        {getAudioDuration(a.id)}
                                                        {a.type && ` · ${a.type}`}
                                                        {a.dominance && ` · ${{ MIND: 'Pensée', BODY: 'Corps', EMOTION: 'Émotion' }[a.dominance] ?? a.dominance}`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Ordered audio list */}
                            {form.audioItems.length > 0 && (
                                <div className="form-group">
                                    <label>Audios du programme (dans l'ordre)</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {form.audioItems.map((item, idx) => (
                                            <div key={item.audioId} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                padding: '0.6rem 0.75rem', background: 'var(--bg-input)',
                                                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                                            }}>
                                                {/* Order controls */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <button type="button" onClick={() => moveAudio(idx, -1)} disabled={idx === 0}
                                                        style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1, padding: 0 }}>
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button type="button" onClick={() => moveAudio(idx, 1)} disabled={idx === form.audioItems.length - 1}
                                                        style={{ background: 'none', border: 'none', cursor: idx === form.audioItems.length - 1 ? 'default' : 'pointer', opacity: idx === form.audioItems.length - 1 ? 0.3 : 1, padding: 0 }}>
                                                        <ChevronDown size={14} />
                                                    </button>
                                                </div>

                                                {/* Order number */}
                                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', minWidth: '1.5rem', textAlign: 'center' }}>
                                                    {idx + 1}
                                                </span>

                                                {/* Title */}
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <div style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {getAudioTitle(item.audioId)}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {getAudioDuration(item.audioId)} min
                                                    </div>
                                                </div>

                                                {/* Required listens */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Écoutes :</label>
                                                    <input
                                                        type="number" min={1} max={99}
                                                        value={item.requiredListens}
                                                        onChange={(e) => updateRequiredListens(item.audioId, parseInt(e.target.value) || 1)}
                                                        style={{ width: '55px', textAlign: 'center', padding: '0.25rem' }}
                                                    />
                                                </div>

                                                {/* Remove */}
                                                <button type="button" onClick={() => removeAudio(item.audioId)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.25rem' }}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                                <button type="submit" className="btn-primary">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SHARE MODAL */}
            {showShareModal && sharingProgram && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '450px' }}>
                        <h2>Partager : {sharingProgram.name}</h2>

                        <form onSubmit={handleShare} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label>Attribuer à l'utilisateur</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <select value={shareUserId} onChange={(e) => setShareUserId(e.target.value)} required style={{ flex: 1 }}>
                                        <option value="">Sélectionner un utilisateur...</option>
                                        {users
                                            .filter(u => {
                                                if (currentUser.role === 'ADMIN') return u.role === 'TEACHER';
                                                if (currentUser.role === 'TEACHER') return u.role === 'ATHLETE' && u.createdById === currentUser.id;
                                                return false;
                                            })
                                            .map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
                                    </select>
                                    <button type="submit" className="btn-primary">Ajouter</button>
                                </div>
                            </div>
                        </form>

                        <div>
                            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Accès actuels</h3>
                            {shares[sharingProgram.id]?.length ? (
                                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {shares[sharingProgram.id].map(share => (
                                        <li key={share.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                            <div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{share.user?.firstName} {share.user?.lastName}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{share.user?.role}</div>
                                            </div>
                                            <button onClick={() => handleRemoveShare(sharingProgram.id, share.userId)} className="btn-danger" style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                                                Retirer
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="empty-state" style={{ padding: '1.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)' }}>
                                    Aucun partage actif pour ce programme.
                                </div>
                            )}
                        </div>

                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setShowShareModal(false)}>Fermer</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nom du programme</th>
                            <th>Description</th>
                            <th>Auteur</th>
                            <th>Audios</th>
                            <th>Partages</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {programs.map(prog => (
                            <tr key={prog.id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {prog.name}
                                        {currentUser?.role === 'TEACHER' && prog.createdById !== currentUser?.id && (
                                            <span style={{
                                                padding: '0.15rem 0.5rem', borderRadius: '20px', fontSize: '0.65rem',
                                                fontWeight: 600, textTransform: 'uppercase',
                                                background: 'rgba(108, 99, 255, 0.15)', color: 'var(--primary-light)'
                                            }}>
                                                Hérité
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>{prog.description || '—'}</td>
                                <td>{prog.createdBy?.firstName} {prog.createdBy?.lastName}</td>
                                <td>{prog.audios?.length || 0}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Users size={16} />
                                        {shares[prog.id]?.length || 0}
                                    </div>
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button className="btn-secondary" onClick={() => openShare(prog)} title="Partager / Assigner">
                                            <Share2 size={18} />
                                        </button>
                                        {(currentUser?.role === 'ADMIN' || prog.createdById === currentUser?.id) && (
                                            <>
                                                <button className="btn-secondary" onClick={() => openEdit(prog)} title="Modifier">
                                                    <Edit size={18} />
                                                </button>
                                                <button className="btn-secondary text-danger" onClick={() => handleDelete(prog.id)} title="Supprimer">
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {programs.length === 0 && <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Aucun programme. Commencez par en créer un !</div>}
            </div>
        </div>
    );
}
