
import React, { useState } from 'react';
import { Product, Rider, ExpenseItem, BookkeepingItem } from '../types';
import { Plus, Coffee, Trash2, Tag, Edit3, XCircle, Save, ArrowUp, ArrowDown, User, Users, ShoppingCart, ShoppingBag, Package } from 'lucide-react';

interface MenuManagerProps {
  products: Product[];
  expenseItems: ExpenseItem[];
  bookkeepingItems: BookkeepingItem[]; // New Prop
  riders: Rider[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onReorderProduct: (startIndex: number, endIndex: number) => void;
  onAddExpenseItem: (item: ExpenseItem) => void;
  onUpdateExpenseItem: (item: ExpenseItem) => void; 
  onDeleteExpenseItem: (id: string) => void;
  onAddBookkeepingItem: (item: BookkeepingItem) => void; // New Handler
  onUpdateBookkeepingItem: (item: BookkeepingItem) => void; // New Handler
  onDeleteBookkeepingItem: (id: string) => void; // New Handler
  onAddRider: (rider: Rider) => void;
  onDeleteRider: (id: string) => void;
}

const MenuManager: React.FC<MenuManagerProps> = ({ 
  products, expenseItems, bookkeepingItems, riders, 
  onAddProduct, onUpdateProduct, onDeleteProduct, onReorderProduct,
  onAddExpenseItem, onUpdateExpenseItem, onDeleteExpenseItem,
  onAddBookkeepingItem, onUpdateBookkeepingItem, onDeleteBookkeepingItem,
  onAddRider, onDeleteRider 
}) => {
  const [activeTab, setActiveTab] = useState<'MENU' | 'EXPENSE' | 'STOCK' | 'RIDER'>('MENU');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Menu Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [hpp, setHpp] = useState(''); 

  // Expense Form State
  const [expenseName, setExpenseName] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'BAHAN_BAKU' | 'OPERASIONAL' | 'GAJI' | 'LAINNYA'>('BAHAN_BAKU');

  // Bookkeeping (Stock) Form State
  const [stockName, setStockName] = useState('');
  const [stockCategory, setStockCategory] = useState('Produksi');

  // Rider Form State
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');

  const handleEditProductClick = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setPrice(product.price.toString());
    setHpp(product.hpp ? product.hpp.toString() : '0');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditExpenseClick = (item: ExpenseItem) => {
    setEditingId(item.id);
    setExpenseName(item.name);
    setExpenseCategory(item.category);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditStockClick = (item: BookkeepingItem) => {
    setEditingId(item.id);
    setStockName(item.name);
    setStockCategory(item.category);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditRiderClick = (rider: Rider) => {
    setEditingId(rider.id);
    setRiderName(rider.name);
    setRiderPhone(rider.phone || '');
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddNewClick = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setHpp('');
    setExpenseName('');
    setExpenseCategory('BAHAN_BAKU');
    setStockName('');
    setStockCategory('Produksi');
    setRiderName('');
    setRiderPhone('');
    setIsFormOpen(true);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setName('');
    setPrice('');
    setHpp('');
    setExpenseName('');
    setStockName('');
    setRiderName('');
    setRiderPhone('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'MENU') {
      if (!name || !price) return;

      if (editingId) {
        // UPDATE MODE
        const existingProduct = products.find(p => p.id === editingId);
        if (existingProduct) {
            const updatedProduct: Product = {
                ...existingProduct,
                name,
                price: parseInt(price),
                hpp: parseInt(hpp) || 0,
            };
            onUpdateProduct(updatedProduct);
        }
      } else {
        // ADD MODE
        const newProduct: Product = {
            id: Date.now().toString(),
            name,
            price: parseInt(price),
            hpp: parseInt(hpp) || 0,
            category: 'General'
        };
        onAddProduct(newProduct);
      }
    } else if (activeTab === 'EXPENSE') {
        if (!expenseName) return;
        
        if (editingId) {
            const updatedItem: ExpenseItem = {
                id: editingId,
                name: expenseName,
                category: expenseCategory
            };
            onUpdateExpenseItem(updatedItem);
        } else {
            const newItem: ExpenseItem = {
                id: `exp-${Date.now()}`,
                name: expenseName,
                category: expenseCategory
            };
            onAddExpenseItem(newItem);
        }
    } else if (activeTab === 'STOCK') {
        if (!stockName || !stockCategory) return;
        
        if (editingId) {
            const updatedItem: BookkeepingItem = {
                id: editingId,
                category: stockCategory,
                name: stockName
            };
            onUpdateBookkeepingItem(updatedItem);
        } else {
            const newItem: BookkeepingItem = {
                id: `bk-${Date.now()}`,
                category: stockCategory,
                name: stockName
            };
            onAddBookkeepingItem(newItem);
        }
    } else {
      if (!riderName) return;

      const newRider: Rider = {
        id: editingId || `r-${Date.now()}`,
        name: riderName,
        phone: riderPhone,
        status: 'ACTIVE'
      };

      onAddRider(newRider);
    }

    handleCancel();
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      onReorderProduct(index, index - 1);
    }
  };

  const moveDown = (index: number) => {
    if (index < products.length - 1) {
      onReorderProduct(index, index + 1);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Sub Tabs */}
      <div className="flex p-1 bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-x-auto">
         <button 
           onClick={() => { setActiveTab('MENU'); handleCancel(); }}
           className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-2 font-bold transition-all whitespace-nowrap ${activeTab === 'MENU' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
         >
            <Coffee size={18} /> Menu Produk
         </button>
         <button 
           onClick={() => { setActiveTab('EXPENSE'); handleCancel(); }}
           className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-2 font-bold transition-all whitespace-nowrap ${activeTab === 'EXPENSE' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
         >
            <ShoppingBag size={18} /> Pengeluaran Rider
         </button>
         <button 
           onClick={() => { setActiveTab('STOCK'); handleCancel(); }}
           className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-2 font-bold transition-all whitespace-nowrap ${activeTab === 'STOCK' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
         >
            <Package size={18} /> Item Belanja
         </button>
         <button 
           onClick={() => { setActiveTab('RIDER'); handleCancel(); }}
           className={`flex-1 py-3 px-2 rounded-lg flex items-center justify-center gap-2 font-bold transition-all whitespace-nowrap ${activeTab === 'RIDER' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
         >
            <Users size={18} /> Daftar Rider
         </button>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
             {activeTab === 'MENU' ? 'Daftar Menu & HPP' : 
              activeTab === 'EXPENSE' ? 'Daftar Item Pengeluaran Rider' : 
              activeTab === 'STOCK' ? 'Daftar Item Belanja Stok' : 'Daftar Rider'}
          </h2>
          <p className="text-sm text-slate-500">
             {activeTab === 'MENU' ? 'Atur produk, harga jual, dan modal (HPP).' : 
              activeTab === 'EXPENSE' ? 'Atur item yang biasa dibeli rider tiap hari (Es, Plastik).' : 
              activeTab === 'STOCK' ? 'Atur item untuk pembukuan belanja (Produksi, Aset, Sirup).' : 'Atur daftar nama penjual (Rider).'}
          </p>
        </div>
        {!isFormOpen && (
          <button 
            onClick={handleAddNewClick}
            className="bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-amber-700 active:scale-95 transition-all"
          >
            <Plus size={18} /> Tambah Data
          </button>
        )}
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-amber-100 animate-in fade-in slide-in-from-top-4 duration-300 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-800 flex items-center gap-2">
               {editingId ? <Edit3 size={18} className="text-blue-600" /> : <Plus size={18} className="text-amber-600" />} 
               {editingId ? 'Edit Data' : 'Tambah Baru'}
             </h3>
             <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
               <XCircle size={20} />
             </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'MENU' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Menu</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Kopi Tubruk Spesial"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Harga Jual (Rp)</label>
                    <input 
                      type="number" 
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="5000"
                      className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase text-rose-600">HPP / Modal (Rp)</label>
                    <input 
                      type="number" 
                      value={hpp}
                      onChange={(e) => setHpp(e.target.value)}
                      placeholder="2500"
                      className="w-full p-3 border border-rose-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 bg-rose-50/50"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Kosongkan jika tidak tahu.</p>
                  </div>
                </div>
              </>
            ) : activeTab === 'EXPENSE' ? (
                /* EXPENSE FORM */
                <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Pengeluaran</label>
                  <input 
                    type="text" 
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    placeholder="Contoh: Es Batu, Gas, Plastik"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kategori</label>
                  <select
                     value={expenseCategory}
                     onChange={(e: any) => setExpenseCategory(e.target.value)}
                     className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                      <option value="BAHAN_BAKU">Bahan Baku (Es, Susu, Cup)</option>
                      <option value="OPERASIONAL">Operasional (Bensin, Listrik)</option>
                      <option value="LAINNYA">Lainnya</option>
                  </select>
                </div>
              </>
            ) : activeTab === 'STOCK' ? (
                 /* BOOKKEEPING STOCK FORM */
                 <>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Kategori Belanja</label>
                   <div className="relative">
                       <input 
                         list="stock-categories"
                         type="text" 
                         value={stockCategory}
                         onChange={(e) => setStockCategory(e.target.value)}
                         placeholder="Pilih atau Ketik Baru (Produksi, Sirup...)"
                         className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                         required
                       />
                       <datalist id="stock-categories">
                           <option value="Produksi" />
                           <option value="Sirup" />
                           <option value="Aset" />
                           <option value="Overhead" />
                       </datalist>
                   </div>
                   <p className="text-[10px] text-slate-400 mt-1">Contoh: Produksi (Kopi, Susu), Sirup, atau Aset (Cup, Alat).</p>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Item Barang</label>
                   <input 
                     type="text" 
                     value={stockName}
                     onChange={(e) => setStockName(e.target.value)}
                     placeholder="Contoh: Bubuk Kopi Robusta"
                     className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                     required
                   />
                 </div>
               </>
            ) : (
              /* RIDER FORM */
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nama Rider</label>
                  <input 
                    type="text" 
                    value={riderName}
                    onChange={(e) => setRiderName(e.target.value)}
                    placeholder="Contoh: Budi"
                    className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">No. HP (Opsional)</label>
                   <input 
                      type="text" 
                      value={riderPhone}
                      onChange={(e) => setRiderPhone(e.target.value)}
                      placeholder="08..."
                      className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                   />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-4">
              <button 
                type="button" 
                onClick={handleCancel}
                className="px-5 py-2.5 text-slate-600 text-sm font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                type="submit" 
                className={`px-5 py-2.5 text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                <Save size={16} />
                {editingId ? 'Simpan Perubahan' : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeTab === 'MENU' ? (
          products.length === 0 ? (
             <div className="col-span-full text-center py-16 text-slate-400 bg-slate-100/50 rounded-2xl border border-dashed border-slate-300">
               <Coffee className="w-16 h-16 mx-auto mb-3 opacity-20" />
               <p className="font-medium">Belum ada menu tersimpan</p>
             </div>
          ) : (
            products.map((product, index) => (
              <div key={product.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md hover:border-amber-200 transition-all">
                <div className="flex items-center gap-4">
                   <div className="flex flex-col gap-1 pr-2 border-r border-slate-100">
                      <button 
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded-md text-slate-300 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        onClick={() => moveDown(index)}
                        disabled={index === products.length - 1}
                        className="p-1 rounded-md text-slate-300 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent"
                      >
                        <ArrowDown size={14} />
                      </button>
                   </div>

                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Coffee size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{product.name}</h3>
                    <div className="flex flex-col mt-1">
                       <span className="text-[10px] text-slate-400">Modal (HPP):</span>
                       <span className="text-xs font-medium text-slate-600">Rp {(product.hpp || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-bold text-amber-700 text-sm">Rp {product.price.toLocaleString('id-ID')}</span>
                  <div className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1">
                     <TrendingUpIcon size={10} /> Margin: Rp {(product.price - (product.hpp || 0)).toLocaleString('id-ID')}
                  </div>
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => handleEditProductClick(product)} className="p-1.5 text-blue-400 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-lg">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => onDeleteProduct(product.id)} className="p-1.5 text-rose-300 hover:text-rose-500 transition-colors hover:bg-rose-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        ) : activeTab === 'EXPENSE' ? (
             /* EXPENSE LIST */
             expenseItems.length === 0 ? (
                <div className="col-span-full text-center py-16 text-slate-400 bg-slate-100/50 rounded-2xl border border-dashed border-slate-300">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Belum ada item pengeluaran</p>
                </div>
             ) : (
                 expenseItems.map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md hover:border-amber-200 transition-all">
                       <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                               <Tag size={20} />
                           </div>
                           <div>
                               <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                               <span className={`text-[10px] px-2 py-0.5 rounded ${
                                   item.category === 'BAHAN_BAKU' ? 'bg-amber-100 text-amber-700' : 
                                   item.category === 'OPERASIONAL' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                               }`}>
                                   {item.category.replace('_', ' ')}
                               </span>
                           </div>
                       </div>
                       <div className="flex gap-1">
                           <button onClick={() => handleEditExpenseClick(item)} className="p-1.5 text-blue-400 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-lg">
                               <Edit3 size={16} />
                           </button>
                           <button onClick={() => onDeleteExpenseItem(item.id)} className="p-1.5 text-rose-300 hover:text-rose-500 transition-colors hover:bg-rose-50 rounded-lg">
                               <Trash2 size={16} />
                           </button>
                       </div>
                    </div>
                 ))
             )
        ) : activeTab === 'STOCK' ? (
              /* BOOKKEEPING STOCK LIST */
              bookkeepingItems.length === 0 ? (
                 <div className="col-span-full text-center py-16 text-slate-400 bg-slate-100/50 rounded-2xl border border-dashed border-slate-300">
                   <Package className="w-16 h-16 mx-auto mb-3 opacity-20" />
                   <p className="font-medium">Belum ada item belanja stok</p>
                 </div>
              ) : (
                  bookkeepingItems.map((item) => (
                     <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md hover:border-amber-200 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                <Package size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                                    {item.category}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => handleEditStockClick(item)} className="p-1.5 text-blue-400 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-lg">
                                <Edit3 size={16} />
                            </button>
                            <button onClick={() => onDeleteBookkeepingItem(item.id)} className="p-1.5 text-rose-300 hover:text-rose-500 transition-colors hover:bg-rose-50 rounded-lg">
                                <Trash2 size={16} />
                            </button>
                        </div>
                     </div>
                  ))
              )
        ) : (
          /* RIDER LIST */
          riders.length === 0 ? (
             <div className="col-span-full text-center py-16 text-slate-400 bg-slate-100/50 rounded-2xl border border-dashed border-slate-300">
               <Users className="w-16 h-16 mx-auto mb-3 opacity-20" />
               <p className="font-medium">Belum ada rider terdaftar</p>
             </div>
          ) : (
            riders.map((rider) => (
              <div key={rider.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:shadow-md hover:border-amber-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <User size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{rider.name}</h3>
                    {rider.phone && <p className="text-xs text-slate-400">{rider.phone}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => handleEditRiderClick(rider)} className="p-1.5 text-blue-400 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-lg">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => onDeleteRider(rider.id)} className="p-1.5 text-rose-300 hover:text-rose-500 transition-colors hover:bg-rose-50 rounded-lg">
                      <Trash2 size={16} />
                    </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

// Little helper icon component just for this file
const TrendingUpIcon = ({size}: {size:number}) => (
   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
);

export default MenuManager;
