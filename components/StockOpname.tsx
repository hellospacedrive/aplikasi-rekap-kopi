
import React, { useState, useMemo, useEffect } from 'react';
import { BookkeepingItem, Transaction, StockOpname, StockOpnameRecord } from '../types';
import { 
  Boxes, 
  Calendar, 
  Save, 
  ClipboardCheck, 
  Package, 
  Calculator, 
  ArrowRight,
  TrendingUp,
  History,
  AlertCircle,
  X,
  Search
} from 'lucide-react';

interface StockOpnameProps {
  bookkeepingItems: BookkeepingItem[];
  transactions: Transaction[];
  stockOpnames: StockOpname[];
  onSave: (opname: StockOpname) => void;
}

const StockOpnameComp: React.FC<StockOpnameProps> = ({ bookkeepingItems, transactions, stockOpnames, onSave }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeView, setActiveView] = useState<'FORM' | 'HISTORY'>('FORM');
  const [inputData, setInputData] = useState<Record<string, { qty: string, price: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [note, setNote] = useState('');

  // Helper function to find latest purchase price for an item
  const findLatestPrice = (itemName: string) => {
    const sorted = [...transactions]
      .filter(t => t.type === 'EXPENSE' && t.description.includes(itemName))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sorted.length > 0) {
      const tx = sorted[0];
      const q = tx.qty || 1;
      return tx.amount / q;
    }
    return 0;
  };

  // Initialize input data from bookkeeping items
  useEffect(() => {
    const existing = stockOpnames.find(o => o.month === selectedMonth);
    const newData: Record<string, { qty: string, price: string }> = {};
    
    bookkeepingItems.forEach(item => {
      if (existing) {
        const record = existing.records.find(r => r.itemId === item.id || r.itemName === item.name);
        if (record) {
          newData[item.id] = { qty: record.qty.toString(), price: record.price.toString() };
          return;
        }
      }
      
      const latestPrice = findLatestPrice(item.name);
      newData[item.id] = { qty: '', price: latestPrice > 0 ? latestPrice.toString() : '' };
    });
    
    setInputData(newData);
    setNote(existing?.note || '');
  }, [selectedMonth, bookkeepingItems, stockOpnames]);

  const filteredItems = useMemo(() => {
    return bookkeepingItems.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bookkeepingItems, searchTerm]);

  const currentTotalValue = useMemo(() => {
    return Object.values(inputData).reduce((sum: number, val: { qty: string; price: string }) => {
      const q = parseFloat(val.qty) || 0;
      const p = parseFloat(val.price) || 0;
      return sum + (q * p);
    }, 0);
  }, [inputData]);

  const handleSave = () => {
    const records: StockOpnameRecord[] = bookkeepingItems
      .filter(item => inputData[item.id]?.qty)
      .map(item => {
        const q = parseFloat(inputData[item.id].qty) || 0;
        const p = parseFloat(inputData[item.id].price) || 0;
        return {
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          qty: q,
          price: p,
          total: q * p
        };
      });

    if (records.length === 0) {
      alert("Masukkan minimal satu kuantitas stok.");
      return;
    }

    const opname: StockOpname = {
      id: `so-${selectedMonth}-${Date.now()}`,
      date: new Date().toISOString(),
      month: selectedMonth,
      records,
      totalValue: currentTotalValue,
      note
    };

    onSave(opname);
    alert("Stok Opname bulan " + selectedMonth + " berhasil disimpan!");
    setActiveView('HISTORY');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
        <button onClick={() => setActiveView('FORM')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeView === 'FORM' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Audit Baru</button>
        <button onClick={() => setActiveView('HISTORY')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${activeView === 'HISTORY' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Riwayat Audit</button>
      </div>

      {activeView === 'FORM' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                            <Boxes size={24}/>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Audit Stok Akhir Bulan</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Input stok fisik yang tersisa di gudang/toko</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-slate-400"/>
                        <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"/>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 mb-6">
                    <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-blue-800 leading-relaxed font-medium">
                        Audit ini digunakan untuk menghitung nilai aset stok akhir bulan sebagai bahan laporan laba/rugi yang lebih akurat. <strong>Tidak akan merubah saldo Cash atau Bank.</strong>
                    </p>
                </div>

                <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input 
                        type="text" 
                        placeholder="Cari nama item atau kategori..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-amber-200 transition-all"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b">
                            <tr>
                                <th className="px-6 py-4">Item & Kategori</th>
                                <th className="px-4 py-4 text-center">Harga Satuan (Terakhir)</th>
                                <th className="px-4 py-4 text-center">Sisa Stok Fisik</th>
                                <th className="px-6 py-4 text-right">Subtotal Nilai</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredItems.map(item => {
                                const val = inputData[item.id] || { qty: '', price: '' };
                                const subtotal = (parseFloat(val.qty) || 0) * (parseFloat(val.price) || 0);
                                
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-black text-slate-700">{item.name}</p>
                                            <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase">{item.category}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                <input 
                                                    type="number" 
                                                    value={val.price}
                                                    onChange={(e) => setInputData({...inputData, [item.id]: {...val, price: e.target.value}})}
                                                    placeholder="0"
                                                    className="w-32 p-2.5 text-center bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-slate-200"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                <input 
                                                    type="number" 
                                                    value={val.qty}
                                                    onChange={(e) => setInputData({...inputData, [item.id]: {...val, qty: e.target.value}})}
                                                    placeholder="Audit Qty"
                                                    className="w-32 p-2.5 text-center bg-white border-2 border-amber-100 rounded-xl text-sm font-black text-amber-700 outline-none focus:border-amber-500 transition-all shadow-inner"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <p className="font-black text-slate-800">Rp {subtotal.toLocaleString('id-ID')}</p>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 items-end border-t pt-8">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Catatan Audit</label>
                        <textarea 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Misal: Beberapa item rusak, stok cup menipis..."
                            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-amber-200 h-24 resize-none"
                        />
                    </div>
                    <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden">
                        <TrendingUp className="absolute right-0 bottom-0 opacity-10" size={100}/>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Nilai Aset Stok</p>
                        <p className="text-4xl font-black text-amber-400">Rp {currentTotalValue.toLocaleString('id-ID')}</p>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    className="w-full mt-8 py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                    <Save size={20}/> SIMPAN LAPORAN AUDIT BULANAN
                </button>
            </section>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in">
            {stockOpnames.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-slate-200 opacity-20" />
                    <p className="text-slate-400 font-bold italic">Belum ada riwayat audit stok fisik.</p>
                </div>
            ) : (
                stockOpnames.map((opname) => (
                    <div key={opname.id} className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600">
                                    <Package size={24}/>
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Audit: {new Date(opname.month).toLocaleDateString('id-ID', {month:'long', year:'numeric'})}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Disimpan pada: {new Date(opname.date).toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Nilai Aset</p>
                                <p className="text-xl font-black text-emerald-600">Rp {opname.totalValue.toLocaleString('id-ID')}</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {opname.records.map((r, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-xs font-black text-slate-700">{r.itemName}</p>
                                            <p className="text-[9px] text-slate-400 font-bold">{r.qty} Sisa Stok</p>
                                        </div>
                                        <p className="text-xs font-black text-slate-400">Rp {r.total.toLocaleString('id-ID')}</p>
                                    </div>
                                ))}
                            </div>
                            {opname.note && (
                                <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 items-start">
                                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5"/>
                                    <p className="text-xs text-amber-800 font-medium italic">"{opname.note}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
      )}
    </div>
  );
};

export default StockOpnameComp;
