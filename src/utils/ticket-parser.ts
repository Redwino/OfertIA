/**
 * Módulo de validación determinista, detección de duplicados y normalización de tickets OCR
 */

import type { PurchaseRecord, TicketLineItem, TicketScanResult } from '../types/index.ts';

/**
 * Valida la consistencia matemática de los ítems de un ticket
 */
export function validateTicketMath(
  lineItems: TicketLineItem[],
  subtotal: number,
  discountsApplied: number,
  taxAmount: number,
  totalPaid: number
): {
  isConsistent: boolean;
  computedItemsTotal: number;
  computedNetTotal: number;
  discrepancy: number;
  warningMessage?: string;
} {
  const computedItemsTotal = lineItems.reduce((acc, item) => acc + (item.totalPrice || item.quantity * item.unitPrice), 0);
  const computedNetTotal = Math.max(0, computedItemsTotal - discountsApplied + taxAmount);
  const discrepancy = Math.abs(computedNetTotal - totalPaid);

  // Permitir margen de redondeo de hasta $1.50
  const isConsistent = discrepancy <= 1.5;

  let warningMessage: string | undefined;
  if (!isConsistent) {
    warningMessage = `Discrepancia detectada: la suma de los artículos ($${computedItemsTotal.toLocaleString('es-AR')}) menos descuentos ($${discountsApplied.toLocaleString('es-AR')}) difiere del total facturado ($${totalPaid.toLocaleString('es-AR')}) por $${discrepancy.toLocaleString('es-AR')}. Revisa las líneas antes de confirmar.`;
  }

  return {
    isConsistent,
    computedItemsTotal,
    computedNetTotal,
    discrepancy,
    warningMessage,
  };
}

/**
 * Detección de tickets duplicados comparando con el historial de compras
 */
export function detectDuplicateTicket(
  ticketCandidate: { storeName: string; date: string; totalPaid: number },
  existingRecords: PurchaseRecord[]
): { isDuplicate: boolean; duplicateRecord?: PurchaseRecord; message?: string } {
  const normalizedStore = ticketCandidate.storeName.toLowerCase().trim();
  const ticketDate = ticketCandidate.date.split('T')[0];

  const matched = existingRecords.find((rec) => {
    const recStore = rec.storeName.toLowerCase().trim();
    const recDate = rec.date.split('T')[0];
    const isSameDate = recDate === ticketDate;
    const isSameTotal = Math.abs(rec.amountSpent - ticketCandidate.totalPaid) <= 1;
    const isSameStore = recStore.includes(normalizedStore) || normalizedStore.includes(recStore);

    return isSameDate && isSameTotal && isSameStore;
  });

  if (matched) {
    return {
      isDuplicate: true,
      duplicateRecord: matched,
      message: `¡Posible ticket duplicado! Ya registraste una compra idéntica en ${matched.storeName} el ${matched.date} por $${matched.amountSpent.toLocaleString('es-AR')}.`,
    };
  }

  return {
    isDuplicate: false,
  };
}

/**
 * Parser de texto de tickets simulado / OCR para procesar tickets físicos
 */
export function parseTicketTextFallback(rawText: string): TicketScanResult {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  
  let storeName = 'Supermercado';
  let dateStr = new Date().toISOString().split('T')[0];
  let totalPaid = 0;
  let subtotal = 0;
  let discountsApplied = 0;
  const lineItems: TicketLineItem[] = [];

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Detección de comercio
    if (lower.includes('coto')) storeName = 'Coto';
    else if (lower.includes('carrefour')) storeName = 'Carrefour';
    else if (lower.includes('dia') || lower.includes('día')) storeName = 'Supermercados DIA';
    else if (lower.includes('jumbo')) storeName = 'Jumbo';
    else if (lower.includes('ypf')) storeName = 'YPF';
    else if (lower.includes('farmacity')) storeName = 'Farmacity';

    // Detección de fecha (formato DD/MM/AAAA o YYYY-MM-DD)
    const dateMatch = line.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
    if (dateMatch) {
      dateStr = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }

    // Detección de total
    if (lower.includes('total') || lower.includes('importe')) {
      const matchNumbers = line.match(/[\d.,]+/g);
      if (matchNumbers && matchNumbers.length > 0) {
        const lastNum = matchNumbers[matchNumbers.length - 1].replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(lastNum);
        if (!isNaN(parsed) && parsed > totalPaid) {
          totalPaid = parsed;
        }
      }
    }

    // Detección de descuentos
    if (lower.includes('descuento') || lower.includes('ahorro') || lower.includes('promo')) {
      const matchNumbers = line.match(/[\d.,]+/g);
      if (matchNumbers && matchNumbers.length > 0) {
        const lastNum = matchNumbers[matchNumbers.length - 1].replace(/\./g, '').replace(',', '.');
        const parsed = parseFloat(lastNum);
        if (!isNaN(parsed)) {
          discountsApplied += parsed;
        }
      }
    }

    // Detección de líneas de artículos
    const itemMatch = line.match(/^([A-Za-zÁ-ÿ0-9\s]+?)\s+(\d+)?\s*[xX]?\s*[\$]?([\d.,]+)$/);
    if (itemMatch && !lower.includes('total') && !lower.includes('subtotal')) {
      const name = itemMatch[1].trim();
      const qty = itemMatch[2] ? parseInt(itemMatch[2], 10) : 1;
      const rawPrice = itemMatch[3].replace(/\./g, '').replace(',', '.');
      const price = parseFloat(rawPrice);
      if (!isNaN(price) && name.length > 2) {
        lineItems.push({
          id: `item-${lineItems.length + 1}`,
          name,
          quantity: qty,
          unitPrice: price / (qty || 1),
          totalPrice: price,
        });
      }
    }
  }

  // Si no se extrajeron ítems, crear estructura por defecto para edición
  if (lineItems.length === 0) {
    lineItems.push({
      id: 'item-1',
      name: 'Compra general en tienda',
      quantity: 1,
      unitPrice: totalPaid > 0 ? totalPaid : 15000,
      totalPrice: totalPaid > 0 ? totalPaid : 15000,
    });
  }

  subtotal = lineItems.reduce((acc, i) => acc + i.totalPrice, 0);
  if (totalPaid === 0) {
    totalPaid = Math.max(0, subtotal - discountsApplied);
  }

  return {
    id: `scan-${Date.now()}`,
    storeName,
    dateTime: `${dateStr}T12:00:00Z`,
    lineItems,
    subtotal,
    discountsApplied,
    taxAmount: 0,
    totalPaid,
    confidenceScore: 92,
    verificationStatus: 'PENDING_CONFIRMATION',
  };
}
