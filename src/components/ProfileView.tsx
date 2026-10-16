import React, { useState } from 'react';
import { 
  CreditCard, 
  Wallet, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Check, 
  Building2, 
  Award, 
  Lock,
  RotateCcw
} from 'lucide-react';
import { UserPaymentMethod } from '../types/index.ts';
import { DEFAULT_USER_PAYMENT_METHODS } from '../data/promotions.ts';

interface ProfileViewProps {
  paymentMethods: UserPaymentMethod[];
  onUpdatePaymentMethods: (methods: UserPaymentMethod[]) => void;
  onResetPaymentMethods: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  paymentMethods,
  onUpdatePaymentMethods,
  onResetPaymentMethods,
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Formulario para nuevo medio de pago
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<UserPaymentMethod['type']>('credit');
  const [newIssuer, setNewIssuer] = useState('Santander');
  const [newBrand, setNewBrand] = useState<'visa' | 'mastercard' | 'amex' | 'cabal'>('visa');
  const [newSegment, setNewSegment] = useState('Estándar');
  const [newHasPayroll, setNewHasPayroll] = useState(false);

  const issuersList = [
    'Santander',
    'BBVA',
    'Galicia',
    'Banco Nación',
    'Banco Provincia',
    'Banco Macro',
    'ICBC',
    'HSBC',
    'Brubank',
    'Mercado Pago',
    'MODO',
    'Cuenta DNI',
    'Ualá',
    'Personal Pay',
    'Naranja X',
    'Otro',
  ];

  const toggleMethodEnabled = (id: string) => {
    const updated = paymentMethods.map((m) =>
      m.id === id ? { ...m, isEnabled: !m.isEnabled } : m
    );
    onUpdatePaymentMethods(updated);
  };

  const removeMethod = (id: string) => {
    const updated = paymentMethods.filter((m) => m.id !== id);
    onUpdatePaymentMethods(updated);
  };

  const handleAddNewMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newMethod: UserPaymentMethod = {
      id: `method-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      issuer: newIssuer,
      brand: newType === 'wallet' ? undefined : newBrand,
      segment: newSegment,
      hasDirectPayroll: newHasPayroll,
      isEnabled: true,
    };

    onUpdatePaymentMethods([...paymentMethods, newMethod]);
    setIsAddingNew(false);
    setNewName('');
    setNewHasPayroll(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>Billetera y Perfil Financiero</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Administra tus Tarjetas y Medios de Pago
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Personaliza tus bancos, tarjetas y billeteras para que AhorroPro filtre únicamente las promociones que puedes aprovechar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetPaymentMethods}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              title="Restablecer medios de pago de ejemplo"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restablecer Ejemplo</span>
            </button>

            <button
              onClick={() => setIsAddingNew(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Medio</span>
            </button>
          </div>
        </div>

        {/* Garantía de Privacidad y Seguridad */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600">
          <Lock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900 font-semibold">100% Privado y Seguro:</strong> AhorroPro jamás solicita contraseñas bancarias, tokens ni números de tarjetas. La información se almacena localmente en tu navegador exclusivamente para calcular compatibilidad con los beneficios comerciales.
          </div>
        </div>
      </div>

      {/* Formulario Modal o Expandible para Agregar */}
      {isAddingNew && (
        <form
          onSubmit={handleAddNewMethod}
          className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-md space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Registrar nuevo medio de pago o billetera
            </h2>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre descriptivo (ej: Santander Visa Black, Cuenta DNI):
              </label>
              <input
                type="text"
                required
                placeholder="Ej: BBVA Crédito Visa"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Entidad Emisora / Billetera:
              </label>
              <select
                value={newIssuer}
                onChange={(e) => setNewIssuer(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
              >
                {issuersList.map((iss) => (
                  <option key={iss} value={iss}>
                    {iss}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tipo de Instrumento:
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
              >
                <option value="credit">Tarjeta de Crédito</option>
                <option value="debit">Tarjeta de Débito</option>
                <option value="wallet">Billetera Virtual / QR</option>
                <option value="fintech">Tarjeta Fintech / Prepaga</option>
              </select>
            </div>

            {newType !== 'wallet' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Marca de la Tarjeta:
                </label>
                <select
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
                >
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="amex">American Express</option>
                  <option value="cabal">Cabal</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Segmento / Paquete de Cuenta:
              </label>
              <select
                value={newSegment}
                onChange={(e) => setNewSegment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none"
              >
                <option value="Estándar">Estándar / General</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum</option>
                <option value="Black">Black / Signature / Eminent</option>
                <option value="Select">Select (Santander)</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={newHasPayroll}
                  onChange={(e) => setNewHasPayroll(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                />
                <span>Cobro mi sueldo en esta cuenta (Cuenta Sueldo)</span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
            >
              Guardar Medio
            </button>
          </div>
        </form>
      )}

      {/* Lista de Medios de Pago Registrados */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Tus Medios de Pago Registrados ({paymentMethods.length})
          </h2>
          <span className="text-xs text-slate-500">
            Activa o desactiva según los que tengas a mano hoy
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                method.isEnabled ? 'bg-white' : 'bg-slate-50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => toggleMethodEnabled(method.id)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                    method.isEnabled
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                  aria-label={method.isEnabled ? 'Desactivar medio' : 'Activar medio'}
                >
                  {method.isEnabled && <Check className="w-4 h-4" />}
                </button>

                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>{method.name}</span>
                    {method.hasDirectPayroll && (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded">
                        Cuenta Sueldo
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {method.issuer} · {method.type.toUpperCase()}
                    {method.brand ? ` · ${method.brand.toUpperCase()}` : ''}
                    {method.segment ? ` (${method.segment})` : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    method.isEnabled
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-slate-400 bg-slate-200/60'
                  }`}
                >
                  {method.isEnabled ? 'Activa para cálculo' : 'Inactiva'}
                </span>

                <button
                  onClick={() => removeMethod(method.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="Eliminar este medio de pago"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {paymentMethods.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="font-semibold text-slate-800">No tienes medios de pago configurados</div>
              <div className="text-xs text-slate-400 mt-1">
                Haz clic en &quot;Agregar Medio&quot; o &quot;Restablecer Ejemplo&quot; para comenzar.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
