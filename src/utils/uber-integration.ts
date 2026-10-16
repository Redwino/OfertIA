/**
 * Integración y estimación de costos de desplazamiento con Uber y transporte
 */

import { UberEstimate } from '../types/index.ts';

/**
 * Genera la estimación de costo de viaje en Uber y el deep link para abrir la app
 */
export function estimateUberRide(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  distanceKm: number,
  cityName: string = 'Buenos Aires'
): UberEstimate {
  // En áreas metropolitanas (ej. AMBA), estimación basada en tarifa base + km + tiempo promedio
  // Tarifa base aprox $900 + $280 por km + factor de congestión promedio
  const durationMinutes = Math.max(5, Math.round((distanceKm / 22) * 60) + 3);
  const basePrice = 900 + distanceKm * 320 + durationMinutes * 45;

  const estimatedCostMin = Math.round((basePrice * 0.9) / 50) * 50;
  const estimatedCostMax = Math.round((basePrice * 1.25) / 50) * 50;

  // Deep link oficial universal de Uber
  const deepLink = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${originLat}&pickup[longitude]=${originLng}&dropoff[latitude]=${destLat}&dropoff[longitude]=${destLng}`;

  return {
    product: 'UberX',
    estimatedCostMin,
    estimatedCostMax,
    formattedEstimate: `$${estimatedCostMin.toLocaleString('es-AR')} - $${estimatedCostMax.toLocaleString('es-AR')}`,
    durationMinutes,
    distanceKm,
    deepLink,
    isAvailable: true,
  };
}

/**
 * Calcula el ahorro neto de la compra considerando si el viaje es incremental
 */
export function calculateNetSavingsWithTravel(
  grossSavings: number,
  travelCost: number,
  isTripDedicated: boolean = true
): {
  netSavings: number;
  deductionApplied: number;
  isJustified: boolean;
  advice: string;
} {
  const deductionApplied = isTripDedicated ? travelCost : 0;
  const netSavings = Math.max(0, grossSavings - deductionApplied);
  const isJustified = netSavings > 0;

  let advice = '';
  if (!isTripDedicated) {
    advice = 'Viaje planificado previamente: no se descuenta costo adicional de transporte.';
  } else if (deductionApplied >= grossSavings) {
    advice = `¡No recomendado desplazarse! El costo del viaje ($${deductionApplied.toLocaleString('es-AR')}) anula el ahorro de $${grossSavings.toLocaleString('es-AR')}.`;
  } else {
    advice = `Ahorro neto justificado: tras descontar $${deductionApplied.toLocaleString('es-AR')} de traslado, conservas $${netSavings.toLocaleString('es-AR')} en tu bolsillo.`;
  }

  return {
    netSavings,
    deductionApplied,
    isJustified,
    advice,
  };
}
