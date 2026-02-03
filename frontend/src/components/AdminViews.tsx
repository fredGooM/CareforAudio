import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { AxiosError } from 'axios';
import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Clock, Activity, Edit, Trash2, Plus, Upload, X, Save, Search, Check, Play, Music, Lock, Mic, Square, Mail, KeyRound, RefreshCw, Layers } from 'lucide-react';
import { AudioTrack, User, UserRole, Group, AdminDashboardData } from '../types';
import { CATEGORIES, GROUPS, dataService, authService } from '../services/apiClient';

// --- Dashboard ---

export const AdminDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await dataService.getAnalyticsDashboard(userId);
      if (response.role === 'ADMIN') {
        setDashboard(response);
      } else {
        setDashboard(null);
        setError("Impossible d'afficher les métriques administrateur.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || 'Impossible de charger le tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(selectedUser || undefined);
  }, [selectedUser, loadDashboard]);

  const handleRefresh = () => loadDashboard(selectedUser || undefined);

  const KpiCard = ({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          <p className="text-xs text-slate-400 mt-2">{helper}</p>
        </div>
        <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Pilotage de la performance</h2>
          <p className="text-slate-500">Mesurez l'engagement mental des athlètes en temps réel.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <select
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 min-w-[200px]"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            disabled={!dashboard}
          >
            <option value="">Tous les athlètes</option>
            {dashboard?.athletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>{athlete.name}</option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-200 transition disabled:opacity-50"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="ml-2 text-sm font-medium">Actualiser</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-100 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 text-slate-500">
          Chargement des indicateurs...
        </div>
      )}

      {!loading && dashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              icon={<Clock size={22} />}
              label="Heures totales d'écoute"
              value={`${dashboard.totalListeningHours.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`}
              helper={selectedUser ? 'Temps pour cet athlète' : 'Depuis le lancement'}
            />
            <KpiCard
              icon={<Activity size={22} />}
              label="Taux de complétion"
              value={`${dashboard.completionRate}%`}
              helper="Podcasts écoutés à +90%"
            />
            <KpiCard
              icon={<Users size={22} />}
              label="Athlètes actifs"
              value={dashboard.activeAthletes !== null ? String(dashboard.activeAthletes) : '—'}
              helper={dashboard.activeAthletes !== null ? 'Écoute > 10 min cette semaine' : 'Filtre athlète actif'}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 xl:col-span-3">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Engagement quotidien</h3>
                  <p className="text-sm text-slate-500">Volume d'écoute sur les 30 derniers jours</p>
                </div>
              </div>
              {dashboard.engagementTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dashboard.engagementTrend} margin={{ left: -10, right: 10 }}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0' }} formatter={(value) => [`${value} min`, 'Volume']} />
                    <Area type="monotone" dataKey="minutes" stroke="#2563eb" strokeWidth={3} fill="url(#volumeGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-sm">Pas de données suffisantes pour le graphique.</p>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 xl:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Alerte décrochage</h3>
                  <p className="text-sm text-slate-500">Athlètes inactifs depuis 7+ jours</p>
                </div>
              </div>
              <div className="space-y-4">
                {dashboard.dropoffs.length === 0 && (
                  <p className="text-sm text-slate-500">Tous les athlètes sont actifs 🎯</p>
                )}
                {dashboard.dropoffs.map((athlete) => (
                  <div key={athlete.userId} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl">
                    <div>
                      <p className="font-semibold text-slate-900">{athlete.name}</p>
                      <p className="text-xs text-slate-500">Dernière écoute: {athlete.daysSince} jours</p>
                    </div>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-600">
                      À relancer
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Tableau de complétion</h3>
                <p className="text-sm text-slate-500">Les podcasts les plus populaires</p>
              </div>
            </div>
            {dashboard.popularAudios.length === 0 ? (
              <p className="text-sm text-slate-500">Pas encore de sessions enregistrées.</p>
            ) : (
              <>
                <div className="hidden md:block">
                  <div className="grid grid-cols-4 text-xs uppercase text-slate-400 tracking-wide">
                    <div>Podcast</div>
                    <div>Minutes</div>
                    <div className="col-span-2">Taux de complétion</div>
                  </div>
                  <div className="mt-2 divide-y divide-slate-100">
                    {dashboard.popularAudios.map((audio) => (
                      <div key={audio.audioId} className="grid grid-cols-4 items-center py-3">
                        <div className="font-semibold text-slate-900">{audio.title}</div>
                        <div className="text-slate-600">{audio.minutes} min</div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-3">
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-primary-500" style={{ width: `${audio.completionRate}%` }}></div>
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{audio.completionRate}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 md:hidden">
                  {dashboard.popularAudios.map((audio) => (
                    <div key={audio.audioId} className="p-4 border border-slate-100 rounded-2xl">
                      <p className="font-semibold text-slate-900">{audio.title}</p>
                      <p className="text-xs text-slate-500">{audio.minutes} min écoutées</p>
                      <div className="mt-3">
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-primary-500" style={{ width: `${audio.completionRate}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{audio.completionRate}% complété</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// --- Unified Audio Modal (Create/Edit/Record) ---

interface AudioModalProps {
  initialData?: AudioTrack; 
  initialMode?: 'UPLOAD' | 'RECORD'; 
  onClose: () => void;
  onSave: () => void;
}

const createEmptyAudioForm = (): Partial<AudioTrack> => ({
  title: '',
  description: '',
  categoryId: 'c1',
  published: true,
  tags: [],
  allowedGroupIds: [],
  allowedUserIds: [],
  url: ''
});

const AudioModal: React.FC<AudioModalProps> = ({ initialData, initialMode = 'UPLOAD', onClose, onSave }) => {
  const isEditMode = !!initialData;
  const [step, setStep] = useState<1 | 2>(1); 
  const [mode, setMode] = useState<'UPLOAD' | 'RECORD'>(initialMode);
  const [saving, setSaving] = useState(false);
  
  // Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const monitorRef = useRef<{
    audioCtx: AudioContext | null;
    analyser: AnalyserNode | null;
    source: MediaStreamAudioSourceNode | null;
    rafId: number | null;
  }>({ audioCtx: null, analyser: null, source: null, rafId: null });
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [audioLevel, setAudioLevel] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number>(initialData?.duration || 0);
  
  // Data for permissions
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Form State
  const [formData, setFormData] = useState<Partial<AudioTrack>>(initialData || createEmptyAudioForm());
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    dataService.getUsers().then(setAvailableUsers).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setDurationSeconds(initialData.duration || 0);
      setMode(initialMode);
    } else {
      setFormData(createEmptyAudioForm());
      setDurationSeconds(0);
      setMode(initialMode);
    }
    setSelectedFile(null);
    setRecordedBlob(null);
    setIsRecording(false);
  }, [initialData, initialMode]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (monitorRef.current.rafId) cancelAnimationFrame(monitorRef.current.rafId);
      monitorRef.current.source?.disconnect();
      monitorRef.current.analyser?.disconnect();
      monitorRef.current.audioCtx?.close().catch(() => undefined);
      previewStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const refreshAudioInputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter(device => device.kind === 'audioinput');
      setAudioInputs(inputs);
      if (inputs.length > 0 && !inputs.find(device => device.deviceId === selectedDeviceId)) {
        setSelectedDeviceId(inputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Failed to enumerate audio devices', err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshAudioInputs();
  }, [refreshAudioInputs]);

  const stopLevelMonitor = (stopStream = true) => {
    if (monitorRef.current.rafId) cancelAnimationFrame(monitorRef.current.rafId);
    monitorRef.current.source?.disconnect();
    monitorRef.current.analyser?.disconnect();
    monitorRef.current.audioCtx?.close().catch(() => undefined);
    monitorRef.current = { audioCtx: null, analyser: null, source: null, rafId: null };
    if (stopStream) {
      previewStreamRef.current?.getTracks().forEach(track => track.stop());
      previewStreamRef.current = null;
    }
    setAudioLevel(0);
  };

  const startLevelMonitor = (stream: MediaStream) => {
    stopLevelMonitor(false);
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Float32Array(analyser.fftSize);

    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const x = data[i];
        sum += x * x;
      }
      const rms = Math.sqrt(sum / data.length);
      setAudioLevel(Math.min(1, rms * 3));
      monitorRef.current.rafId = requestAnimationFrame(tick);
    };

    monitorRef.current = { audioCtx, analyser, source, rafId: requestAnimationFrame(tick) };
  };

  const startPreviewMonitor = async () => {
    try {
      stopLevelMonitor(true);
      const constraints = selectedDeviceId && selectedDeviceId !== 'default'
        ? { audio: { deviceId: { exact: selectedDeviceId } } }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      previewStreamRef.current = stream;
      startLevelMonitor(stream);
      refreshAudioInputs();
    } catch (err) {
      console.warn('Failed to start microphone preview', err);
    }
  };

  const startRecording = async () => {
    try {
      const constraints = selectedDeviceId && selectedDeviceId !== 'default'
        ? { audio: { deviceId: { exact: selectedDeviceId } } }
        : { audio: true };
      const stream = previewStreamRef.current ?? await navigator.mediaDevices.getUserMedia(constraints);
      previewStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      startLevelMonitor(stream);
      refreshAudioInputs();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        const file = new File([blob], "enregistrement.webm", { type: "audio/webm" });
        setSelectedFile(file);
        setFormData(prev => ({ ...prev, url: url }));
        setDurationSeconds(recordingTime);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Impossible d'accéder au microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      stopLevelMonitor(true);
    }
  };

  useEffect(() => {
    if (mode !== 'RECORD') {
      if (isRecording) {
        stopRecording();
      } else {
        stopLevelMonitor(true);
      }
    }
  }, [mode, isRecording]);

  useEffect(() => {
    if (mode === 'RECORD' && !isRecording && !recordedBlob) {
      startPreviewMonitor();
      return;
    }
    if (mode === 'RECORD' && (isRecording || recordedBlob)) {
      stopLevelMonitor(false);
      return;
    }
    stopLevelMonitor(true);
  }, [mode, selectedDeviceId, isRecording, recordedBlob]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setSelectedFile(file);

          const objectUrl = URL.createObjectURL(file);
          const audioProbe = new Audio();
          audioProbe.src = objectUrl;
          audioProbe.onloadedmetadata = () => {
              if (!Number.isNaN(audioProbe.duration)) {
                  setDurationSeconds(Math.round(audioProbe.duration));
              }
              URL.revokeObjectURL(objectUrl);
          };
      }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
        if (isEditMode && initialData) {
            await dataService.updateAudio({ ...initialData, ...formData, duration: durationSeconds } as AudioTrack);
        } else {
            const payload = {
                ...formData,
                duration: durationSeconds,
                file: selectedFile
            };
            await dataService.addAudio(payload);
        }
        onSave();
    } catch (e) {
        console.error(e);
        const err = e as AxiosError<{ error?: string }>;
        const detail = err?.response?.data?.error || err?.message;
        alert(detail ? `Erreur lors de l'enregistrement. (${detail})` : "Erreur lors de l'enregistrement.");
    } finally {
        setSaving(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    const current = formData.allowedGroupIds || [];
    setFormData({
      ...formData,
      allowedGroupIds: current.includes(groupId)
        ? current.filter(id => id !== groupId)
        : [...current, groupId]
    });
  };

  const toggleUser = (userId: string) => {
    const current = formData.allowedUserIds || [];
    setFormData({
      ...formData,
      allowedUserIds: current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId]
    });
  };

  const filteredUsers = availableUsers.filter(u => 
    u.role === UserRole.USER && 
    (u.email.toLowerCase().includes(searchUser.toLowerCase()) || 
     u.lastName.toLowerCase().includes(searchUser.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {isEditMode ? 'Modifier le podcast' : 'Ajouter un podcast'}
            </h3>
            <p className="text-sm text-slate-500">
              {step === 1 ? 'Détails et fichier' : 'Permissions'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
              
              {!isEditMode && (
                <div className="space-y-4">
                  <div className="flex gap-4 mb-4">
                     <button 
                       onClick={() => setMode('UPLOAD')}
                       className={`flex-1 py-3 rounded-xl border font-medium flex items-center justify-center gap-2 transition-all ${mode === 'UPLOAD' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                     >
                        <Upload size={18} /> Import Fichier
                     </button>
                     <button 
                       onClick={() => setMode('RECORD')}
                       className={`flex-1 py-3 rounded-xl border font-medium flex items-center justify-center gap-2 transition-all ${mode === 'RECORD' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                     >
                        <Mic size={18} /> Enregistrement
                     </button>
                  </div>

                  {mode === 'UPLOAD' ? (
                     <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                        <input type="file" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" accept="audio/*" />
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                          <Upload size={24} className="text-primary-600" />
                        </div>
                        <p className="font-medium text-slate-900">{selectedFile ? selectedFile.name : 'Cliquez pour uploader (MP3, WAV)'}</p>
                     </div>
                  ) : (
                     <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center text-center">
                        {recordedBlob ? (
                          <div className="w-full">
                            <div className="flex items-center justify-center gap-2 mb-4 text-green-600 font-medium">
                               <Check size={20} /> Audio enregistré ({formatTime(recordingTime)})
                            </div>
                            <audio src={formData.url} controls className="w-full mb-4" />
                            <button onClick={() => { setRecordedBlob(null); setFormData(p => ({...p, url: ''})) }} className="text-xs text-red-500 underline">Recommencer</button>
                          </div>
                        ) : (
                          <>
                            <div className="w-full max-w-md space-y-3 mb-4">
                              <div className="flex items-center justify-between gap-3">
                                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Microphone
                                </label>
                                <button
                                  type="button"
                                  onClick={refreshAudioInputs}
                                  className="text-xs text-slate-500 hover:text-slate-700"
                                >
                                  Rafraichir
                                </button>
                              </div>
                              <select
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                                value={selectedDeviceId}
                                onChange={(e) => setSelectedDeviceId(e.target.value)}
                                disabled={isRecording}
                              >
                                <option value="default">Micro par defaut</option>
                                {audioInputs.map((device, index) => (
                                  <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Micro ${index + 1}`}
                                  </option>
                                ))}
                              </select>
                              <div className="w-full">
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 transition-[width] duration-100"
                                    style={{ width: `${Math.round(audioLevel * 100)}%` }}
                                  />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                  {isRecording ? 'Signal micro en cours...' : "Signal micro"}
                                </p>
                              </div>
                            </div>
                            <div className="text-4xl font-mono font-bold text-slate-700 mb-6">
                               {formatTime(recordingTime)}
                            </div>
                            {!isRecording ? (
                               <button 
                                 onClick={startRecording}
                                 className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
                               >
                                 <Mic size={28} />
                               </button>
                            ) : (
                               <div className="flex flex-col items-center gap-2">
                                 <button 
                                   onClick={stopRecording}
                                   className="w-16 h-16 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 animate-pulse"
                                 >
                                   <Square size={24} fill="currentColor" />
                                 </button>
                                 <span className="text-xs text-red-500 font-medium animate-pulse">Enregistrement en cours...</span>
                               </div>
                            )}
                          </>
                        )}
                     </div>
                  )}
                </div>
              )}
              
              {isEditMode && (
                <div className="p-3 bg-slate-100 rounded-lg flex items-center gap-3 text-sm text-slate-600">
                   <Music size={18} />
                   <span className="truncate flex-1 font-mono">Fichier existant</span>
                   <span className="font-bold">{Math.floor(initialData.duration / 60)} min</span>
                </div>
              )}

              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Titre du podcast"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-100 outline-none"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
                <textarea 
                  placeholder="Description..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-100 outline-none h-24 resize-none"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Catégorie</label>
                    <select 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
                      value={formData.categoryId}
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Statut</label>
                    <select 
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white"
                      value={formData.published ? 'true' : 'false'}
                      onChange={e => setFormData({...formData, published: e.target.value === 'true'})}
                    >
                      <option value="true">Publié</option>
                      <option value="false">Brouillon</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Users size={16} /> Par Groupes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GROUPS.map(group => (
                    <label key={group.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${formData.allowedGroupIds?.includes(group.id) ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.allowedGroupIds?.includes(group.id) ? 'bg-primary-600 border-primary-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {formData.allowedGroupIds?.includes(group.id) && <Check size={12} strokeWidth={3} />}
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={formData.allowedGroupIds?.includes(group.id)}
                        onChange={() => toggleGroup(group.id)}
                      />
                      <span className="text-sm font-medium text-slate-700">{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 my-4"></div>

              <div className="flex flex-col h-64">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Lock size={16} /> Par Utilisateur (Exceptions)
                </h4>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Chercher un athlète..." 
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                  />
                </div>
                
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-50 divide-y divide-slate-100">
                  {filteredUsers.map(user => {
                    const isSelected = formData.allowedUserIds?.includes(user.id);
                    return (
                      <div key={user.id} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">
                             {user.firstName[0]}{user.lastName[0]}
                           </div>
                           <div>
                             <p className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</p>
                             <p className="text-xs text-slate-500">{user.email}</p>
                           </div>
                         </div>
                         <button 
                            onClick={() => toggleUser(user.id)}
                            className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${isSelected ? 'bg-secondary-50 border-secondary-200 text-secondary-600' : 'bg-white border-slate-200 text-slate-500'}`}
                         >
                           {isSelected ? 'Sélectionné' : 'Sélectionner'}
                         </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
           {step === 2 ? (
             <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
               Retour
             </button>
           ) : (
             <div></div>
           )}
           <div className="flex gap-3">
             {step === 1 ? (
               <button 
                onClick={() => setStep(2)}
                disabled={!isEditMode && mode === 'RECORD' && !recordedBlob && !formData.url}
                className="px-6 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Suivant
               </button>
             ) : (
               <button 
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
               >
                 {saving ? '...' : <Save size={16} />}
                 {isEditMode ? 'Enregistrer' : 'Publier'}
               </button>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Library Management ---

export const AdminLibrary: React.FC<{ onPlay: (audio: AudioTrack) => void }> = ({ onPlay }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'UPLOAD' | 'RECORD'>('UPLOAD');
  const [editAudio, setEditAudio] = useState<AudioTrack | undefined>(undefined);
  const [audios, setAudios] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
      setLoading(true);
      try {
          const data = await dataService.getAllAudios();
          setAudios(data);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      refresh();
  }, []);

  const handleOpenUpload = () => {
    setModalMode('UPLOAD');
    setEditAudio(undefined);
    setModalOpen(true);
  };

  const handleOpenRecord = () => {
    setModalMode('RECORD');
    setEditAudio(undefined);
    setModalOpen(true);
  };

  const handleOpenEdit = (audio: AudioTrack) => {
    setEditAudio(audio);
    setModalOpen(true);
  };

  const handleDelete = async (audio: AudioTrack) => {
    const confirmed = window.confirm(`Supprimer "${audio.title}" ?`);
    if (!confirmed) return;
    setLoading(true);
    try {
        await dataService.deleteAudio(audio.id);
        await refresh();
    } catch (e) {
        console.error(e);
        alert("Suppression impossible pour le moment.");
    } finally {
        setLoading(false);
    }
  };

  const handleSaveSuccess = () => {
    setModalOpen(false);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Bibliothèque Audio</h2>
        <div className="flex gap-3">
          <button onClick={handleOpenRecord} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm">
            <Mic size={18} /> <span>Enregistrer</span>
          </button>
          <button onClick={handleOpenUpload} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
            <Upload size={18} /> <span>Uploader</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 w-16"></th>
                <th className="px-6 py-4">Titre</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Durée</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audios.map((audio) => {
                const category = CATEGORIES.find(c => c.id === audio.categoryId);
                return (
                  <tr key={audio.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                       <button onClick={() => onPlay(audio)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-sm">
                         <Play size={14} fill="currentColor" className="ml-0.5" />
                       </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                           <Music size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{audio.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${category?.color || 'bg-slate-100'}`}>
                        {category?.name || 'Général'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{Math.floor(audio.duration / 60)}:{audio.duration % 60 < 10 ? '0' : ''}{audio.duration % 60}</td>
                    <td className="px-6 py-4">
                      {audio.published ? <span className="text-green-600">Publié</span> : <span className="text-slate-500">Brouillon</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => handleOpenEdit(audio)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
                            <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(audio)} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {audios.length === 0 && !loading && (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-500">Aucun audio.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <AudioModal 
          initialMode={modalMode}
          initialData={editAudio}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveSuccess}
        />
      )}
    </div>
  );
};

// --- User Management Modals ---

interface UserCreateModalProps {
  onClose: () => void;
  onSave: () => void;
}

const UserCreateModal: React.FC<UserCreateModalProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    email: '',
    firstName: '',
    lastName: '',
    role: UserRole.USER,
    groupIds: [],
    isActive: true,
    password: 'care1234!',
    mustChangePassword: true,
  });

  const toggleGroup = (groupId: string) => {
    const current = formData.groupIds || [];
    setFormData({
      ...formData,
      groupIds: current.includes(groupId)
        ? current.filter(id => id !== groupId)
        : [...current, groupId]
    });
  };

  const handleSave = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      alert("Champs manquants");
      return;
    }
    try {
        await dataService.addUser(formData as Omit<User, 'id'>);
        onSave();
    } catch(e) {
        alert("Erreur création utilisateur");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">Inviter un utilisateur</h3>
          <button onClick={onClose} className="p-2"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
           <div className="space-y-4">
              <input type="email" placeholder="Email" className="w-full p-2 border rounded" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                 <input type="text" placeholder="Prénom" className="w-full p-2 border rounded" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                 <input type="text" placeholder="Nom" className="w-full p-2 border rounded" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div>
                 <label className="text-xs font-semibold text-slate-500 mb-1 block">Mot de passe provisoire</label>
                 <input
                   type="text"
                   className="w-full p-2 border rounded"
                   value={formData.password || ''}
                   onChange={e => setFormData({ ...formData, password: e.target.value })}
                   placeholder="care1234!"
                 />
              </div>
              <select className="w-full p-2 border rounded" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                 <option value={UserRole.USER}>Athlète</option>
                 <option value={UserRole.ADMIN}>Admin</option>
              </select>
           </div>
           
           <div>
              <p className="mb-2 font-bold text-sm">Groupes</p>
              <div className="space-y-2">
                {GROUPS.map(group => (
                    <label key={group.id} className="flex gap-2 items-center">
                        <input type="checkbox" checked={formData.groupIds?.includes(group.id)} onChange={() => toggleGroup(group.id)} />
                        {group.name}
                    </label>
                ))}
              </div>
           </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">Annuler</button>
          <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded">Créer</button>
        </div>
      </div>
    </div>
  );
};

interface UserEditModalProps {
  user: User;
  onClose: () => void;
  onSave: () => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState<User>({ ...user });
  const [allAudios, setAllAudios] = useState<AudioTrack[]>([]);
  const [directAudioIds, setDirectAudioIds] = useState<string[]>([]);
  const [searchAudio, setSearchAudio] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  // Fetch audios to calculate permissions
  useEffect(() => {
     dataService.getAllAudios().then(audios => {
        setAllAudios(audios);
        // Calculate which audios have this user in their allowedUserIds
        const allowed = audios
          .filter(a => a.allowedUserIds && a.allowedUserIds.includes(user.id))
          .map(a => a.id);
        setDirectAudioIds(allowed);
     });
  }, [user.id]);

  const toggleGroup = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      groupIds: prev.groupIds.includes(groupId)
        ? prev.groupIds.filter(id => id !== groupId)
        : [...prev.groupIds, groupId]
    }));
  };

  const toggleDirectAudio = (audioId: string) => {
    setDirectAudioIds(prev => 
      prev.includes(audioId) 
        ? prev.filter(id => id !== audioId) 
        : [...prev, audioId]
    );
  };

  const handleSave = async () => {
    try {
        await dataService.updateUser(formData);
        await dataService.updateUserAudioAccess(user.id, directAudioIds);
        onSave();
    } catch(e) {
        console.error(e);
    }
  };

  const handleResetPassword = async () => {
     try {
       await authService.resetUserPassword(user.id);
       setResetMsg("Mot de passe réinitialisé");
       setTimeout(() => setResetMsg(''), 3000);
     } catch (e) {
       console.error(e);
     }
  };

  const filteredAudios = allAudios.filter(audio => 
    audio.title.toLowerCase().includes(searchAudio.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
             <h3 className="text-xl font-bold text-slate-900">Modifier {user.email}</h3>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <h4 className="font-bold text-sm text-slate-500 uppercase">Infos</h4>
                 <div className="grid grid-cols-2 gap-2">
                    <input className="border p-2 rounded" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                    <input className="border p-2 rounded" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                 </div>
                 
                 <h4 className="font-bold text-sm text-slate-500 uppercase">Groupes</h4>
                 <div className="space-y-2 border p-2 rounded max-h-40 overflow-auto">
                    {GROUPS.map(g => (
                       <label key={g.id} className="flex gap-2">
                          <input type="checkbox" checked={formData.groupIds.includes(g.id)} onChange={() => toggleGroup(g.id)} />
                          {g.name}
                       </label>
                    ))}
                 </div>
                 
                 <button onClick={handleResetPassword} className="text-orange-600 border border-orange-200 bg-orange-50 px-4 py-2 rounded w-full">Réinitialiser MDP</button>
                 {resetMsg && <p className="text-center text-green-600 text-sm">{resetMsg}</p>}
              </div>

              <div className="space-y-4">
                 <h4 className="font-bold text-sm text-slate-500 uppercase">Accès Audio Direct</h4>
                 <input placeholder="Chercher..." className="border p-2 rounded w-full" value={searchAudio} onChange={e => setSearchAudio(e.target.value)} />
                 <div className="border rounded max-h-60 overflow-auto">
                    {filteredAudios.map(a => (
                       <div key={a.id} className="flex justify-between p-2 hover:bg-slate-50 border-b">
                          <div className="flex items-center gap-2 overflow-hidden">
                             <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
                                <Music size={14} />
                             </div>
                             <span className="text-sm truncate w-40">{a.title}</span>
                          </div>
                          <button onClick={() => toggleDirectAudio(a.id)} className={`text-xs px-2 py-1 rounded flex-shrink-0 ${directAudioIds.includes(a.id) ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>
                             {directAudioIds.includes(a.id) ? 'Autorisé' : 'Ajouter'}
                          </button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
           <button onClick={onClose} className="px-4 py-2 border rounded">Annuler</button>
           <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded">Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const refresh = async () => {
      setLoading(true);
      try {
          const data = await dataService.getUsers();
          setUsers(data);
      } catch(e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      refresh();
  }, []);

  const handleSendWelcome = async (userId: string) => {
    setSendingId(userId);
    try {
      await dataService.sendWelcomeEmail(userId);
      alert('Email envoyé');
    } catch (e) {
      console.error(e);
      alert("Impossible d'envoyer l'email");
    } finally {
      setSendingId(null);
    }
  };

  const handleSave = () => {
    setIsCreateModalOpen(false);
    setEditingUser(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Utilisateurs</h2>
        <div className="flex gap-2">
          <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
            <Plus size={18} /> <span>Créer</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nom</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Groupes</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">{user.firstName[0]}</div>
                        <div>
                            <div className="font-bold text-slate-900">{user.firstName} {user.lastName}</div>
                            <div className="text-xs">{user.email}</div>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-4">{user.role}</td>
                  <td className="px-6 py-4">
                     {user.groupIds.map(gid => GROUPS.find(g => g.id === gid)?.name).join(', ')}
                  </td>
                  <td className="px-6 py-4">
                     {user.isActive ? <span className="text-green-600">Actif</span> : <span className="text-red-500">Inactif</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handleSendWelcome(user.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-semibold border-slate-200 text-slate-600 hover:border-primary-200 hover:text-primary-600"
                      >
                        <Mail size={14} /> {sendingId === user.id ? 'Envoi...' : 'Envoyer'}
                      </button>
                      <button onClick={() => setEditingUser(user)} className="text-primary-600 hover:underline">Modifier</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
         </div>
      </div>

      {isCreateModalOpen && (
        <UserCreateModal onClose={() => setIsCreateModalOpen(false)} onSave={handleSave} />
      )}
      
      {editingUser && (
        <UserEditModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSave} />
      )}
    </div>
  );
};
