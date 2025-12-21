import React, { useState, useEffect } from 'react';
import { Headphones, ShieldCheck, LogOut, LayoutDashboard, Library, Users as UsersIcon, Home, Heart, Menu, X, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { User, ViewState, AudioTrack, UserRole } from './types';
import { authService, dataService } from './services/apiClient';
import { AudioPlayer } from './components/AudioPlayer';
import { AdminDashboard, AdminLibrary, AdminUsers } from './components/AdminViews';
import UserDashboard from './components/UserDashboard';
import { UserCatalog } from './components/UserViews';

// --- Login Component ---
const LoginView: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await authService.login(email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-xl mb-4">
          <Headphones size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Careformance Audio</h1>
        <p className="text-slate-500 mt-2">Accompagnement cérébral pour sportifs de haut niveau</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email professionnel</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-slate-50 focus:bg-white"
              placeholder="exemple@athlete.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all bg-slate-50 focus:bg-white pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-slate-500 bg-slate-100 p-2 rounded-lg">
            <strong>Admin :</strong> admin@careformance.com / admin
          </p>
          <p className="text-xs text-slate-500 bg-slate-100 p-2 rounded-lg">
            <strong>Athlète :</strong> athlete@careformance.com / care1234!
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Change Password View ---
const ChangePasswordView: React.FC<{ user: User, onComplete: () => void }> = ({ user, onComplete }) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPass !== confirmPass) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authService.changePassword(user.id, newPass);
      onComplete();
    } catch (err: any) {
      setError(err.message || "Erreur lors du changement de mot de passe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="mb-6 flex items-center gap-3 text-slate-900">
           <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
             <KeyRound size={24} />
           </div>
           <h2 className="text-xl font-bold">Première connexion</h2>
        </div>
        
        <p className="text-slate-500 mb-6 text-sm">
          Pour la sécurité de votre compte, veuillez définir un nouveau mot de passe personnel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none pr-12"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Confirmer le mot de passe</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none pr-12"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Mise à jour...' : 'Définir mon mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('LOGIN');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Audio Player State
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  
  // Data State
  const [userAudios, setUserAudios] = useState<AudioTrack[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.mustChangePassword) {
        setCurrentView('CHANGE_PASSWORD');
      } else {
        const loadData = async () => {
          if (currentUser.role === UserRole.ADMIN) {
              try {
                setUserAudios([]); // Admin views fetch their own data
                setCurrentView('ADMIN_DASHBOARD');
              } catch(e) { console.error(e); }
          } else {
              try {
                 const audios = await dataService.getAudiosForUser(currentUser);
                 setUserAudios(audios);
                 setCurrentView('USER_DASHBOARD');
              } catch(e) { console.error(e); }
          }
        };
        loadData();
      }
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handlePasswordChangeComplete = () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, mustChangePassword: false };
    setCurrentUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setCurrentView('LOGIN');
    setCurrentTrack(null);
  };

  const toggleFavorite = (audioId: string) => {
    if (!currentUser) return;
    setFavorites(prev => 
      prev.includes(audioId) ? prev.filter(id => id !== audioId) : [...prev, audioId]
    );
  };

  const renderContent = () => {
    switch (currentView) {
      case 'USER_DASHBOARD': return <UserDashboard />;
      case 'ADMIN_DASHBOARD': return <AdminDashboard />;
      case 'ADMIN_AUDIOS': return <AdminLibrary onPlay={setCurrentTrack} />;
      case 'ADMIN_USERS': return <AdminUsers />;
      case 'CATALOG': return (
        <UserCatalog 
          audios={userAudios} 
          onPlay={setCurrentTrack} 
          favorites={favorites} 
          onToggleFavorite={toggleFavorite}
          title="Mes programmes"
          showGroupFilters
          showGroupName={false}
        />
      );
      case 'FAVORITES': return (
        <UserCatalog 
          audios={userAudios.filter(a => favorites.includes(a.id))} 
          onPlay={setCurrentTrack} 
          favorites={favorites} 
          onToggleFavorite={toggleFavorite}
          title="Mon training personnalisé"
          subtitle="Adaptez votre training comme bon vous semble !"
          showGroupFilters={false}
          showGroupName
        />
      );
      default: return null;
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => { setCurrentView(view); setMobileMenuOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left font-medium ${
        currentView === view 
          ? 'bg-primary-50 text-primary-700' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  if (!currentUser || currentView === 'LOGIN') {
    return <LoginView onLogin={handleLoginSuccess} />;
  }

  if (currentView === 'CHANGE_PASSWORD') {
    return <ChangePasswordView user={currentUser} onComplete={handlePasswordChangeComplete} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full z-10">
        <div className="p-6">
          <div className="flex items-center gap-3 text-primary-700">
            <div className="p-2 bg-primary-100 rounded-lg">
               <Headphones size={24} />
            </div>
            <span className="font-bold text-lg text-slate-900 tracking-tight">Careformance</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {currentUser.role === UserRole.ADMIN ? (
            <>
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Administration</p>
              <NavItem view="ADMIN_DASHBOARD" icon={LayoutDashboard} label="Tableau de bord" />
              <NavItem view="ADMIN_AUDIOS" icon={Library} label="Bibliothèque" />
              <NavItem view="ADMIN_USERS" icon={UsersIcon} label="Utilisateurs" />
            </>
          ) : (
            <>
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 mt-4">Menu</p>
              <NavItem view="USER_DASHBOARD" icon={LayoutDashboard} label="Tableau de bord" />
              <NavItem view="CATALOG" icon={Home} label="Programme" />
              <NavItem view="FAVORITES" icon={Heart} label="Training" />
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
               {currentUser.firstName[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">{currentUser.firstName}</p>
              <p className="text-xs text-slate-500 truncate">{currentUser.role === 'ADMIN' ? 'Administrateur' : 'Athlète'}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-slate-200 z-30 px-4 py-3 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary-100 rounded-lg text-primary-700">
               <Headphones size={20} />
            </div>
            <span className="font-bold text-slate-900">Careformance</span>
         </div>
         <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600">
           {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
         </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-20 md:hidden" onClick={() => setMobileMenuOpen(false)}>
           <div className="absolute right-0 top-0 h-full w-64 bg-white shadow-2xl p-4 pt-20" onClick={e => e.stopPropagation()}>
              <nav className="space-y-2">
                {currentUser.role === UserRole.ADMIN ? (
                   <>
                     <NavItem view="ADMIN_DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
                     <NavItem view="ADMIN_AUDIOS" icon={Library} label="Bibliothèque" />
                     <NavItem view="ADMIN_USERS" icon={UsersIcon} label="Utilisateurs" />
                   </>
                 ) : (
                   <>
                      <NavItem view="USER_DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
                      <NavItem view="CATALOG" icon={Home} label="Programme" />
                      <NavItem view="FAVORITES" icon={Heart} label="Mon training" />
                   </>
                 )}
                  <div className="border-t border-slate-100 my-4 pt-4">
                     <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 text-red-500 w-full text-left">
                       <LogOut size={20} />
                       <span>Déconnexion</span>
                     </button>
                  </div>
              </nav>
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-full relative pt-16 md:pt-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {renderContent()}
        </div>
      </main>

      {/* Persistent Audio Player */}
      <AudioPlayer 
        track={currentTrack} 
        userId={currentUser.id} 
        onClose={() => setCurrentTrack(null)} 
      />

    </div>
  );
};

export default App;
