/**
 * Motor determinista de cálculo de ahorros y evaluación de promociones
 */

import type { CalculationResult, Promotion, UserPaymentMethod } from '../types/index.ts';
import { estimateTravelCost } from './geo-distance.ts';

/**
 * Calcula el ahorro exacto para un monto de compra en una promoción específica
 */
export function calculateSavings(
  purchaseAmount: number,
  promo: Promotion,
  userDistanceKm: number = 0,
  includeTravelCost: boolean = true
): CalculationResult {
  const nominalDiscount = (purchaseAmount * promo.discountPercentage) / 100;
  const meetsMinPurchase = promo.minPurchase <= 0 || purchaseAmount >= promo.minPurchase;

  let actualSavings = 0;
  let isCapped = false;

  if (meetsMinPurchase && purchaseAmount > 0) {
    if (promo.maxCashback > 0 && nominalDiscount > promo.maxCashback) {
      actualSavings = promo.maxCashback;
      isCapped = true;
    } else {
      actualSavings = nominalDiscount;
    }
  }

  // Cálculo del monto exacto a partir del cual se alcanza el tope
  const reachCapAmount =
    promo.maxCashback > 0
      ? Math.round(promo.maxCashback / (promo.discountPercentage / 100))
      : null;

  const estimatedTravelCost = includeTravelCost && !promo.isOnlineOnly
    ? estimateTravelCost(userDistanceKm)
    : 0;

  const netSavingsAfterTravel = Math.max(0, actualSavings - estimatedTravelCost);
  const netPayable = Math.max(0, purchaseAmount - actualSavings);
  const effectiveDiscountRate = purchaseAmount > 0
    ? Math.round((actualSavings / purchaseAmount) * 1000) / 10
    : 0;

  let reasoning = '';
  if (!meetsMinPurchase) {
    reasoning = `No aplica el beneficio porque no alcanza el mínimo de compra requerido ($${promo.minPurchase.toLocaleString('es-AR')}).`;
  } else if (isCapped) {
    reasoning = `El descuento nominal de $${nominalDiscount.toLocaleString('es-AR')} (${promo.discountPercentage}%) fue limitado por el tope máximo de reintegro de $${promo.maxCashback.toLocaleString('es-AR')}. Gastando $${reachCapAmount?.toLocaleString('es-AR')} ya obtienes el beneficio máximo.`;
  } else {
    reasoning = `Aplica el ${promo.discountPercentage}% completo sobre el importe, resultando en un ahorro de $${actualSavings.toLocaleString('es-AR')}.`;
  }

  if (estimatedTravelCost > 0) {
    if (estimatedTravelCost >= actualSavings) {
      reasoning += ` ¡Atención! El costo estimado de traslado ida y vuelta ($${estimatedTravelCost.toLocaleString('es-AR')}) neutraliza o supera el ahorro de la promoción.`;
    } else {
      reasoning += ` Descontando $${estimatedTravelCost.toLocaleString('es-AR')} de traslado estimado, tu ahorro neto real es de $${netSavingsAfterTravel.toLocaleString('es-AR')}.`;
    }
  }

  return {
    promoId: promo.id,
    storeName: promo.storeName,
    purchaseAmount,
    discountPercentage: promo.discountPercentage,
    nominalDiscount,
    maxCashback: promo.maxCashback,
    actualSavings,
    isCapped,
    reachCapAmount,
    netPayable,
    minPurchaseRequired: promo.minPurchase,
    meetsMinPurchase,
    travelDistanceKm: userDistanceKm,
    estimatedTravelCost,
    netSavingsAfterTravel,
    effectiveDiscountRate,
    isRecommended: false, // Se asigna al comparar
    reasoning,
  };
}

/**
 * Comprueba si un usuario tiene habilitado algún medio de pago compatible con la promoción
 */
