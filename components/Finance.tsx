
import React, { useState, useMemo } from 'react';
import { Transaction, Rider, PaymentMethod } from '../types';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  Wallet, 
  CreditCard, 
  Filter, 
  ChevronDown, 
  ChevronUp,
  CircleDollarSign,
  Search,
  Banknote,
  Users,
  X,
  Smartphone,
  CheckCircle2,
  Wrench,
  AlertTriangle
} from 'lucide-react';

interface FinanceProps {
  transactions: Transaction[];
  riders: Rider[];
}

const Finance: React.FC<FinanceProps> = ({ transactions = [], riders = [] }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  
  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  const safeFormatDate = (dateStr: string) => {
    try {
      if (!dateStr) return 'Tanggal Invalid';
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return dateStr; }
  };

  const safeTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter(t => t && typeof t === 'object' && typeof t.date === 'string');
  }, [transactions]);

  const totalPendingSalary = useMemo(() => {
    let grandTotal = 0;
    const monthLabel = new Date(selectedMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    riders.forEach(rider => {
        const isPaid = safeTransactions.some(t => 
            t.type === 'EXPENSE' && 
            t.category === 'GAJI' && 
            t.description.includes(`Gaji ${rider.name}`) && 
            t.description.includes(monthLabel)
        );

        if (!isPaid) {
            const riderTxs = safeTransactions.filter(t => t.riderName === rider.name && t.date.startsWith(selectedMonth));
            let totalCups = 0, totalMeal = 0, totalKasbon = 0;
            riderTxs.forEach(t => {
                if (t.type === 'INCOME') { 
                    totalCups += (t.qty || 0); 
                    totalMeal += (t.mealCost || 0); 
                }
                else if (t.type === 'EXPENSE' && t.category === 'Kasbon') {
                    totalKasbon += t.amount;
                }
            });
            const estimation = (totalCups * 1400 + totalMeal) - totalKasbon;
            grandTotal += Math.max(0, estimation); 
        }
    });
    return grandTotal;
  }, [safeTransactions, riders, selectedMonth]);

  const filteredTransactions = useMemo(() => {
    return safeTransactions.filter(t => {
      const matchMonth = t.date.startsWith(selectedMonth);
      const matchType = filterType === 'ALL' || t.type === filterType;
      const matchMethod = selectedMethod === 'ALL' || t.paymentMethod === selectedMethod;
      const matchSearch = (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchMonth && matchType && matchMethod && matchSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [safeTransactions, selectedMonth, filterType, selectedMethod, searchTerm]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, any> = {};
    filteredTransactions.forEach(t => {
      const dateKey = t.date.substring(0, 10);
      if (!groups[dateKey]) groups[dateKey] = { date: dateKey, items: [], dailyIncome: 0, dailyExpense: 0 };
      if (t.type === 'INCOME') groups[dateKey].dailyIncome += t.amount;
      else groups[dateKey].dailyExpense += t.amount;
      groups[dateKey].items.push(t);
    });
    return Object.values(groups).sort((a:any, b:any) => b.date.localeCompare(a.date));
  }, [filteredTransactions]);

  const summary = useMemo(() => {
    let inc = 0, incCash = 0, incQris = 0, exp = 0, expCash = 0, expTf = 0;
    safeTransactions.filter(t => t.date.startsWith(selectedMonth)).forEach(t => {
      if (t.type === 'INCOME') {
        inc += t.amount;
        if (t.paymentMethod === 'CASH') incCash += t.amount; else incQris += t.amount;
      } else {
        exp += t.amount;
        if (t.paymentMethod === 'CASH') expCash += t.amount; else expTf += t.amount;
      }
    });
    return { inc, incCash, incQris, exp, expCash, expTf, net: inc - exp - totalPendingSalary };
  }, [safeTransactions, selectedMonth, totalPendingSalary]);

  const handleQuickFilter = (type: 'INCOME' | 'EXPENSE' | 'ALL', method: PaymentMethod | 'ALL') => {
    setFilterType(type as any);
    setSelectedMethod(method);
    setExpandedDates({});
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
         <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                    <CircleDollarSign className="text-amber-600" /> Arus Uang & Profit
                </h2>
                <p className="text-xs text-slate-400">Monitoring laba rugi dan mutasi real-time.</p>
            </div>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"/>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className={`p-4 rounded-3xl border transition-all ${filterType === 'INCOME' && selectedMethod === 'ALL' ? 'ring-4 ring-emerald-100 border-emerald-500 bg-emerald-50/30' : 'bg-slate-50 border-slate-100'}`}>
               <div className="mb-3 cursor-pointer group" onClick={() => handleQuickFilter('INCOME', 'ALL')}>
                   <p className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1 group-hover:underline"><ArrowUpCircle size={12}/> Pemasukan</p>
                   <p className="text-xl font-black text-slate-800">Rp {summary.inc.toLocaleString('id-ID')}</p>
               </div>
               <div className="flex gap-1.5 pt-2 border-t border-slate-200">
                   <button onClick={() => handleQuickFilter('INCOME', 'CASH')} className={`flex-1 p-2 rounded-xl text-center transition-all hover:scale-105 active:scale-95 ${selectedMethod==='CASH'&&filterType==='INCOME'?'bg-emerald-600 text-white shadow-md':'bg-white text-emerald-600 border border-emerald-100'}`}>
                       <p className="text-[8px] font-black">CASH</p>
                       <p className="text-[10px] font-black">Rp {summary.incCash.toLocaleString('id-ID')}</p>
                   </button>
                   <button onClick={() => handleQuickFilter('INCOME', 'QRIS')} className={`flex-1 p-2 rounded-xl text-center transition-all hover:scale-105 active:scale-95 ${selectedMethod==='QRIS'&&filterType==='INCOME'?'bg-emerald-600 text-white shadow-md':'bg-white text-emerald-600 border border-emerald-100'}`}>
                       <p className="text-[8px] font-black">QRIS</p>
                       <p className="text-[10px] font-black">Rp {summary.incQris.toLocaleString('id-ID')}</p>
                   </button>
               </div>
            </div>

            <div className={`p-4 rounded-3xl border transition-all ${filterType === 'EXPENSE' && selectedMethod === 'ALL' ? 'ring-4 ring-rose-100 border-rose-500 bg-rose-50/30' : 'bg-slate-50 border-slate-100'}`}>
               <div className="mb-3 cursor-pointer group" onClick={() => handleQuickFilter('EXPENSE', 'ALL')}>
                   <p className="text-[10px] font-black text-rose-600 uppercase flex items-center gap-1 group-hover:underline"><ArrowDownCircle size={12}/> Pengeluaran</p>
                   <p className="text-xl font-black text-slate-800">Rp {summary.exp.toLocaleString('id-ID')}</p>
               </div>
               <div className="flex gap-1.5 pt-2 border-t border-slate-200">
                   <button onClick={() => handleQuickFilter('EXPENSE', 'CASH')} className={`flex-1 p-2 rounded-xl text-center transition-all hover:scale-105 active:scale-95 ${selectedMethod==='CASH'&&filterType==='EXPENSE'?'bg-rose-600 text-white shadow-md':'bg-white text-rose-600 border border-rose-100'}`}>
                       <p className="text-[8px] font-black">CASH</p>
                       <p className="text-[10px] font-black">Rp {summary.expCash.toLocaleString('id-ID')}</p>
                   </button>
                   <button onClick={() => handleQuickFilter('EXPENSE', 'TRANSFER')} className={`flex-1 p-2 rounded-xl text-center transition-all hover:scale-105 active:scale-95 ${selectedMethod==='TRANSFER'&&filterType==='EXPENSE'?'bg-rose-600 text-white shadow-md':'bg-white text-rose-600 border border-rose-100'}`}>
                       <p className="text-[8px] font-black">TF/QRIS</p>
                       <p className="text-[10px] font-black">Rp {summary.expTf.toLocaleString('id-ID')}</p>
                   </button>
               </div>
            </div>

            <div className={`p-4 rounded-3xl flex flex-col justify-center border shadow-xl transition-all ${totalPendingSalary === 0 ? 'bg-blue-600 border-blue-700 text-white' : 'bg-slate-900 border-slate-800 text-white'}`}>
               <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gaji Belum Bayar</p>
                  {totalPendingSalary === 0 && <CheckCircle2 size={14} className="text-blue-200"/>}
               </div>
               <p className={`text-xl font-black ${totalPendingSalary === 0 ? 'text-white' : 'text-rose-400'}`}>
                   {totalPendingSalary === 0 ? 'LUNAS' : `- Rp ${totalPendingSalary.toLocaleString('id-ID')}`}
               </p>
               <p className="text-[8px] opacity-60 mt-2 italic leading-tight">
                  {totalPendingSalary === 0 ? 'Semua gaji rider bulan ini sudah dibayarkan.' : '*Hanya menghitung rider yang belum di-payroll.'}
               </p>
            </div>

            <div className={`p-4 rounded-3xl flex flex-col justify-center shadow-lg border-2 transition-all ${summary.net >= 0 ? 'bg-amber-500 text-white border-amber-600 shadow-amber-200' : 'bg-rose-600 text-white border-rose-700 shadow-rose-200'}`}>
               <p className="text-[10px] font-black uppercase opacity-80 text-center tracking-widest mb-1">Net Profit Real-Time</p>
               <p className="text-2xl font-black text-center">Rp {summary.net.toLocaleString('id-ID')}</p>
               <div className="flex justify-center mt-2"><div className="w-10 h-1 bg-white/30 rounded-full"></div></div>
            </div>
         </div>

         <div className="flex gap-2 items-center bg-slate-50 p-2 rounded-2xl border border-slate-200">
            <div className="flex-1 flex items-center gap-2 px-2">
                <Search className="text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Cari keterangan, kategori, atau rider..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="flex-1 bg-transparent text-sm font-bold outline-none text-slate-700"
                />
            </div>
            {(filterType !== 'ALL' || selectedMethod !== 'ALL' || searchTerm !== '') && (
                <button 
                    onClick={() => {setFilterType('ALL'); setSelectedMethod('ALL'); setSearchTerm('');}} 
                    className="text-[10px] font-black text-rose-500 flex items-center gap-1 uppercase bg-white px-3 py-1.5 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors shadow-sm"
                >
                    Reset Filter <X size={14}/>
                </button>
            )}
         </div>
      </section>

      <section className="space-y-4 pb-24">
         {groupedByDate.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <Filter className="w-16 h-16 mx-auto mb-4 text-slate-200 opacity-20" />
                <p className="text-slate-400 font-bold italic">Tidak ada transaksi yang sesuai kriteria.</p>
            </div>
         ) : (
            groupedByDate.map((group) => (
             <div key={group.date} className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                <div onClick={() => toggleDate(group.date)} className="bg-slate-50 p-4 px-6 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">
                            {expandedDates[group.date] === false ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronUp size={16} className="text-amber-600"/>}
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-sm">{safeFormatDate(group.date)}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.items.length} Mutasi</p>
                        </div>
                    </div>
                    <div className="flex items-end flex-col gap-1">
                        {group.dailyIncome > 0 && <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg">+Rp {group.dailyIncome.toLocaleString('id-ID')}</span>}
                        {group.dailyExpense > 0 && <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg">-Rp {group.dailyExpense.toLocaleString('id-ID')}</span>}
                    </div>
                </div>
                {expandedDates[group.date] !== false && (
                    <div className="divide-y divide-slate-50">
                        {group.items.map((t:any) => {
                            const isCorrection = t.category === 'Koreksi Saldo';
                            return (
                                <div key={t.id} className={`p-4 px-6 flex justify-between items-center hover:bg-slate-50 transition-colors ${isCorrection ? 'bg-amber-50/50' : ''}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-2xl shadow-sm ${isCorrection ? 'bg-amber-100 text-amber-700 border border-amber-200' : t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                            {isCorrection ? <Wrench size={18}/> : t.type === 'INCOME' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 leading-tight">
                                                {isCorrection && <span className="text-amber-700 font-black mr-1">[PENYESUAIAN]</span>}
                                                {t.description}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-1.5">
                                                {t.category && <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border ${isCorrection ? 'bg-amber-200 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{t.category}</span>}
                                                <span className="text-[9px] flex items-center gap-1 text-slate-400 font-black uppercase tracking-widest px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                                                    {t.paymentMethod === 'CASH' ? <Wallet size={10}/> : t.paymentMethod === 'QRIS' ? <Smartphone size={10}/> : <CreditCard size={10}/>}
                                                    {t.paymentMethod}
                                                </span>
                                                {t.riderName && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">RIDER: {t.riderName}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className="flex items-center gap-1 justify-end">
                                            {isCorrection && <AlertTriangle size={12} className="text-amber-500"/>}
                                            <p className={`font-black text-sm whitespace-nowrap ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {t.type === 'INCOME' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">{new Date(t.date).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
             </div>
            ))
         )}
      </section>
    </div>
  );
};

export default Finance;
