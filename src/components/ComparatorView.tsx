import React, { useState } from 'react';
import { 
  ArrowRightLeft, 
  CheckCircle2, 
  Award, 
  HelpCircle, 
  Car, 
  Percent, 
  ShieldAlert, 
  Sparkles,
  Info
} from 'lucide-react';
import { Promotion, UserLocation, UserPaymentMethod } from '../types/index.ts';
import { calculateSavings, comparePromotions, checkPaymentCompatibility } from '../utils/discount-engine.ts';
import { calculateHaversineDistance } from '../utils/geo-distance.ts';

interface ComparatorViewProps {
  promotions: Promotion[];
  userLocation: UserLocation;
  userPaymentMethods: UserPaymentMethod[];
  initialPromoAId?: string;
  initialAmount?: number;
  onOpenPromoDetail: (promo: Promotion) => void;
}

export const ComparatorView: React.FC<ComparatorViewProps> = ({
  promotions,
  userLocation,
  userPaymentMethods,
  initialPromoAId,
  initialAmount = 100000,
  onOpenPromoDetail,
}) => {
  const [purchaseAmount, setPurchaseAmount] = useState<number>(initialAmount);
  const [promoIdA, setPromoIdA] = useState<string>(initialPromoAId || promotions[0]?.id || '');
  const [promoIdB, setPromoIdB] = useState<string>(promotions[1]?.id || '');
  const [includeTravel, setIncludeTravel] = useState<boolean>(true);

  const promoA = promotions.find((p) => p.id === promoIdA) || promotions[0];
  const promoB = promotions.find((p) => p.id === promoIdB) || promotions[1];

  const distanceA = promoA.isOnlineOnly
    ? 0
    : calculateHaversineDistance(
        userLocation.lat,
        userLocation.lng,
        promoA.coordinates.lat,
        promoA.coordinates.lng
      );

  const distanceB = promoB.isOnlineOnly
    ? 0
    : calculateHaversineDistance(
        userLocation.lat,
        userLocation.lng,
        promoB.coordinates.lat,
        promoB.coordinates.lng
      );

  const calcA = calculateSavings(purchaseAmount, promoA, distanceA, includeTravel);
  const calcB = calculateSavings(purchaseAmount, promoB, distanceB, includeTravel);

  const paymentA = checkPaymentCompatibility(promoA, userPaymentMethods);
  const paymentB = checkPaymentCompatibility(promoB, userPaymentMethods);

  // Determinar ganadora
  const comparison = comparePromotions(
    purchaseAmount,
    [promoA, promoB],
    { [promoA.id]: distanceA, [promoB.id]: distanceB },
    includeTravel
  );

  const winner = comparison.bestOption;
  const isAWinner = winner?.promoId === promoA.id;
  const isBWinner = winner?.promoId === promoB.id;
  const isTie = calcA.netSavingsAfterTravel === calcB.netSavingsAfterTravel;

  // Cargar caso de prueba del prompt ($100.000: 20% cap 10k vs 15% cap 20k)
  const loadPromptTestCase = () => {
    setPurchaseAmount(100000);
    // Buscar o emparejar promos similares
    const promoWith20 = promotions.find((p) => p.discountPercentage === 20 && p.maxCashback === 10000) || promotions[0];
    const promoWith15 = promotions.find((p) => p.discountPercentage >= 15 && p.maxCashback >= 15000) || promotions[1];
    setPromoIdA(promoWith20.id);
    setPromoIdB(promoWith15.id);
  };

  return (
    <div className="space-y-6">
      {/* Header y Control del monto */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
              <span>Comparador Financiero Frente a Frente</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Compara dos alternativas y maximiza tu reintegro neto
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Desglose matemático determinista: porcentaje nominal vs. tope máximo de reintegro vs. costo de traslado.
            </p>
          </div>

          <button
            onClick={loadPromptTestCase}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200 self-start md:self-auto flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Cargar Caso Ejemplo: Compra de $100.000</span>
          </button>
        </div>

        {/* Input de monto de compra */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-slate-700">
              Importe de compra a simular:
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-mono font-bold text-slate-400">$</span>
              <input
                type="number"
                step="5000"
                min="1000"
                value={purchaseAmount}
                onChange={(e) => setPurchaseAmount(Math.max(1, Number(e.target.value) || 0))}
                className="pl-8 pr-4 py-2 text-base font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTravel}
              onChange={(e) => setIncludeTravel(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <span>Descontar costo estimado de traslado ($180/km)</span>
          </label>
        </div>
      </div>

      {/* Veredicto de la Comparación */}
      <div className="p-4 bg-emerald-950 text-emerald-100 rounded-2xl shadow-sm border border-emerald-800 flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
          <Award className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Veredicto Matemático
          </div>
          <p className="text-sm font-medium leading-relaxed">
            {comparison.explanation}
          </p>
        </div>
      </div>

      {/* Tableros comparativos lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Opción A */}
        <div
          className={`bg-white rounded-2xl border-2 p-6 flex flex-col justify-between transition-all ${
            isAWinner && !isTie
              ? 'border-emerald-500 shadow-md ring-4 ring-emerald-500/10'
              : 'border-slate-200'
          }`}
        >
          <div className="space-y-5">
            {/* Selector de Promoción A */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Opción A
                </span>
                {isAWinner && !isTie && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ★ Mejor Opción
                  </span>
                )}
              </div>
              <select
                value={promoIdA}
                onChange={(e) => setPromoIdA(e.target.value)}
                className="w-full text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              >
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.storeName} ({p.discountPercentage}% con {p.issuer})
                  </option>
                ))}
              </select>
            </div>

            {/* Ficha técnica rápida */}
            <div className="text-xs text-slate-500 space-y-1">
              <div className="text-slate-900 font-bold text-base">{promoA.title}</div>
              <div>{promoA.branchName} · a {distanceA} km de ti</div>
              <div>Medio: {promoA.issuer} ({promoA.paymentInstrument})</div>
            </div>

            {/* Desglose de Números Deterministas */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Porcentaje Nominal:</span>
                <span className="font-mono font-bold text-slate-800">{promoA.discountPercentage}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Descuento Teórico ({promoA.discountPercentage}% de ${purchaseAmount.toLocaleString('es-AR')}):</span>
                <span className="font-mono font-semibold text-slate-700">${calcA.nominalDiscount.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tope Máximo de Reintegro:</span>
                <span className="font-mono font-semibold text-slate-700">
                  {promoA.maxCashback > 0 ? `$${promoA.maxCashback.toLocaleString('es-AR')}` : 'Sin tope'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Gasto óptimo para saturar tope:</span>
                <span className="font-mono font-semibold text-slate-700">
                  {calcA.reachCapAmount ? `$${calcA.reachCapAmount.toLocaleString('es-AR')}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Ahorro Bruto Efectivo:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ${calcA.actualSavings.toLocaleString('es-AR')}
                  {calcA.isCapped && <span className="text-xs text-amber-600 ml-1">(Limitado por tope)</span>}
                </span>
              </div>
              {includeTravel && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Costo traslado ida y vuelta:</span>
                  <span className="font-mono text-slate-600">-${calcA.estimatedTravelCost.toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-xl font-bold">
                <span className="text-slate-800">Ahorro Neto Real:</span>
                <span className="font-mono text-emerald-800 text-base">
                  ${calcA.netSavingsAfterTravel.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Compatibilidad de medios */}
            <div className="text-xs">
              {paymentA.isCompatible ? (
                <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Compatible con {paymentA.matchingMethod?.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 p-2 rounded-lg">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{paymentA.reasons[0]}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100">
            <button
              onClick={() => onOpenPromoDetail(promoA)}
              className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Ver Términos Completos Opción A
            </button>
          </div>
        </div>

        {/* Opción B */}
        <div
          className={`bg-white rounded-2xl border-2 p-6 flex flex-col justify-between transition-all ${
            isBWinner && !isTie
              ? 'border-emerald-500 shadow-md ring-4 ring-emerald-500/10'
              : 'border-slate-200'
          }`}
        >
          <div className="space-y-5">
            {/* Selector de Promoción B */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Opción B
                </span>
                {isBWinner && !isTie && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    ★ Mejor Opción
                  </span>
                )}
              </div>
              <select
                value={promoIdB}
                onChange={(e) => setPromoIdB(e.target.value)}
                className="w-full text-sm font-semibold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
              >
                {promotions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.storeName} ({p.discountPercentage}% con {p.issuer})
                  </option>
                ))}
              </select>
            </div>

            {/* Ficha técnica rápida */}
            <div className="text-xs text-slate-500 space-y-1">
              <div className="text-slate-900 font-bold text-base">{promoB.title}</div>
              <div>{promoB.branchName} · a {distanceB} km de ti</div>
              <div>Medio: {promoB.issuer} ({promoB.paymentInstrument})</div>
            </div>

            {/* Desglose de Números Deterministas */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Porcentaje Nominal:</span>
                <span className="font-mono font-bold text-slate-800">{promoB.discountPercentage}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Descuento Teórico ({promoB.discountPercentage}% de ${purchaseAmount.toLocaleString('es-AR')}):</span>
                <span className="font-mono font-semibold text-slate-700">${calcB.nominalDiscount.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Tope Máximo de Reintegro:</span>
                <span className="font-mono font-semibold text-slate-700">
                  {promoB.maxCashback > 0 ? `$${promoB.maxCashback.toLocaleString('es-AR')}` : 'Sin tope'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Gasto óptimo para saturar tope:</span>
                <span className="font-mono font-semibold text-slate-700">
                  {calcB.reachCapAmount ? `$${calcB.reachCapAmount.toLocaleString('es-AR')}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Ahorro Bruto Efectivo:</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">
                  ${calcB.actualSavings.toLocaleString('es-AR')}
                  {calcB.isCapped && <span className="text-xs text-amber-600 ml-1">(Limitado por tope)</span>}
                </span>
              </div>
              {includeTravel && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Costo traslado ida y vuelta:</span>
                  <span className="font-mono text-slate-600">-${calcB.estimatedTravelCost.toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between py-2 bg-slate-50 px-3 rounded-xl font-bold">
                <span className="text-slate-800">Ahorro Neto Real:</span>
                <span className="font-mono text-emerald-800 text-base">
                  ${calcB.netSavingsAfterTravel.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Compatibilidad de medios */}
            <div className="text-xs">
              {paymentB.isCompatible ? (
                <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 p-2 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Compatible con {paymentB.matchingMethod?.name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50 p-2 rounded-lg">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{paymentB.reasons[0]}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100">
            <button
              onClick={() => onOpenPromoDetail(promoB)}
              className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Ver Términos Completos Opción B
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
