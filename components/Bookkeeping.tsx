
import React, { useState, useMemo } from 'react';
import { Transaction, PaymentMethod, Rider, BookkeepingItem } from '../types';
import { 
  BookOpen, 
  Trash2, 
  Wallet, 
  CreditCard, 
  Smartphone, 
  ChevronDown, 
  ChevronUp, 
  X, 
  StickyNote, 
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  Calculator,
  ArrowRight
} from 'lucide-react';

interface BookkeepingProps {
  transactions: Transaction[];
  riders: Rider[];
  bookkeepingItems: BookkeepingItem[];
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

interface CartItem {
  tempId: string;
  category: string;
  itemName: string;
  riderName?: string;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  note: string;
}

const Bookkeeping: React.FC<BookkeepingProps> = ({ transactions, riders, bookkeepingItems, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>('Produksi');
  const [item, setItem] = useState<string>('');
  const [manualItemName, setManualItemName] = useState('');
  const [selectedRider, setSelectedRider] = useState(''); 
  const [qty, setQty] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [itemNote, setItemNote] = useState('');
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [adminFee, setAdminFee] = useState<string>('0');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  
  // State untuk mode edit historis
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  // Kalkulasi Otomatis (Live Preview)
  const currentSubtotal = useMemo(() => {
    const p = parseInt(unitPrice) || 0;
    const q = parseInt(qty) || 0;
    return p * q;
  }, [unitPrice, qty]);

  const totalCartAmount = useMemo(() => cart.reduce((sum, item) => sum + item.totalAmount, 0), [cart]);
  
  const grandTotalWithAdmin = useMemo(() => {
    // Admin fee calculation logic could be per item or per batch. 
    // Here we keep it per batch save if user wants, but we'll show it in summary.
    const fee = paymentMethod === 'TRANSFER' ? (parseInt(adminFee) || 0) : 0;
    return totalCartAmount + fee;
  }, [totalCartAmount, adminFee, paymentMethod]);

  const availableCategories = useMemo(() => {
    const standard = ['Produksi', 'Sirup', 'Aset', 'Overhead', 'Operasional'];
    const custom = bookkeepingItems.map(i => i.category);
    return Array.from(new Set([...standard, ...custom, 'Kasbon', 'Lainnya']));
  }, [bookkeepingItems]);

  const filteredItems = useMemo(() => bookkeepingItems.filter(i => i.category === category), [bookkeepingItems, category]);

  const toggleExpand = (dateKey: string) => setExpandedDates(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));

  const removeFromCart = (tempId: string) => {
    setCart(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleEditHistorical = (t: Transaction) => {
    setEditingTransactionId(t.id);
    setDate(t.date.substring(0, 10));
    setCategory(t.category || 'Lainnya');
    
    let itemName = t.description;
    if (t.description.includes(': ')) {
        itemName = t.description.split(': ')[1].split(' (')[0];
    } else if (t.description.startsWith('Kasbon: ')) {
        itemName = t.description.replace('Kasbon: ', '');
    }

    setManualItemName(itemName);
    setQty(t.qty?.toString() || '1');
    const qValue = t.qty || 1;
    setUnitPrice((t.amount / qValue).toString());
    setPaymentMethod(t.paymentMethod);
    setItemNote(t.notes || '');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTransactionId(null);
    setManualItemName('');
    setUnitPrice('');
    setQty('1');
    setItemNote('');
    setItem('');
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitPrice || parseInt(unitPrice) <= 0) { alert("Harga tidak valid"); return; }
    if (!qty || parseInt(qty) <= 0) { alert("Qty tidak valid"); return; }

    let finalItemName = '';
    let finalRider = undefined;
    
    if (category === 'Kasbon') {
      if (!selectedRider && !manualItemName) { alert("Pilih rider"); return; }
      finalItemName = selectedRider ? `Kasbon: ${selectedRider}` : `Kasbon: ${manualItemName}`;
      finalRider = selectedRider || manualItemName;
    } else {
      finalItemName = manualItemName || item;
      if (!finalItemName) { alert("Nama barang kosong"); return; }
    }

    const subtotal = parseInt(qty) * parseInt(unitPrice);

    if (editingTransactionId) {
        const desc = category === 'Kasbon' ? finalItemName : `Belanja ${category}: ${finalItemName} (${qty}x${unitPrice})`;
        onUpdateTransaction({
            id: editingTransactionId,
            date: new Date(date).toISOString(),
            type: 'EXPENSE',
            amount: subtotal,
            paymentMethod,
            description: desc,
            category,
            riderName: finalRider,
            qty: parseInt(qty),
            notes: itemNote
        });
        cancelEdit();
        alert("Update Berhasil!");
        return;
    }

    setCart([...cart, { 
        tempId: Math.random().toString(36).substr(2, 9), 
        category, 
        itemName: finalItemName, 
        riderName: finalRider, 
        qty: parseInt(qty), 
        unitPrice: parseInt(unitPrice), 
        totalAmount: subtotal,
        paymentMethod,
        note: itemNote
    }]);
    
    // Reset item specific fields but keep payment method for convenience
    setItem(''); setManualItemName(''); setQty('1'); setUnitPrice(''); setItemNote('');
  };

  const handleProcessPayment = () => {
    if (cart.length === 0) return;
    const totalWithAdmin = grandTotalWithAdmin;
    const confirmMsg = `Simpan ${cart.length} item belanja? Total Rp ${totalWithAdmin.toLocaleString('id-ID')}`;
    if (!window.confirm(confirmMsg)) return;

    const ts = Date.now();
    cart.forEach((c, idx) => {
       const desc = c.category === 'Kasbon' ? c.itemName : `Belanja ${c.category}: ${c.itemName} (${c.qty}x${c.unitPrice})`;
       onAddTransaction({ 
           id: `book-${ts}-${idx}`, 
           date: new Date(date).toISOString(), 
           type: 'EXPENSE', 
           amount: c.totalAmount, 
           paymentMethod: c.paymentMethod, 
           description: desc, 
           category: c.category, 
           riderName: c.riderName, 
           qty: c.qty, 
           notes: c.note 
       });
    });

    const feeValue = parseInt(adminFee) || 0;
    // Simple fee logic: if any item was transfer, maybe add a general fee transaction
    if (feeValue > 0) {
        onAddTransaction({ 
            id: `book-fee-${ts}`, 
            date: new Date(date).toISOString(), 
            type: 'EXPENSE', 
            amount: feeValue, 
            paymentMethod: 'TRANSFER', 
            description: `Biaya Admin Transfer Belanja`, 
            category: 'Lainnya'
        });
    }

    setCart([]); setAdminFee('0'); setPaymentMethod('CASH'); 
    setExpandedDates({...expandedDates, [date]: true}); 
  };

  const groupedTransactions = useMemo(() => {
    const expenses = transactions.filter(t => 
        t.type === 'EXPENSE' && (t.id.startsWith('book-') || availableCategories.includes(t.category||''))
    );
    const groups: Record<string, any> = {};
    expenses.forEach(t => {
      const d = t.date.substring(0, 10);
      if (!groups[d]) groups[d] = { date: d, total: 0, items: [] };
      groups[d].items.push(t); groups[d].total += t.amount;
    });
    return Object.values(groups).sort((a:any, b:any) => b.date.localeCompare(a.date));
  }, [transactions, availableCategories]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* FORM INPUT UTAMA */}
      <section className={`bg-white p-6 rounded-3xl shadow-sm border transition-all ${editingTransactionId ? 'border-amber-400 ring-4 ring-amber-50' : 'border-slate-100'}`}>
        <div className="flex justify-between items-center border-b pb-4 mb-6">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${editingTransactionId ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'}`}>
                    <BookOpen size={20}/>
                </div>
                <div>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                        {editingTransactionId ? 'Edit Data Belanja' : 'Input Pengeluaran Baru'}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Catat belanja produksi & operasional</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                {editingTransactionId && <button onClick={cancelEdit} className="text-[10px] font-black text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">BATAL EDIT</button>}
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="font-black text-slate-700 outline-none text-sm bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200"/>
            </div>
        </div>

        <form onSubmit={handleAddItem} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">1. Kategori</label>
                    <select value={category} onChange={(e)=>setCategory(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-purple-200 transition-all">
                        {availableCategories.map(c=>(<option key={c} value={c}>{c}</option>))}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">2. Nama Barang / Item</label>
                    <div className="flex gap-2">
                        {category === 'Kasbon' ? (
                            <select value={selectedRider} onChange={(e)=>setSelectedRider(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none">
                                <option value="">- Pilih Rider -</option>
                                {riders.map(r=>(<option key={r.id} value={r.name}>{r.name}</option>))}
                            </select>
                        ) : (
                            <>
                                {!editingTransactionId && <select value={item} onChange={(e)=>{setItem(e.target.value); setManualItemName('');}} className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none">
                                    <option value="">-- Daftar Item --</option>
                                    {filteredItems.map(i=>(<option key={i.id} value={i.name}>{i.name}</option>))}
                                </select>}
                                <input value={manualItemName} onChange={(e)=>{setManualItemName(e.target.value); setItem('');}} placeholder="Ketik nama barang..." className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-purple-200 transition-all"/>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">3. Harga Satuan</label>
                        <input type="number" value={unitPrice} onChange={(e)=>setUnitPrice(e.target.value)} placeholder="Rp" className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black text-purple-700 outline-none focus:border-purple-500 transition-all"/>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">4. Qty</label>
                        <input type="number" value={qty} onChange={(e)=>setQty(e.target.value)} className="w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-sm text-center font-black outline-none focus:border-purple-500 transition-all"/>
                    </div>
                </div>

                {/* Kalkulasi Otomatis (Live) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 flex flex-col justify-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calculator size={12}/> Kalkulasi Subtotal</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800">Rp {currentSubtotal.toLocaleString('id-ID')}</span>
                        {parseInt(qty) > 1 && <span className="text-[10px] font-bold text-slate-400">({qty} x {parseInt(unitPrice).toLocaleString('id-ID')})</span>}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">5. Metode Pembayaran</label>
                    <p className="text-[9px] text-amber-600 font-bold italic mb-2">*Pilih uang diambil dari mana</p>
                    <div className="flex gap-2">
                        {(['CASH', 'QRIS', 'TRANSFER'] as PaymentMethod[]).map(m => (
                            <button 
                                key={m} 
                                type="button" 
                                onClick={() => setPaymentMethod(m)} 
                                className={`flex-1 p-3 rounded-xl text-[10px] font-black border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === m ? 'bg-amber-500 border-amber-600 text-white shadow-md scale-105' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                            >
                                {m === 'CASH' ? <Wallet size={16}/> : m === 'QRIS' ? <Smartphone size={16}/> : <CreditCard size={16}/>}
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">6. Catatan Tambahan</label>
                    <div className="relative">
                        <StickyNote size={16} className="absolute left-4 top-4 text-slate-300"/>
                        <textarea 
                            value={itemNote} 
                            onChange={(e)=>setItemNote(e.target.value)} 
                            placeholder="Contoh: Titip Rider Budi, Stok Gudang..." 
                            className="w-full p-4 pl-11 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-purple-200 transition-all h-[88px] resize-none"
                        />
                    </div>
                </div>
            </div>

            <button type="submit" className={`w-full p-5 text-white rounded-2xl text-sm font-black shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 ${editingTransactionId ? 'bg-amber-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                {editingTransactionId ? <Save size={20}/> : <Plus size={20}/>}
                {editingTransactionId ? 'SIMPAN PERUBAHAN DATA' : 'TAMBAHKAN KE DAFTAR BELANJA'}
            </button>
        </form>
      </section>

      {/* KERANJANG BELANJA (Hanya muncul jika ada item) */}
      {!editingTransactionId && cart.length > 0 && (
        <section className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-2"><CheckCircle2 className="text-emerald-400"/> Keranjang Belanja</h3>
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">{cart.length} Item</span>
            </div>

            <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/10">
                <table className="w-full text-xs text-left">
                    <thead className="bg-white/10 text-slate-400 font-bold uppercase tracking-widest text-[9px]">
                        <tr><th className="p-5">Item & Sumber</th><th className="p-5 text-center">Qty</th><th className="p-5 text-right">Subtotal</th><th className="p-5 w-10"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {cart.map(c=>(
                            <tr key={c.tempId} className="hover:bg-white/5 transition-colors">
                                <td className="p-5">
                                    <div>
                                        <p className="font-black text-sm">{c.itemName}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] opacity-40 font-black uppercase border border-white/20 px-1.5 rounded">{c.category}</span>
                                            <span className={`text-[9px] font-black uppercase px-1.5 rounded flex items-center gap-1 ${c.paymentMethod==='CASH'?'text-emerald-400 bg-emerald-400/10':'text-blue-400 bg-blue-400/10'}`}>
                                                {c.paymentMethod==='CASH'?<Wallet size={10}/>:<CreditCard size={10}/>} {c.paymentMethod}
                                            </span>
                                        </div>
                                        {c.note && <p className="text-[10px] text-amber-400/70 italic mt-1.5">"{c.note}"</p>}
                                    </div>
                                </td>
                                <td className="p-5 text-center font-black text-base">{c.qty}</td>
                                <td className="p-5 text-right font-black text-base">Rp {c.totalAmount.toLocaleString('id-ID')}</td>
                                <td className="p-5 text-center"><button onClick={()=>removeFromCart(c.tempId)} className="text-rose-400 hover:text-rose-300 p-2 hover:bg-rose-400/10 rounded-full transition-all"><X size={18}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Opsi Tambahan untuk Batch Save */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">Biaya Admin (Hanya jika Transfer)</label>
                    <input type="number" value={adminFee} onChange={(e)=>setAdminFee(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-black outline-none focus:border-amber-500 focus:bg-white/10 transition-all" placeholder="Misal: 2500"/>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bayar Keseluruhan</p>
                    <p className="text-4xl font-black text-emerald-400">Rp {grandTotalWithAdmin.toLocaleString('id-ID')}</p>
                </div>
            </div>

            <button onClick={handleProcessPayment} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 p-6 rounded-3xl flex justify-between items-center font-black shadow-xl hover:shadow-emerald-500/20 active:scale-[0.98] transition-all">
                <span className="tracking-widest uppercase text-sm">SIMPAN SEMUA KE RIWAYAT</span>
                <div className="flex items-center gap-2">
                    <span className="text-xl">Rp {grandTotalWithAdmin.toLocaleString('id-ID')}</span>
                    <ArrowRight size={20}/>
                </div>
            </button>
        </section>
      )}

      {/* RIWAYAT TERAKHIR */}
      <section className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-5 bg-slate-50 border-b flex justify-between items-center">
            <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2">
                <Clock size={16} className="text-slate-400"/> Riwayat Belanja Terakhir
            </h3>
        </div>
        <div className="divide-y divide-slate-100">
            {groupedTransactions.length === 0 ? (
                <div className="p-20 text-center flex flex-col items-center gap-2">
                    <AlertCircle className="text-slate-200" size={48}/>
                    <p className="text-slate-400 font-bold italic text-sm">Belum ada riwayat pembukuan belanja.</p>
                </div>
            ) : groupedTransactions.map(g => (
                <div key={g.date}>
                    <div onClick={()=>toggleExpand(g.date)} className="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl shadow-sm">
                                {expandedDates[g.date] ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                            </div>
                            <div>
                                <p className="font-black text-slate-800 text-sm">{new Date(g.date).toLocaleDateString('id-ID', {weekday:'long', day:'2-digit', month:'long'})}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{g.items.length} Transaksi</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 font-black uppercase mb-0.5">Total Keluar</p>
                            <p className="font-black text-rose-600 text-lg">Rp {g.total.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                    {expandedDates[g.date] && (
                        <div className="p-3 bg-slate-50 border-t animate-in slide-in-from-top-2 duration-200">
                            <div className="bg-white rounded-2xl border overflow-hidden shadow-inner">
                                <table className="w-full text-[11px] text-left">
                                    <tbody className="divide-y divide-slate-50">
                                        {g.items.map((t:any)=>(
                                            <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${editingTransactionId === t.id ? 'bg-amber-50 ring-2 ring-inset ring-amber-200' : ''}`}>
                                                <td className="py-4 px-5">
                                                    <p className="font-black text-slate-700 text-sm">{t.description.split(': ')[1] || t.description}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border border-slate-200">{t.category}</span>
                                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border flex items-center gap-1 ${t.paymentMethod === 'CASH' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-blue-600 border-blue-100 bg-blue-50'}`}>
                                                            {t.paymentMethod === 'CASH' ? <Wallet size={10}/> : <CreditCard size={10}/>} {t.paymentMethod}
                                                        </span>
                                                    </div>
                                                    {t.notes && <p className="text-[10px] text-slate-400 italic mt-1.5 font-medium leading-relaxed">Catatan: {t.notes}</p>}
                                                </td>
                                                <td className="py-4 px-5 text-right">
                                                    <p className="text-[9px] text-slate-400 font-black uppercase mb-0.5">Nominal</p>
                                                    <p className="font-black text-rose-600 text-sm">Rp {t.amount.toLocaleString('id-ID')}</p>
                                                </td>
                                                <td className="py-4 px-5 text-center w-24">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={()=>handleEditHistorical(t)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all" title="Edit"><Edit3 size={16}/></button>
                                                        <button onClick={()=>{if(window.confirm('Hapus belanja ini dari riwayat?')) onDeleteTransaction(t.id)}} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" title="Hapus"><Trash2 size={16}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </section>
    </div>
  );
};

export default Bookkeeping;
