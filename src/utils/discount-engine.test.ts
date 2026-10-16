import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSavings, comparePromotions, checkPaymentCompatibility } from './discount-engine.ts';
import type { Promotion, UserPaymentMethod } from '../types/index.ts';

const mockPromoA: Promotion = {
  id: 'promo-a',
  title: '20% en Supermercado A',
  storeName: 'Supermercado A',
  branchName: 'Sucursal Centro',
  category: 'supermercados',
  issuer: 'Banco Santander',
  paymentInstrument: 'Tarjeta de Crédito Visa',
  requiredBrand: 'visa',
  discountPercentage: 20,
  maxCashback: 10000,
  minPurchase: 0,
  applicableDays: [1, 2, 3, 4, 5, 6, 0],
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  benefitType: 'immediate',
  terms: 'Válido en compras presenciales.',
  exclusions: ['Electro'],
  compatibilityNotes: 'No acumulable.',
  source: 'Santander Beneficios',
  verifiedAt: '2026-10-14',
  verificationStatus: 'VERIFIED',
  confidenceScore: 99,
  isOnlineOnly: false,
  coordinates: { lat: -34.588, lng: -58.430, address: 'Av. Santa Fe 3200' },
};

const mockPromoB: Promotion = {
  id: 'promo-b',
  title: '15% en Supermercado B',
  storeName: 'Supermercado B',
  branchName: 'Sucursal Palermo',
  category: 'supermercados',
  issuer: 'BBVA',
  paymentInstrument: 'Tarjeta de Débito Visa',
  requiredBrand: 'visa',
  discountPercentage: 15,
  maxCashback: 20000,
  minPurchase: 0,
  applicableDays: [1, 2, 3, 4, 5, 6, 0],
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  benefitType: 'cashback_statement',
  terms: 'Reintegro a los 30 días.',
  exclusions: [],
  compatibilityNotes: 'No acumulable.',
  source: 'BBVA Go',
  verifiedAt: '2026-10-14',
  verificationStatus: 'VERIFIED',
  confidenceScore: 98,
  isOnlineOnly: false,
  coordinates: { lat: -34.580, lng: -58.420, address: 'Av. Scalabrini Ortiz 1500' },
};

test('Scenario from User Prompt: $100.000 purchase compares 20% cap $10.000 vs 15% cap $20.000', () => {
  const resultA = calculateSavings(100000, mockPromoA, 0, false);
  const resultB = calculateSavings(100000, mockPromoB, 0, false);

  // Promo A: 20% of 100.000 is 20.000, but capped at 10.000
  assert.equal(resultA.nominalDiscount, 20000);
  assert.equal(resultA.actualSavings, 10000);
  assert.equal(resultA.isCapped, true);
  assert.equal(resultA.reachCapAmount, 50000); // $10.000 / 0.20 = $50.000

  // Promo B: 15% of 100.000 is 15.000, under the 20.000 cap
  assert.equal(resultB.nominalDiscount, 15000);
  assert.equal(resultB.actualSavings, 15000);
  assert.equal(resultB.isCapped, false);
  assert.equal(resultB.reachCapAmount, 133333); // $20.000 / 0.15 ≈ $133.333

  // Compare both promos
  const comparison = comparePromotions(100000, [mockPromoA, mockPromoB], {}, false);
  assert.equal(comparison.bestOption?.promoId, 'promo-b');
  assert.equal(comparison.bestOption?.actualSavings, 15000);
  assert.equal(comparison.bestOption?.isRecommended, true);
});

test('Minimum purchase requirement enforces $0 savings if not met', () => {
  const promoWithMin: Promotion = {
    ...mockPromoA,
    id: 'promo-min',
    minPurchase: 25000,
  };

  const belowMin = calculateSavings(20000, promoWithMin, 0, false);
  assert.equal(belowMin.meetsMinPurchase, false);
  assert.equal(belowMin.actualSavings, 0);

  const meetsMin = calculateSavings(30000, promoWithMin, 0, false);
  assert.equal(meetsMin.meetsMinPurchase, true);
  assert.equal(meetsMin.actualSavings, 6000); // 20% of 30.000
});

test('Travel cost penalization reduces net savings for far locations', () => {
  // 10 km distance at $180/km * 2 ways = $3.600 travel cost
  const withTravel = calculateSavings(50000, mockPromoA, 10, true);
  assert.equal(withTravel.actualSavings, 10000);
  assert.equal(withTravel.estimatedTravelCost, 3600);
  assert.equal(withTravel.netSavingsAfterTravel, 6400);
});

test('Payment method compatibility checks issuer and brand', () => {
  const userMethods: UserPaymentMethod[] = [
    {
      id: 'm1',
      name: 'Santander Visa Débito',
      type: 'debit',
      issuer: 'Banco Santander',
      brand: 'visa',
      isEnabled: true,
    },
    {
      id: 'm2',
      name: 'Mercado Pago',
      type: 'wallet',
      issuer: 'Mercado Pago',
      isEnabled: true,
    },
  ];

  const checkSantander = checkPaymentCompatibility(mockPromoA, userMethods);
  assert.equal(checkSantander.isCompatible, true);
  assert.equal(checkSantander.matchingMethod?.issuer, 'Banco Santander');

  const checkBBVA = checkPaymentCompatibility(mockPromoB, userMethods);
  assert.equal(checkBBVA.isCompatible, false);
});
