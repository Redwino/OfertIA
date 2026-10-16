import React, { useState } from 'react';
import { 
  Receipt, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  Calendar 
} from 'lucide-react';
import { Category, PurchaseRecord } from '../types/index.ts';
import { CATEGORY_LABELS } from '../data/promotions.ts';

interface HistoryViewProps {
  records: PurchaseRecord[];
  onAddRecord: (record: PurchaseRecord) => void;
  onDeleteRecord: (id: string) => void;
  isOpenModal: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  records,
  onAddRecord,
  onDeleteRecord,
  isOpenModal,
  onCloseModal,
  onOpenModal,
}) => {
  // Formulario de registro de compra
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState<Category>('supermercados');
  const [paymentMethodUsed, setPaymentMethodUsed] = useState('Santander Visa Crédito');
  const [amountSpent, setAmountSpent] = useState<number>(45000);
  const [estimatedSavings, setEstimatedSavings] = useState<number>(9000);
  const [actualSavings, setActualSavings] = useState<number>(9000);
  const [status, setStatus] = useState<PurchaseRecord['verifiedStatus']>('CONFIRMED');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || amountSpent <= 0) return;

    const newRecord: PurchaseRecord = {
      id: `record-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      storeName: storeName.trim(),
      category,
      paymentMethodUsed,
      amountSpent,
      estimatedSavings,
      actualSavings,
      verifiedStatus: status,
      notes: notes.trim(),
    };

    onAddRecord(newRecord);
    onCloseModal();

    // Reset form
    setStoreName('');
    setNotes('');
  };

  const totalSpent = records.reduce((acc, r) => acc + r.amountSpent, 0);
  const totalActualSavings = records.reduce((acc, r) => acc + r.actualSavings, 0);
  const totalEstimatedSavings = records.reduce((acc, r) => acc + r.estimatedSavings, 0);
  const effectiveRatio = totalSpent > 0 ? Math.round((totalActualSavings / totalSpent) * 1000) / 10 : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Libro de Compras y Verificación Real</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Historial de Ahorro Efectivamente Obtenido
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Registra tus tickets y compara lo que estimaste ahorrar con lo que realmente se acreditó en tu resumen bancario o billetera.
            </p>
          </div>

          <button
            onClick={onOpenModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 self-start md:self-auto shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Nueva Compra</span>
          </button>
        </div>

        {/* Resumen de Métricas Históricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 font-medium">Ahorro Real Acumulado</div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
              ${totalActualSavings.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Dinero real no gastado</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 font-medium">Gasto Total Registrado</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              ${totalSpent.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">En {records.length} compras</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 font-medium">% Descuento Efectivo</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1">
              {effectiveRatio}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Promedio global de ahorro</div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 font-medium">Ahorro Estimado Previo</div>
            <div className="text-xl font-bold font-mono text-slate-600 mt-1">
              ${totalEstimatedSavings.toLocaleString('es-AR')}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Exactitud: {totalEstimatedSavings > 0 ? Math.round((totalActualSavings / totalEstimatedSavings) * 100) : 100}%
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Tus Compras Registradas ({records.length})
          </h2>
          <span className="text-xs text-slate-500">
            Datos auditables introducidos manualmente por ti
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Comercio y Rubro</th>
                <th className="py-3 px-4">Medio Utilizado</th>
                <th className="py-3 px-4 text-right">Monto Gastado</th>
                <th className="py-3 px-4 text-right">Ahorro Estimado</th>
                <th className="py-3 px-4 text-right">Ahorro Real</th>
                <th className="py-3 px-4 text-center">Estado Reintegro</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-600">{r.date}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{r.storeName}</div>
                    <div className="text-[11px] text-slate-400 capitalize">
                      {CATEGORY_LABELS[r.category]?.label || r.category}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-700">
                    {r.paymentMethodUsed}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    ${r.amountSpent.toLocaleString('es-AR')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                    ${r.estimatedSavings.toLocaleString('es-AR')}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                    ${r.actualSavings.toLocaleString('es-AR')}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        r.verifiedStatus === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : r.verifiedStatus === 'DIFFERED'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {r.verifiedStatus === 'CONFIRMED'
                        ? 'Acreditado'
                        : r.verifiedStatus === 'DIFFERED'
                        ? 'En resumen próximo'
                        : 'En reclamo'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onDeleteRecord(r.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {records.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-semibold text-slate-800">No hay compras registradas aún</div>
              <div className="text-xs text-slate-400 mt-1">
                Haz clic en &quot;Registrar Nueva Compra&quot; para empezar tu registro de ahorro auditado.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Registrar Compra */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Registrar compra realizada y ahorro real
              </h2>
              <button
                onClick={onCloseModal}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Comercio donde compraste:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Coto, YPF, Farmacity"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rubro:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medio utilizado:</label>
                  <input
                    type="text"
                    required
                    value={paymentMethodUsed}
                    onChange={(e) => setPaymentMethodUsed(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total abonado ($):</label>
                  <input
                    type="number"
                    min="1"
                    value={amountSpent}
                    onChange={(e) => setAmountSpent(Number(e.target.value))}
                    className="w-full px-3 py-2 font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ahorro / Reintegro ($):</label>
                  <input
                    type="number"
                    min="0"
                    value={actualSavings}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setActualSavings(v);
                      setEstimatedSavings(v);
                    }}
                    className="w-full px-3 py-2 font-mono font-bold text-emerald-700 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estado de verificación del reintegro:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                >
                  <option value="CONFIRMED">Acreditado inmediatamente / Descuento directo en caja</option>
                  <option value="DIFFERED">Pendiente en resumen bancario a 30 días</option>
                  <option value="DISPUTED">Reclamando por falta de acreditación</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
                >
                  Guardar en el Historial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
