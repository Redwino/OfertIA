import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Globe, 
  Check, 
  X, 
  ArrowRight, 
  CreditCard, 
  MapPin, 
  User,
  LogOut,
  Calendar,
  FileSpreadsheet,
  Map,
  CheckCircle2
} from 'lucide-react';
import { UserAccount, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { googleSignIn, googleSignOut, isGoogleConnected } from '../services/google-auth.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUpdateUser: (user: UserAccount) => void;
  onOpenLocationModal: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  onOpenLocationModal,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        const { user } = result;
        const updated: UserAccount = {
          ...currentUser,
          id: user.uid || `usr-${Date.now()}`,
          name: user.displayName || 'Usuario de Google',
          email: user.email || 'usuario@gmail.com',
          avatarUrl: user.photoURL || undefined,
          isAuthenticated: true,
        };
        onUpdateUser(updated);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Error al iniciar sesión con Google.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      onUpdateUser({
        ...currentUser,
        isAuthenticated: false,
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        role="dialog"
        aria-labelledby="auth-modal-title"
      >
        {/* Header con Logo OfertIA */}
        <div className="p-6 bg-gradient-to-b from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md mx-auto mb-3 font-bold text-xl">
            O%
          </div>

          <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {currentUser.isAuthenticated ? 'Tu Cuenta OfertIA & Google' : 'Conecta con Google'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {currentUser.isAuthenticated
              ? 'Cuenta conectada con Google Maps, Google Calendar y Google Sheets.'
              : 'Inicia sesión con tu cuenta de Google para agendar compras y sincronizar tus planillas.'}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {authError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 rounded-xl">
              {authError}
            </div>
          )}

          {!currentUser.isAuthenticated ? (
            /* Pantalla de Inicio de Sesión con Google (Diseño Oficial de Botón Google) */
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-2xl font-semibold text-sm text-slate-800 dark:text-slate-100 shadow-xs transition-all active:scale-[0.99]"
              >
                {/* Google multi-color SVG icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isSigningIn ? 'Conectando con Google...' : 'Iniciar Sesión con Google'}</span>
              </button>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs text-slate-600 dark:text-slate-300 space-y-2 border border-slate-200/60 dark:border-slate-700/60">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Integraciones oficiales habilitadas:</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Map className="w-3.5 h-3.5 text-blue-500" />
                  <span>Google Maps: Localización precisa de sucursales</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Google Calendar: Agendar recordatorios de compras</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
                  <span>Google Sheets: Exportar auditoría de ahorro a Drive</span>
                </div>
              </div>
            </div>
          ) : (
            /* Cuenta autenticada */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-12 h-12 rounded-full border-2 border-emerald-500 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
                    {currentUser.name ? currentUser.name[0] : 'U'}
                  </div>
                )}
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{currentUser.name}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{currentUser.email}</div>
                  <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Google Workspace Conectado
                  </div>
                </div>
              </div>

              {/* Estado de Servicios de Google */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Servicios Activos
                </div>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Map className="w-4 h-4 text-blue-500" />
                      <span>Google Maps Platform</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                      Activo
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <Calendar className="w-4 h-4 text-emerald-500" />
                      <span>Google Calendar</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                      Conectado
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                      <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      <span>Google Sheets & Drive</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md">
                      Conectado
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs"
                >
                  Listo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
