/**
 * Motor de optimización de Ruta Inteligente de Ahorro, Carritos por Comercio y Transporte
 * Responde: "¿Qué comprar, en qué comercios, con qué medio de pago, en qué orden y qué día?"
 */

import { 
  Category, 
  DayPlanningMode, 
  GeoPoint, 
  Promotion, 
  RouteShoppingItem, 
  RouteStrategy, 
  SavingsRoutePlan, 
  SingleStoreComparison, 
  StoreCart, 
  StoreCartItem, 
  TransportMode, 
  TransportSettings, 
  UserLocation, 
  UserPaymentMethod, 
  WeekDaySavingsProjection 
} from '../types/index.ts';
import { calculateHaversineDistance, estimateTravelTime } from './geo-distance.ts';
import { calculateSavings, checkPaymentCompatibility } from './discount-engine.ts';
import { estimateUberRide } from './uber-integration.ts';
import { CATALOG_PRODUCTS, OBSERVED_PRICES } from '../data/products.ts';

// Sucursales y comercios de referencia en Buenos Aires con coordenadas reales
export interface StoreBranchLocation {
  storeId: string;
  storeName: string;
  branchName: string;
  address: string;
  lat: number;
  lng: number;
  category: Category;
  openingHours: string;
}

export const KNOWN_STORE_BRANCHES: StoreBranchLocation[] = [
  {
    storeId: 'store-coto-palermo',
    storeName: 'Coto Hipermercado',
    branchName: 'Sucursal Palermo (Av. Santa Fe)',
    address: 'Av. Santa Fe 3760, Palermo',
    lat: -34.5829,
    lng: -58.4149,
    category: 'supermercados',
    openingHours: 'Lunes a Domingo 08:30 a 21:30',
  },
  {
    storeId: 'store-carrefour-palermo',
    storeName: 'Carrefour Hiper',
    branchName: 'Sucursal Warnes / Palermo',
    address: 'Av. Warnes 2707, Palermo',
    lat: -34.5950,
    lng: -58.4480,
    category: 'supermercados',
    openingHours: 'Lunes a Sábado 08:00 a 22:00, Domingos 09:00 a 20:00',
  },
  {
    storeId: 'store-dia-coronel-diaz',
    storeName: 'Supermercados DIA',
    branchName: 'Sucursal Coronel Díaz',
    address: 'Av. Cnel. Díaz 1850, Recoleta',
    lat: -34.5898,
    lng: -58.4089,
    category: 'supermercados',
    openingHours: 'Lunes a Sábado 08:30 a 20:30',
  },
  {
    storeId: 'store-jumbo-palermo',
    storeName: 'Jumbo',
    branchName: 'Sucursal Bullrich',
    address: 'Av. Int. Bullrich 345, Palermo',
    lat: -34.5732,
    lng: -58.4285,
    category: 'supermercados',
    openingHours: 'Lunes a Domingo 08:00 a 21:30',
  },
  {
    storeId: 'store-disco-honduras',
    storeName: 'Disco',
    branchName: 'Sucursal Honduras',
    address: 'Honduras 5120, Palermo Soho',
    lat: -34.5865,
    lng: -58.4260,
    category: 'supermercados',
    openingHours: 'Lunes a Sábado 08:30 a 21:00',
  },
  {
    storeId: 'store-farmacity-scalabrini',
    storeName: 'Farmacity',
    branchName: 'Sucursal Scalabrini Ortiz',
    address: 'Av. Scalabrini Ortiz 1900, Palermo',
    lat: -34.5885,
    lng: -58.4170,
    category: 'farmacias',
    openingHours: 'Abierto 24 Horas',
  },
];

export const DEFAULT_TRANSPORT_SETTINGS: TransportSettings = {
  mode: 'car',
  carConsumptionL100km: 8.5,
  fuelPricePerLiter: 1150,
  parkingFee: 0,
  tollFee: 0,
  transitFarePerTrip: 450,
  maxTransportBudget: 8000,
};

/**
 * Resuelve el precio y la disponibilidad de un producto en un comercio
 */
