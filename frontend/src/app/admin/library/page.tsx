"use client";

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, FormEvent } from 'react';
import { Check, X, Play, Edit, Trash2, Mic, Square } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { AudioTrack, Category, Group } from '@/types';
import AudioPlayer from '@/components/AudioPlayer';

export default function AdminLibraryPage() {
    const { data: session } = useSession();
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingAudio, setEditingAudio] = useState<AudioTrack | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Recording states
    const [uploadMode, setUploadMode] = useState<'FILE' | 'RECORD'>('FILE');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Initial form state
    const initialForm = {
        title: '',
        description: '',
        categoryId: '',
        published: 'true',
        type: 'Training',
        orderToListen: '1',
        allowedGroupIds: [] as string[],
    };
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        Promise.all([
            apiClient.get<AudioTrack[]>('/audios'),
            apiClient.get<Category[]>('/categories'),
            apiClient.get<Group[]>('/groups'),
        ]).then(([a, c, g]) => {
            setAudios(a);
            setCategories(c);
            setGroups(g);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

    // Open modal for Create
    const openCreate = () => {
        setEditingAudio(null);
        setForm(initialForm);
        setShowModal(true);
    };

    // Open modal for Edit
    const openEdit = (audio: AudioTrack) => {
        setEditingAudio(audio);
        setForm({
            title: audio.title,
            description: audio.description || '',
            categoryId: audio.categoryId,
            published: String(audio.published),
            type: audio.type,
            orderToListen: String(audio.orderToListen || 1),
            allowedGroupIds: audio.allowedGroupIds || [],
        });
        setShowModal(true);
    };

    /* ── Recording Handlers ── */
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            recordingChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordingChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                const blob = new Blob(recordingChunksRef.current, { type: mimeType });
                setRecordedBlob(blob);
                setRecordedUrl(URL.createObjectURL(blob));
                // Stop microphone
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            setRecordedBlob(null);
            setRecordedUrl(null);
            recordingTimerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err: any) {
            alert('Erreur accès micro : ' + err.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        try {
            if (editingAudio) {
                // UPDATE
                await apiClient.put(`/audios/${editingAudio.id}`, {
                    title: form.title,
                    description: form.description,
                    categoryId: form.categoryId,
                    published: form.published === 'true',
                    type: form.type,
                    orderToListen: parseInt(form.orderToListen),
                    allowedGroupIds: form.allowedGroupIds,
                });

                // Update local list
                setAudios(audios.map(a => a.id === editingAudio.id ? {
                    ...a,
                    ...form,
                    published: form.published === 'true',
                    orderToListen: parseInt(form.orderToListen)
                } : a));
            } else {
                // CREATE
                const formData = new FormData();
                formData.append('title', form.title);
                formData.append('description', form.description);
                formData.append('categoryId', form.categoryId || categories[0]?.id || '');
                formData.append('published', form.published);
                formData.append('type', form.type);
                formData.append('orderToListen', form.orderToListen);
                formData.append('allowedGroupIds', JSON.stringify(form.allowedGroupIds));

                if (uploadMode === 'FILE') {
                    const file = fileRef.current?.files?.[0];
                    if (!file) return alert('Veuillez sélectionner un fichier audio');
                    formData.append('file', file);
                } else {
                    if (!recordedBlob) return alert('Veuillez enregistrer un audio');
                    const ext = recordedBlob.type.includes('mp4') || recordedBlob.type.includes('m4a') ? 'm4a' : 'webm';
                    const file = new File([recordedBlob], `recording.${ext}`, { type: recordedBlob.type });
                    formData.append('file', file);
                }

                const newAudio = await apiClient.post<AudioTrack>('/audios', formData);
                setAudios([newAudio, ...audios]);
            }
            setShowModal(false);
            setRecordedBlob(null);
            setRecordedUrl(null);
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cet audio ?')) return;
        await apiClient.delete(`/audios/${id}`);
        setAudios(audios.filter((a) => a.id !== id));
    };

    const handlePlay = (audio: AudioTrack) => {
        setCurrentTrack(audio);
    };

    if (loading) return <Loader />;

    return (
        <div className="page-content" style={{ paddingBottom: currentTrack ? '100px' : '20px' }}>
            <div className="page-header">
                <h1>Bibliothèque Audio</h1>
                <button className="btn-primary" onClick={openCreate}>
                    + Ajouter un audio
                </button>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{editingAudio ? 'Modifier Audio' : 'Ajouter Audio'}</h2>
                        <form onSubmit={handleSubmit} className="upload-form">
                            {!editingAudio && (
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label>Méthode d'ajout</label>
                                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="uploadMode"
                                                checked={uploadMode === 'FILE'}
                                                onChange={() => setUploadMode('FILE')}
                                            />
                                            Fichier classique
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="uploadMode"
                                                checked={uploadMode === 'RECORD'}
                                                onChange={() => setUploadMode('RECORD')}
                                            />
                                            Enregistrer (Micro)
                                        </label>
                                    </div>

                                    {uploadMode === 'FILE' && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <input ref={fileRef} type="file" accept=".mp3,.wav,.aiff" required={uploadMode === 'FILE'} />
                                        </div>
                                    )}

                                    {uploadMode === 'RECORD' && (
                                        <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <strong>Enregistrement local</strong>
                                                {isRecording && <span className="text-danger font-mono font-bold animate-pulse">{formatTime(recordingTime)}</span>}
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                {!isRecording ? (
                                                    <button type="button" className="btn-primary" onClick={startRecording} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Mic size={18} />
                                                        Démarrer
                                                    </button>
                                                ) : (
                                                    <button type="button" className="btn-danger" onClick={stopRecording} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Square size={18} />
                                                        Arrêter [{formatTime(recordingTime)}]
                                                    </button>
                                                )}
                                                {recordedUrl && !isRecording && (
                                                    <audio src={recordedUrl} controls style={{ height: '38px', outline: 'none' }} />
                                                )}
                                            </div>
                                            {!recordedBlob && !isRecording && (
                                                <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Aucun enregistrement en cours.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Titre</label>
                                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Catégorie</label>
                                    <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                                        <option value="">Choisir...</option>
                                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Type</label>
                                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                        <option value="Training">Training</option>
                                        <option value="Recovery">Recovery</option>
                                        <option value="Performance">Performance</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Publié</label>
                                    <select value={form.published} onChange={(e) => setForm({ ...form, published: e.target.value })}>
                                        <option value="true">Oui</option>
                                        <option value="false">Non</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Groupes autorisés</label>
                                <div className="checkbox-group">
                                    {groups.map((g) => (
                                        <label key={g.id} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={form.allowedGroupIds.includes(g.id)}
                                                onChange={(e) => {
                                                    const ids = e.target.checked
                                                        ? [...form.allowedGroupIds, g.id]
                                                        : form.allowedGroupIds.filter((id) => id !== g.id);
                                                    setForm({ ...form, allowedGroupIds: ids });
                                                }}
                                            />
                                            {g.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                                <button type="submit" className="btn-primary">
                                    {editingAudio ? 'Enregistrer' : 'Uploader'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Titre</th>
                            <th>Durée</th>
                            <th>Type</th>
                            <th>Publié</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {audios.map((audio) => (
                            <tr key={audio.id}>
                                <td>{audio.title}</td>
                                <td>{Math.round(audio.duration / 60)} min</td>
                                <td>{audio.type}</td>
                                <td>
                                    {audio.published ? (
                                        <Check className="text-success" size={20} />
                                    ) : (
                                        <X className="text-muted" size={20} />
                                    )}
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button className="btn-secondary" onClick={() => handlePlay(audio)} title="Écouter">
                                            <Play size={18} />
                                        </button>
                                        <button className="btn-secondary" onClick={() => openEdit(audio)} title="Modifier">
                                            <Edit size={18} />
                                        </button>
                                        <button className="btn-secondary text-danger" onClick={() => handleDelete(audio.id)} title="Supprimer">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {currentTrack && (
                <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
                    <AudioPlayer
                        src={currentTrack.url}
                        title={currentTrack.title}
                        coverUrl={currentTrack.coverUrl}
                    />
                </div>
            )}
        </div>
    );
}
