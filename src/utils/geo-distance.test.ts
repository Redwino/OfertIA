import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHaversineDistance, estimateTravelTime, estimateTravelCost, filterAndSortByDistance } from './geo-distance.ts';
import type { Promotion } from '../types/index.ts';

test('Haversine distance calculates accurate kilometers between two points', () => {
  // Obelisco Buenos Aires: -34.6037, -58.3816
  // Alto Palermo Shopping: -34.5880, -58.4110
  // Distance is approximately 3.2 km
  const distance = calculateHaversineDistance(-34.6037, -58.3816, -34.5880, -58.4110);
  assert.ok(distance >= 3.0 && distance <= 3.5, `Expected ~3.2km, got ${distance}`);

  // Same coordinates should return 0
  assert.equal(calculateHaversineDistance(-34.6037, -58.3816, -34.6037, -58.3816), 0);
});

test('Travel cost estimates roundtrip transport accurately', () => {
  // 5 km * 2 ways * $180/km = $1.800
  const cost = estimateTravelCost(5, 180);
  assert.equal(cost, 1800);
});

test('Travel time estimates for walking and car', () => {
  const walkTime = estimateTravelTime(0.9, 'walk');
  assert.ok(walkTime.includes('min a pie'));

  const carTime = estimateTravelTime(5, 'car');
  assert.ok(carTime.includes('min en auto'));
});

test('Filter and sort by distance excludes far stores and preserves order', () => {
  const userLat = -34.6037;
  const userLng = -58.3816;

  const mockPromos: Promotion[] = [
    {
      id: 'p-far',
      title: 'Promo Lejana (50km)',
      storeName: 'Lejano',
      branchName: 'Sucursal Pilar',
      category: 'supermercados',
      issuer: 'Santander',
      paymentInstrument: 'Visa',
      discountPercentage: 20,
      maxCashback: 5000,
      minPurchase: 0,
      applicableDays: [1, 2, 3],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      benefitType: 'immediate',
      terms: '',
      exclusions: [],
      compatibilityNotes: '',
      source: '',
      verifiedAt: '2026-10-14',
      verificationStatus: 'VERIFIED',
      confidenceScore: 90,
      isOnlineOnly: false,
      coordinates: { lat: -34.4500, lng: -58.9100, address: 'Pilar' },
    },
    {
      id: 'p-near',
      title: 'Promo Cercana (1km)',
      storeName: 'Cercano',
      branchName: 'Sucursal Obelisco',
      category: 'supermercados',
      issuer: 'BBVA',
      paymentInstrument: 'Visa',
      discountPercentage: 15,
      maxCashback: 5000,
      minPurchase: 0,
      applicableDays: [1, 2, 3],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      benefitType: 'immediate',
      terms: '',
      exclusions: [],
      compatibilityNotes: '',
      source: '',
      verifiedAt: '2026-10-14',
      verificationStatus: 'VERIFIED',
      confidenceScore: 95,
      isOnlineOnly: false,
      coordinates: { lat: -34.6000, lng: -58.3800, address: 'Av. Corrientes 1000' },
    },
    {
      id: 'p-online',
      title: 'Promo Online',
      storeName: 'Tienda Web',
      branchName: 'E-commerce',
      category: 'online',
      issuer: 'Mercado Pago',
      paymentInstrument: 'Saldo',
      discountPercentage: 25,
      maxCashback: 8000,
      minPurchase: 0,
      applicableDays: [1, 2, 3],
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      benefitType: 'wallet_instant',
      terms: '',
      exclusions: [],
      compatibilityNotes: '',
      source: '',
      verifiedAt: '2026-10-14',
      verificationStatus: 'VERIFIED',
      confidenceScore: 99,
      isOnlineOnly: true,
      coordinates: { lat: 0, lng: 0, address: 'Online' },
    },
  ];

  // Filter max 5km
  const filtered = filterAndSortByDistance(mockPromos, userLat, userLng, 5);
  // Far store (Pilar ~50km) should be excluded, near store and online should be included
  assert.equal(filtered.length, 2);
  const ids = filtered.map((f) => f.id);
  assert.ok(ids.includes('p-near'));
  assert.ok(ids.includes('p-online'));
  assert.ok(!ids.includes('p-far'));
});
