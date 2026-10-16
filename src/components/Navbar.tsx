import React from 'react';
import { 
  MapPin, 
  Sparkles, 
  Camera, 
  ShoppingCart, 
  Sun, 
  Moon, 
  User, 
  Globe 
} from 'lucide-react';
import { ThemeMode, UserAccount, UserLocation } from '../types/index.ts';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  userLocation: UserLocation;
  currentUser: UserAccount;
  onOpenLocationModal: () => void;
  onOpenAuthModal: () => void;
  onOpenScanner: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  cartItemCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  userLocation,
  currentUser,
  onOpenLocationModal,
  onOpenAuthModal,
  onOpenScanner,
  theme,
  onToggleTheme,
  cartItemCount,
}) => {
  const desktopNavItems = [
    { id: 'dashboard', label: 'Inicio' },
    { id: 'savings-route', label: 'Ruta de Ahorro' },
    { id: 'products', label: 'Precios' },
    { id: 'calculator', label: 'Calculadora' },
    { id: 'map', label: 'Mapa' },
    { id: 'calendar', label: 'Calendario' },
    { id: 'comparator', label: 'Comparador' },
    { id: 'agents', label: 'Agente IA' },
    { id: 'history', label: 'Mis Ahorros' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand & Location */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
            aria-label="Ir al inicio de OfertIA"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm font-bold text-lg group-hover:scale-105 transition-transform">
              O%
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              Ofert<span className="text-emerald-600 dark:text-emerald-400">IA</span>
            </span>
          </button>

          {/* Location Badge */}
          <button
            onClick={onOpenLocationModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 rounded-xl transition-colors"
            title="Cambiar ubicación de referencia"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="max-w-[130px] truncate">{userLocation.label}</span>
          </button>
        </div>

        {/* Zone 2: Navigation Links for Desktop */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-300">
          {desktopNavItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`transition-colors whitespace-nowrap shrink-0 pb-1 relative text-xs font-semibold ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Profile */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            title="Alternar modo claro / oscuro"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Cart Shortcut with Badge */}
          <button
            onClick={() => onSelectTab('calculator')}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
            title="Ver calculadora y carrito"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartItemCount > 0 && (
              <span className="absolute 0 top-0.5 right-0.5 bg-emerald-600 text-white font-mono text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>

          {/* Escanear Ticket Button */}
          <button
            onClick={onOpenScanner}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Escanear Ticket</span>
          </button>

          {/* User Account / Google Login Pill */}
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-2 p-1.5 pr-2.5 text-xs font-semibold rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-colors text-slate-800 dark:text-slate-200"
            title="Gestionar cuenta y preferencias"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
              {currentUser.isAuthenticated ? (currentUser.name ? currentUser.name[0] : 'U') : <User className="w-3.5 h-3.5" />}
            </div>
            <span className="hidden sm:inline max-w-[80px] truncate">
              {currentUser.isAuthenticated ? currentUser.name.split(' ')[0] : 'Cuenta'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
