import { getAccessToken } from './google-auth.ts';
import { PurchaseRecord } from '../types/index.ts';

export interface CreateSpreadsheetResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

/**
 * Creates a formatted Google Sheet in Google Drive with the user's purchase history and savings audit.
 * Caller MUST request explicit confirmation from the user prior to invocation.
 */
export const createSavingsSpreadsheet = async (
  title = 'OfertIA - Libro de Ahorro y Compras',
  records: PurchaseRecord[] = []
): Promise<CreateSpreadsheetResult> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debes iniciar sesión con Google para crear una planilla de Google Sheets.');
  }

  // 1. Create spreadsheet with headers
  const initialPayload = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Historial de Ahorros',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(initialPayload),
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Error al crear Google Sheet (HTTP ${createRes.status})`
    );
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // 2. Format and add headers + records
  const headers = [
    'Fecha',
    'Comercio / Sucursal',
    'Rubro',
    'Medio de Pago',
    'Gasto Total ($)',
    'Ahorro Estimado ($)',
    'Ahorro Real ($)',
    'Estado Reintegro',
    'Notas / Ticket',
  ];

  const rows = [
    headers,
    ...records.map((r) => [
      r.date,
      r.storeName,
      r.category,
      r.paymentMethodUsed,
      r.amountSpent,
      r.estimatedSavings,
      r.actualSavings,
      r.verifiedStatus === 'CONFIRMED'
        ? 'Acreditado / Confirmado'
        : r.verifiedStatus === 'DIFFERED'
        ? 'En resumen bancario próximo'
        : 'En Reclamo Bancario',
      r.notes || '',
    ]),
  ];

  // Append data to Sheet
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!appendRes.ok) {
    console.warn('Advertencia al poblar filas de la planilla, pero fue creada con éxito.');
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
};

/**
 * Appends new purchase records to an existing Google Spreadsheet.
 */
export const appendRecordsToSpreadsheet = async (
  spreadsheetId: string,
  records: PurchaseRecord[]
): Promise<number> => {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Debes iniciar sesión con Google para sincronizar con Google Sheets.');
  }

  if (records.length === 0) return 0;

  const rows = records.map((r) => [
    r.date,
    r.storeName,
    r.category,
    r.paymentMethodUsed,
    r.amountSpent,
    r.estimatedSavings,
    r.actualSavings,
    r.verifiedStatus,
    r.notes || '',
  ]);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error?.message || `Error al actualizar la planilla (HTTP ${res.status})`
    );
  }

  return records.length;
};

/**
 * Export purchase records directly to a new Google Sheet
 */
export const exportPurchasesToSheets = async (
  records: PurchaseRecord[],
  title = 'OfertIA - Libro de Ahorro y Compras'
): Promise<CreateSpreadsheetResult> => {
  return createSavingsSpreadsheet(title, records);
};
