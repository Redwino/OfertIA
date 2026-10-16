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
  LogOut
} from 'lucide-react';
import { UserAccount, UserLocation, UserPaymentMethod } from '../types/index.ts';

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
  const [step, setStep] = useState<'login' | 'country_currency' | 'profile_details'>('login');
  const [name, setName] = useState(currentUser.name || 'Damián');
  const [email, setEmail] = useState(currentUser.email || 'damian.nqn.91@gmail.com');
  const [country, setCountry] = useState(currentUser.country || 'Argentina');
  const [currency, setCurrency] = useState(currentUser.currency || 'ARS');

  if (!isOpen) return null;

  const handleSimulateGoogleLogin = () => {
    // Autenticación de Google exitosa
    const updated: UserAccount = {
      ...currentUser,
      id: `usr-${Date.now()}`,
      name: name || 'Damián',
      email: email || 'usuario@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      country,
      currency,
      currencySymbol: currency === 'USD' ? 'US$' : currency === 'EUR' ? '€' : '$',
      isAuthenticated: true,
    };
    onUpdateUser(updated);
    setStep('country_currency');
  };

  const handleCompleteSetup = () => {
    const updated: UserAccount = {
      ...currentUser,
      country,
      currency,
      currencySymbol: currency === 'USD' ? 'US$' : currency === 'EUR' ? '€' : '$',
    };
    onUpdateUser(updated);
    onClose();
  };

  const handleSignOut = () => {
    onUpdateUser({
      ...currentUser,
      isAuthenticated: false,
    });
    setStep('login');
  };

  const countries = [
    { name: 'Argentina', code: 'AR', currency: 'ARS', symbol: '$' },
    { name: 'México', code: 'MX', currency: 'MXN', symbol: '$' },
    { name: 'Colombia', code: 'CO', currency: 'COP', symbol: '$' },
    { name: 'Chile', code: 'CL', currency: 'CLP', symbol: '$' },
    { name: 'España', code: 'ES', currency: 'EUR', symbol: '€' },
    { name: 'Estados Unidos', code: 'US', currency: 'USD', symbol: 'US$' },
  ];

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
            {currentUser.isAuthenticated ? 'Tu Cuenta en OfertIA' : 'Bienvenido a OfertIA'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            {currentUser.isAuthenticated
              ? 'Gestiona tu perfil, preferencias regionales y sincronización de datos.'
              : 'Asistente inteligente de compras, tickets con OCR y optimización de promociones.'}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {!currentUser.isAuthenticated ? (
            /* Pantalla de Inicio de Sesión con Google */
            <div className="space-y-4">
              <button
                onClick={handleSimulateGoogleLogin}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-2xl font-semibold text-sm text-slate-800 dark:text-slate-100 shadow-xs transition-all active:scale-[0.99]"
              >
                {/* Google multi-color SVG icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continuar con Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-medium absolute">
                  seguridad y privacidad garantizadas
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 dark:text-slate-400 space-y-1.5 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Sin acceso a tus cuentas bancarias</span>
                </div>
                <p className="text-[11px]">
                  OfertIA nunca solicita claves ni credenciales de bancos. La cuenta permite sincronizar tus tickets escaneados y medios de pago en la nube.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-2 font-medium"
              >
                Continuar como invitado por ahora
              </button>
            </div>
          ) : (
            /* Pantalla de Perfil Autenticado y Configuración Regional */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  {currentUser.name ? currentUser.name[0] : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.email}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                  Google Conectado
                </span>
              </div>

              {/* País y Moneda */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  País y Moneda de Preferencia:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {countries.map((c) => {
                    const isSelected = country === c.name;
                    return (
                      <button
                        key={c.code}
                        onClick={() => {
                          setCountry(c.name);
                          setCurrency(c.currency);
                        }}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 font-semibold'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>{c.name} ({c.currency})</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Botón para guardar / cerrar sesión */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors flex items-center gap-1 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión</span>
                </button>

                <button
                  onClick={handleCompleteSetup}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
                >
                  Guardar Preferencias
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
