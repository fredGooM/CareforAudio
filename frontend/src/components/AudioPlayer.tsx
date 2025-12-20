import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, ChevronUp, ChevronDown, Music } from 'lucide-react';
import { AudioTrack } from '../types';
import { dataService } from '../services/apiClient';

interface AudioPlayerProps {
  track: AudioTrack | null;
  userId: string;
  onClose: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ track, userId, onClose }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false); // Mobile expand
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    if (track && audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error(e));
      setCurrentTime(0); 
    }
  }, [track]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      setCurrentTime(current);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (amount: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += amount;
    }
  };

  const changeSpeed = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(speed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const sendHeartbeat = useCallback(() => {
    if (!track || !audioRef.current) return;
    const now = Date.now();
    const lastSent = lastHeartbeatRef.current;
    const sessionDuration = lastSent ? Math.round((now - lastSent) / 1000) : 10;
    lastHeartbeatRef.current = now;
    dataService.sendHeartbeat({
      audioId: track.id,
      position: audioRef.current.currentTime,
      sessionDuration
    }).catch(() => {});
  }, [track]);

  useEffect(() => {
    if (isPlaying && track) {
      lastHeartbeatRef.current = Date.now();
      heartbeatTimer.current = setInterval(() => {
        sendHeartbeat();
      }, 10000);
    } else {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }
      lastHeartbeatRef.current = null;
    }

    return () => {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = null;
      }
    };
  }, [isPlaying, track, sendHeartbeat]);

  if (!track) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all duration-300 z-50 ${isExpanded ? 'h-full flex flex-col justify-center' : 'h-24'}`}>
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          sendHeartbeat();
          setIsPlaying(false);
        }}
      />

      <div className={`max-w-7xl mx-auto px-4 h-full flex ${isExpanded ? 'flex-col gap-8' : 'flex-row items-center justify-between'}`}>
        
        {/* Track Info */}
        <div className={`flex items-center gap-4 ${isExpanded ? 'flex-col text-center' : 'w-1/3'}`}>
           <div className="relative group">
              <div className={`${isExpanded ? 'w-64 h-64 rounded-xl shadow-2xl' : 'w-12 h-12 rounded-md'} bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden`}>
                 <Music size={isExpanded ? 64 : 24} />
              </div>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="md:hidden absolute -top-2 -right-2 bg-white rounded-full p-1 shadow border border-slate-200"
              >
                {isExpanded ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
              </button>
           </div>
           <div className="overflow-hidden">
             <h3 className={`font-semibold text-slate-900 truncate ${isExpanded ? 'text-2xl mt-4' : 'text-sm'}`}>{track.title}</h3>
             <p className={`text-slate-500 truncate ${isExpanded ? 'text-lg' : 'text-xs'}`}>Careformance Audio</p>
           </div>
        </div>

        {/* Controls - Center */}
        <div className={`flex flex-col items-center gap-2 ${isExpanded ? 'w-full' : 'w-1/3'}`}>
          <div className="flex items-center gap-6">
            <button onClick={() => skip(-10)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <SkipBack size={24} />
            </button>
            <button 
              onClick={togglePlay} 
              className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 shadow-lg transition-transform active:scale-95"
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1"/>}
            </button>
            <button onClick={() => skip(10)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <SkipForward size={24} />
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="flex-grow h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <span className="w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Extra Controls - Right */}
        <div className={`flex items-center justify-end gap-4 ${isExpanded ? 'w-full justify-center pb-8' : 'w-1/3 hidden md:flex'}`}>
           <button 
            onClick={changeSpeed}
            className="px-2 py-1 text-xs font-bold text-slate-600 border border-slate-300 rounded hover:bg-slate-100 w-12 text-center"
           >
             {speed}x
           </button>
           
           {!isExpanded && (
             <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
               <X size={20} />
             </button>
           )}
        </div>
      </div>
    </div>
  );
};
