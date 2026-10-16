import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizeCartPayment } from './cart-optimizer.ts';
import type { CartProductEntry, Promotion, UserPaymentMethod } from '../types/index.ts';

const mockPromos: Promotion[] = [
  {
    id: 'p1',
    title: '20% Santander (tope $10.000)',
    storeName: 'Coto',
    branchName: 'Palermo',
    category: 'supermercados',
    issuer: 'Santander',
    paymentInstrument: 'Visa',
    discountPercentage: 20,
    maxCashback: 10000,
    minPurchase: 0,
    applicableDays: [1, 2, 3, 4, 5, 6, 0],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    benefitType: 'immediate',
    terms: '',
    exclusions: [],
    compatibilityNotes: '',
    source: '',
    verifiedAt: '2026-10-15',
    verificationStatus: 'VERIFIED',
    confidenceScore: 99,
    isOnlineOnly: false,
    coordinates: { lat: 0, lng: 0, address: '' },
  },
  {
    id: 'p2',
    title: '25% MODO (tope $15.000)',
    storeName: 'Carrefour',
    branchName: 'Warnes',
    category: 'supermercados',
    issuer: 'MODO',
    paymentInstrument: 'QR',
    discountPercentage: 25,
    maxCashback: 15000,
    minPurchase: 0,
    applicableDays: [1, 2, 3, 4, 5, 6, 0],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    benefitType: 'wallet_instant',
    terms: '',
    exclusions: [],
    compatibilityNotes: '',
    source: '',
    verifiedAt: '2026-10-15',
    verificationStatus: 'VERIFIED',
    confidenceScore: 98,
    isOnlineOnly: false,
    coordinates: { lat: 0, lng: 0, address: '' },
  },
];

const mockMethods: UserPaymentMethod[] = [
  { id: 'm1', name: 'Santander Visa', type: 'credit', issuer: 'Santander', isEnabled: true },
  { id: 'm2', name: 'MODO QR', type: 'wallet', issuer: 'MODO', isEnabled: true },
];

test('optimizeCartPayment recommends single payment when under cap', () => {
  const items: CartProductEntry[] = [
    {
      id: 'c1',
      product: {
        id: 'p-1',
        name: 'Leche 1L',
        brand: 'LS',
        presentation: '1L',
        unit: 'l',
        unitQuantity: 1,
        category: 'supermercados',
        averageObservedPrice: 1500,
        lowestObservedPrice: 1300,
        lowestPriceStore: 'Coto',
        lastObservedAt: '2026-10-15',
      },
      quantity: 10,
      selectedStore: 'Carrefour',
      unitPrice: 1500,
      itemSubtotal: 15000,
    },
  ];

  const result = optimizeCartPayment(items, mockPromos, mockMethods);
  assert.ok(result.singlePaymentWinner);
  assert.equal(result.singlePaymentWinner?.method.issuer, 'MODO'); // 25% of 15000 = 3750
  assert.equal(result.singlePaymentWinner?.savings, 3750);
});

test('optimizeCartPayment recommends split payment when a large cart exceeds single cap', () => {
  const items: CartProductEntry[] = [
    {
      id: 'c1',
      product: {
        id: 'p-1',
        name: 'Electro / Despensa Mayor',
        brand: 'G',
        presentation: '1u',
        unit: 'un',
        unitQuantity: 1,
        category: 'supermercados',
        averageObservedPrice: 60000,
        lowestObservedPrice: 60000,
        lowestPriceStore: 'Coto',
        lastObservedAt: '2026-10-15',
      },
      quantity: 1,
      selectedStore: 'Coto',
      unitPrice: 60000,
      itemSubtotal: 60000,
    },
    {
      id: 'c2',
      product: {
        id: 'p-2',
        name: 'Mercadería General',
        brand: 'G',
        presentation: '1u',
        unit: 'un',
        unitQuantity: 1,
        category: 'supermercados',
        averageObservedPrice: 50000,
        lowestObservedPrice: 50000,
        lowestPriceStore: 'Carrefour',
        lastObservedAt: '2026-10-15',
      },
      quantity: 1,
      selectedStore: 'Carrefour',
      unitPrice: 50000,
      itemSubtotal: 50000,
    },
  ];

  const result = optimizeCartPayment(items, mockPromos, mockMethods);
  // Total cart is $110.000. In a single payment MODO gives cap $15.000.
  // In split payment: MODO gives $15.000 on part 1, and Santander gives $10.000 on part 2 = $25.000 total!
  assert.ok(result.splitOption);
  assert.equal(result.splitOption?.isSplitRecommended, true);
  assert.ok((result.splitOption?.totalCombinedSavings ?? 0) > (result.singlePaymentWinner?.savings ?? 0));
});
