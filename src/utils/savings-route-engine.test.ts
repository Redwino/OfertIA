import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  optimizeSavingsRoute, 
  calculateTransportationCost, 
  DEFAULT_TRANSPORT_SETTINGS 
} from './savings-route-engine.ts';
import { DEFAULT_USER_PAYMENT_METHODS, PROMOTIONS_DATABASE } from '../data/promotions.ts';
import { RouteShoppingItem } from '../types/index.ts';

test('calculateTransportationCost for car calculates fuel and parking accurately', () => {
  const origin = { lat: -34.588, lng: -58.423, address: 'Palermo' };
  const dest = { lat: -34.582, lng: -58.414, address: 'Coto Palermo' };
  
  const calc = calculateTransportationCost(10, 2, {
    ...DEFAULT_TRANSPORT_SETTINGS,
    mode: 'car',
    carConsumptionL100km: 10,
    fuelPricePerLiter: 1000,
    parkingFee: 500,
  }, origin, dest);

  // 10 km * 10L/100km = 1 Liter = 1000 pesos + 500 parking = 1500
  assert.equal(calc.cost, 1500);
  assert.ok(calc.durationMinutes > 0);
  assert.ok(calc.details.includes('Auto propio'));
});

test('calculateTransportationCost for bike and walk has zero monetary cost', () => {
  const origin = { lat: -34.588, lng: -58.423, address: 'Palermo' };
  
  const bikeCalc = calculateTransportationCost(6, 1, {
    ...DEFAULT_TRANSPORT_SETTINGS,
    mode: 'bike',
  }, origin);
  assert.equal(bikeCalc.cost, 0);
  assert.ok(bikeCalc.details.includes('kcal'));

  const walkCalc = calculateTransportationCost(3, 1, {
    ...DEFAULT_TRANSPORT_SETTINGS,
    mode: 'walk',
  }, origin);
  assert.equal(walkCalc.cost, 0);
  assert.ok(walkCalc.details.includes('pasos'));
});

test('optimizeSavingsRoute generates multi-store carts and respects net savings logic', () => {
  const origin = { lat: -34.588, lng: -58.423, address: 'Honduras 4800, Palermo' };
  const items: RouteShoppingItem[] = [
    {
      id: 'prod-leche-serenisima-1l',
      name: 'Leche Entera Clásica',
      category: 'supermercados',
      quantity: 4,
      unit: 'l',
    },
    {
      id: 'prod-yerba-playadito-1kg',
      name: 'Yerba Mate Tradicional con Palo',
      category: 'supermercados',
      quantity: 2,
      unit: 'kg',
    },
    {
      id: 'prod-aceite-cocinero-15l',
      name: 'Aceite Puro de Girasol',
      category: 'supermercados',
      quantity: 2,
      unit: 'l',
    }
  ];

  const plan = optimizeSavingsRoute({
    origin,
    shoppingList: items,
    promotions: PROMOTIONS_DATABASE,
    userPaymentMethods: DEFAULT_USER_PAYMENT_METHODS,
    transportSettings: DEFAULT_TRANSPORT_SETTINGS,
    planningMode: 'today',
    maxStoresCount: 2,
    strategy: 'smart_balance',
  });

  assert.ok(plan.storeCarts.length >= 1, 'Should create at least one store cart');
  assert.ok(plan.totalCartGrossAmount > 0, 'Cart amount should be positive');
  assert.ok(plan.totalNetSavings >= 0, 'Net savings should be non-negative');
  assert.ok(plan.googleMapsDirectionsUrl.includes('google.com/maps/dir'), 'Directions URL should be generated');
  assert.ok(plan.singleStoreComparisons.length >= 2, 'Should compare with single store baselines');
  assert.ok(plan.weekDaysComparison?.length === 7, 'Should project 7 days of the week');
});
