'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';
import type { UserProfile, AudioTrack } from '@/types';

interface ProgramAudio {
    id: string;
    title: string;
    duration: number;
    categoryId: string;
    type: string;
    timesListened: number;
}

export default function AdminMyProgramPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [audios, setAudios] = useState<AudioTrack[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [program, setProgram] = useState<ProgramAudio[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        Promise.all([
            apiClient.get<UserProfile[]>('/users'),
            apiClient.get<AudioTrack[]>('/audios'),
        ]).then(([u, a]) => {
            setUsers(u.filter((us) => us.role === 'ATHLETE'));
            setAudios(a);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

    useEffect(() => {
        if (!selectedUser) {
            setProgram([]);
            return;
        }
        apiClient.get<ProgramAudio[]>(`/audios/my-program/admin?userId=${selectedUser}`).then(setProgram).catch(() => { });
    }, [selectedUser]);

    const toggleProgram = async (audioId: string) => {
        const isInProgram = program.some((p) => p.id === audioId);
        await apiClient.post('/audios/my-program/admin', {
            userId: selectedUser,
            audioId,
            isMyProgram: !isInProgram,
        });
        const updated = await apiClient.get<ProgramAudio[]>(`/audios/my-program/admin?userId=${selectedUser}`);
        setProgram(updated);
    };

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <h1>MonProgramme (Admin)</h1>

            <div className="form-group">
                <label>Sélectionner un athlète</label>
                <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                    <option value="">Choisir...</option>
                    {users.map((u) => (
                        <option key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                        </option>
                    ))}
                </select>
            </div>

            {selectedUser && (
                <>
                    <h2>Programme actuel</h2>
                    {program.length === 0 ? (
                        <p className="empty-state">Aucun audio dans le programme.</p>
                    ) : (
                        <div className="training-list">
                            {program.map((p) => (
                                <div key={p.id} className="training-item">
                                    <span>{p.title}</span>
                                    <button className="btn-danger" onClick={() => toggleProgram(p.id)}>
                                        Retirer
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <h2>Tous les audios</h2>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr><th>Titre</th><th>Durée</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {audios.map((audio) => {
                                    const inProgram = program.some((p) => p.id === audio.id);
                                    return (
                                        <tr key={audio.id}>
                                            <td>{audio.title}</td>
                                            <td>{Math.round(audio.duration / 60)} min</td>
                                            <td>
                                                <button
                                                    className={inProgram ? 'btn-danger' : 'btn-primary'}
                                                    onClick={() => toggleProgram(audio.id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                                >
                                                    {inProgram ? (
                                                        <>
                                                            <Trash2 size={16} />
                                                            Retirer
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus size={16} />
                                                            Ajouter
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
