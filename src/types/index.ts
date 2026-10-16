export type VerificationStatus = 'VERIFIED' | 'PARTIAL' | 'PENDING' | 'EXPIRED';

export type BenefitType = 
  | 'immediate'            // Descuento directo en caja
  | 'cashback_statement'   // Reintegro en el resumen (30 a 60 días)
  | 'wallet_instant'       // Reintegro instantáneo en saldo de billetera
  | 'installments_zero';   // Cuotas sin interés con descuento

export type Category = 
  | 'supermercados'
  | 'combustible'
  | 'farmacias'
  | 'gastronomia'
  | 'indumentaria'
  | 'tecnologia'
  | 'hogar'
  | 'servicios'
  | 'online';

export type OptimizationGoal =
  | 'max_savings'          // Máximo ahorro económico
  | 'closest'              // Comercios más cercanos
  | 'best_of_week'         // Mejores descuentos de la semana
  | 'best_payment_combo'   // Mejor combinación de banco, tarjeta y billetera
  | 'min_travel'           // Menor cantidad de desplazamientos
  | 'savings_vs_travel'    // Mejor relación entre ahorro, distancia y tiempo
  | 'today_only';          // Promociones disponibles hoy

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  country: string;
  currency: string;
  currencySymbol: string;
  isAuthenticated: boolean;
  theme: ThemeMode;
  notificationsEnabled: boolean;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  address: string;
  neighborhood?: string;
  city?: string;
}

export interface UserPaymentMethod {
  id: string;
  name: string;
  type: 'credit' | 'debit' | 'wallet' | 'loyalty' | 'fintech';
  issuer: string;         // Ej: Santander, BBVA, Mercado Pago, Cuenta DNI, Ualá
  brand?: 'visa' | 'mastercard' | 'amex' | 'cabal' | 'other';
  segment?: string;       // Ej: Select, Eminent, Premium, Black, Signature, Estándar
  hasDirectPayroll?: boolean; // Cuenta sueldo
  loyaltyPrograms?: string[]; // Ej: Serviclub, Club La Nación, Clarín 365, Shell Box
  isEnabled: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  storeName: string;
  storeLogo?: string;
  branchName: string;
  category: Category;
  issuer: string;                 // Banco o Billetera
  paymentInstrument: string;      // Ej: "Tarjeta de Crédito Visa", "QR MODO", "Saldo en Cuenta"
  requiredBrand?: 'visa' | 'mastercard' | 'amex' | 'cabal' | 'any';
  requiredSegment?: string;       // Ej: "Black", "Eminent", "Select", "Todos"
  requiresPayroll?: boolean;
  discountPercentage: number;     // Ej: 20 para 20%
  maxCashback: number;            // 0 = Sin tope, >0 = Tope de reintegro en $
  minPurchase: number;            // 0 = Sin mínimo, >0 = Importe mínimo en $
  applicableDays: number[];       // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  applicableHours?: { start: string; end: string };
  startDate: string;              // ISO string YYYY-MM-DD
  endDate: string;                // ISO string YYYY-MM-DD
  benefitType: BenefitType;
  terms: string;
  exclusions: string[];
  compatibilityNotes: string;
  source: string;                 // URL o nombre de la fuente oficial
  verifiedAt: string;             // ISO date
  verificationStatus: VerificationStatus;
  confidenceScore: number;        // 0 a 100
  isOnlineOnly: boolean;
  coordinates: GeoPoint;
  installments?: number;          // Si ofrece cuotas sin interés
}

export interface CalculationResult {
  promoId: string;
  storeName: string;
  purchaseAmount: number;
  discountPercentage: number;
  nominalDiscount: number;
  maxCashback: number;
  actualSavings: number;
  isCapped: boolean;
  reachCapAmount: number | null; // Gasto a partir del cual se satura el tope
  netPayable: number;
  minPurchaseRequired: number;
  meetsMinPurchase: boolean;
  travelDistanceKm: number;
  estimatedTravelCost: number;
  netSavingsAfterTravel: number;
  effectiveDiscountRate: number; // Porcentaje de ahorro real sobre el monto pagado
  isRecommended: boolean;
  reasoning: string;
}

