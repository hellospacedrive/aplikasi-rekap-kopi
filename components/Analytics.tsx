
import React, { useState, useMemo, useEffect } from 'react';
import { Transaction, Product, PaymentMethod, ExpenseCategoryType, BankReconciliation } from '../types';
import { 
  BarChart3, 
  ChevronRight, 
  ChevronDown,
  ChevronLeft, // Added ChevronLeft import
  ShoppingBag, 
  Coffee,
  TrendingUp,
  CreditCard,
  Users,
  Wallet,
  Smartphone,
  Info,
  QrCode,
  ArrowRight,
  Clock,
  CalendarDays,
  FilterX,
  PackageSearch,
  ArrowLeft,
  History,
  Tag,
  Edit2,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  X as LucideX,
  Banknote,
  Wrench,
  Check,
  FileSearch,
  Search,
  Receipt,
  Calculator
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

interface AnalyticsProps {
  transactions: Transaction[];
  products: Product[];
  reconciliations: BankReconciliation[];
  onUpdateTransaction?: (updated: Transaction) => void;
  onAddTransaction?: (transaction: Transaction) => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ transactions, products, reconciliations, onUpdateTransaction, onAddTransaction }) => {
  const [activeTab, setActiveTab] = useState<'MENU' | 'EXPENSE' | 'DAILY' | 'RIDER' | 'QRIS' | 'COH'>('MENU');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // States for Expense Drill-down
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);

  // State untuk modal rincian rekap (shortcut dari QRIS)
  const [recapModalInfo, setRecapModalInfo] = useState<{date: string, riderName: string} | null>(null);

  // Reset secondary filters when primary ones change
  useEffect(() => {
    setSelectedItemName(null);
  }, [selectedCategory, selectedMethod, selectedMonth]);

  // FIX: Month Navigation with manual YYYY-MM formatting
  const changeMonth = (delta: number) => {
    const [year, monthVal] = selectedMonth.split('-').map(Number);
    const newDate = new Date(year, (monthVal - 1) + delta, 1);
    const y = newDate.getFullYear();
    const m = (newDate.getMonth() + 1).toString().padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  // Helper to get clean item name from description
  const getCleanItemName = (desc: string) => {
    return desc
      .replace(/^Belanja .*?: /, '') 
      .replace(/\s\(.*\)$/, '')     
      .replace(/^Beli /, '')        
      .trim();
  };

  // --- MENU ANALYTICS ---
  const menuStats = useMemo(() => {
    const stats: Record<string, any> = {};
    products.forEach(p => stats[p.name] = { name: p.name, category: p.category, qty: 0, revenue: 0, profit: 0 });
    transactions.forEach(t => {
        if (!t || !t.date || !t.date.startsWith(selectedMonth) || t.type !== 'INCOME') return;
        const detail = t.description.split('Detail: ')[1];
        if (detail) detail.split(', ').forEach(itemStr => {
            const x = itemStr.lastIndexOf(' x');
            if (x !== -1) {
                const name = itemStr.substring(0, x).trim();
                const qty = parseInt(itemStr.substring(x + 2)) || 0;
                if (!stats[name]) stats[name] = { name, category: 'Unknown', qty: 0, revenue: 0, profit: 0 };
                stats[name].qty += qty;
                const p = products.find(prod => prod.name === name);
                const price = p?.price || 0;
                stats[name].revenue += (qty * price);
                stats[name].profit += (qty * (price - (p?.hpp || 0)));
            }
        });
    });
    const data = Object.values(stats).sort((a:any, b:any) => b.qty - a.qty);
    return { data, top5: data.slice(0, 5) };
  }, [transactions, products, selectedMonth]);

  // --- EXPENSE ANALYTICS ---
  const categoryStats = useMemo(() => {
    const cats: Record<string, any> = {};
    let totalCash = 0, totalQris = 0, totalTransfer = 0;

    transactions.forEach(t => {
       if (!t || !t.date || !t.date.startsWith(selectedMonth) || t.type !== 'EXPENSE') return;
       
       const catName = t.category || 'LAINNYA';
       const method = t.paymentMethod || 'CASH';
       const amount = t.amount || 0;

       if (!cats[catName]) {
         cats[catName] = { name: catName, total: 0, cash: 0, qris: 0, transfer: 0 };
       }
       
       cats[catName].total += amount;
       if (method === 'CASH') { cats[catName].cash += amount; totalCash += amount; }
       else if (method === 'QRIS') { cats[catName].qris += amount; totalQris += amount; }
       else if (method === 'TRANSFER') { cats[catName].transfer += amount; totalTransfer += amount; }
    });
    
    return { categories: cats, summary: { totalCash, totalQris, totalTransfer, grandTotal: totalCash + totalQris + totalTransfer } };
  }, [transactions, selectedMonth]);

  const itemStatsInCategory = useMemo(() => {
    if (!selectedCategory && !selectedMethod) return [];
    const itemMap: Record<string, { name: string, total: number, count: number }> = {};
    transactions.forEach(t => {
        if (t.date.startsWith(selectedMonth) && t.type === 'EXPENSE') {
            const matchCat = !selectedCategory || (t.category || 'LAINNYA') === selectedCategory;
            const matchMethod = !selectedMethod || t.paymentMethod === selectedMethod;
            if (matchCat && matchMethod) {
                const cleanName = getCleanItemName(t.description);
                if (!itemMap[cleanName]) itemMap[cleanName] = { name: cleanName, total: 0, count: 0 };
                itemMap[cleanName].total += t.amount;
                itemMap[cleanName].count += 1;
            }
        }
    });
    return Object.values(itemMap).sort((a, b) => b.total - a.total);
  }, [transactions, selectedCategory, selectedMethod, selectedMonth]);

  const detailedHistoryForItem = useMemo(() => {
    if (!selectedItemName) return [];
    return transactions
      .filter(t => {
        const matchMonth = t.date.startsWith(selectedMonth);
        const matchType = t.type === 'EXPENSE';
        const matchItem = getCleanItemName(t.description) === selectedItemName;
        const matchCat = !selectedCategory || (t.category || 'LAINNYA') === selectedCategory;
        const matchMethod = !selectedMethod || t.paymentMethod === selectedMethod;
        return matchMonth && matchType && matchItem && matchCat && matchMethod;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedItemName, selectedMonth, selectedCategory, selectedMethod]);

  // --- DAILY SALES ---
  const dailyStats = useMemo(() => {
      const groups: Record<string, any> = {};
      const [y, m] = selectedMonth.split('-').map(Number);
      if(!y || !m) return { data: [], totalOmset: 0, totalExpense: 0, totalQris: 0, totalCoh: 0 };
      const days = new Date(y, m, 0).getDate();
      for(let i = 1; i <= days; i++) {
          const date = `${selectedMonth}-${i.toString().padStart(2, '0')}`;
          groups[date] = { date, omset: 0, expense: 0, qris: 0, coh: 0 };
      }
      transactions.forEach(t => {
          if (!t || !t.date || !t.date.startsWith(selectedMonth)) return;
          const d = t.date.substring(0, 10);
          if (!groups[d]) groups[d] = { date: d, omset: 0, expense: 0, qris: 0, coh: 0 };
          if (t.type === 'INCOME') {
              groups[d].omset += t.amount;
              if (t.paymentMethod !== 'CASH') groups[d].qris += t.amount;
              if (t.actualCash) groups[d].coh += t.actualCash;
          } else groups[d].expense += t.amount;
      });
      const data = Object.values(groups).sort((a:any, b:any) => a.date.localeCompare(b.date));
      return { 
        data, 
        totalOmset: data.reduce((s: number, d: any) => s + (d.omset || 0), 0), 
        totalExpense: data.reduce((s: number, d: any) => s + (d.expense || 0), 0), 
        totalQris: data.reduce((s: number, d: any) => s + (d.qris || 0), 0),
        totalCoh: data.reduce((s: number, d: any) => s + (d.coh || 0), 0)
      };
  }, [transactions, selectedMonth]);

  // --- RIDER ANALYTICS ---
  const riderStats = useMemo(() => {
    const riders: Record<string, any> = {};
    transactions.forEach(t => {
        if (!t || !t.date || !t.date.startsWith(selectedMonth) || !t.riderName) return;
        const name = t.riderName;
        if (!riders[name]) riders[name] = { name, totalOmset: 0, totalExpense: 0, totalCups: 0, daily: {} };
        const d = t.date.substring(0, 10);
        if (!riders[name].daily[d]) riders[name].daily[d] = { date: d, omset: 0, expense: 0, coh: 0, cups: 0 };
        if (t.type === 'INCOME') {
            riders[name].totalOmset += t.amount;
            riders[name].totalCups += (t.qty || 0);
            riders[name].daily[d].omset += t.amount;
            riders[name].daily[d].cups += (t.qty || 0);
            if (t.actualCash) riders[name].daily[d].coh = t.actualCash;
        } else {
            riders[name].totalExpense += t.amount;
            riders[name].daily[d].expense += t.amount;
        }
    });
    return riders;
  }, [transactions, selectedMonth]);

  // --- QRIS MATRIX ---
  const qrisMatrix = useMemo(() => {
    const activeRidersSet = new Set<string>();
    const dateMap: Record<string, Record<string, number>> = {};
    transactions.forEach(t => {
      if (!t || !t.date || !t.date.startsWith(selectedMonth) || t.type !== 'INCOME' || !t.riderName) return;
      if (t.paymentMethod === 'QRIS' || t.paymentMethod === 'TRANSFER') {
        const date = t.date.substring(0, 10);
        const name = t.riderName;
        activeRidersSet.add(name);
        if (!dateMap[date]) dateMap[date] = {};
        if (!dateMap[date][name]) dateMap[date][name] = 0;
        (dateMap[date][name] as number) += t.amount;
      }
    });
    const riders = Array.from(activeRidersSet).sort();
    const dates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
    const totalsPerRider: Record<string, number> = {};
    riders.forEach(r => {
      totalsPerRider[r] = dates.reduce((sum: number, d: string) => sum + (dateMap[d]?.[r] || 0), 0);
    });
    return { riders, dates, matrix: dateMap, totalsPerRider };
  }, [transactions, selectedMonth]);

  // --- COH MATRIX ---
  const cohMatrix = useMemo(() => {
    const activeRidersSet = new Set<string>();
    const dateMap: Record<string, Record<string, number>> = {};
    transactions.forEach(t => {
      if (!t || !t.date || !t.date.startsWith(selectedMonth) || t.type !== 'INCOME' || !t.riderName || t.actualCash === undefined) return;
      
      const date = t.date.substring(0, 10);
      const name = t.riderName;
      activeRidersSet.add(name);
      
      if (!dateMap[date]) dateMap[date] = {};
      if (!dateMap[date][name]) dateMap[date][name] = 0;
      // Gunakan Math.max karena actualCash biasanya nempel di satu transaksi setoran tunai per hari
      dateMap[date][name] = Math.max(dateMap[date][name] as number, t.actualCash);
    });
    
    const riders = Array.from(activeRidersSet).sort();
    const dates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
    const totalsPerRider: Record<string, number> = {};
    riders.forEach(r => {
      totalsPerRider[r] = dates.reduce((sum: number, d: string) => sum + (dateMap[d]?.[r] || 0), 0);
    });
    return { riders, dates, matrix: dateMap, totalsPerRider };
  }, [transactions, selectedMonth]);

  const [selectedRider, setSelectedRider] = useState<string | null>(null);

  const handleCellClick = (cat: string | null, method: PaymentMethod | null) => {
    setSelectedCategory(cat);
    setSelectedMethod(method);
    setSelectedItemName(null); 
  };

  // LOGIKA KOREKSI DARI ANALYSA QRIS
  const isDateCorrected = (date: string) => {
    const dateLabel = new Date(date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'});
    return transactions.some(t => 
        t.category === 'Koreksi Saldo' && 
        t.paymentMethod === 'TRANSFER' &&
        t.description.includes(`Koreksi Selisih QRIS (${dateLabel})`)
    );
  };

  const handleApplyQrisCorrection = (date: string, systemTotal: number, realBank: number) => {
    if (!onAddTransaction) return;
    const variance = realBank - systemTotal;
    const isPositive = variance > 0;
    const absVariance = Math.abs(variance);
    const dateLabel = new Date(date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'});

    const confirmMsg = `Buat transaksi ${isPositive ? 'PEMASUKAN' : 'PENGELUARAN'} sebesar Rp ${absVariance.toLocaleString('id-ID')} untuk menyeimbangkan saldo QRIS sistem dengan bank pada tanggal ${dateLabel}?`;

    if (window.confirm(confirmMsg)) {
        const now = new Date();
        const txDate = new Date(date);
        txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

        onAddTransaction({
            id: `corr-qris-${Date.now()}`,
            date: txDate.toISOString(),
            type: isPositive ? 'INCOME' : 'EXPENSE',
            amount: absVariance,
            paymentMethod: 'TRANSFER',
            category: 'Koreksi Saldo',
            description: `Koreksi Selisih QRIS (${dateLabel})`,
            notes: `Penyesuaian selisih QRIS/Transfer antara sistem and real bank.`
        });
        alert('Saldo Bank di aplikasi berhasil disesuaikan!');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
           <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full md:w-auto no-scrollbar">
                <button onClick={() => setActiveTab('MENU')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'MENU' ? 'bg-white shadow text-amber-600' : 'text-slate-500'}`}>Analisa Menu</button>
                <button onClick={() => setActiveTab('EXPENSE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'EXPENSE' ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}>Analisa Belanja</button>
                <button onClick={() => setActiveTab('DAILY')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'DAILY' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Analisa Harian</button>
                <button onClick={() => setActiveTab('RIDER')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'RIDER' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}>Analisa Rider</button>
                <button onClick={() => setActiveTab('QRIS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'QRIS' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}>Analisa QRIS</button>
                <button onClick={() => setActiveTab('COH')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === 'COH' ? 'bg-white shadow text-amber-600' : 'text-slate-500'}`}>Analisa COH</button>
           </div>
           
           <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-amber-600 transition-all">
                  <ChevronLeft size={18}/>
              </button>
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="bg-transparent border-none text-sm font-black text-slate-700 outline-none text-center px-1 cursor-pointer"
              />
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-amber-600 transition-all">
                  <ChevronRight size={18}/>
              </button>
           </div>
       </div>

       {/* CONTENT: EXPENSE */}
       {activeTab === 'EXPENSE' && (
           <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div onClick={() => handleCellClick(null, null)} className={`cursor-pointer bg-white p-4 rounded-2xl border-2 shadow-sm transition-all hover:scale-105 active:scale-95 ${!selectedCategory && !selectedMethod ? 'border-rose-500 shadow-rose-100' : 'border-transparent'}`}><p className="text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">Total Belanja <ChevronRight size={10}/></p><p className="text-lg font-black text-slate-800">Rp {categoryStats.summary.grandTotal.toLocaleString('id-ID')}</p></div>
                    <div onClick={() => handleCellClick(null, 'CASH')} className={`cursor-pointer bg-white p-4 rounded-2xl border-2 shadow-sm flex items-center gap-3 transition-all hover:scale-105 active:scale-95 ${!selectedCategory && selectedMethod === 'CASH' ? 'border-emerald-500 bg-emerald-50/30 shadow-emerald-100' : 'border-transparent'}`}><div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Wallet size={16}/></div><div><p className="text-[10px] font-bold text-slate-400 uppercase">Tunai</p><p className="font-black text-emerald-600">Rp {categoryStats.summary.totalCash.toLocaleString('id-ID')}</p></div></div>
                    <div onClick={() => handleCellClick(null, 'QRIS')} className={`cursor-pointer bg-white p-4 rounded-2xl border-2 shadow-sm flex items-center gap-3 transition-all hover:scale-105 active:scale-95 ${!selectedCategory && selectedMethod === 'QRIS' ? 'border-blue-500 bg-blue-50/30 shadow-blue-100' : 'border-transparent'}`}><div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Smartphone size={16}/></div><div><p className="text-[10px] font-bold text-slate-400 uppercase">QRIS</p><p className="font-black text-blue-600">Rp {categoryStats.summary.totalQris.toLocaleString('id-ID')}</p></div></div>
                    <div onClick={() => handleCellClick(null, 'TRANSFER')} className={`cursor-pointer bg-white p-4 rounded-2xl border-2 shadow-sm flex items-center gap-3 transition-all hover:scale-105 active:scale-95 ${!selectedCategory && selectedMethod === 'TRANSFER' ? 'border-purple-500 bg-purple-50/30 shadow-purple-100' : 'border-transparent'}`}><div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><CreditCard size={16}/></div><div><p className="text-[10px] font-bold text-slate-400 uppercase">Transfer</p><p className="font-black text-purple-600">Rp {categoryStats.summary.totalTransfer.toLocaleString('id-ID')}</p></div></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-slate-700 flex items-center gap-2 uppercase tracking-tighter"><Layers size={18} className="text-rose-500"/> Pilih Kategori</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-50">
                            {Object.values(categoryStats.categories).length === 0 ? (
                                <div className="p-12 text-center text-slate-300 italic text-xs uppercase font-bold">Belum ada data belanja</div>
                            ) : (
                                Object.values(categoryStats.categories).map((cat: any) => (
                                    <div 
                                        key={cat.name} 
                                        onClick={() => handleCellClick(cat.name, null)}
                                        className={`p-4 flex justify-between items-center cursor-pointer transition-all hover:bg-slate-50 group ${selectedCategory === cat.name ? 'bg-rose-50/50 border-r-4 border-rose-500' : ''}`}
                                    >
                                        <div><p className={`font-black uppercase tracking-widest text-xs transition-colors ${selectedCategory === cat.name ? 'text-rose-600' : 'text-slate-600'}`}>{cat.name}</p><p className="text-[10px] text-slate-400 font-bold">Total: Rp {cat.total.toLocaleString('id-ID')}</p></div>
                                        <ChevronRight size={16} className={`transition-transform ${selectedCategory === cat.name ? 'text-rose-400 translate-x-1' : 'text-slate-200'}`}/>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-black text-slate-700 flex items-center gap-2 uppercase tracking-tighter"><PackageSearch size={18} className="text-amber-500"/> Pilih Daftar Item</h3>
                            {selectedCategory && <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">{selectedCategory}</span>}
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-50">
                            {!selectedCategory && !selectedMethod ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-300"><Info size={32} className="opacity-20 mb-2"/><p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Pilih kategori belanja di sebelah kiri<br/>untuk melihat daftar item barang</p></div>
                            ) : itemStatsInCategory.length === 0 ? (
                                <div className="p-12 text-center text-slate-300 text-xs font-bold uppercase">Tidak ada item ditemukan</div>
                            ) : (
                                itemStatsInCategory.map((item) => (
                                    <div 
                                        key={item.name} 
                                        onClick={() => setSelectedItemName(item.name)}
                                        className={`p-4 flex justify-between items-center cursor-pointer transition-all hover:bg-amber-50/30 group ${selectedItemName === item.name ? 'bg-amber-50 border-r-4 border-amber-500' : ''}`}
                                    >
                                        <div className="min-w-0"><p className={`font-bold text-sm truncate transition-colors ${selectedItemName === item.name ? 'text-amber-700' : 'text-slate-700'}`}>{item.name}</p><p className="text-[9px] text-slate-400 font-black uppercase">{item.count}x Transaksi</p></div>
                                        <div className="text-right ml-4 shrink-0"><p className={`font-black text-xs ${selectedItemName === item.name ? 'text-amber-600' : 'text-slate-800'}`}>Rp {item.total.toLocaleString('id-ID')}</p></div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {selectedItemName && (
                    <div className="bg-white rounded-3xl border shadow-lg overflow-hidden animate-in slide-in-from-top-4 duration-500">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl text-amber-400"><History size={24}/></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rincian Riwayat Pembelian Item</p>
                                    <h4 className="text-xl font-black uppercase tracking-tight">{selectedItemName}</h4>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItemName(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><CloseIcon size={24}/></button>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b text-slate-400 font-black uppercase text-[10px] tracking-widest">
                                    <tr><th className="px-8 py-4">Tanggal Pembelian</th><th className="px-6 py-4 text-center">Jumlah (Qty)</th><th className="px-6 py-4">Kategori / Metode</th><th className="px-8 py-4 text-right">Subtotal Harga</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detailedHistoryForItem.map((t, idx) => (
                                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white border border-transparent group-hover:border-slate-100 transition-all text-slate-400"><Calendar size={14}/></div>
                                                    <div>
                                                        <p className="font-black text-slate-700">{new Date(t.date).toLocaleDateString('id-ID', {weekday: 'long', day: '2-digit', month: 'long'})}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="inline-block px-4 py-1.5 bg-amber-50 text-amber-700 rounded-xl font-black text-sm border border-amber-100">{t.qty || 1} <span className="text-[10px] opacity-60 font-bold">Item</span></span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase">{t.category || 'LAINNYA'}</span>
                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase flex items-center gap-1 ${t.paymentMethod === 'CASH' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-blue-600 border-blue-100 bg-blue-50'}`}>
                                                        {t.paymentMethod === 'CASH' ? <Wallet size={10}/> : <CreditCard size={10}/>} {t.paymentMethod}
                                                    </span>
                                                </div>
                                                {t.notes && <p className="text-[10px] text-slate-400 italic mt-1 truncate max-w-xs">"{t.notes}"</p>}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <p className="font-black text-rose-600 text-lg">Rp {t.amount.toLocaleString('id-ID')}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
           </div>
       )}

       {/* CONTENT: MENU */}
       {activeTab === 'MENU' && (
           <div className="space-y-6 animate-in fade-in">
               <div className="bg-white p-6 rounded-2xl border"><h3 className="font-bold mb-6 flex items-center gap-2 text-slate-700"><BarChart3 size={18}/> Top 5 Terlaris</h3>
               <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={menuStats.top5}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Bar dataKey="qty" fill="#f59e0b" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div></div>
               <div className="bg-white rounded-2xl border overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr><th className="px-6 py-4">Menu</th><th className="px-6 py-4 text-center">Qty</th><th className="px-6 py-4 text-right">Omset</th><th className="px-6 py-4 text-right">Profit</th></tr></thead><tbody className="divide-y">{menuStats.data.map((i:any,idx:number)=>(<tr key={idx} className="hover:bg-slate-50"><td className="px-6 py-4 font-bold">{i.name}</td><td className="px-6 py-4 text-center">{i.qty}</td><td className="px-6 py-4 text-right">Rp {i.revenue.toLocaleString('id-ID')}</td><td className="px-6 py-4 text-right font-bold text-emerald-600">Rp {i.profit.toLocaleString('id-ID')}</td></tr>))}</tbody></table></div>
           </div>
       )}

       {/* CONTENT: DAILY */}
       {activeTab === 'DAILY' && (
           <div className="space-y-6 animate-in fade-in">
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Omset</p>
                        <p className="text-lg font-black text-emerald-700">Rp {dailyStats.totalOmset.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Belanja</p>
                        <p className="text-lg font-black text-rose-700">Rp {dailyStats.totalExpense.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">QRIS/Transfer</p>
                        <p className="text-lg font-black text-blue-700">Rp {dailyStats.totalQris.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total COH</p>
                        <p className="text-lg font-black text-amber-400">Rp {dailyStats.totalCoh.toLocaleString('id-ID')}</p>
                    </div>
               </div>
               <div className="bg-white rounded-2xl border overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-50 text-[10px] font-bold"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3 text-right">Omset</th><th className="px-4 py-3 text-right">Belanja</th><th className="px-4 py-3 text-right">COH</th></tr></thead><tbody>{dailyStats.data.filter((d:any)=>d.omset>0||d.expense>0).sort((a:any,b:any)=>b.date.localeCompare(a.date)).map((d:any)=>(<tr key={d.date} className="border-t"><td className="px-4 py-3 font-bold">{new Date(d.date).toLocaleDateString('id-ID',{day:'2-digit', month:'short'})}</td><td className="px-4 py-3 text-right font-bold text-emerald-600">Rp {d.omset.toLocaleString('id-ID')}</td><td className="px-4 py-3 text-right text-rose-500">Rp {d.expense.toLocaleString('id-ID')}</td><td className="px-4 py-3 text-right font-black text-slate-800">Rp {d.coh.toLocaleString('id-ID')}</td></tr>))}</tbody></table></div>
           </div>
       )}

       {/* CONTENT: RIDER ANALYTICS */}
       {activeTab === 'RIDER' && (
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                <div className="lg:col-span-1 bg-white rounded-2xl border shadow-sm h-[500px] flex flex-col">
                    <div className="p-4 bg-purple-50 border-b font-bold text-purple-800">Daftar Rider Aktif</div>
                    <div className="overflow-y-auto divide-y no-scrollbar">{Object.values(riderStats).map((r:any)=>(<div key={r.name} onClick={()=>setSelectedRider(r.name)} className={`p-4 cursor-pointer hover:bg-slate-50 flex justify-between items-center ${selectedRider===r.name?'bg-purple-50':''}`}><div><p className="font-bold text-slate-800">{r.name}</p><p className="text-[10px] text-slate-400">{r.totalCups} Cup Terjual</p></div><ChevronRight size={16}/></div>))}</div>
                </div>
                <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm h-[500px] flex flex-col">
                    {selectedRider ? (
                        <>
                            <div className="p-4 bg-slate-50 border-b font-bold text-slate-700 flex justify-between items-center">
                                <span>Performa: {selectedRider}</span>
                                <div className="text-right"><p className="text-[10px] opacity-60">Total Omset</p><p className="font-black text-emerald-600 text-sm">Rp {riderStats[selectedRider].totalOmset.toLocaleString('id-ID')}</p></div>
                            </div>
                            <div className="overflow-y-auto no-scrollbar"><table className="w-full text-xs text-left"><thead className="bg-slate-50 sticky top-0 font-bold uppercase text-[9px]"><tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3 text-center">Cup</th><th className="px-4 py-3 text-right">Omset</th><th className="px-4 py-3 text-right">Belanja</th><th className="px-4 py-3 text-right">COH</th></tr></thead><tbody className="divide-y">{Object.values(riderStats[selectedRider].daily).sort((a:any,b:any)=>b.date.localeCompare(a.date)).map((d:any)=>(<tr key={d.date} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium">{new Date(d.date).toLocaleDateString('id-ID',{day:'2-digit', month:'short'})}</td><td className="px-4 py-3 text-center font-bold">{d.cups}</td><td className="px-4 py-3 text-right font-bold text-emerald-600">Rp {d.omset.toLocaleString('id-ID')}</td><td className="px-4 py-3 text-right text-rose-500">Rp {d.expense.toLocaleString('id-ID')}</td><td className="px-4 py-3 text-right font-black">Rp {d.coh.toLocaleString('id-ID')}</td></tr>))}</tbody></table></div>
                        </>
                    ) : (<div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-300"><Users size={48} className="mb-4 opacity-20"/><p className="font-bold">Silakan pilih rider di samping</p></div>)}
                </div>
           </div>
       )}

       {/* CONTENT: QRIS ANALYTICS */}
       {activeTab === 'QRIS' && (
           <div className="space-y-6 animate-in fade-in">
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg"><QrCode size={24}/></div>
                    <div><h3 className="font-black text-emerald-900 text-lg">Analisa QRIS per Rider</h3><p className="text-xs text-emerald-700 font-medium opacity-80">Rincian pendapatan harian dengan pembanding data Real Bank.</p></div>
                </div>

                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-sm border-collapse min-w-[1100px]">
                            <thead>
                                <tr className="bg-slate-50 border-b">
                                    <th className="px-6 py-4 text-left font-black text-slate-400 uppercase tracking-widest text-[10px] sticky left-0 bg-slate-50 z-10 border-r">TANGGAL</th>
                                    {qrisMatrix.riders.map(rider => (
                                        <th key={rider} className="px-6 py-4 text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rider</p><p className="font-black text-slate-800">{rider}</p></th>
                                    ))}
                                    <th className="px-6 py-4 text-right bg-emerald-50/50 border-l font-black text-emerald-800 text-[10px] uppercase">Total Sistem</th>
                                    <th className="px-6 py-4 text-right bg-blue-50/50 border-l font-black text-blue-800 text-[10px] uppercase">Real Bank</th>
                                    <th className="px-6 py-4 text-center border-l font-black text-slate-400 text-[10px] uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {qrisMatrix.dates.length === 0 ? (
                                    <tr><td colSpan={qrisMatrix.riders.length + 4} className="p-12 text-center text-slate-400 italic font-medium">Tidak ada pendapatan QRIS pada bulan ini.</td></tr>
                                ) : (
                                    qrisMatrix.dates.map(date => {
                                        const systemTotal = (Object.values(qrisMatrix.matrix[date] || {}) as number[]).reduce((a: number, b: number) => a + b, 0);
                                        const reconData = reconciliations.find(r => r.date === date);
                                        const realBankAmount = reconData?.manualQrisAmount;
                                        const isMatch = realBankAmount !== undefined && realBankAmount === systemTotal;
                                        const corrected = isDateCorrected(date);

                                        return (
                                            <tr key={date} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-600 sticky left-0 bg-white z-10 border-r">{new Date(date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', weekday: 'short'})}</td>
                                                {qrisMatrix.riders.map(rider => {
                                                    const val = qrisMatrix.matrix[date]?.[rider] || 0;
                                                    return (
                                                        <td key={rider} className="px-6 py-4 text-center">
                                                            {val > 0 ? (
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <div className="inline-block px-3 py-1 bg-white text-slate-700 rounded-lg font-bold text-xs border">Rp {val.toLocaleString('id-ID')}</div>
                                                                    <button 
                                                                        onClick={() => setRecapModalInfo({date, riderName: rider})}
                                                                        className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-md transition-all"
                                                                        title="Lihat Rekap Rider"
                                                                    >
                                                                        <FileSearch size={14}/>
                                                                    </button>
                                                                </div>
                                                            ) : (<span className="text-slate-300">—</span>)}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-6 py-4 text-right bg-emerald-50/30 border-l font-black text-emerald-700">Rp {systemTotal.toLocaleString('id-ID')}</td>
                                                <td className="px-6 py-4 text-right bg-blue-50/30 border-l">
                                                    {realBankAmount !== undefined ? (
                                                        <div className="flex flex-col items-end">
                                                            <p className="font-black text-blue-700">Rp {realBankAmount.toLocaleString('id-ID')}</p>
                                                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1 flex items-center gap-1 ${isMatch ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                                {isMatch ? <CheckCircle2 size={10}/> : <AlertTriangle size={10}/>}
                                                                {isMatch ? 'Match' : 'Selisih'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px] font-bold">Belum Dicek</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 border-l text-center">
                                                   {!isMatch && realBankAmount !== undefined && !corrected ? (
                                                       <button 
                                                           onClick={() => handleApplyQrisCorrection(date, systemTotal, realBankAmount)}
                                                           className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-md active:scale-95" 
                                                           title="Koreksi Saldo"
                                                       >
                                                           <Wrench size={16}/>
                                                       </button>
                                                   ) : corrected ? (
                                                       <div className="flex items-center justify-center text-emerald-500 gap-1"><Check size={16}/><span className="text-[9px] font-black uppercase">Terkoreksi</span></div>
                                                   ) : isMatch && realBankAmount !== undefined ? (
                                                       <div className="text-emerald-500"><CheckCircle2 size={18}/></div>
                                                   ) : (
                                                       <span className="text-slate-200">—</span>
                                                   )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-slate-900 p-5 rounded-3xl text-white flex items-center justify-between shadow-xl">
                    <div className="flex items-center gap-3"><div className="p-2 bg-white/10 rounded-xl"><TrendingUp size={20} className="text-emerald-400"/></div><div><p className="text-[10px] font-black text-slate-400 uppercase">Grand Total QRIS Bulan Ini</p><p className="text-2xl font-black text-emerald-400">Rp {(Object.values(qrisMatrix.totalsPerRider) as number[]).reduce((a: number, b: number) => a + b, 0).toLocaleString('id-ID')}</p></div></div>
                    <ArrowRight className="opacity-20"/>
                </div>
           </div>
       )}

       {/* CONTENT: COH ANALYTICS */}
       {activeTab === 'COH' && (
           <div className="space-y-6 animate-in fade-in">
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-amber-600 text-white rounded-2xl shadow-lg"><Banknote size={24}/></div>
                    <div><h3 className="font-black text-amber-900 text-lg">Analisa COH per Rider</h3><p className="text-xs text-amber-700 font-medium opacity-80">Matrix komparasi uang fisik (Cash On Hand) yang diterima dari masing-masing rider.</p></div>
                </div>

                <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-sm border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-slate-50 border-b">
                                    <th className="px-6 py-4 text-left font-black text-slate-400 uppercase tracking-widest text-[10px] sticky left-0 bg-slate-50 z-10 border-r">TANGGAL</th>
                                    {cohMatrix.riders.map(rider => (
                                        <th key={rider} className="px-6 py-4 text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rider</p><p className="font-black text-slate-800">{rider}</p></th>
                                    ))}
                                    <th className="px-6 py-4 text-right bg-amber-50/50 border-l font-black text-amber-800 text-[10px] uppercase">Total Harian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {cohMatrix.dates.length === 0 ? (
                                    <tr><td colSpan={cohMatrix.riders.length + 2} className="p-12 text-center text-slate-400 italic font-medium">Tidak ada data COH pada bulan ini.</td></tr>
                                ) : (
                                    cohMatrix.dates.map(date => {
                                        const dailyTotal = (Object.values(cohMatrix.matrix[date] || {}) as number[]).reduce((a: number, b: number) => a + b, 0);

                                        return (
                                            <tr key={date} className="hover:bg-amber-50/30 transition-colors group">
                                                <td className="px-6 py-4 font-bold text-slate-600 sticky left-0 bg-white z-10 border-r group-hover:bg-amber-50/30">{new Date(date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', weekday: 'short'})}</td>
                                                {cohMatrix.riders.map(rider => {
                                                    const val = cohMatrix.matrix[date]?.[rider] || 0;
                                                    return (<td key={rider} className="px-6 py-4 text-center">{val > 0 ? (<div className="inline-block px-3 py-1 bg-white text-amber-700 rounded-lg font-black text-xs border border-amber-100 shadow-sm">Rp {val.toLocaleString('id-ID')}</div>) : (<span className="text-slate-300">—</span>)}</td>);
                                                })}
                                                <td className="px-6 py-4 text-right bg-amber-50/30 border-l font-black text-amber-700">Rp {dailyTotal.toLocaleString('id-ID')}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {cohMatrix.riders.length > 0 && (
                                <tfoot className="bg-slate-900 text-white">
                                    <tr>
                                        <td className="px-6 py-4 font-black text-[10px] uppercase tracking-widest sticky left-0 bg-slate-900 border-r">TOTAL PER RIDER</td>
                                        {cohMatrix.riders.map(rider => (
                                            <td key={rider} className="px-6 py-4 text-center font-black text-amber-400">Rp {cohMatrix.totalsPerRider[rider].toLocaleString('id-ID')}</td>
                                        ))}
                                        <td className="px-6 py-4 text-right font-black text-emerald-400 border-l">Rp {(Object.values(cohMatrix.totalsPerRider) as number[]).reduce((a: number, b: number) => a + b, 0).toLocaleString('id-ID')}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
                
                <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200 flex items-start gap-4">
                   <Info size={20} className="text-amber-600 shrink-0 mt-0.5"/>
                   <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Tentang Analisa COH</p>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Matrix ini menampilkan uang fisik nyata yang disetorkan rider di akhir shift. Gunakan matrix ini untuk memonitor ketersediaan dana tunai di "kantong" masing-masing rider sebelum disetorkan ke owner/kas pusat.</p>
                   </div>
                </div>
           </div>
       )}

       {/* MODAL RINCIAN REKAP (SHORTCUT DARI QRIS) */}
       {recapModalInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-6 bg-slate-50 border-b flex justify-between items-start">
                   <div>
                     <h3 className="font-black text-slate-800 text-xl tracking-tight uppercase">Pantau Rekap Harian</h3>
                     <div className="flex items-center gap-2 mt-1">
                       <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">{new Date(recapModalInfo.date).toLocaleDateString('id-ID', {weekday: 'long', day: '2-digit', month: 'long'})}</span>
                       <span className="text-sm font-black text-slate-500 uppercase">• {recapModalInfo.riderName}</span>
                     </div>
                   </div>
                   <button onClick={() => setRecapModalInfo(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><LucideX size={24}/></button>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto no-scrollbar">
                   {(() => {
                     const dateKey = recapModalInfo.date;
                     const rider = recapModalInfo.riderName;
                     
                     // Filter transaksi murni untuk rider ini pada hari ini (Abaikan Gaji/Koreksi)
                     const relevantTxs = transactions.filter(t => 
                        t.date.startsWith(dateKey) && 
                        t.riderName === rider && 
                        t.category !== 'GAJI' && 
                        t.category !== 'Koreksi Saldo'
                     );

                     const omset = relevantTxs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
                     const shopping = relevantTxs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
                     const qris = relevantTxs.filter(t => t.type === 'INCOME' && (t.paymentMethod === 'QRIS' || t.paymentMethod === 'TRANSFER')).reduce((s, t) => s + t.amount, 0);
                     
                     // Ambil data metadata dari transaksi INCOME utama
                     const mainTx = relevantTxs.find(t => t.type === 'INCOME' && t.actualCash !== undefined);
                     const cashOnHand = mainTx?.actualCash || 0;
                     const variance = mainTx?.variance || 0;
                     const cups = mainTx?.qty || 0;
                     const description = mainTx?.description || '';

                     return (
                       <div className="space-y-8">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                             <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                <div className="flex items-center gap-2 text-emerald-600 mb-1"><Receipt size={14}/><span className="text-[9px] font-black uppercase">Omset Kotor</span></div>
                                <p className="text-lg font-black text-emerald-900">Rp {omset.toLocaleString('id-ID')}</p>
                             </div>
                             <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                               <div className="flex items-center gap-2 text-blue-600 mb-1"><Smartphone size={14}/><span className="text-[9px] font-black uppercase tracking-tight">QRIS/Transfer</span></div>
                               <p className="text-lg font-black text-blue-900">Rp {qris.toLocaleString('id-ID')}</p>
                             </div>
                             <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                                <div className="flex items-center gap-2 text-rose-600 mb-1"><ShoppingBag size={14}/><span className="text-[10px] font-black uppercase">Belanja</span></div>
                                <p className="text-lg font-black text-rose-900">Rp {shopping.toLocaleString('id-ID')}</p>
                             </div>
                             <div className={`p-4 rounded-2xl border ${variance === 0 ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-100'}`}>
                                <div className="flex items-center gap-2 text-slate-400 mb-1"><AlertTriangle size={14}/><span className="text-[10px] font-black uppercase">Selisih Uang</span></div>
                                <p className={`text-lg font-black ${variance === 0 ? 'text-slate-700' : 'text-rose-700'}`}>
                                   {variance > 0 ? '+' : ''}{variance.toLocaleString('id-ID')}
                                </p>
                             </div>
                          </div>

                          <div className="p-5 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
                             <div className="flex justify-between items-center mb-4 relative z-10">
                                <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Calculator size={14}/> Rekonsiliasi Kas</span>
                             </div>
                             <div className="space-y-3 relative z-10">
                                <div className="flex justify-between text-sm">
                                   <span className="opacity-70">Uang Seharusnya (Tunai Sistem)</span>
                                   <span className="font-bold text-amber-200">Rp {(omset - qris - shopping).toLocaleString('id-ID')}</span>
                                 </div>
                                 <div className="flex justify-between text-sm">
                                   <span className="opacity-70">Uang Tunai Nyata (Fisik)</span>
                                   <span className="font-bold text-emerald-400">Rp {cashOnHand.toLocaleString('id-ID')}</span>
                                 </div>
                                 <div className="flex justify-between pt-3 border-t border-white/10 items-end">
                                    <span className="text-xs font-black text-amber-400 uppercase">TOTAL HASIL SELISIH</span>
                                    <div className="text-right">
                                       <p className={`text-2xl font-black ${variance === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {variance > 0 ? '+' : ''}{variance.toLocaleString('id-ID')}
                                       </p>
                                    </div>
                                 </div>
                             </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                   <Coffee size={14} className="text-amber-500"/> Rincian Penjualan ({cups} Cup)
                                </h4>
                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                   <table className="w-full text-sm">
                                      <tbody className="divide-y divide-slate-50">
                                         {description.includes('Detail: ') ? description.split('Detail: ')[1].split(', ').map((item: string, idx: number) => {
                                            const lastX = item.lastIndexOf(' x');
                                            if (lastX === -1) return null;
                                            const name = item.substring(0, lastX);
                                            const qty = item.substring(lastX + 2);
                                            return (
                                              <tr key={idx} className="hover:bg-slate-50">
                                                 <td className="px-4 py-2.5 font-bold text-slate-700 text-xs">{name}</td>
                                                 <td className="px-4 py-2.5 text-right font-black text-amber-600 text-xs">{qty} <span className="text-[10px] font-normal text-slate-400">Cup</span></td>
                                              </tr>
                                            )
                                         }) : (
                                            <tr><td className="p-4 text-center text-slate-400 italic text-xs">Tidak ada rincian menu.</td></tr>
                                         )}
                                      </tbody>
                                   </table>
                                </div>
                             </div>

                             <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                   <ShoppingBag size={14} className="text-rose-500"/> Belanja Operasional
                                </h4>
                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden max-h-[160px] overflow-y-auto no-scrollbar">
                                   <table className="w-full text-sm">
                                      <tbody className="divide-y divide-slate-50">
                                         {relevantTxs.filter(t => t.type === 'EXPENSE').length > 0 ? (
                                             relevantTxs.filter(t => t.type === 'EXPENSE').map((t, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2.5">
                                                        <p className="font-bold text-slate-700 text-xs truncate">{t.description.replace('Beli ', '').replace(` (${rider})`, '')}</p>
                                                        <span className="text-[8px] font-black bg-slate-100 text-slate-400 px-1 py-0.5 rounded uppercase">{t.category}</span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-black text-rose-600 text-xs whitespace-nowrap">Rp {t.amount.toLocaleString('id-ID')}</td>
                                                </tr>
                                             ))
                                         ) : (
                                            <tr><td className="p-4 text-center text-slate-400 italic text-xs">Rider tidak belanja hari ini.</td></tr>
                                         )}
                                      </tbody>
                                   </table>
                                </div>
                             </div>
                          </div>
                       </div>
                     )
                   })()}
                </div>

                <div className="p-6 bg-slate-50 border-t flex gap-3">
                   <button onClick={() => setRecapModalInfo(null)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl shadow-sm active:scale-95 transition-all">TUTUP PANTUAN</button>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

// FIX: Renamed X to CloseIcon to avoid naming collision with imported lucide-react X icon
const CloseIcon = ({size}: {size:number}) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

export default Analytics;
