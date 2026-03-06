"use client";

import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { Check, X, Play, Edit, Trash2, Mic, Square, Search, RotateCcw } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { AudioTrack, UserProfile } from '@/types';
import { AudioDominance, AudioPhasing, AudioLanguage, AudioVoiceType } from '@/types';
import AudioPlayer from '@/components/AudioPlayer';
import fixWebmDuration from 'webm-duration-fix';

export default function AdminLibraryPage() {
    const { data: session } = useSession();
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingAudio, setEditingAudio] = useState<AudioTrack | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    // Filter & sort state
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDominance, setFilterDominance] = useState('');
    const [filterPhasing, setFilterPhasing] = useState('');
    const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'dur-asc' | 'dur-desc'>('title-asc');

    const filteredAudios = useMemo(() => {
        let list = [...audios];
        if (search) list = list.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
        if (filterType) list = list.filter(a => a.type === filterType);
        if (filterDominance) list = list.filter(a => a.dominance === filterDominance);
        if (filterPhasing) list = list.filter(a => Array.isArray(a.phasing) && a.phasing.includes(filterPhasing));
        list.sort((a, b) => {
            if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
            if (sortBy === 'title-desc') return b.title.localeCompare(a.title);
            if (sortBy === 'dur-asc') return a.duration - b.duration;
            return b.duration - a.duration;
        });
        return list;
    }, [audios, search, filterType, filterDominance, filterPhasing, sortBy]);

    // Recording states
    const [uploadMode, setUploadMode] = useState<'FILE' | 'RECORD'>('FILE');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number | null>(null);

    // Initial form state
    const initialForm = {
        title: '',
        description: '',
        published: 'true',
        type: 'Training',
        orderToListen: '1',
        allowedUserIds: [] as string[],
        dominance: AudioDominance.MIND,
        phasing: [] as AudioPhasing[],
        language: AudioLanguage.FRENCH,
        voiceType: AudioVoiceType.MALE,
    };
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        Promise.all([
            apiClient.get<AudioTrack[]>('/audios'),
            apiClient.get<UserProfile[]>('/users'),
        ]).then(([a, u]) => {
            setAudios(a);
            setUsers(u);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

    // Open modal for Create
    const openCreate = () => {
        setEditingAudio(null);
        const gender = (session?.user as any)?.gender as string | undefined;
        setForm({
            ...initialForm,
            voiceType: gender === 'F' ? AudioVoiceType.FEMALE : AudioVoiceType.MALE,
        });
        setShowModal(true);
    };

    // Open modal for Edit
    const openEdit = (audio: AudioTrack) => {
        setEditingAudio(audio);
        setForm({
            title: audio.title,
            description: audio.description || '',
            published: String(audio.published),
            type: audio.type,
            orderToListen: String(audio.orderToListen || 1),
            allowedUserIds: audio.allowedUserIds || [],
            dominance: audio.dominance || AudioDominance.MIND,
            phasing: Array.isArray(audio.phasing) ? audio.phasing as AudioPhasing[] : [],
            language: audio.language || AudioLanguage.FRENCH,
            voiceType: audio.voiceType || AudioVoiceType.MALE,
        });
        setShowModal(true);
    };

    /* ── Recording Handlers ── */
    const drawVisualizer = () => {
        const canvas = canvasRef.current;
        const analyser = analyserRef.current;
        if (!canvas || !analyser) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            const W = canvas.width;
            const H = canvas.height;
            ctx.clearRect(0, 0, W, H);

            const barCount = 60;
            const barW = 3;
            const gap = 2;
            const totalW = barCount * (barW + gap) - gap;
            const offsetX = (W - totalW) / 2;
            const step = Math.floor(bufferLength / barCount);

            for (let i = 0; i < barCount; i++) {
                const value = dataArray[i * step] / 255;
                const barH = Math.max(3, value * (H - 8));
                const x = offsetX + i * (barW + gap);
                const y = (H - barH) / 2;

                // gradient: muted at low volume, bright red at high
                const alpha = 0.35 + value * 0.65;
                ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
                ctx.beginPath();
                ctx.roundRect(x, y, barW, barH, 2);
                ctx.fill();
            }
        };
        draw();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            recordingChunksRef.current = [];

            // Wire up Web Audio analyser
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordingChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                analyserRef.current = null;
                audioCtx.close();

                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                let blob = new Blob(recordingChunksRef.current, { type: mimeType });
                try {
                    // @ts-ignore
                    blob = await fixWebmDuration(blob, { duration: recordingTime * 1000 });
                } catch (e) {
                    console.error('Failed to fix WebM duration', e);
                }
                setRecordedBlob(blob);
                setRecordedUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach((t) => t.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            setRecordedBlob(null);
            setRecordedUrl(null);
            recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);

            // Start canvas animation (slight delay so canvas is rendered)
            setTimeout(drawVisualizer, 50);
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

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
                    published: form.published === 'true',
                    type: form.type,
                    orderToListen: parseInt(form.orderToListen),
                    allowedUserIds: form.allowedUserIds,
                    dominance: form.dominance,
                    phasing: form.phasing,
                    language: form.language,
                    voiceType: form.voiceType,
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
                formData.append('published', form.published);
                formData.append('type', form.type);
                formData.append('orderToListen', form.orderToListen);
                formData.append('allowedUserIds', JSON.stringify(form.allowedUserIds));
                formData.append('dominance', form.dominance);
                formData.append('phasing', JSON.stringify(form.phasing));
                formData.append('language', form.language);
                formData.append('voiceType', form.voiceType);

                if (uploadMode === 'FILE') {
                    const file = fileRef.current?.files?.[0];
                    if (!file) return alert('Veuillez sélectionner un fichier audio');
                    formData.append('file', file);
                } else {
                    if (!recordedBlob) return alert('Veuillez enregistrer un audio');
                    const ext = recordedBlob.type.includes('mp4') || recordedBlob.type.includes('m4a') ? 'm4a' : 'webm';
                    const file = new File([recordedBlob], `recording.${ext}`, { type: recordedBlob.type });
                    formData.append('file', file);
                    formData.append('duration', recordingTime.toString());
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

    const handleHeartbeat = (position: number, sessionDuration: number, completed?: boolean) => {
        if (currentTrack) {
            apiClient.post('/analytics/heartbeat', {
                audioId: currentTrack.id,
                position,
                sessionDuration,
                completed,
            });
        }
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
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>{editingAudio ? 'Modifier Audio' : 'Ajouter Audio'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {!editingAudio && (
                                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', gap: 0, marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', width: 'fit-content' }}>
                                        {(['FILE', 'RECORD'] as const).map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => setUploadMode(mode)}
                                                style={{
                                                    padding: '0.5rem 1.25rem',
                                                    background: uploadMode === mode ? 'var(--primary)' : 'var(--bg-input)',
                                                    color: uploadMode === mode ? '#fff' : 'var(--text-muted)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontFamily: 'var(--font)',
                                                    fontSize: '0.85rem',
                                                    fontWeight: uploadMode === mode ? 600 : 400,
                                                    transition: 'var(--transition)',
                                                    borderRight: mode === 'FILE' ? '1px solid var(--border)' : 'none',
                                                }}
                                            >
                                                {mode === 'FILE' ? 'Téléverser' : 'Enregistrer'}
                                            </button>
                                        ))}
                                    </div>

                                    {uploadMode === 'FILE' && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <input ref={fileRef} type="file" accept=".mp3,.wav,.aiff" required={uploadMode === 'FILE'} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-input)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }} />
                                        </div>
                                    )}

                                    {uploadMode === 'RECORD' && (
                                        <div style={{ padding: '1.25rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                            {/* Visualizer */}
                                            {isRecording ? (
                                                <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', background: 'rgba(0,0,0,0.25)' }}>
                                                    <canvas ref={canvasRef} width={480} height={80} style={{ display: 'block', width: '100%', height: '80px' }} />
                                                    {/* Timer overlay */}
                                                    <div style={{ position: 'absolute', top: '50%', right: '0.875rem', transform: 'translateY(-50%)', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.95rem', color: '#ef4444', background: 'rgba(0,0,0,0.45)', padding: '0.2rem 0.5rem', borderRadius: '6px', letterSpacing: '1px' }}>
                                                        {formatTime(recordingTime)}
                                                    </div>
                                                    {/* Pulsing red dot */}
                                                    <div style={{ position: 'absolute', top: '50%', left: '0.875rem', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 1s ease-in-out infinite' }} />
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#ef4444', letterSpacing: '1px', textTransform: 'uppercase' }}>REC</span>
                                                    </div>
                                                </div>
                                            ) : !recordedBlob ? (
                                                <div style={{ height: 80, borderRadius: '10px', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                    <Mic size={16} /> En attente d'enregistrement…
                                                </div>
                                            ) : (
                                                <audio src={recordedUrl!} controls style={{ width: '100%', height: '40px', outline: 'none', borderRadius: '8px' }} />
                                            )}

                                            {/* Controls */}
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                {!isRecording ? (
                                                    <button type="button" className="btn-primary" onClick={startRecording} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Mic size={16} />
                                                        {recordedBlob ? 'Réenregistrer' : 'Démarrer'}
                                                    </button>
                                                ) : (
                                                    <button type="button" onClick={stopRecording} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#ef4444', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontFamily: 'var(--font)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
                                                        <Square size={16} fill="#fff" />
                                                        Arrêter
                                                    </button>
                                                )}
                                                {recordedBlob && !isRecording && (
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Durée : {formatTime(recordingTime)}</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="form-group">
                                <label>Titre</label>
                                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Titre de la piste audio" />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Détails à propos de cet audio..." />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Catégorie</label>
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

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Dominance</label>
                                    <select value={form.dominance} onChange={(e) => setForm({ ...form, dominance: e.target.value as AudioDominance })}>
                                        <option value={AudioDominance.MIND}>Pensée</option>
                                        <option value={AudioDominance.BODY}>Corps</option>
                                        <option value={AudioDominance.EMOTION}>Émotion</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Phasing</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: '0.25rem' }}>
                                        {([
                                            [AudioPhasing.PRE_COMPETITION, 'Précompétition'],
                                            [AudioPhasing.DURING_COMPETITION, 'Pendant compétition'],
                                            [AudioPhasing.POST_COMPETITION, 'Post compétition'],
                                        ] as [AudioPhasing, string][]).map(([val, lbl]) => (
                                            <label key={val} className="checkbox-label" style={{ padding: '0.15rem 0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.phasing.includes(val)}
                                                    onChange={(e) => {
                                                        const next = e.target.checked
                                                            ? [...form.phasing, val]
                                                            : form.phasing.filter(p => p !== val);
                                                        setForm({ ...form, phasing: next });
                                                    }}
                                                />
                                                {lbl}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Langue</label>
                                    <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as AudioLanguage })}>
                                        <option value={AudioLanguage.FRENCH}>Français</option>
                                        <option value={AudioLanguage.ENGLISH}>Anglais</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Voix (Type)</label>
                                    <select value={form.voiceType} onChange={(e) => setForm({ ...form, voiceType: e.target.value as AudioVoiceType })}>
                                        <option value={AudioVoiceType.MALE}>Masculin</option>
                                        <option value={AudioVoiceType.FEMALE}>Féminin</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Utilisateurs autorisés</label>
                                <div className="checkbox-group" style={{ maxHeight: '150px', overflowY: 'auto', padding: '0.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)' }}>
                                    {users
                                        .filter(u => {
                                            if ((session?.user as any)?.role === 'ADMIN') return u.role === 'TEACHER';
                                            if ((session?.user as any)?.role === 'TEACHER') return u.role === 'ATHLETE' && u.createdById === (session?.user as any)?.id;
                                            return false;
                                        })
                                        .map((u) => (
                                            <label key={u.id} className="checkbox-label" style={{ width: '100%', padding: '0.2rem 0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.allowedUserIds.includes(u.id)}
                                                    onChange={(e) => {
                                                        const ids = e.target.checked
                                                            ? [...form.allowedUserIds, u.id]
                                                            : form.allowedUserIds.filter((id) => id !== u.id);
                                                        setForm({ ...form, allowedUserIds: ids });
                                                    }}
                                                />
                                                {u.firstName} {u.lastName} <span className="text-muted text-sm">({u.role})</span>
                                            </label>
                                        ))
                                    }
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

            {/* ── Filter bar ── */}
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1.25rem',
                display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end',
            }}>
                {/* Search */}
                <div style={{ flex: '1 1 200px', minWidth: '160px' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Recherche</div>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                            placeholder="Titre..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', paddingLeft: '2rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: '0.875rem', padding: '0.5rem 0.75rem 0.5rem 2rem', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                {/* Catégorie */}
                <div style={{ flex: '0 0 auto' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Catégorie</div>
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: filterType ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: '0.875rem', padding: '0.5rem 0.75rem', outline: 'none', cursor: 'pointer' }}>
                        <option value="">Toutes</option>
                        <option value="Training">Training</option>
                        <option value="Recovery">Recovery</option>
                        <option value="Performance">Performance</option>
                    </select>
                </div>

                {/* Dominance */}
                <div style={{ flex: '0 0 auto' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Dominance</div>
                    <select value={filterDominance} onChange={e => setFilterDominance(e.target.value)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: filterDominance ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: '0.875rem', padding: '0.5rem 0.75rem', outline: 'none', cursor: 'pointer' }}>
                        <option value="">Toutes</option>
                        <option value={AudioDominance.MIND}>Pensée</option>
                        <option value={AudioDominance.BODY}>Corps</option>
                        <option value={AudioDominance.EMOTION}>Émotion</option>
                    </select>
                </div>

                {/* Phasing */}
                <div style={{ flex: '0 0 auto' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Phasing</div>
                    <select value={filterPhasing} onChange={e => setFilterPhasing(e.target.value)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: filterPhasing ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'var(--font)', fontSize: '0.875rem', padding: '0.5rem 0.75rem', outline: 'none', cursor: 'pointer' }}>
                        <option value="">Tous</option>
                        <option value={AudioPhasing.PRE_COMPETITION}>Précompétition</option>
                        <option value={AudioPhasing.DURING_COMPETITION}>Pendant</option>
                        <option value={AudioPhasing.POST_COMPETITION}>Post compétition</option>
                    </select>
                </div>

                {/* Séparateur */}
                <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', margin: '0 0.25rem' }} />

                {/* Tri */}
                <div style={{ flex: '0 0 auto' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.35rem' }}>Tri</div>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontFamily: 'var(--font)', fontSize: '0.875rem', padding: '0.5rem 0.75rem', outline: 'none', cursor: 'pointer' }}>
                        <option value="title-asc">Titre A→Z</option>
                        <option value="title-desc">Titre Z→A</option>
                        <option value="dur-asc">Durée ↑</option>
                        <option value="dur-desc">Durée ↓</option>
                    </select>
                </div>

                {/* Reset + count */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', marginLeft: 'auto' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{filteredAudios.length} / {audios.length} audio{audios.length !== 1 ? 's' : ''}</div>
                    {(search || filterType || filterDominance || filterPhasing) && (
                        <button
                            onClick={() => { setSearch(''); setFilterType(''); setFilterDominance(''); setFilterPhasing(''); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', color: 'var(--primary-light)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font)', padding: 0 }}
                        >
                            <RotateCcw size={12} /> Réinitialiser
                        </button>
                    )}
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Titre</th>
                            <th>Durée</th>
                            <th>Catégorie</th>
                            <th>Dominance</th>
                            <th>Phasing</th>
                            <th>Publié</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAudios.map((audio) => (
                            <tr key={audio.id}>
                                <td>{audio.title}</td>
                                <td style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{formatDuration(audio.duration)}</td>
                                <td>{audio.type}</td>
                                <td style={{ fontSize: '0.8rem' }}>{audio.dominance ? { MIND: 'Pensée', BODY: 'Corps', EMOTION: 'Émotion' }[audio.dominance] ?? audio.dominance : '—'}</td>
                                <td style={{ fontSize: '0.8rem' }}>{Array.isArray(audio.phasing) && audio.phasing.length > 0 ? audio.phasing.map(p => ({ PRE_COMPETITION: 'Pré', DURING_COMPETITION: 'Pendant', POST_COMPETITION: 'Post' }[p] ?? p)).join(', ') : '—'}</td>
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
                        duration={currentTrack.duration}
                        onHeartbeat={handleHeartbeat}
                    />
                </div>
            )}
        </div>
    );
}
