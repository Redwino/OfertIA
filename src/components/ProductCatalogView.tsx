import React, { useState } from 'react';
import { 
  Search, 
  Barcode, 
  ShoppingCart, 
  Plus, 
  TrendingDown, 
  Store, 
  Calendar, 
  Check, 
  ShieldCheck, 
  Layers,
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { Category, ObservedPrice, ProductItem, UserPaymentMethod } from '../types/index.ts';
import { CATEGORY_LABELS } from '../data/promotions.ts';

interface ProductCatalogViewProps {
  products: ProductItem[];
  observedPrices: ObservedPrice[];
  onAddToCart: (product: ProductItem, storeName: string, unitPrice: number, quantity: number) => void;
  userPaymentMethods: UserPaymentMethod[];
}

export const ProductCatalogView: React.FC<ProductCatalogViewProps> = ({
  products,
  observedPrices,
  onAddToCart,
  userPaymentMethods,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todas');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(products[0] || null);
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [addedSuccessMessage, setAddedSuccessMessage] = useState<string | null>(null);

  // Filtrado de productos
  const filteredProducts = products.filter((prod) => {
    if (selectedCategory !== 'todas' && prod.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = prod.name.toLowerCase().includes(q);
      const matchBrand = prod.brand.toLowerCase().includes(q);
      const matchBarcode = prod.barcode ? prod.barcode.includes(q) : false;
      return matchName || matchBrand || matchBarcode;
    }
    return true;
  });

  // Precios observados para el producto seleccionado
  const productPrices = observedPrices
    .filter((obs) => obs.productId === selectedProduct?.id)
    .sort((a, b) => a.unitPrice - b.unitPrice);

  const bestPrice = productPrices[0];

  const handleAddCurrentProduct = (store: string, price: number) => {
    if (!selectedProduct) return;
    onAddToCart(selectedProduct, store, price, addQuantity);
    setAddedSuccessMessage(`¡${addQuantity}x ${selectedProduct.name} añadido a la calculadora!`);
    setTimeout(() => setAddedSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header y Buscador de Productos */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Base de Precios Observados y Comparador</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Compara precios de góndola entre comercios
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Encuentra el precio observado más bajo, normalizado por unidad ($/kg, $/L) y añádelo directamente a tu calculadora.
            </p>
          </div>
        </div>

        {/* Buscador por Texto o Código de Barras */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por producto, marca o código de barras (ej: Leche La Serenísima, 7793940...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2.5 px-3.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-2xl focus:outline-none text-slate-800 dark:text-slate-200"
            >
              <option value="todas">Todos los Rubros</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notificación de Éxito al Añadir */}
      {addedSuccessMessage && (
        <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{addedSuccessMessage}</span>
          </div>
          <span className="text-[11px] opacity-90">Ver en pestaña Calculadora →</span>
        </div>
      )}

      {/* Grid: Lista de Productos y Panel de Comparativa de Precios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Productos Encontrados */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 h-[580px] overflow-y-auto">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 pb-1">
            Catálogo ({filteredProducts.length} productos)
          </div>

          {filteredProducts.map((prod) => {
            const isSelected = selectedProduct?.id === prod.id;
            return (
              <div
                key={prod.id}
                onClick={() => {
                  setSelectedProduct(prod);
                  setAddQuantity(1);
                }}
                className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                      {prod.brand}
                    </span>
                    <h2 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {prod.name}
                    </h2>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {prod.presentation} {prod.barcode ? `· EAN: ${prod.barcode}` : ''}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      ${prod.lowestObservedPrice.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Mínimo visto
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Panel de Comparación en Góndola del Producto Seleccionado */}
        {selectedProduct ? (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between h-[580px] overflow-hidden">
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* Encabezado del Producto */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      {selectedProduct.brand}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedProduct.presentation}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {selectedProduct.name}
                  </h2>
                </div>

                {/* Control de Cantidad y Botón Rápido */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 px-2 py-1">
                    <button
                      onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))}
                      className="px-2 py-0.5 text-slate-600 dark:text-slate-300 hover:font-bold"
                    >
                      -
                    </button>
                    <span className="px-2 font-mono font-bold text-xs text-slate-900 dark:text-white">
                      {addQuantity}
                    </span>
                    <button
                      onClick={() => setAddQuantity(addQuantity + 1)}
                      className="px-2 py-0.5 text-slate-600 dark:text-slate-300 hover:font-bold"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => handleAddCurrentProduct(bestPrice?.storeName || 'Comercio', bestPrice?.unitPrice || selectedProduct.lowestObservedPrice)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Añadir a la calculadora</span>
                  </button>
                </div>
              </div>

              {/* Comparación de Precios Observados por Comercio */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Precios observados en sucursales reales:</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Normalizados por unidad de medida ({selectedProduct.unit})
                  </span>
                </div>

                <div className="space-y-2.5">
                  {productPrices.map((obs, idx) => {
                    const isLowest = idx === 0;

                    return (
                      <div
                        key={obs.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isLowest
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {obs.storeName}
                            </span>
                            {isLowest && (
                              <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.2 rounded-full">
                                Mejor Precio
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {obs.branchName} · Visto el {obs.observedAt.split('T')[0]} ({obs.source})
                          </div>
                          {obs.promoCondition && (
                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                              ★ {obs.promoCondition}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-right">
                            <div className="text-base font-mono font-bold text-slate-900 dark:text-white">
                              ${obs.unitPrice.toLocaleString('es-AR')}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {obs.pricePerUnit.toFixed(1)} {obs.unitLabel}
                            </div>
                          </div>

                          <button
                            onClick={() => handleAddCurrentProduct(obs.storeName, obs.unitPrice)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
                            title="Añadir con este comercio a la calculadora"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Añadir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Banner de Verificación y Origen */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Precios contrastados contra tickets de compra y folletos oficiales</span>
              </div>
              <span>Zona horaria local comercial</span>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-800 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center justify-center">
            <Search className="w-10 h-10 mb-2 opacity-50" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">Selecciona un producto para comparar precios</div>
          </div>
        )}
      </div>
    </div>
  );
};
