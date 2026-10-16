import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTicketMath, detectDuplicateTicket, parseTicketTextFallback } from './ticket-parser.ts';
import type { PurchaseRecord, TicketLineItem } from '../types/index.ts';

test('validateTicketMath verifies exact line items vs total and catches discrepancies', () => {
  const items: TicketLineItem[] = [
    { id: '1', name: 'Leche 1L', quantity: 2, unitPrice: 1500, totalPrice: 3000 },
    { id: '2', name: 'Yerba 1kg', quantity: 1, unitPrice: 4500, totalPrice: 4500 },
  ];

  // Correct calculation: 3000 + 4500 - 500 = 7000
  const valid = validateTicketMath(items, 7500, 500, 0, 7000);
  assert.equal(valid.isConsistent, true);
  assert.equal(valid.discrepancy, 0);

  // Mismatched calculation: claims total is 8000 when items sum to 7000
  const invalid = validateTicketMath(items, 7500, 500, 0, 8000);
  assert.equal(invalid.isConsistent, false);
  assert.equal(invalid.discrepancy, 1000);
  assert.ok(invalid.warningMessage?.includes('Discrepancia detectada'));
});

test('detectDuplicateTicket alerts when same store, date and total exist', () => {
  const existing: PurchaseRecord[] = [
    {
      id: 'rec-1',
      date: '2026-10-15',
      storeName: 'Coto Sucursal Palermo',
      category: 'supermercados',
      paymentMethodUsed: 'Santander Visa',
      amountSpent: 25400,
      estimatedSavings: 5000,
      actualSavings: 5000,
      verifiedStatus: 'CONFIRMED',
    },
  ];

  const candidateDuplicate = {
    storeName: 'Coto',
    date: '2026-10-15',
    totalPaid: 25400,
  };

  const dupCheck = detectDuplicateTicket(candidateDuplicate, existing);
  assert.equal(dupCheck.isDuplicate, true);
  assert.ok(dupCheck.message?.includes('ticket duplicado'));

  const candidateDifferentDate = {
    storeName: 'Coto',
    date: '2026-10-14',
    totalPaid: 25400,
  };
  const diffCheck = detectDuplicateTicket(candidateDifferentDate, existing);
  assert.equal(diffCheck.isDuplicate, false);
});
