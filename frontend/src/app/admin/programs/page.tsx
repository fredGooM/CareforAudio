'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, FormEvent } from 'react';
import { Edit, Trash2, Share2, Plus, Users, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { Program, AudioTrack, UserProfile, ProgramShare } from '@/types';

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

    const initialForm = { name: '', description: '', audioItems: [] as AudioItemForm[] };
    const [form, setForm] = useState(initialForm);
    const [shareUserId, setShareUserId] = useState('');

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

    const openCreate = () => {
        setEditingProgram(null);
        setForm(initialForm);
        setShowModal(true);
    };

    const openEdit = (program: Program) => {
        setEditingProgram(program);
        setForm({
            name: program.name,
            description: program.description || '',
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
        try {
            if (editingProgram) {
                await apiClient.put(`/programs/${editingProgram.id}`, form);
            } else {
                await apiClient.post('/programs', form);
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
        return a ? Math.round(a.duration / 60) : 0;
    };
    const availableAudios = audios.filter(a => !form.audioItems.find(i => i.audioId === a.id));

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
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
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

                            {/* Audio selection */}
                            <div className="form-group">
                                <label>Ajouter un audio</label>
                                <select
                                    value=""
                                    onChange={(e) => { if (e.target.value) addAudio(e.target.value); }}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Sélectionner un audio à ajouter...</option>
                                    {availableAudios.map(a => (
                                        <option key={a.id} value={a.id}>{a.title} ({Math.round(a.duration / 60)} min)</option>
                                    ))}
                                </select>
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
                <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
                    <div className="modal-content" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
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
                            <th>Complétion</th>
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
                                        <div style={{
                                            width: '60px', height: '6px', borderRadius: '3px',
                                            background: 'var(--border)', overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                width: `${prog.completionPercent || 0}%`, height: '100%',
                                                borderRadius: '3px',
                                                background: (prog.completionPercent || 0) === 100 ? 'var(--success)' : 'var(--primary)',
                                            }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{prog.completionPercent || 0}%</span>
                                    </div>
                                </td>
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
