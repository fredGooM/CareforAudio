'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    title: string;
    coverUrl?: string;
    onHeartbeat?: (position: number, sessionDuration: number) => void;
    onComplete?: () => void;
}

export default function AudioPlayer({
    src,
    title,
    coverUrl,
    onHeartbeat,
    onComplete,
}: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [sessionStart, setSessionStart] = useState(0);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onLoadedMetadata = () => setDuration(audio.duration);
        const onTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
            if (onHeartbeat && Math.round(audio.currentTime) % 10 === 0) {
                const sessionDur = (Date.now() - sessionStart) / 1000;
                onHeartbeat(audio.currentTime, sessionDur);
            }
        };
        const onEnded = () => {
            setPlaying(false);
            onComplete?.();
        };

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('ended', onEnded);
        };
    }, [src, sessionStart, onHeartbeat, onComplete]);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) {
            audio.pause();
        } else {
            if (sessionStart === 0) setSessionStart(Date.now());
            audio.play();
        }
        setPlaying(!playing);
    };

    const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = Number(e.target.value);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!src) return null;

    return (
        <div className="audio-player">
            <audio ref={audioRef} src={src} preload="metadata" />

            <div className="player-info">
                {coverUrl && (
                    <img src={coverUrl} alt={title} className="player-cover" />
                )}
                <span className="player-title">{title}</span>
            </div>

            <button onClick={togglePlay} className="player-play-btn">
                {playing ? <Pause size={24} /> : <Play size={24} />}
            </button>

            <div className="player-controls">
                <span className="player-time">{formatTime(currentTime)}</span>

                <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    onChange={seek}
                    className="player-seek"
                />

                <span className="player-time">{formatTime(duration)}</span>
            </div>
        </div>
    );
}