export interface UserLocation {
  type: 'gps' | 'manual';
  label: string;
  lat: number;
  lng: number;
  address: string;
  neighborhood?: string;
  city: string;
  isFavorite?: boolean;
}

export interface PurchaseRecord {
  id: string;
  date: string;
  storeName: string;
  category: Category;
  promoId?: string;
  paymentMethodUsed: string;
  amountSpent: number;
  estimatedSavings: number;
  actualSavings: number;
  verifiedStatus: 'CONFIRMED' | 'DIFFERED' | 'DISPUTED';
  notes?: string;
  ticketImage?: string;
  ticketId?: string;
  itemsCount?: number;
}

// ==========================================
// NUEVAS ENTIDADES PARA OFERTIA
// ==========================================

export interface ProductItem {
  id: string;
  name: string;
  brand: string;
  variant?: string;
  presentation: string;        // Ej: "1 Litro", "500g", "Pack x6"
  unit: 'kg' | 'g' | 'l' | 'ml' | 'un';
  unitQuantity: number;        // Cantidad de la unidad base (ej: 1 para 1L, 0.5 para 500g)
  barcode?: string;
  category: Category;
  imageUrl?: string;
  averageObservedPrice: number;
  lowestObservedPrice: number;
  lowestPriceStore: string;
  lastObservedAt: string;
}

export interface ObservedPrice {
  id: string;
  productId: string;
  productName: string;
  storeName: string;
  branchName: string;
  city: string;
  observedAt: string;
  unitPrice: number;
  packagePrice: number;
  pricePerUnit: number;        // Precio por kg, litro o unidad estandarizada
  unitLabel: string;           // "$/kg", "$/L", "$/un"
  isPromotional: boolean;
  promoCondition?: string;
  paymentMethodAssociated?: string;
  source: 'ticket_ocr' | 'verified_catalog' | 'community';
  confidenceScore: number;     // 0 a 100
  isVerified: boolean;
}

export interface TicketLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: Category;
  matchedProductId?: string;
  isFlaggedForReview?: boolean;
}

export interface TicketScanResult {
  id: string;
  storeName: string;
  branchAddress?: string;
  dateTime: string;            // ISO o string fecha/hora
  lineItems: TicketLineItem[];
  subtotal: number;
  discountsApplied: number;
  taxAmount: number;
  totalPaid: number;
  paymentMethodIdentified?: string;
  rawOcrText?: string;
  confidenceScore: number;
  isDuplicateSuspect?: boolean;
  duplicateMessage?: string;
  verificationStatus: 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED';
}

export interface CartProductEntry {
  id: string;
  product: ProductItem;
  quantity: number;
  selectedStore: string;
  unitPrice: number;
  itemSubtotal: number;
}

export interface PaymentSplitOption {
  methodA: UserPaymentMethod;
  itemsA: CartProductEntry[];
  subtotalA: number;
  savingsA: number;
  methodB?: UserPaymentMethod;
  itemsB?: CartProductEntry[];
  subtotalB?: number;
  savingsB?: number;
  totalCombinedSavings: number;
  totalCombinedPayable: number;
  reasoning: string;
  isSplitRecommended: boolean;
}

export interface UberEstimate {
  product: 'UberX' | 'UberFlash' | 'UberComfort';
  estimatedCostMin: number;
  estimatedCostMax: number;
  formattedEstimate: string;
  durationMinutes: number;
  distanceKm: number;
  deepLink: string;
  isAvailable: boolean;
}

export interface AgentStepResult {
  agentName: string;
  role: string;
  status: 'completed' | 'warning' | 'skipped';
  summary: string;
  details: string[];
  findings?: Record<string, any>;
}

export interface MultiAgentAnalysis {
  timestamp: string;
  query: string;
  userContext: {
    locationLabel: string;
    activePaymentCount: number;
    amount?: number;
    category?: string;
  };
  steps: AgentStepResult[];
  executiveSummary: string;
  primaryRecommendation: {
    storeName: string;
    dayToBuy: string;
    paymentMethod: string;
    estimatedSavings: number;
    netSavingsAfterTravel: number;
    whyThisOption: string;
    cautions: string[];
  } | null;
  alternatives: Array<{
    storeName: string;
    paymentMethod: string;
    estimatedSavings: number;
    pros: string;
    cons: string;
  }>;
}