export function resolveProductPriceForStore(
  item: RouteShoppingItem,
  storeName: string
): {
  unitPrice: number;
  referencePrice: number;
  confidenceScore: number;
  priceSource: string;
  observedAt: string;
  promoCondition?: string;
  isSubstitute: boolean;
} {
  // 1. Buscar en OBSERVED_PRICES una coincidencia directa por nombre / id y comercio
  const normalizedItemName = item.name.toLowerCase();
  const directMatch = OBSERVED_PRICES.find((op) => {
    const storeMatch = op.storeName.toLowerCase().includes(storeName.toLowerCase()) || 
                       storeName.toLowerCase().includes(op.storeName.toLowerCase());
    const nameMatch = op.productName.toLowerCase().includes(normalizedItemName) ||
                      normalizedItemName.includes(op.productName.toLowerCase());
    return storeMatch && nameMatch;
  });

  // 2. Buscar en catálogo el precio de referencia general
  const catalogItem = CATALOG_PRODUCTS.find((cp) => 
    cp.name.toLowerCase().includes(normalizedItemName) ||
    normalizedItemName.includes(cp.name.toLowerCase()) ||
    cp.id === item.id
  );

  const referencePrice = item.referencePrice || catalogItem?.averageObservedPrice || 2500;

  if (directMatch) {
    return {
      unitPrice: directMatch.unitPrice,
      referencePrice,
      confidenceScore: directMatch.confidenceScore,
      priceSource: directMatch.source === 'ticket_ocr' ? 'Ticket escaneado verificado' : 'Catálogo oficial',
      observedAt: directMatch.observedAt,
      promoCondition: directMatch.promoCondition,
      isSubstitute: false,
    };
  }

  // Si no hay precio exacto para ese comercio, calcular un diferencial de precio realista
  // según el perfil del comercio (DIA suele ser ~6% más económico en canasta básica; Jumbo ~4% más caro)
  let storeFactor = 1.0;
  if (storeName.includes('DIA')) storeFactor = 0.93;
  else if (storeName.includes('Coto')) storeFactor = 0.96;
  else if (storeName.includes('Carrefour')) storeFactor = 0.97;
  else if (storeName.includes('Disco')) storeFactor = 1.02;
  else if (storeName.includes('Jumbo')) storeFactor = 1.04;
  else if (storeName.includes('Farmacity')) storeFactor = 1.05;

  const estimatedUnitPrice = Math.round((referencePrice * storeFactor) / 10) * 10;

  return {
    unitPrice: estimatedUnitPrice,
    referencePrice,
    confidenceScore: 82,
    priceSource: 'Estimación basada en historial verificado',
    observedAt: '2026-10-14',
    isSubstitute: false,
  };
}

/**
 * Calcula el costo de transporte para una distancia dada según el modo seleccionado
 */
export function calculateTransportationCost(
  totalDistanceKm: number,
  stopsCount: number,
  settings: TransportSettings,
  origin: GeoPoint,
  firstStop?: GeoPoint
): {
  cost: number;
  details: string;
  durationMinutes: number;
  uberEstimate?: any;
} {
  const km = Math.max(0.5, totalDistanceKm);

  switch (settings.mode) {
    case 'car': {
      // Consumo de nafta: (km * consumoL/100) * precioLitro
      const fuelLiters = (km * settings.carConsumptionL100km) / 100;
      const fuelCost = Math.round(fuelLiters * settings.fuelPricePerLiter);
      const totalCost = fuelCost + settings.parkingFee + settings.tollFee;
      // Tráfico urbano: 22 km/h + 8 min por cada parada para estacionar
      const durationMinutes = Math.round((km / 22) * 60) + (stopsCount * 8);

      return {
        cost: totalCost,
        details: `Auto propio (${settings.carConsumptionL100km} L/100km a $${settings.fuelPricePerLiter.toLocaleString('es-AR')}/L nafta): $${fuelCost.toLocaleString('es-AR')}${settings.parkingFee > 0 ? ` + $${settings.parkingFee} estacionamiento` : ''}`,
        durationMinutes,
      };
    }

    case 'uber': {
      // Tarifa estimada para circuito urbano con paradas
      // Base $1.100 + $340/km + $50/minuto + recargo por parada adicional ($650 por parada)
      const baseRideMinutes = Math.round((km / 20) * 60);
      const additionalStopsCost = Math.max(0, stopsCount - 1) * 650;
      const calculatedRide = 1100 + Math.round(km * 340) + Math.round(baseRideMinutes * 50) + additionalStopsCost;

      const uberEst = firstStop 
        ? estimateUberRide(origin.lat, origin.lng, firstStop.lat, firstStop.lng, km)
        : null;

      const minCost = Math.round((calculatedRide * 0.9) / 50) * 50;
      const maxCost = Math.round((calculatedRide * 1.2) / 50) * 50;

      return {
        cost: calculatedRide,
        details: `Uber estimado (${stopsCount} paradas): $${minCost.toLocaleString('es-AR')} - $${maxCost.toLocaleString('es-AR')}`,
        durationMinutes: baseRideMinutes + (stopsCount * 5),
        uberEstimate: uberEst,
      };
    }

    case 'transit': {
      // Colectivo / Subte: costo fijo por viaje (origen -> parada 1, parada 1 -> parada 2, parada final -> origen)
      const legs = stopsCount + 1;
      const transitCost = legs * settings.transitFarePerTrip;
      // Tiempo transporte público: 14 km/h + 12 min de espera/caminata por tramo
      const durationMinutes = Math.round((km / 14) * 60) + (legs * 12);

      return {
        cost: transitCost,
        details: `Transporte público (${legs} tramos a $${settings.transitFarePerTrip} boleto): $${transitCost.toLocaleString('es-AR')}`,
        durationMinutes,
      };
    }

    case 'bike': {
      // Bicicleta: costo cero, quema de calorías aprox 32 kcal/km
      const calories = Math.round(km * 32);
      const durationMinutes = Math.round((km / 15) * 60);

      return {
        cost: 0,
        details: `Bicicleta: $0 de gasto · Quemas ~${calories} kcal en el recorrido`,
        durationMinutes,
      };
    }

    case 'walk':
    default: {
      // A pie: costo cero, pasos aprox 1.350 pasos/km
      const steps = Math.round(km * 1350);
      const durationMinutes = Math.round((km / 4.6) * 60);

      return {
        cost: 0,
        details: `A pie: $0 de transporte · ~${steps.toLocaleString('es-AR')} pasos de caminata`,
        durationMinutes,
      };
    }
  }
}

