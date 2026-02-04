import React, { useEffect, useMemo, useState } from 'react';
import { dataService, CATEGORIES } from '../services/apiClient';
import { UserDashboardData, User, Category, AudioTrack } from '../types';
import { Clock, Flame, Trophy, RefreshCw, Play } from 'lucide-react';

const CategoryCircle: React.FC<{ label: string; percent: number }> = ({ label, percent }) => {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={120} height={120} className="transform -rotate-90">
        <circle cx={60} cy={60} r={radius} stroke="#e2e8f0" strokeWidth={10} fill="none" />
        <circle
          cx={60}
          cy={60}
          r={radius}
          stroke="#2563eb"
          strokeWidth={10}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <text x="60" y="65" textAnchor="middle" fill="#0f172a" fontSize="20" className="rotate-90">
          {percent}%
        </text>
      </svg>
      <p className="mt-2 text-sm font-medium text-slate-600 text-center">{label}</p>
    </div>
  );
};

const UserDashboard: React.FC<{ audios: AudioTrack[]; onPlay: (audio: AudioTrack) => void }> = ({ audios, onPlay }) => {
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioMap = useMemo(() => new Map(audios.map(a => [a.id, a])), [audios]);

  const buildFallbackData = async (): Promise<UserDashboardData> => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsedUser = JSON.parse(stored) as User;
        // Try to fetch accessible audios so that at least the catalogue loads
        await dataService.getAudiosForUser(parsedUser);
      }
    } catch (err) {
      console.warn('Fallback catalogue fetch failed', err);
    }

    return {
      totalMinutes: 0,
      last7DaysMinutes: 0,
      completionPercent: 0,
      streakDays: 0,
      completedCount: 0,
      categoryProgress: categories.map((category) => ({
        categoryId: category.id,
        percent: 0
      })),
      continueListening: []
    };
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await dataService.getAnalyticsDashboard();
        if (!cancelled && response.role === 'USER') {
          setData(response);
        } else if (!cancelled) {
          throw new Error('Réponse inattendue');
        }
      } catch (err) {
        console.error('User dashboard unavailable', err);
        if (cancelled) return;
        setError("Impossible de récupérer les métriques temps réel. Affichage d'une vue simplifiée.");
        const fallback = await buildFallbackData();
        if (!cancelled) {
          setData(fallback);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    dataService.getCategories().then(setCategories).catch(() => undefined);
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Chargement des performances...</div>;
  }

  if (!data) {
    return <div className="p-6 text-center text-slate-500">Aucune donnée disponible.</div>;
  }

  const categoryLabels: Record<string, string> = categories.reduce((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Pilotage Personnel</h2>
        <p className="text-slate-500">Surveille ta charge mentale et ton assiduité.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Clock size={24} /></div>
          <div>
            <p className="text-sm text-slate-500">Temps passé (total)</p>
            <p className="text-2xl font-bold text-slate-900">{data.totalMinutes} min</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Clock size={24} /></div>
          <div>
            <p className="text-sm text-slate-500">Temps passé (7 jours)</p>
            <p className="text-2xl font-bold text-slate-900">{data.last7DaysMinutes} min</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 md:col-span-1">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Trophy size={24} /></div>
          <div>
            <p className="text-sm text-slate-500">Podcasts terminés</p>
            <p className="text-2xl font-bold text-slate-900">{data.completedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-slate-500">Progression globale par catégorie</p>
            <p className="text-3xl font-bold text-slate-900">{data.completionPercent}%</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.categoryProgress.map((cat) => (
            <CategoryCircle key={cat.categoryId} label={categoryLabels[cat.categoryId] || cat.categoryId} percent={cat.percent} />
          ))}
          {data.categoryProgress.length === 0 && <p className="text-slate-500">Commence un audio pour voir ta progression par thème.</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Continuer l'écoute</h3>
            <p className="text-sm text-slate-500">Reprends là où tu t'es arrêté.</p>
          </div>
          <RefreshCw className="text-slate-400" size={18} />
        </div>
        <div className="space-y-4">
          {data.continueListening.length === 0 && (
            <p className="text-sm text-slate-500">Tu es à jour, rien à reprendre pour l'instant.</p>
          )}
          {data.continueListening.map((item) => (
            <div key={item.audioId} className="p-4 border border-slate-100 rounded-2xl hover:border-primary-100 transition">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-slate-900">{item.title}</p>
                <button
                  type="button"
                  onClick={() => {
                    const audio = audioMap.get(item.audioId);
                    if (audio) onPlay(audio);
                  }}
                  disabled={!audioMap.has(item.audioId)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  <Play size={14} /> Rejouer
                </button>
              </div>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-primary-500 rounded-full"
                  style={{ width: `${item.progressPercent}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-1">{item.progressPercent}% complété</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