export function checkPaymentCompatibility(
  promo: Promotion,
  userMethods: UserPaymentMethod[]
): {
  isCompatible: boolean;
  matchingMethod?: UserPaymentMethod;
  reasons: string[];
} {
  const activeMethods = userMethods.filter((m) => m.isEnabled);
  if (activeMethods.length === 0) {
    return {
      isCompatible: false,
      reasons: ['No tienes medios de pago configurados o habilitados.'],
    };
  }

  const reasons: string[] = [];
  const normalizedPromoIssuer = promo.issuer.toLowerCase().trim();

  // Buscar coincidencia directa de emisor
  const candidates = activeMethods.filter((method) => {
    const methodIssuer = method.issuer.toLowerCase().trim();
    const methodName = method.name.toLowerCase().trim();

    return (
      methodIssuer.includes(normalizedPromoIssuer) ||
      normalizedPromoIssuer.includes(methodIssuer) ||
      methodName.includes(normalizedPromoIssuer)
    );
  });

  if (candidates.length === 0) {
    return {
      isCompatible: false,
      reasons: [
        `Requiere medio de pago emitido por ${promo.issuer} (${promo.paymentInstrument}).`,
      ],
    };
  }

  // Filtrar por marca si la promo lo exige
  let matchedMethod = candidates[0];

  if (promo.requiredBrand && promo.requiredBrand !== 'any') {
    const brandMatch = candidates.find(
      (c) => c.brand && c.brand.toLowerCase() === promo.requiredBrand?.toLowerCase()
    );
    if (!brandMatch) {
      return {
        isCompatible: false,
        reasons: [
          `Tienes cuenta en ${promo.issuer}, pero la promoción requiere tarjeta ${promo.requiredBrand.toUpperCase()}.`,
        ],
      };
    }
    matchedMethod = brandMatch;
  }

  // Filtrar por cuenta sueldo si la promo lo requiere
  if (promo.requiresPayroll && !matchedMethod.hasDirectPayroll) {
    return {
      isCompatible: false,
      reasons: [
        `La promoción exige cuenta sueldo en ${promo.issuer}. Tu medio registrado no tiene configurada cuenta sueldo.`,
      ],
    };
  }

  // Filtrar por segmento si es exclusivo (ej. Select, Eminent, Black)
  if (
    promo.requiredSegment &&
    promo.requiredSegment !== 'Todos' &&
    promo.requiredSegment !== 'General'
  ) {
    if (
      !matchedMethod.segment ||
      !matchedMethod.segment.toLowerCase().includes(promo.requiredSegment.toLowerCase())
    ) {
      reasons.push(
        `Nota: Exige segmento ${promo.requiredSegment}. Tu tarjeta registrada está listada como ${matchedMethod.segment || 'Estándar'}. Puede requerir confirmación.`
      );
    }
  }

  return {
    isCompatible: true,
    matchingMethod: matchedMethod,
    reasons,
  };
}

/**
 * Comprueba si la promoción está vigente hoy (según día de la semana y fecha)
 */
export function isPromoActiveToday(
  promo: Promotion,
  referenceDate: Date = new Date()
): { isActive: boolean; reason: string } {
  // Comprobar rango de fechas
  const todayStr = referenceDate.toISOString().split('T')[0];
  if (promo.startDate && todayStr < promo.startDate) {
    return {
      isActive: false,
      reason: `La promoción comienza el ${promo.startDate}.`,
    };
  }
  if (promo.endDate && todayStr > promo.endDate) {
    return {
      isActive: false,
      reason: `La promoción finalizó el ${promo.endDate}.`,
    };
  }

  // Comprobar día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
  const dayOfWeek = referenceDate.getDay();
  if (promo.applicableDays.length > 0 && !promo.applicableDays.includes(dayOfWeek)) {
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const activeDaysNames = promo.applicableDays.map((d) => dayNames[d]).join(', ');
    return {
      isActive: false,
      reason: `Hoy ${dayNames[dayOfWeek]} no aplica. Días habilitados: ${activeDaysNames}.`,
    };
  }

  return {
    isActive: true,
    reason: 'Vigente hoy.',
  };
}

/**
 * Compara dos o más promociones y determina cuál ofrece el mayor ahorro real
 */
export function comparePromotions(
  purchaseAmount: number,
  promos: Promotion[],
  distanceMap: Record<string, number> = {},
  includeTravelCost: boolean = true
): {
  rankedResults: CalculationResult[];
  bestOption: CalculationResult | null;
  explanation: string;
} {
  if (promos.length === 0) {
    return {
      rankedResults: [],
      bestOption: null,
      explanation: 'No hay promociones seleccionadas para comparar.',
    };
  }

  const results = promos.map((promo) => {
    const dist = distanceMap[promo.id] ?? 0;
    return calculateSavings(purchaseAmount, promo, dist, includeTravelCost);
  });

  // Ordenar por ahorro neto descendente (después de traslado si aplica)
  results.sort((a, b) => b.netSavingsAfterTravel - a.netSavingsAfterTravel);

  // Marcar la mejor opción
  if (results.length > 0 && results[0].netSavingsAfterTravel > 0) {
    results[0].isRecommended = true;
  }

  const best = results[0];
  let explanation = '';

  if (results.length === 1) {
    explanation = `Para un gasto de $${purchaseAmount.toLocaleString('es-AR')}, obtienes un ahorro de $${best.actualSavings.toLocaleString('es-AR')} en ${best.storeName}.`;
  } else {
    const second = results[1];
    const diff = best.netSavingsAfterTravel - second.netSavingsAfterTravel;
    if (diff > 0) {
      explanation = `Recomendamos ${best.storeName}: te ahorras $${diff.toLocaleString('es-AR')} más que en ${second.storeName} (Ahorro neto: $${best.netSavingsAfterTravel.toLocaleString('es-AR')} vs $${second.netSavingsAfterTravel.toLocaleString('es-AR')}).`;
    } else {
      explanation = `Ambas opciones ofrecen el mismo ahorro neto ($${best.netSavingsAfterTravel.toLocaleString('es-AR')}). Te sugerimos la más cercana (${best.travelDistanceKm} km).`;
    }
  }

  return {
    rankedResults: results,
    bestOption: best,
    explanation,
  };
}