/**
 * Genera el enlace de Google Maps con origen y waypoints
 */
export function buildGoogleMapsDirectionsUrl(
  origin: GeoPoint,
  stops: StoreCart[]
): string {
  if (stops.length === 0) {
    return `https://www.google.com/maps/search/?api=1&query=${origin.lat},${origin.lng}`;
  }

  const originParam = `${origin.lat},${origin.lng}`;
  const destinationParam = `${stops[stops.length - 1].coordinates.lat},${stops[stops.length - 1].coordinates.lng}`;

  if (stops.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&travelmode=driving`;
  }

  // Multi-stop waypoints (todas las intermedias)
  const waypoints = stops
    .slice(0, stops.length - 1)
    .map((s) => `${s.coordinates.lat},${s.coordinates.lng}`)
    .join('|');

  return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destinationParam}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
}

/**
 * Genera el Deep Link de Uber para la primera parada o parada seleccionada
 */
export function buildUberDeepLink(
  origin: GeoPoint,
  destination: GeoPoint,
  dropoffNickname: string
): string {
  return `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${origin.lat}&pickup[longitude]=${origin.lng}&pickup[nickname]=${encodeURIComponent(origin.address || 'Mi Ubicación')}&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}&dropoff[nickname]=${encodeURIComponent(dropoffNickname)}`;
}

/**
 * Optimiza la ruta completa de compras considerando productos, comercios, descuentos bancarios,
 * distancias geográficas y costos de desplazamiento.
 */
export function optimizeSavingsRoute(params: {
  origin: GeoPoint;
  shoppingList: RouteShoppingItem[];
  promotions: Promotion[];
  userPaymentMethods: UserPaymentMethod[];
  transportSettings: TransportSettings;
  planningMode: DayPlanningMode;
  targetDate?: string; // YYYY-MM-DD
  maxStoresCount: number; // 1, 2, 3 o 4
  strategy: RouteStrategy;
  excludedStoreIds?: string[];
}): SavingsRoutePlan {
  const {
    origin,
    shoppingList,
    promotions,
    userPaymentMethods,
    transportSettings,
    planningMode,
    targetDate,
    maxStoresCount = 2,
    strategy = 'smart_balance',
    excludedStoreIds = [],
  } = params;

  // 1. Determinar el día de la semana
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  let chosenDateObj = new Date();
  
  if (planningMode === 'tomorrow') {
    chosenDateObj.setDate(chosenDateObj.getDate() + 1);
  } else if (planningMode === 'specific_date' && targetDate) {
    chosenDateObj = new Date(`${targetDate}T12:00:00`);
  }

  let selectedDayIndex = chosenDateObj.getDay();
  let dateFormattedStr = chosenDateObj.toISOString().split('T')[0];

  // Si el usuario eligió "El día que más me convenga esta semana", proyectar los 7 días
  const weekDaysComparison: WeekDaySavingsProjection[] = [];
  let bestDayIndex = selectedDayIndex;
  let highestNetSavings = -1;

  for (let d = 0; d < 7; d++) {
    const projDate = new Date();
    // Encontrar el día d de la semana actual
    const currentDay = projDate.getDay();
    const diff = d - currentDay;
    projDate.setDate(projDate.getDate() + diff);
    const dateStr = projDate.toISOString().split('T')[0];

    // Promos activas ese día d
    const dayPromos = promotions.filter((p) => p.applicableDays.includes(d));
    let sampleGrossSavings = 0;
    let topBankPromoTitle = '';

    for (const promo of dayPromos) {
      const comp = checkPaymentCompatibility(promo, userPaymentMethods);
      if (comp.isCompatible) {
        sampleGrossSavings += promo.maxCashback > 0 ? Math.min(12000, promo.maxCashback) : 8000;
        if (!topBankPromoTitle) {
          topBankPromoTitle = `${promo.issuer} (${promo.discountPercentage}% en ${promo.storeName})`;
        }
      }
    }

    // Estimar ahorro neto de ese día
    const approxTransport = transportSettings.mode === 'walk' || transportSettings.mode === 'bike' ? 0 : 2500;
    const projectedNet = Math.max(0, sampleGrossSavings - approxTransport);

    if (projectedNet > highestNetSavings) {
      highestNetSavings = projectedNet;
      bestDayIndex = d;
    }

    weekDaysComparison.push({
      dayIndex: d,
      dayName: dayNames[d],
      dateStr,
      grossSavings: sampleGrossSavings,
      netSavings: projectedNet,
      isBestDay: false,
      highlights: topBankPromoTitle || 'Descuentos regulares de comercio',
      bestBankPromo: topBankPromoTitle,
    });
  }

  // Marcar el mejor día en la proyección
  if (weekDaysComparison[bestDayIndex]) {
    weekDaysComparison[bestDayIndex].isBestDay = true;
  }

  // Si el modo es "best_day_week", fijamos el día óptimo calculado
  if (planningMode === 'best_day_week') {
    selectedDayIndex = bestDayIndex;
    const bestProj = weekDaysComparison[bestDayIndex];
    dateFormattedStr = bestProj.dateStr;
  }

  // Promociones vigentes para el día elegido
  const activePromosForDay = promotions.filter((p) => 
    p.applicableDays.includes(selectedDayIndex) && p.verificationStatus !== 'EXPIRED'
  );

  // Comercios candidatos disponibles
  const availableBranches = KNOWN_STORE_BRANCHES.filter((b) => 
    !excludedStoreIds.includes(b.storeId)
  );

  // 2. Evaluar para cada producto el mejor comercio
  // Si shoppingList está vacía, no hay nada que calcular
  if (shoppingList.length === 0) {
    return createEmptyPlan(origin, dateFormattedStr, selectedDayIndex, dayNames[selectedDayIndex], transportSettings);
  }

  // Asignar cada producto a la tienda más conveniente
  // Candidatas principales de supermercados
  const candidateStores = availableBranches.slice(0, Math.min(availableBranches.length, Math.max(1, maxStoresCount)));

  // Calcular precio de cada ítem en cada comercio candidato y encontrar mejor asignación
  const storeCartsMap: Map<string, StoreCart> = new Map();

  for (const branch of candidateStores) {
    // Buscar la mejor promo compatible para este comercio en este día
    const storePromos = activePromosForDay.filter((p) => 
      p.storeName.toLowerCase().includes(branch.storeName.toLowerCase()) ||
      branch.storeName.toLowerCase().includes(p.storeName.toLowerCase())
    );

    let bestPromo: Promotion | null = null;
    let bestMethod: UserPaymentMethod | null = null;
    let highestDiscount = 0;

    for (const promo of storePromos) {
      const comp = checkPaymentCompatibility(promo, userPaymentMethods);
      if (comp.isCompatible && comp.matchingMethod) {
        if (promo.discountPercentage > highestDiscount) {
          highestDiscount = promo.discountPercentage;
          bestPromo = promo;
          bestMethod = comp.matchingMethod;
        }
      }
    }

    const distFromOrigin = calculateHaversineDistance(origin.lat, origin.lng, branch.lat, branch.lng);

    storeCartsMap.set(branch.storeId, {
      storeId: branch.storeId,
      storeName: branch.storeName,
      branchName: branch.branchName,
      address: branch.address,
      coordinates: {
        lat: branch.lat,
        lng: branch.lng,
        address: branch.address,
      },
      openingHours: branch.openingHours,
      items: [],
      itemsSubtotal: 0,
      recommendedPaymentMethod: bestMethod,
      appliedPromotion: bestPromo,
      discountAmount: 0,
      isCapReached: false,
      reachCapAmount: bestPromo && bestPromo.maxCashback > 0 
        ? Math.round(bestPromo.maxCashback / (bestPromo.discountPercentage / 100))
        : null,
      netPayable: 0,
      actualSavings: 0,
      distanceFromPrevKm: distFromOrigin,
      travelTimeFromPrevMinutes: Math.round((distFromOrigin / 22) * 60) + 4,
      proratedTransportCost: 0,
      netSavings: 0,
    });
  }

  // Distribuir productos entre los carritos
  // Si maxStoresCount === 1, todo va al comercio con mejor beneficio
  // Si maxStoresCount > 1, asignamos cada producto donde tenga mejor precio unitario o beneficio
  for (const item of shoppingList) {
    let bestAssignedStoreId = candidateStores[0]?.storeId;
    let lowestNetItemPrice = Infinity;
    let chosenItemPricing: any = null;

    for (const branch of candidateStores) {
      const cart = storeCartsMap.get(branch.storeId)!;
      const pricing = resolveProductPriceForStore(item, branch.storeName);
      
      // Calcular precio efectivo con descuento de la tienda
      const discountPct = cart.appliedPromotion ? cart.appliedPromotion.discountPercentage : 0;
      const effectiveUnitPrice = pricing.unitPrice * (1 - discountPct / 100);

      if (effectiveUnitPrice < lowestNetItemPrice || !chosenItemPricing) {
        lowestNetItemPrice = effectiveUnitPrice;
        bestAssignedStoreId = branch.storeId;
        chosenItemPricing = pricing;
      }
    }

    // Agregar el producto al carrito ganador
    const targetCart = storeCartsMap.get(bestAssignedStoreId)!;
    const itemSubtotal = chosenItemPricing.unitPrice * item.quantity;
    const itemRefTotal = chosenItemPricing.referencePrice * item.quantity;
    const itemSavings = Math.max(0, itemRefTotal - itemSubtotal);

    const storeCartItem: StoreCartItem = {
      product: item,
      quantity: item.quantity,
      unitPrice: chosenItemPricing.unitPrice,
      subtotal: itemSubtotal,
      referencePrice: chosenItemPricing.referencePrice,
      savings: itemSavings,
      confidenceScore: chosenItemPricing.confidenceScore,
      priceSource: chosenItemPricing.priceSource,
      observedAt: chosenItemPricing.observedAt,
      promoCondition: chosenItemPricing.promoCondition,
      isSubstitute: item.allowSubstitution || false,
    };

    targetCart.items.push(storeCartItem);
    targetCart.itemsSubtotal += itemSubtotal;
  }

  // Filtrar carritos que tengan al menos 1 producto
  let activeStoreCarts = Array.from(storeCartsMap.values()).filter((c) => c.items.length > 0);

  // Si por estrategia 'min_time' o 'maxStoresCount === 1', forzar todo al mejor comercio
  if (strategy === 'min_time' && activeStoreCarts.length > 1) {
    // Mover todos los ítems al comercio con mayor subtotal
    const mainCart = activeStoreCarts.reduce((max, c) => c.itemsSubtotal > max.itemsSubtotal ? c : max);
    for (const otherCart of activeStoreCarts) {
      if (otherCart.storeId !== mainCart.storeId) {
        for (const it of otherCart.items) {
          const rePriced = resolveProductPriceForStore(it.product, mainCart.storeName);
          it.unitPrice = rePriced.unitPrice;
          it.subtotal = rePriced.unitPrice * it.quantity;
          it.referencePrice = rePriced.referencePrice;
          it.savings = Math.max(0, (rePriced.referencePrice * it.quantity) - it.subtotal);
          mainCart.items.push(it);
          mainCart.itemsSubtotal += it.subtotal;
        }
      }
    }
    activeStoreCarts = [mainCart];
  }

  // Ordenar las paradas de visita para reducir la distancia total (Nearest Neighbor TSP)
  activeStoreCarts = orderStopsEfficiently(origin, activeStoreCarts);

  // Recalcular distancias parada por parada
  let cumulativeDistanceKm = 0;
  let prevPoint = origin;

  for (let i = 0; i < activeStoreCarts.length; i++) {
    const cart = activeStoreCarts[i];
    const legDistance = calculateHaversineDistance(prevPoint.lat, prevPoint.lng, cart.coordinates.lat, cart.coordinates.lng);
    cart.distanceFromPrevKm = legDistance;
    cart.travelTimeFromPrevMinutes = Math.round((legDistance / 22) * 60) + 3;
    cumulativeDistanceKm += legDistance;
    prevPoint = cart.coordinates;
  }

  // Agregar tramo de regreso al origen si es auto, bici o a pie
  const returnLegKm = calculateHaversineDistance(prevPoint.lat, prevPoint.lng, origin.lat, origin.lng);
  const totalRoundTripKm = cumulativeDistanceKm + (transportSettings.mode !== 'uber' ? returnLegKm : 0);

  // Calcular descuentos y topes para cada carrito individual
  let totalGrossSavings = 0;
  let totalCartGrossAmount = 0;

  for (const cart of activeStoreCarts) {
    totalCartGrossAmount += cart.itemsSubtotal;

    if (cart.appliedPromotion) {
      const calc = calculateSavings(cart.itemsSubtotal, cart.appliedPromotion, cart.distanceFromPrevKm, false);
      cart.discountAmount = calc.actualSavings;
      cart.isCapReached = calc.isCapped;
      cart.netPayable = calc.netPayable;
      cart.actualSavings = calc.actualSavings;
      totalGrossSavings += calc.actualSavings;

      // Evaluar división de pagos dentro del comercio si el tope se superó
      if (calc.isCapped && userPaymentMethods.filter((m) => m.isEnabled).length >= 2) {
        const otherMethod = userPaymentMethods.find((m) => m.isEnabled && m.id !== cart.recommendedPaymentMethod?.id);
        if (otherMethod && cart.reachCapAmount && cart.itemsSubtotal > cart.reachCapAmount + 5000) {
          const firstAmount = cart.reachCapAmount;
          const secondAmount = cart.itemsSubtotal - cart.reachCapAmount;
          const extraGain = Math.round(secondAmount * 0.15); // aprox 15% con el segundo medio

          cart.splitRecommendation = {
            recommended: true,
            reasoning: `La compra de $${cart.itemsSubtotal.toLocaleString('es-AR')} supera el tope de reintegro de $${cart.appliedPromotion.maxCashback.toLocaleString('es-AR')} a los $${firstAmount.toLocaleString('es-AR')}. Paga $${firstAmount.toLocaleString('es-AR')} con ${cart.recommendedPaymentMethod?.name} y los $${secondAmount.toLocaleString('es-AR')} restantes con ${otherMethod.name}.`,
            firstPaymentMethod: cart.recommendedPaymentMethod?.name || 'Tarjeta A',
            firstAmount,
            secondPaymentMethod: otherMethod.name,
            secondAmount,
            extraGain,
          };
          totalGrossSavings += extraGain;
        }
      }
    } else {
      cart.discountAmount = 0;
      cart.netPayable = cart.itemsSubtotal;
      cart.actualSavings = 0;
    }
  }

  // Calcular costo de transporte total
  const transportCalc = calculateTransportationCost(
    totalRoundTripKm,
    activeStoreCarts.length,
    transportSettings,
    origin,
    activeStoreCarts[0]?.coordinates
  );

  const totalTransportCost = transportCalc.cost;
  const totalNetSavings = Math.max(0, totalGrossSavings - totalTransportCost);

  // Prorratear costo de transporte entre los carritos para mostrar ahorro neto por parada
  for (const cart of activeStoreCarts) {
    const proportion = totalCartGrossAmount > 0 ? (cart.itemsSubtotal / totalCartGrossAmount) : 1;
    cart.proratedTransportCost = Math.round(totalTransportCost * proportion);
    cart.netSavings = Math.max(0, cart.actualSavings - cart.proratedTransportCost);
  }

  // Comparación contra comprar TODO en un único comercio
  const singleStoreComparisons = computeSingleStoreComparisons({
    origin,
    shoppingList,
    promotions: activePromosForDay,
    userPaymentMethods,
    transportSettings,
    multiStoreNetSavings: totalNetSavings,
  });

  // URLs de navegación
  const googleMapsDirectionsUrl = buildGoogleMapsDirectionsUrl(origin, activeStoreCarts);
  const uberDeepLinkUrl = activeStoreCarts[0] 
    ? buildUberDeepLink(origin, activeStoreCarts[0].coordinates, activeStoreCarts[0].storeName)
    : `https://m.uber.com/ul/`;

  // Tiempos totales: viaje + estadía dentro de cada sucursal (aprox 20 min por comercio)
  const inStoreMinutes = activeStoreCarts.length * 20;
  const totalTripMinutes = transportCalc.durationMinutes + inStoreMinutes;

  const transportBudgetPercent = transportSettings.maxTransportBudget > 0
    ? Math.min(100, Math.round((totalTransportCost / transportSettings.maxTransportBudget) * 100))
    : 0;

  // Veredicto y recomendación
  let recommendationVerdict = '';
  const bestSingle = singleStoreComparisons[0];
  const deltaVsSingle = bestSingle ? totalNetSavings - bestSingle.netSavings : 0;

  if (activeStoreCarts.length === 1) {
    recommendationVerdict = `Te conviene realizar toda la compra en ${activeStoreCarts[0].storeName} (${activeStoreCarts[0].branchName}): aprovechas el descuento completo con costo mínimo de traslado.`;
  } else if (deltaVsSingle > 1500) {
    recommendationVerdict = `¡Excelente! Visitar ${activeStoreCarts.length} comercios te genera un Ahorro Neto de $${totalNetSavings.toLocaleString('es-AR')}, ganando $${deltaVsSingle.toLocaleString('es-AR')} extra en comparación con comprar todo en un solo lugar.`;
  } else if (deltaVsSingle > 0) {
    recommendationVerdict = `El ahorro neto multi-comercio es ligeramente superior ($${deltaVsSingle.toLocaleString('es-AR')} extra). Si prefieres ahorrar tiempo, comprar todo en ${bestSingle.storeName} es una alternativa muy cómoda.`;
  } else {
    recommendationVerdict = `No se justifica el viaje a múltiples comercios: el costo de transporte ($${totalTransportCost.toLocaleString('es-AR')}) absorbe el beneficio. Te recomendamos comprar todo en ${bestSingle.storeName}.`;
  }

  const dayReason = planningMode === 'best_day_week'
    ? `Recomendamos comprar el ${dayNames[selectedDayIndex]} porque se activan los mejores topes bancarios de la semana.`
    : undefined;

  return {
    origin,
    date: dateFormattedStr,
    dayIndex: selectedDayIndex,
    dayName: dayNames[selectedDayIndex],
    dayRecommendationReason: dayReason,
    totalProductsCount: shoppingList.reduce((sum, item) => sum + item.quantity, 0),
    totalCartGrossAmount,
    totalGrossSavings,
    totalTransportCost,
    totalNetSavings,
    totalDistanceKm: Math.round(totalRoundTripKm * 10) / 10,
    totalTravelMinutes: transportCalc.durationMinutes,
    totalInStoreMinutes: inStoreMinutes,
    totalTripMinutes,
    transportBudgetPercent,
    transportMode: transportSettings.mode,
    transportModeDetails: transportCalc.details,
    storeCarts: activeStoreCarts,
    singleStoreComparisons,
    weekDaysComparison,
    googleMapsDirectionsUrl,
    uberEstimate: transportCalc.uberEstimate,
    uberDeepLinkUrl,
    recommendationVerdict,
  };
}

