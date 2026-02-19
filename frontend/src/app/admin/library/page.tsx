'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef, FormEvent } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { AudioTrack, Category, Group } from '@/types';

export default function AdminLibraryPage() {
    const { data: session } = useSession();
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const [loading, setLoading] = useState(true);
    const fileRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        title: '',
        description: '',
        categoryId: '',
        published: 'true',
        type: 'Training',
        orderToListen: '1',
        allowedGroupIds: [] as string[],
    });

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

    const handleUpload = async (e: FormEvent) => {
        e.preventDefault();
        const file = fileRef.current?.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', form.title);
        formData.append('description', form.description);
        formData.append('categoryId', form.categoryId || categories[0]?.id || '');
        formData.append('published', form.published);
        formData.append('type', form.type);
        formData.append('orderToListen', form.orderToListen);
        formData.append('allowedGroupIds', JSON.stringify(form.allowedGroupIds));

        try {
            const newAudio = await apiClient.post<AudioTrack>('/audios', formData);
            setAudios([newAudio, ...audios]);
            setShowUpload(false);
            setForm({ title: '', description: '', categoryId: '', published: 'true', type: 'Training', orderToListen: '1', allowedGroupIds: [] });
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cet audio ?')) return;
        await apiClient.delete(`/audios/${id}`);
        setAudios(audios.filter((a) => a.id !== id));
    };

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <div className="page-header">
                <h1>Bibliothèque Audio</h1>
                <button className="btn-primary" onClick={() => setShowUpload(!showUpload)}>
                    {showUpload ? 'Annuler' : '+ Ajouter un audio'}
                </button>
            </div>

            {showUpload && (
                <form onSubmit={handleUpload} className="upload-form">
                    <div className="form-group">
                        <label>Fichier audio</label>
                        <input ref={fileRef} type="file" accept=".mp3,.wav,.aiff" required />
                    </div>
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
                    <button type="submit" className="btn-primary">Uploader</button>
                </form>
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
                                <td>{audio.published ? '✅' : '❌'}</td>
                                <td>
                                    <button className="btn-danger" onClick={() => handleDelete(audio.id)}>
                                        Supprimer
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
