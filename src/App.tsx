import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { ProductCatalogView } from './components/ProductCatalogView.tsx';
import { MapView } from './components/MapView.tsx';
import { ComparatorView } from './components/ComparatorView.tsx';
import { CalculatorView } from './components/CalculatorView.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { MultiAgentView } from './components/MultiAgentView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { LocationSelector } from './components/LocationSelector.tsx';
import { PromoModal } from './components/PromoModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { TicketScannerModal } from './components/TicketScannerModal.tsx';
import { 
  DEFAULT_LOCATIONS, 
  DEFAULT_USER_PAYMENT_METHODS, 
  PROMOTIONS_DATABASE 
} from './data/promotions.ts';
import { CATALOG_PRODUCTS, OBSERVED_PRICES } from './data/products.ts';
import { 
  CartProductEntry, 
  ObservedPrice, 
  ProductItem, 
  Promotion, 
  PurchaseRecord, 
  ThemeMode, 
  UserAccount, 
  UserLocation, 
  UserPaymentMethod 
} from './types/index.ts';

// Registros de compra iniciales de demostración
const INITIAL_PURCHASE_RECORDS: PurchaseRecord[] = [
  {
    id: 'rec-1',
    date: '2026-10-10',
    storeName: 'Coto (Sucursal Palermo)',
    category: 'supermercados',
    paymentMethodUsed: 'Santander Crédito Visa Platinum',
    amountSpent: 60000,
    estimatedSavings: 12000,
    actualSavings: 12000,
    verifiedStatus: 'CONFIRMED',
    notes: '20% con tope de $12.000 acreditado en resumen.',
    itemsCount: 4,
  },
  {
    id: 'rec-2',
    date: '2026-10-08',
    storeName: 'YPF (Palermo)',
    category: 'combustible',
    paymentMethodUsed: 'Santander Crédito Visa (App YPF)',
    amountSpent: 42000,
    estimatedSavings: 6300,
    actualSavings: 6300,
    verifiedStatus: 'CONFIRMED',
    notes: '15% de ahorro en nafta Infinia.',
    itemsCount: 1,
  },
  {
    id: 'rec-3',
    date: '2026-10-04',
    storeName: 'Farmacity (Malabia)',
    category: 'farmacias',
    paymentMethodUsed: 'BBVA Débito Visa',
    amountSpent: 28000,
    estimatedSavings: 5600,
    actualSavings: 5600,
    verifiedStatus: 'CONFIRMED',
    notes: '20% en perfumería.',
    itemsCount: 2,
  },
];

// Carrito inicial de prueba para la calculadora inteligente
const INITIAL_CART_ITEMS: CartProductEntry[] = [
  {
    id: 'cart-1',
    product: CATALOG_PRODUCTS[0], // Leche La Serenísima
    quantity: 2,
    selectedStore: 'Supermercados DIA',
    unitPrice: 1390,
    itemSubtotal: 2780,
  },
  {
    id: 'cart-2',
    product: CATALOG_PRODUCTS[1], // Aceite Cocinero
    quantity: 1,
    selectedStore: 'Coto Digital',
    unitPrice: 2490,
    itemSubtotal: 2490,
  },
  {
    id: 'cart-3',
    product: CATALOG_PRODUCTS[2], // Yerba Playadito 1kg
    quantity: 2,
    selectedStore: 'Carrefour Hiper',
    unitPrice: 3890,
    itemSubtotal: 7780,
  },
];