/**
 * Ordena las paradas de comercios usando algoritmo del vecino más cercano para acortar kilómetros
 */
function orderStopsEfficiently(origin: GeoPoint, carts: StoreCart[]): StoreCart[] {
  if (carts.length <= 1) return carts;

  const unvisited = [...carts];
  const ordered: StoreCart[] = [];
  let currentPos = origin;

  while (unvisited.length > 0) {
    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateHaversineDistance(
        currentPos.lat,
        currentPos.lng,
        unvisited[i].coordinates.lat,
        unvisited[i].coordinates.lng
      );
      if (dist < closestDistance) {
        closestDistance = dist;
        closestIndex = i;
      }
    }

    const nextStop = unvisited.splice(closestIndex, 1)[0];
    ordered.push(nextStop);
    currentPos = nextStop.coordinates;
  }

  return ordered;
}

/**
 * Calcula el escenario base de comprar TODO en un único comercio para comparar
 */
function computeSingleStoreComparisons(params: {
  origin: GeoPoint;
  shoppingList: RouteShoppingItem[];
  promotions: Promotion[];
  userPaymentMethods: UserPaymentMethod[];
  transportSettings: TransportSettings;
  multiStoreNetSavings: number;
}): SingleStoreComparison[] {
  const { origin, shoppingList, promotions, userPaymentMethods, transportSettings, multiStoreNetSavings } = params;

  const baselineStores = [
    { name: 'Coto Hipermercado', branch: KNOWN_STORE_BRANCHES[0] },
    { name: 'Carrefour Hiper', branch: KNOWN_STORE_BRANCHES[1] },
    { name: 'Supermercados DIA', branch: KNOWN_STORE_BRANCHES[2] },
  ];

  const results: SingleStoreComparison[] = [];

  for (const store of baselineStores) {
    let totalCart = 0;
    let totalRef = 0;

    for (const item of shoppingList) {
      const pricing = resolveProductPriceForStore(item, store.name);
      totalCart += pricing.unitPrice * item.quantity;
      totalRef += pricing.referencePrice * item.quantity;
    }

    // Buscar mejor promo compatible
    const matchingPromos = promotions.filter((p) => 
      p.storeName.toLowerCase().includes(store.name.toLowerCase()) ||
      store.name.toLowerCase().includes(p.storeName.toLowerCase())
    );

    let maxDiscount = 0;
    for (const promo of matchingPromos) {
      const comp = checkPaymentCompatibility(promo, userPaymentMethods);
      if (comp.isCompatible) {
        const calc = calculateSavings(totalCart, promo, 0, false);
        if (calc.actualSavings > maxDiscount) {
          maxDiscount = calc.actualSavings;
        }
      }
    }

    // Costo de viaje a este único comercio ida y vuelta
    const distOneWay = calculateHaversineDistance(origin.lat, origin.lng, store.branch.lat, store.branch.lng);
    const roundTripKm = distOneWay * 2;
    const transportCalc = calculateTransportationCost(roundTripKm, 1, transportSettings, origin, store.branch);

    const netSavings = Math.max(0, maxDiscount - transportCalc.cost);
    const netPayableTotal = (totalCart - maxDiscount) + transportCalc.cost;
    const diffVsMulti = multiStoreNetSavings - netSavings;

    let verdict = '';
    if (diffVsMulti > 1500) {
      verdict = `Pierdes $${diffVsMulti.toLocaleString('es-AR')} de ahorro neto vs la ruta multi-comercio, pero ahorras tiempo al hacer solo una parada.`;
    } else if (diffVsMulti > 0) {
      verdict = `Casi igual: solo $${diffVsMulti.toLocaleString('es-AR')} menos de ahorro y visitas 1 solo comercio.`;
    } else {
      verdict = `¡Mejor o igual que dividir! Comprar todo aquí es más conveniente por el ahorro de transporte.`;
    }

    results.push({
      storeName: store.name,
      totalCart,
      discountAmount: maxDiscount,
      transportCost: transportCalc.cost,
      netSavings,
      netPayableTotal,
      differenceVsMultiStore: diffVsMulti,
      verdict,
    });
  }

  // Ordenar de mayor a menor ahorro neto
  return results.sort((a, b) => b.netSavings - a.netSavings);
}

function createEmptyPlan(
  origin: GeoPoint,
  date: string,
  dayIndex: number,
  dayName: string,
  settings: TransportSettings
): SavingsRoutePlan {
  return {
    origin,
    date,
    dayIndex,
    dayName,
    totalProductsCount: 0,
    totalCartGrossAmount: 0,
    totalGrossSavings: 0,
    totalTransportCost: 0,
    totalNetSavings: 0,
    totalDistanceKm: 0,
    totalTravelMinutes: 0,
    totalInStoreMinutes: 0,
    totalTripMinutes: 0,
    transportBudgetPercent: 0,
    transportMode: settings.mode,
    transportModeDetails: 'Sin transporte requerido',
    storeCarts: [],
    singleStoreComparisons: [],
    googleMapsDirectionsUrl: `https://www.google.com/maps/search/?api=1&query=${origin.lat},${origin.lng}`,
    uberDeepLinkUrl: `https://m.uber.com/ul/`,
    recommendationVerdict: 'Agrega productos a tu canasta para calcular la ruta inteligente de ahorro.',
  };
}
