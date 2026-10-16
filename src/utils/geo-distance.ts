/**
 * Utilidades geográficas deterministas para cálculo de distancias y ordenamiento
 */

import type { GeoPoint, Promotion } from '../types/index.ts';

/**
 * Calcula la distancia ortodrómica entre dos puntos mediante la fórmula de Haversine en kilómetros.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Radio medio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Redondeo a 1 decimal
  return Math.round(distance * 10) / 10;
}

/**
 * Estima el tiempo de viaje aproximado según el medio de transporte
 */
export function estimateTravelTime(
  distanceKm: number,
  mode: 'walk' | 'car' = 'car'
): string {
  if (distanceKm <= 0) return '0 min';

  if (mode === 'walk') {
    // Velocidad media peatonal 4.5 km/h
    const minutes = Math.round((distanceKm / 4.5) * 60);
    return minutes < 60 ? `${minutes} min a pie` : `${Math.floor(minutes / 60)}h ${minutes % 60}m a pie`;
  } else {
    // Tráfico urbano promedio 25 km/h + 2 min estacionamiento
    const minutes = Math.round((distanceKm / 25) * 60) + 2;
    return `${minutes} min en auto`;
  }
}

/**
 * Estima el costo del viaje (combustible o transporte)
 * Por defecto aprox $180 por km en ciudad
 */
export function estimateTravelCost(
  distanceKm: number,
  costPerKm: number = 180
): number {
  // Viaje ida y vuelta (distancia * 2)
  return Math.round(distanceKm * 2 * costPerKm);
}

/**
 * Filtra y ordena promociones según la distancia al usuario
 */
export function filterAndSortByDistance(
  promos: Promotion[],
  userLat: number,
  userLng: number,
  maxRadiusKm: number = 10
): (Promotion & { distanceKm: number })[] {
  return promos
    .map((promo) => {
      const distanceKm = promo.isOnlineOnly
        ? 0
        : calculateHaversineDistance(
            userLat,
            userLng,
            promo.coordinates.lat,
            promo.coordinates.lng
          );
      return {
        ...promo,
        distanceKm,
      };
    })
    .filter((p) => p.isOnlineOnly || p.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
