import React, { useState } from 'react';
import { Plus, Search, Trash2, Tag, ShoppingCart } from 'lucide-react';
import { formatNumber } from '../utils/arabic';
import { sound } from '../utils/audio';

interface ItemCatalogViewProps {
  suggestions: string[];
  itemPrices: Record<string, number>;
  onAddItemToCatalog: (name: string, price: number) => void;
  onDeleteItemFromCatalog: (name: string) => void;
  onDirectAddToInvoice: (name: string, price: number) => void;
  currency?: string;
  isDark?: boolean;
}

export const ItemCatalogView: React.FC<ItemCatalogViewProps> = ({
  suggestions,
  itemPrices,
  onAddItemToCatalog,
  onDeleteItemFromCatalog,
  onDirectAddToInvoice,
  currency = 'ر.ي',
  isDark = false,
}) => {
  const [search, setSearch] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  const filteredItems = suggestions.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    const price = parseFloat(newItemPrice) || 0;
    onAddItemToCatalog(newItemName.trim(), price);
    setNewItemName('');
    setNewItemPrice('');
    sound.playSuccess();
  };

  return (
    <div id="item-catalog-container" className="space-y-3 select-none">
      {/* Add New Product Card */}
      <div className="bg-white dark:bg-slate-800/90 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>إضافة صنف وسعر جديد لدليل البقالة:</span>
        </h3>

        <form onSubmit={handleAddNew} className="grid grid-cols-12 gap-2">
          <div className="col-span-6">
            <input
              type="text"
              placeholder="اسم الصنف (مثال: أرز، زيت...)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none"
            />
          </div>

          <div className="col-span-3">
            <input
              type="number"
              placeholder={`السعر (${currency})`}
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none font-mono text-center"
            />
          </div>

          <div className="col-span-3">
            <button
              type="submit"
              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </div>
        </form>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في دليل الأصناف والأسعار..."
          className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none"
        />
        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
      </div>

      {/* Catalog Items Grid */}
      <div className="space-y-1.5 max-h-[460px] overflow-y-auto">
        {filteredItems.map((item) => {
          const price = itemPrices[item] || 0;

          return (
            <div
              key={item}
              className="bg-white dark:bg-slate-800/90 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between hover:border-emerald-400 transition"
            >
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {item}
                </div>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {price > 0 ? `${formatNumber(price)} ${currency}` : 'السعر غير محدد'}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    sound.playBeep();
                    onDirectAddToInvoice(item, price);
                  }}
                  title="إدراج فوري في الفاتورة"
                  className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>+ فاتورة</span>
                </button>

                <button
                  onClick={() => {
                    sound.playTap();
                    onDeleteItemFromCatalog(item);
                  }}
                  title="حذف من الدليل"
                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
