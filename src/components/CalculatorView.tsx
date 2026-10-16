import React, { useState } from 'react';
import { 
  Calculator, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Sparkles, 
  Zap, 
  Split, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CreditCard,
  TrendingDown,
  Layers
} from 'lucide-react';
import { CartProductEntry, Category, Promotion, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { CATEGORY_LABELS } from '../data/promotions.ts';
import { calculateSavings, checkPaymentCompatibility } from '../utils/discount-engine.ts';
import { optimizeCartPayment } from '../utils/cart-optimizer.ts';

interface CalculatorViewProps {
  promotions: Promotion[];
  userLocation: UserLocation;
  userPaymentMethods: UserPaymentMethod[];
  cartItems: CartProductEntry[];
  onUpdateCartItemQty: (id: string, qty: number) => void;
  onRemoveCartItem: (id: string) => void;
  onClearCart: () => void;
  onOpenPromoDetail: (promo: Promotion) => void;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  promotions,
  userLocation,
  userPaymentMethods,
  cartItems,
  onUpdateCartItemQty,
  onRemoveCartItem,
  onClearCart,
  onOpenPromoDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'cart' | 'single_amount'>('cart');
  const [amount, setAmount] = useState<number>(100000);
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');

  const totalCartAmount = cartItems.reduce((acc, i) => acc + i.itemSubtotal, 0);

  // Optimización de medios de pago para el carrito (Pago Único vs Pago Dividido)
  const cartOptimization = optimizeCartPayment(cartItems, promotions, userPaymentMethods);

  // Simulación para monto individual
  const quickAmounts = [25000, 50000, 100000, 150000, 250000];
  const evaluatedSingle = promotions
    .filter((p) => selectedCategory === 'todas' || p.category === selectedCategory)
    .map((promo) => {
      const payment = checkPaymentCompatibility(promo, userPaymentMethods);
      const calc = calculateSavings(amount, promo, 0, false);
      return { promo, payment, calc };
    })
    .sort((a, b) => b.calc.actualSavings - a.calc.actualSavings);

  const bestSinglePromo = evaluatedSingle[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Calculator className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Calculadora y Planificador de Compras</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Optimiza tu Carrito y Medios de Pago
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Calcula el ahorro total de tus artículos, alertas de promociones próximas y la mejor estrategia de pago (único o dividido).
            </p>
          </div>

          {/* Toggle entre Carrito Activo y Monto Rápido */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('cart')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'cart'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Mi Carrito ({cartItems.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('single_amount')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeTab === 'single_amount'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Simulador por Importe
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'cart' ? (
        /* VISTA DE CARRITO DE COMPRAS ACTIVO */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Artículos del Carrito */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-600" />
                  <span>Artículos en tu Carrito ({cartItems.length})</span>
                </h2>
                {cartItems.length > 0 && (
                  <button
                    onClick={onClearCart}
                    className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                  >
                    Vaciar carrito
                  </button>
                )}
              </div>

              {cartItems.length > 0 ? (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.product.brand} · {item.product.presentation} · Visto en {item.selectedStore}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        {/* Control de cantidad */}
                        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 px-2 py-0.5">
                          <button
                            onClick={() => onUpdateCartItemQty(item.id, Math.max(1, item.quantity - 1))}
                            className="px-1.5 py-0.5 text-slate-600 dark:text-slate-300 font-bold"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono font-bold text-slate-900 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateCartItemQty(item.id, item.quantity + 1)}
                            className="px-1.5 py-0.5 text-slate-600 dark:text-slate-300 font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Subtotal del ítem */}
                        <div className="text-right min-w-[70px]">
                          <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                            ${item.itemSubtotal.toLocaleString('es-AR')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ${item.unitPrice.toLocaleString('es-AR')} c/u
                          </div>
                        </div>

                        <button
                          onClick={() => onRemoveCartItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Eliminar artículo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="w-10 h-10 mx-auto opacity-40" />
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    Tu carrito está vacío
                  </div>
                  <p className="text-xs max-w-xs mx-auto">
                    Ve a la pestaña &quot;Precios&quot; y pulsa &quot;Añadir a la calculadora&quot; en cualquier producto para armar tu compra.
                  </p>
                </div>
              )}
            </div>

            {/* Alertas de Oportunidades Temporales */}
            <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>Alertas Temporales y Oportunidades de Compra:</span>
              </div>
              <div className="space-y-1.5 text-xs text-emerald-900/90 dark:text-emerald-200/90">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span><strong>Miércoles y Jueves:</strong> 20% en Coto con Santander Visa (Ahorro potencial de hasta $12.000).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span><strong>Lunes y Martes:</strong> 25% en Carrefour pagando con QR MODO (Reintegro directo en cuenta).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-emerald-600">•</span>
                  <span><strong>Sábados:</strong> 35% en Carnicerías con Cuenta DNI (Tope de $6.000 por semana).</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resumen del Carrito y Estrategia de Pago Recomendada */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Resumen de la Compra
              </h2>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Total productos ({cartItems.length}):</span>
                  <span className="font-mono font-semibold">${totalCartAmount.toLocaleString('es-AR')}</span>
                </div>

                {cartOptimization.singlePaymentWinner && (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span>Ahorro máximo detectado:</span>
                    <span className="font-mono">
                      -${(cartOptimization.splitOption?.isSplitRecommended
                        ? cartOptimization.splitOption.totalCombinedSavings
                        : cartOptimization.singlePaymentWinner.savings
                      ).toLocaleString('es-AR')}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                  <span>Total estimado a pagar:</span>
                  <span className="font-mono text-lg text-emerald-700 dark:text-emerald-400">
                    ${(cartOptimization.splitOption?.isSplitRecommended
                      ? cartOptimization.splitOption.totalCombinedPayable
                      : cartOptimization.singlePaymentWinner
                      ? cartOptimization.singlePaymentWinner.finalPayable
                      : totalCartAmount
                    ).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* Estrategia de Pago Recomendada */}
              {cartOptimization.singlePaymentWinner && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Estrategia de Pago Recomendada:</span>
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {cartOptimization.bestStrategyText}
                  </p>

                  {/* Detalle si se recomienda Pago Dividido */}
                  {cartOptimization.splitOption?.isSplitRecommended && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                        <Split className="w-3.5 h-3.5" />
                        <span>Plan de Pago Dividido:</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                        <div>
                          <strong>Operación 1:</strong> Pagar ${cartOptimization.splitOption.subtotalA.toLocaleString('es-AR')} con <strong>{cartOptimization.splitOption.methodA.name}</strong> → Ahorro: <strong>${cartOptimization.splitOption.savingsA.toLocaleString('es-AR')}</strong>
                        </div>
                        <div>
                          <strong>Operación 2:</strong> Pagar ${cartOptimization.splitOption.subtotalB?.toLocaleString('es-AR') ?? '0'} con <strong>{cartOptimization.splitOption.methodB?.name}</strong> → Ahorro: <strong>${cartOptimization.splitOption.savingsB?.toLocaleString('es-AR') ?? '0'}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* VISTA DE SIMULADOR POR IMPORTE DIRECTO */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Importe a Simular ($ ARS):
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-lg font-mono font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="5000"
                    min="100"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
                    className="w-full pl-10 pr-4 py-3 text-2xl font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      onClick={() => setAmount(q)}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg border transition-colors shrink-0 ${
                        amount === q
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      ${q.toLocaleString('es-AR')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Filtrar por Rubro:
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full py-3 px-3.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-200"
                >
                  <option value="todas">Todos los Rubros</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {bestSinglePromo && (
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-6 shadow-md border border-emerald-800">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Máximo Ahorro Detectado para ${amount.toLocaleString('es-AR')}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                <div className="lg:col-span-2 space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    {bestSinglePromo.promo.storeName} ({bestSinglePromo.promo.discountPercentage}% con {bestSinglePromo.promo.issuer})
                  </h2>
                  <p className="text-sm text-emerald-100">
                    Pagarías <strong className="text-white">${bestSinglePromo.calc.netPayable.toLocaleString('es-AR')}</strong> con tu {bestSinglePromo.payment.matchingMethod?.name || bestSinglePromo.promo.paymentInstrument}.
                  </p>
                  <div className="text-xs text-emerald-200 pt-1">
                    {bestSinglePromo.calc.reasoning}
                  </div>
                </div>

                <div className="bg-emerald-800/80 backdrop-blur-xs p-4 rounded-2xl border border-emerald-700/60 text-center">
                  <span className="text-xs text-emerald-200 font-medium">Ahorro Real</span>
                  <div className="text-3xl font-extrabold font-mono text-emerald-300 mt-1">
                    ${bestSinglePromo.calc.actualSavings.toLocaleString('es-AR')}
                  </div>
                  <span className="text-[11px] text-emerald-200 mt-1">
                    {bestSinglePromo.calc.effectiveDiscountRate}% efectivo
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
