'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import Loader from '@/components/Loader';

interface ProgramAudio {
    id: string;
    title: string;
    duration: number;
    categoryId: string;
    type: string;
    timesListened: number;
}

export default function TrainingPage() {
    const { data: session } = useSession();
    const [program, setProgram] = useState<ProgramAudio[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!session) return;
        apiClient.setToken((session as any).accessToken);
        apiClient.get<ProgramAudio[]>('/audios/my-program').then((data) => {
            setProgram(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [session]);

    if (loading) return <Loader />;

    return (
        <div className="page-content">
            <h1>Mon Training</h1>

            {program.length === 0 ? (
                <p className="empty-state">Aucun audio dans votre programme pour le moment.</p>
            ) : (
                <div className="training-list">
                    {program.map((audio) => (
                        <div key={audio.id} className="training-item">
                            <div className="training-info">
                                <h3>{audio.title}</h3>
                                <p>{Math.round(audio.duration / 60)} min • {audio.type}</p>
                            </div>
                            <div className="training-stats">
                                <span>Écoutes : {audio.timesListened}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
