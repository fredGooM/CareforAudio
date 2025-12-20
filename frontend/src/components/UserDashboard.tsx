import React, { useEffect, useState } from 'react';
import { dataService, CATEGORIES } from '../services/apiClient';
import { UserDashboardData } from '../types';
import { Clock, Flame, Trophy, RefreshCw } from 'lucide-react';

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

const UserDashboard: React.FC = () => {
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataService.getAnalyticsDashboard()
      .then((response) => {
        if (response.role === 'USER') {
          setData(response);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Chargement des performances...</div>;
  }

  if (!data) {
    return <div className="p-6 text-center text-slate-500">Aucune donnée disponible.</div>;
  }

  const categoryLabels: Record<string, string> = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = cat.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Pilotage Personnel</h2>
        <p className="text-slate-500">Surveille ta charge mentale et ton assiduité.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Clock size={24} /></div>
          <div>
            <p className="text-sm text-slate-500">Temps passé</p>
            <p className="text-2xl font-bold text-slate-900">{data.totalMinutes} min</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Flame size={24} /></div>
          <div>
            <p className="text-sm text-slate-500">Série (jours)</p>
            <p className="text-2xl font-bold text-slate-900">{data.streakDays}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
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
            <p className="text-sm text-slate-500">Progression globale</p>
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
              <p className="font-semibold text-slate-900">{item.title}</p>
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
