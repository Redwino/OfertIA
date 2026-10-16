/**
 * Optimizador de carrito y división inteligente de pagos (Payment Split)
 */

import type { CartProductEntry, PaymentSplitOption, Promotion, UserPaymentMethod } from '../types/index.ts';
import { calculateSavings, checkPaymentCompatibility } from './discount-engine.ts';

/**
 * Evalúa opciones de pago para un carrito completo: pago único vs pago dividido en 2 transacciones
 */
export function optimizeCartPayment(
  cartItems: CartProductEntry[],
  availablePromos: Promotion[],
  userMethods: UserPaymentMethod[]
): {
  singlePaymentWinner: {
    method: UserPaymentMethod;
    promo: Promotion;
    savings: number;
    finalPayable: number;
  } | null;
  splitOption: PaymentSplitOption | null;
  bestStrategyText: string;
} {
  const activeMethods = userMethods.filter((m) => m.isEnabled);
  const totalCartAmount = cartItems.reduce((acc, item) => acc + item.itemSubtotal, 0);

  if (cartItems.length === 0 || activeMethods.length === 0) {
    return {
      singlePaymentWinner: null,
      splitOption: null,
      bestStrategyText: 'El carrito está vacío o no hay medios de pago activos.',
    };
  }

  // 1. Evaluar Pago Único con cada tarjeta/billetera
  let bestSingle: {
    method: UserPaymentMethod;
    promo: Promotion;
    savings: number;
    finalPayable: number;
  } | null = null;

  for (const promo of availablePromos) {
    const comp = checkPaymentCompatibility(promo, activeMethods);
    if (!comp.isCompatible || !comp.matchingMethod) continue;

    const calc = calculateSavings(totalCartAmount, promo, 0, false);
    if (!bestSingle || calc.actualSavings > bestSingle.savings) {
      bestSingle = {
        method: comp.matchingMethod,
        promo,
        savings: calc.actualSavings,
        finalPayable: calc.netPayable,
      };
    }
  }

  // 2. Evaluar Pago Dividido (si hay más de 1 artículo y más de 1 medio compatible)
  let splitOption: PaymentSplitOption | null = null;

  if (cartItems.length >= 2 && activeMethods.length >= 2) {
    // Buscar si hay artículos de distintas categorías (ej: carnicería/supermercado o combustible/despensa)
    // O si una sola compra satura el tope de reintegro de la mejor promo
    if (bestSingle && bestSingle.promo.maxCashback > 0 && (totalCartAmount * (bestSingle.promo.discountPercentage / 100)) > bestSingle.promo.maxCashback) {
      // El tope de la mejor promo única se saturó!
      // Dividir el carrito para aprovechar un segundo beneficio con otra tarjeta
      const reachCap = bestSingle.promo.maxCashback / (bestSingle.promo.discountPercentage / 100);

      // Agrupar ítems hasta reachCap en Grupo A, y el resto en Grupo B
      const itemsA: CartProductEntry[] = [];
      const itemsB: CartProductEntry[] = [];
      let accA = 0;

      for (const item of cartItems) {
        if (accA + item.itemSubtotal <= reachCap * 1.2 || itemsA.length === 0) {
          itemsA.push(item);
          accA += item.itemSubtotal;
        } else {
          itemsB.push(item);
        }
      }

      if (itemsB.length > 0) {
        const subtotalA = itemsA.reduce((sum, i) => sum + i.itemSubtotal, 0);
        const subtotalB = itemsB.reduce((sum, i) => sum + i.itemSubtotal, 0);

        const calcA = calculateSavings(subtotalA, bestSingle.promo, 0, false);

        // Buscar mejor medio para grupo B excluyendo el emisor de A
        const otherMethods = activeMethods.filter((m) => m.issuer !== bestSingle?.method.issuer);
        let bestBPromo: Promotion | null = null;
        let bestBMethod: UserPaymentMethod | null = null;
        let bestBSavings = 0;

        for (const promo of availablePromos) {
          const comp = checkPaymentCompatibility(promo, otherMethods);
          if (!comp.isCompatible || !comp.matchingMethod) continue;
          const calcB = calculateSavings(subtotalB, promo, 0, false);
          if (calcB.actualSavings > bestBSavings) {
            bestBSavings = calcB.actualSavings;
            bestBPromo = promo;
            bestBMethod = comp.matchingMethod;
          }
        }

        if (bestBMethod && bestBPromo && (calcA.actualSavings + bestBSavings) > bestSingle.savings + 500) {
          const totalCombinedSavings = calcA.actualSavings + bestBSavings;
          const totalCombinedPayable = totalCartAmount - totalCombinedSavings;
          const extraGain = totalCombinedSavings - bestSingle.savings;

          splitOption = {
            methodA: bestSingle.method,
            itemsA,
            subtotalA,
            savingsA: calcA.actualSavings,
            methodB: bestBMethod,
            itemsB,
            subtotalB,
            savingsB: bestBSavings,
            totalCombinedSavings,
            totalCombinedPayable,
            isSplitRecommended: true,
            reasoning: `Dividiendo tu compra en 2 transacciones separadas aprovechas el tope de ${bestSingle.promo.storeName} ($${calcA.actualSavings.toLocaleString('es-AR')}) y sumas $${bestBSavings.toLocaleString('es-AR')} con tu ${bestBMethod.name}, ahorrando $${extraGain.toLocaleString('es-AR')} extra.`,
          };
        }
      }
    }
  }

  let bestStrategyText = '';
  if (splitOption && splitOption.isSplitRecommended) {
    bestStrategyText = splitOption.reasoning;
  } else if (bestSingle) {
    bestStrategyText = `Te conviene pagar el total ($${totalCartAmount.toLocaleString('es-AR')}) en una sola operación con ${bestSingle.method.name} obteniendo $${bestSingle.savings.toLocaleString('es-AR')} de ahorro.`;
  } else {
    bestStrategyText = 'No encontramos promociones compatibles con tus medios de pago activos para este carrito.';
  }

  return {
    singlePaymentWinner: bestSingle,
    splitOption,
    bestStrategyText,
  };
}
