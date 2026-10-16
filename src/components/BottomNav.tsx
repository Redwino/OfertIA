import React from 'react';
import { 
  Home, 
  Search, 
  Camera, 
  Calculator, 
  User, 
  Layers,
  MapPin,
  Calendar,
  Sparkles,
  Receipt
} from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenScanner: () => void;
  cartItemCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenScanner,
  cartItemCount,
}) => {
  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 safe-area-bottom shadow-lg"
      aria-label="Navegación principal inferior"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Inicio */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] ${
            currentTab === 'dashboard'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Ir a Inicio"
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Inicio</span>
        </button>

        {/* 2. Precios y Productos */}
        <button
          onClick={() => onSelectTab('products')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] ${
            currentTab === 'products'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Buscar y comparar precios"
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Precios</span>
        </button>

        {/* 3. Botón Central Destacado: Escanear Ticket */}
        <button
          onClick={onOpenScanner}
          className="flex flex-col items-center justify-center -mt-5 transition-transform active:scale-95 group focus:outline-none"
          aria-label="Fotografiar y escanear ticket de compra"
        >
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 ring-4 ring-white dark:ring-slate-900 group-hover:scale-105 transition-all">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            Escanear
          </span>
        </button>

        {/* 4. Calculadora y Carrito */}
        <button
          onClick={() => onSelectTab('calculator')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] relative ${
            currentTab === 'calculator'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Calculadora inteligente y carrito de compra"
        >
          <div className="relative">
            <Calculator className="w-5 h-5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white font-mono text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Calculadora</span>
        </button>

        {/* 5. Perfil y Cuenta */}
        <button
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-colors min-w-[56px] ${
            currentTab === 'profile'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-label="Ir a Mi Perfil"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Perfil</span>
        </button>
      </div>
    </nav>
  );
};
