'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect, FormEvent } from 'react';
import { Edit, Trash2, Share2, Plus, Users } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { Program, AudioTrack, UserProfile, ProgramShare } from '@/types';

export default function AdminProgramsPage() {
    const { data: session } = useSession();
    const currentUser = session?.user as any;
    const [programs, setPrograms] = useState<Program[]>([]);
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    
    // share state
    const [shares, setShares] = useState<Record<string, ProgramShare[]>>({});
    
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [sharingProgram, setSharingProgram] = useState<Program | null>(null);

    const initialForm = {
        name: '',
        description: '',
        audioIds: [] as string[],
    };
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
                apiClient.get<UserProfile[]>('/users')
            ]);
            setPrograms(p);
            setAudios(a);
            setUsers(u);
            
            // fetch shares for all programs
            const sharesPromises = p.map(prog => apiClient.get<ProgramShare[]>(`/programs/${prog.id}/share`));
            const sharesResults = await Promise.all(sharesPromises);
            const sharesMap: Record<string, ProgramShare[]> = {};
            p.forEach((prog, idx) => {
                sharesMap[prog.id] = sharesResults[idx];
            });
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
            audioIds: program.audios?.map(a => a.id) || [],
        });
        setShowModal(true);
    };

    const openShare = (program: Program) => {
        setSharingProgram(program);
        setShowShareModal(true);
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
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
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
                                <label>Audios inclus</label>
                                <div className="checkbox-group" style={{ maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                                    {audios.map(audio => (
                                        <label key={audio.id} className="checkbox-label" style={{ width: '100%', padding: '0.25rem 0' }}>
                                            <input 
                                                type="checkbox"
                                                checked={form.audioIds.includes(audio.id)}
                                                onChange={(e) => {
                                                    const ids = e.target.checked 
                                                        ? [...form.audioIds, audio.id]
                                                        : form.audioIds.filter(id => id !== audio.id);
                                                    setForm({ ...form, audioIds: ids });
                                                }}
                                            />
                                            {audio.title} <span className="text-muted">({Math.round(audio.duration / 60)} min)</span>
                                        </label>
                                    ))}
                                    {audios.length === 0 && <span className="text-muted" style={{ padding: '0.5rem' }}>Aucun audio disponible</span>}
                                </div>
                            </div>
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
                                        {users.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.role})</option>)}
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
                                <td>{prog.name}</td>
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
                                        {(currentUser.role === 'ADMIN' || prog.createdById === currentUser.id) && (
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