const DEFAULT_USER_ACCOUNT: UserAccount = {
  id: 'usr-demo-1',
  name: 'Damián (Usuario Demo)',
  email: 'damian.nqn.91@gmail.com',
  country: 'Argentina',
  currency: 'ARS',
  currencySymbol: '$',
  isAuthenticated: true,
  theme: 'light',
  notificationsEnabled: true,
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [tabExtraData, setTabExtraData] = useState<any>(null);

  // Tema (light / dark)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('ahorropro_theme');
      return (saved as ThemeMode) || 'light';
    } catch {
      return 'light';
    }
  });

  // Usuario autenticado / cuenta
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    try {
      const saved = localStorage.getItem('ahorropro_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER_ACCOUNT;
    } catch {
      return DEFAULT_USER_ACCOUNT;
    }
  });

  // Ubicación del usuario con persistencia
  const [userLocation, setUserLocation] = useState<UserLocation>(() => {
    try {
      const saved = localStorage.getItem('ahorropro_location');
      return saved ? JSON.parse(saved) : DEFAULT_LOCATIONS[0];
    } catch {
      return DEFAULT_LOCATIONS[0];
    }
  });

  // Radio de búsqueda
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ahorropro_radius');
      return saved ? Number(saved) : 10;
    } catch {
      return 10;
    }
  });

  // Medios de pago con persistencia
  const [paymentMethods, setPaymentMethods] = useState<UserPaymentMethod[]>(() => {
    try {
      const saved = localStorage.getItem('ahorropro_payment_methods');
      return saved ? JSON.parse(saved) : DEFAULT_USER_PAYMENT_METHODS;
    } catch {
      return DEFAULT_USER_PAYMENT_METHODS;
    }
  });

  // Historial de compras con persistencia
  const [records, setRecords] = useState<PurchaseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ahorropro_records');
      return saved ? JSON.parse(saved) : INITIAL_PURCHASE_RECORDS;
    } catch {
      return INITIAL_PURCHASE_RECORDS;
    }
  });

  // Carrito de compras para la calculadora inteligente
  const [cartItems, setCartItems] = useState<CartProductEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ahorropro_cart');
      return saved ? JSON.parse(saved) : INITIAL_CART_ITEMS;
    } catch {
      return INITIAL_CART_ITEMS;
    }
  });

  // Precios observados (base de precios alimentada por tickets)
  const [observedPrices, setObservedPrices] = useState<ObservedPrice[]>(() => {
    try {
      const saved = localStorage.getItem('ahorropro_observed_prices');
      return saved ? JSON.parse(saved) : OBSERVED_PRICES;
    } catch {
      return OBSERVED_PRICES;
    }
  });

  // Modales
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [selectedPromoForDetail, setSelectedPromoForDetail] = useState<Promotion | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);

  // Aplicar tema en documentElement
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('ahorropro_theme', theme);
    } catch {}
  }, [theme]);

  // Sincronizar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ahorropro_user', JSON.stringify(currentUser));
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem('ahorropro_location', JSON.stringify(userLocation));
    } catch {}
  }, [userLocation]);

  useEffect(() => {
    try {
      localStorage.setItem('ahorropro_radius', String(searchRadiusKm));
    } catch {}
  }, [searchRadiusKm]);

  useEffect(() => {
    try {
      localStorage.setItem('ahorropro_payment_methods', JSON.stringify(paymentMethods));
    } catch {}
  }, [paymentMethods]);

  useEffect(() => {
    try {
      localStorage.setItem('ahorropro_records', JSON.stringify(records));
    } catch {}
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('ahorropro_cart', JSON.stringify(cartItems));
    } catch {}
  }, [cartItems]);

  useEffect(() => {
    try {
      localStorage.setItem('ahorropro_observed_prices', JSON.stringify(observedPrices));
    } catch {}
  }, [observedPrices]);

  // Handlers
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleNavigateToTab = (tab: string, extraData?: any) => {
    setCurrentTab(tab);
    setTabExtraData(extraData ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddPurchaseRecord = (newRecord: PurchaseRecord) => {
    setRecords([newRecord, ...records]);
  };

  const handleDeletePurchaseRecord = (id: string) => {
    setRecords(records.filter((r) => r.id !== id));
  };

  const handleResetPaymentMethods = () => {
    setPaymentMethods(DEFAULT_USER_PAYMENT_METHODS);
  };

  // Manejador para guardar compras desde el escáner de tickets OCR
  const handleSavePurchaseFromScanner = (record: PurchaseRecord, newPrices: ObservedPrice[]) => {
    setRecords([record, ...records]);
    setObservedPrices([...newPrices, ...observedPrices]);
  };

  // Handlers del Carrito
  const handleAddToCart = (product: ProductItem, storeName: string, unitPrice: number, quantity: number) => {
    const existingIndex = cartItems.findIndex(
      (item) => item.product.id === product.id && item.selectedStore === storeName
    );

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + quantity;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        itemSubtotal: newQty * unitPrice,
      };
      setCartItems(updated);
    } else {
      const newEntry: CartProductEntry = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        product,
        quantity,
        selectedStore: storeName,
        unitPrice,
        itemSubtotal: quantity * unitPrice,
      };
      setCartItems([...cartItems, newEntry]);
    }
  };

  const handleUpdateCartItemQty = (id: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveCartItem(id);
      return;
    }
    setCartItems(
      cartItems.map((item) =>
        item.id === id
          ? { ...item, quantity: qty, itemSubtotal: qty * item.unitPrice }
          : item
      )
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems(cartItems.filter((i) => i.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const cartTotalItemsCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Barra de Navegación Principal */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigateToTab(tab)}
        userLocation={userLocation}
        currentUser={currentUser}
        onOpenLocationModal={() => setIsLocationModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenScanner={() => setIsScannerModalOpen(true)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        cartItemCount={cartTotalItemsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            promotions={PROMOTIONS_DATABASE}
            userLocation={userLocation}
            userPaymentMethods={paymentMethods}
            onOpenPromoDetail={(promo) => setSelectedPromoForDetail(promo)}
            onNavigateToTab={handleNavigateToTab}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
          />
        )}

        {currentTab === 'products' && (
          <ProductCatalogView
            products={CATALOG_PRODUCTS}
            observedPrices={observedPrices}
            onAddToCart={handleAddToCart}
            userPaymentMethods={paymentMethods}
          />
        )}

        {currentTab === 'map' && (
          <MapView
            promotions={PROMOTIONS_DATABASE}
            userLocation={userLocation}
            userPaymentMethods={paymentMethods}
            searchRadiusKm={searchRadiusKm}
            onSelectRadius={(r) => setSearchRadiusKm(r)}
            onOpenPromoDetail={(promo) => setSelectedPromoForDetail(promo)}
            onOpenLocationModal={() => setIsLocationModalOpen(true)}
          />
        )}

        {currentTab === 'comparator' && (
          <ComparatorView
            promotions={PROMOTIONS_DATABASE}
            userLocation={userLocation}
            userPaymentMethods={paymentMethods}
            initialPromoAId={tabExtraData?.promoA}
            initialAmount={tabExtraData?.amount || 100000}
            onOpenPromoDetail={(promo) => setSelectedPromoForDetail(promo)}
          />
        )}

        {currentTab === 'calculator' && (
          <CalculatorView
            promotions={PROMOTIONS_DATABASE}
            userLocation={userLocation}
            userPaymentMethods={paymentMethods}
            cartItems={cartItems}
            onUpdateCartItemQty={handleUpdateCartItemQty}
            onRemoveCartItem={handleRemoveCartItem}
            onClearCart={handleClearCart}
            onOpenPromoDetail={(promo) => setSelectedPromoForDetail(promo)}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            promotions={PROMOTIONS_DATABASE}
            userLocation={userLocation}
            userPaymentMethods={paymentMethods}
            onOpenPromoDetail={(promo) => setSelectedPromoForDetail(promo)}
          />
        )}

        {currentTab === 'agents' && (
          <MultiAgentView
            promotions={PROMOTIONS_DATABASE}
            userLocation={userLocation}
            userPaymentMethods={paymentMethods}
            onOpenPromoDetail={(promo) => setSelectedPromoForDetail(promo)}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileView
            paymentMethods={paymentMethods}
            onUpdatePaymentMethods={(methods) => setPaymentMethods(methods)}
            onResetPaymentMethods={handleResetPaymentMethods}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            records={records}
            onAddRecord={handleAddPurchaseRecord}
            onDeleteRecord={handleDeletePurchaseRecord}
            isOpenModal={isPurchaseModalOpen}
            onCloseModal={() => setIsPurchaseModalOpen(false)}
            onOpenModal={() => setIsPurchaseModalOpen(true)}
          />
        )}
      </main>

      {/* Barra de Navegación Inferior para Dispositivos Móviles */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => handleNavigateToTab(tab)}
        onOpenScanner={() => setIsScannerModalOpen(true)}
        cartItemCount={cartTotalItemsCount}
      />

      {/* Footer minimalista */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">OfertIA</span>
            <span aria-hidden="true">·</span>
            <span>Plataforma Inteligente de Optimización de Descuentos & Tickets OCR</span>
          </div>
          <div>
            Ahorros calculados con fórmulas deterministas sobre promociones bancarias y comerciales verificadas.
          </div>
        </div>
      </footer>

      {/* Modal de Ubicación */}
      <LocationSelector
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={userLocation}
        onSelectLocation={(loc) => setUserLocation(loc)}
        searchRadiusKm={searchRadiusKm}
        onSelectRadius={(r) => setSearchRadiusKm(r)}
      />

      {/* Modal de Detalle de Promoción */}
      <PromoModal
        promo={selectedPromoForDetail}
        onClose={() => setSelectedPromoForDetail(null)}
        userLocation={userLocation}
        userPaymentMethods={paymentMethods}
      />

      {/* Modal de Autenticación / Cuenta Google */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={(updated) => setCurrentUser(updated)}
        onOpenLocationModal={() => {
          setIsAuthModalOpen(false);
          setIsLocationModalOpen(true);
        }}
      />

      {/* Modal de Escaneo de Tickets OCR */}
      <TicketScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onSavePurchase={handleSavePurchaseFromScanner}
        existingRecords={records}
      />
    </div>
  );
}
