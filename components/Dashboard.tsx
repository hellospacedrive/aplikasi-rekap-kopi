
import React, { useMemo, useState, useEffect } from 'react';
import { FinancialSummary, Capital, Transaction } from '../types';
import { Wallet, CreditCard, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft, Banknote, PieChart, AlertCircle, X, ChevronRight, Package, Calculator, Plus, Minus, Equal, StickyNote, History } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  summary: FinancialSummary;
  capital: Capital;
  recentTransactions: Transaction[];
  transactions: Transaction[]; 
  onUpdateCapital: (updated: Capital) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ summary, capital, recentTransactions, transactions, onUpdateCapital }) => {
  const [detailModalType, setDetailModalType] = useState<'BAHAN_BAKU' | 'GAJI' | null>(null);
  const [balanceDetailType, setBalanceDetailType] = useState<'CASH' | 'BANK' | null>(null);
  const [note, setNote] = useState(capital.ownerNote || '');

  // Sync local note with capital prop when it changes
  useEffect(() => {
    setNote(capital.ownerNote || '');
  }, [capital.ownerNote]);

  const handleNoteBlur = () => {
    onUpdateCapital({ ...capital, ownerNote: note });
  };

  const chartData = [
    { name: 'Masuk', value: summary.totalIncome, color: '#10b981' },
    { name: 'Keluar', value: summary.totalExpense, color: '#ef4444' },
  ];

  // --- BALANCE BREAKDOWN LOGIC ---
  const balanceBreakdown = useMemo(() => {
    let incomeCash = 0, expenseCash = 0;
    let incomeBank = 0, expenseBank = 0;

    transactions.forEach(t => {
      if (!t || !t.amount) return;
      if (t.type === 'INCOME') {
        if (t.paymentMethod === 'CASH') incomeCash += t.amount;
        else incomeBank += t.amount;
      } else {
        if (t.paymentMethod === 'CASH') expenseCash += t.amount;
        else expenseBank += t.amount;
      }
    });

    return {
      cash: {
        initial: capital.initialCash,
        income: incomeCash,
        expense: expenseCash,
        final: capital.initialCash + incomeCash - expenseCash
      },
      bank: {
        initial: capital.initialBank,
        income: incomeBank,
        expense: expenseBank,
        final: capital.initialBank + incomeBank - expenseBank
      }
    };
  }, [transactions, capital]);

  // --- COST & STOCK ANALYSIS LOGIC ---
  const analysis = useMemo(() => {
    // Current Month Filter
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyTx = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
    
    // 1. Total Omset (Revenue)
    const totalOmset = monthlyTx
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

    // 2. Bahan Baku Logic
    const rawMaterialKeywords = ['es batu', 'skm', 'uht', 'air', 'plastik', 'sedotan', 'cup', 'kresek', 'tisu'];
    const bookkeepingCategories = ['Produksi', 'Sirup'];

    // Helper to identify Bahan Baku
    const isBahanBaku = (t: Transaction) => {
        if (t.type !== 'EXPENSE') return false;
        if (t.category === 'BAHAN_BAKU') return true;
        if (t.category && bookkeepingCategories.includes(t.category)) return true;
        const desc = (t.description || '').toLowerCase();
        if (rawMaterialKeywords.some(keyword => desc.includes(keyword))) return true;
        return false;
    };

    const bahanBakuTxs = monthlyTx.filter(isBahanBaku);
    const totalBahanBaku = bahanBakuTxs.reduce((sum, t) => sum + t.amount, 0);

    // 3. Labor Cost (Gaji) Logic
    let totalEstimatedLabor = 0;
    const estimatedLaborDetails: {date: string, desc: string, amount: number}[] = [];
    
    // 3a. From Transactions Metadata (Commission + Meal)
    monthlyTx.filter(t => t.type === 'INCOME').forEach(t => {
        const cups = t.qty || 0;
        const meal = t.mealCost || 0;
        const comm = cups * 1400;
        const total = comm + meal;
        if (total > 0) {
            totalEstimatedLabor += total;
            estimatedLaborDetails.push({
                date: t.date,
                desc: `Estimasi Beban Gaji Rider (${t.riderName || 'Unknown'}) - ${cups} Cup + Makan`,
                amount: total
            });
        }
    });

    // 3b. Paid Salaries (Real Cash Out)
    const paidSalaryTxs = monthlyTx.filter(t => t.type === 'EXPENSE' && (t.category === 'GAJI' || t.category === 'Gaji'));
    const totalPaidSalary = paidSalaryTxs.reduce((sum, t) => sum + t.amount, 0);
    
    // Combine for display in modal
    const gajiHistory = [
        ...paidSalaryTxs.map(t => ({ date: t.date, desc: t.description, amount: t.amount, isPaid: true })),
        ...estimatedLaborDetails.map(t => ({ ...t, isPaid: false }))
    ].sort((a,b) => b.date.localeCompare(a.date));


    // Percentages
    const pctBahanBaku = totalOmset > 0 ? (totalBahanBaku / totalOmset) * 100 : 0;
    const pctGaji = totalOmset > 0 ? (totalEstimatedLabor / totalOmset) * 100 : 0;

    // --- STOCK LOGIC (CUP) ---
    const initialStock = capital.initialCupStock || 0;
    const purchasedStock = monthlyTx
        .filter(t => t.type === 'EXPENSE' && (t.description || '').toLowerCase().includes('cup'))
        .reduce((sum, t) => sum + (t.qty || 1), 0);
    const soldStock = summary.totalCupsMonth;
    const currentStock = initialStock + purchasedStock - soldStock;

    return {
        totalOmset,
        totalBahanBaku,
        totalEstimatedLabor,
        totalPaidSalary,
        pctBahanBaku,
        pctGaji,
        bahanBakuTxs,
        gajiHistory,
        stock: {
            initial: initialStock,
            purchased: purchasedStock,
            sold: soldStock,
            current: currentStock
        }
    };
  }, [transactions, capital, summary]);

  return (
    <div className="space-y-6">
      
      {/* Detail Balance Modal */}
      {balanceDetailType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className={`p-6 text-white flex justify-between items-start ${balanceDetailType === 'CASH' ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Rincian Saldo {balanceDetailType === 'CASH' ? 'Tunai' : 'Bank'}</h3>
                  <p className="text-sm opacity-80 font-medium">Rekapitulasi total saldo saat ini</p>
                </div>
                <button onClick={() => setBalanceDetailType(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                 {(() => {
                   const data = balanceDetailType === 'CASH' ? balanceBreakdown.cash : balanceBreakdown.bank;
                   return (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg text-slate-400 border border-slate-100"><Calculator size={18}/></div>
                              <span className="text-sm font-bold text-slate-500">Modal Awal</span>
                           </div>
                           <span className="font-black text-slate-700">Rp {data.initial.toLocaleString('id-ID')}</span>
                        </div>

                        <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Plus size={18}/></div>
                              <span className="text-sm font-bold text-emerald-700">Total Pemasukan</span>
                           </div>
                           <span className="font-black text-emerald-700">+ Rp {data.income.toLocaleString('id-ID')}</span>
                        </div>

                        <div className="flex justify-between items-center bg-rose-50 p-4 rounded-2xl border border-rose-100">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-rose-100 rounded-lg text-rose-600"><Minus size={18}/></div>
                              <span className="text-sm font-bold text-rose-700">Total Pengeluaran</span>
                           </div>
                           <span className="font-black text-rose-700">- Rp {data.expense.toLocaleString('id-ID')}</span>
                        </div>

                        <div className="pt-4 border-t-2 border-dashed border-slate-200">
                           <div className={`p-5 rounded-2xl text-center shadow-lg ${balanceDetailType === 'CASH' ? 'bg-emerald-600' : 'bg-blue-600'} text-white`}>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Saldo Akhir (Real Time)</p>
                              <p className="text-3xl font-black">Rp {data.final.toLocaleString('id-ID')}</p>
                           </div>
                        </div>
                     </div>
                   )
                 })()}
              </div>
              <div className="px-8 pb-8">
                 <button onClick={() => setBalanceDetailType(null)} className="w-full py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-colors uppercase tracking-widest text-xs">Tutup Rincian</button>
              </div>
           </div>
        </div>
      )}
      
      {/* Detail Modal for Expenses */}
      {detailModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">
                            {detailModalType === 'BAHAN_BAKU' ? 'Rincian Biaya Bahan Baku' : 'Analisa Gaji Rider'}
                        </h3>
                        <p className="text-xs text-slate-500">
                             Total: Rp {detailModalType === 'BAHAN_BAKU' 
                                ? analysis.totalBahanBaku.toLocaleString('id-ID') 
                                : analysis.totalEstimatedLabor.toLocaleString('id-ID')}
                        </p>
                    </div>
                    <button onClick={() => setDetailModalType(null)} className="p-1 rounded-full hover:bg-slate-200">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-slate-500 uppercase text-xs sticky top-0 shadow-sm">
                            <tr>
                                <th className="px-6 py-3">Tanggal</th>
                                <th className="px-6 py-3">Keterangan</th>
                                <th className="px-6 py-3 text-right">Nominal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {detailModalType === 'BAHAN_BAKU' ? (
                                analysis.bahanBakuTxs.length === 0 ? (
                                    <tr><td colSpan={3} className="p-6 text-center text-slate-400">Tidak ada data.</td></tr>
                                ) : (
                                    analysis.bahanBakuTxs.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 whitespace-nowrap text-slate-500 text-xs">
                                                {new Date(t.date).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-700">
                                                {t.description}
                                                {t.category && <span className="ml-2 text-[10px] bg-slate-100 px-1.5 rounded text-slate-500">{t.category}</span>}
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-rose-600">
                                                Rp {t.amount.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))
                                )
                            ) : (
                                analysis.gajiHistory.length === 0 ? (
                                    <tr><td colSpan={3} className="p-6 text-center text-slate-400">Tidak ada data.</td></tr>
                                ) : (
                                    analysis.gajiHistory.map((item, idx) => (
                                        <tr key={idx} className={`hover:bg-slate-50 ${item.isPaid ? 'bg-emerald-50/50' : ''}`}>
                                            <td className="px-6 py-3 whitespace-nowrap text-slate-500 text-xs">
                                                {new Date(item.date).toLocaleDateString('id-ID')}
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-700">
                                                <div className="flex items-center gap-2">
                                                   {item.isPaid && <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Real / Paid</span>}
                                                   {!item.isPaid && <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Estimasi Beban</span>}
                                                   {item.desc}
                                                </div>
                                            </td>
                                            <td className={`px-6 py-3 text-right font-bold ${item.isPaid ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                Rp {item.amount.toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* Cards Row 1: Real Money */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Posisi Keuangan (Real)</h2>
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded uppercase">Bayar Gaji di menu "Gaji Rider" agar saldo berkurang secara Real</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CASH CARD - CLICKABLE */}
          <div 
            onClick={() => setBalanceDetailType('CASH')}
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-emerald-400 cursor-pointer transition-all active:scale-[0.98]"
          >
            <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Banknote size={64} className="text-emerald-700" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-200/50 rounded-lg text-emerald-700">
                <Wallet size={18} />
              </div>
              <span className="text-sm font-bold text-emerald-800">Tunai (Cash)</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-slate-800">
                Rp {summary.currentCash.toLocaleString('id-ID')}
              </p>
              <ChevronRight size={16} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-emerald-600 mt-1 font-medium italic opacity-70">
              Lihat rincian perhitungan...
            </p>
          </div>

          {/* BANK CARD - CLICKABLE */}
          <div 
            onClick={() => setBalanceDetailType('BANK')}
            className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-blue-400 cursor-pointer transition-all active:scale-[0.98]"
          >
             <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard size={64} className="text-blue-700" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-200/50 rounded-lg text-blue-700">
                 <CreditCard size={18} />
              </div>
              <span className="text-sm font-bold text-blue-800">Bank / QRIS</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-black text-slate-800">
                Rp {summary.currentBank.toLocaleString('id-ID')}
              </p>
              <ChevronRight size={16} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
            </div>
             <p className="text-xs text-blue-600 mt-1 font-medium italic opacity-70">
              Lihat rincian perhitungan...
            </p>
          </div>
          
           {/* Stock Monitor Widget */}
           <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div className="absolute right-0 top-0 p-3 opacity-10">
                 <Package size={64} className="text-purple-700" />
              </div>
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2">
                     <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
                        <Package size={18} />
                     </div>
                     <span className="text-sm font-bold text-purple-900">Monitor Stok Cup</span>
                 </div>
              </div>
              
              <div className="flex items-end gap-2 mb-2">
                  <p className="text-3xl font-black text-slate-800">{analysis.stock.current}</p>
                  <span className="text-sm text-slate-400 font-bold mb-1">Pcs</span>
              </div>

              <div className="flex gap-4 text-xs pt-3 border-t border-purple-100">
                  <div>
                      <span className="text-slate-400 block">Awal</span>
                      <span className="font-bold text-slate-700">{analysis.stock.initial}</span>
                  </div>
                  <div>
                      <span className="text-emerald-500 block">Beli</span>
                      <span className="font-bold text-slate-700">{analysis.stock.purchased}</span>
                  </div>
                  <div>
                      <span className="text-rose-500 block">Jual</span>
                      <span className="font-bold text-slate-700">{analysis.stock.sold}</span>
                  </div>
              </div>
           </div>

           {/* Owner Sticky Note Widget */}
           <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-2 text-amber-800">
                  <StickyNote size={18} />
                  <span className="text-sm font-bold">Catatan Owner</span>
              </div>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Tulis instruksi atau catatan harian di sini..."
                className="w-full flex-1 bg-transparent border-none text-xs font-medium text-amber-900 focus:ring-0 resize-none p-0 placeholder:text-amber-300"
              />
              <div className="text-[8px] text-amber-400 mt-2 text-right font-black uppercase tracking-widest">Auto-saved on exit</div>
           </div>
        </div>
      </section>

      {/* COST ANALYSIS SECTION */}
      <section>
         <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider flex items-center gap-2">
            <PieChart size={16} /> Analisa Biaya Bulan Ini (Estimasi vs Real)
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Bahan Baku Widget - CLICKABLE */}
            <div 
                onClick={() => setDetailModalType('BAHAN_BAKU')}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group"
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 group-hover:text-amber-600">
                            Biaya Bahan Baku <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <h3 className="text-xl font-black text-slate-800">Rp {analysis.totalBahanBaku.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${analysis.pctBahanBaku > 45 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {analysis.pctBahanBaku.toFixed(1)}% dari Omset
                    </div>
                </div>
                
                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                        <span className="text-xs font-semibold inline-block text-slate-500">
                            Limit Normal: 45%
                        </span>
                        {analysis.pctBahanBaku > 45 && (
                             <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                                <AlertCircle size={12} /> Over Budget
                             </span>
                        )}
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-100">
                        <div style={{ width: `${Math.min(analysis.pctBahanBaku, 100)}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${analysis.pctBahanBaku > 45 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                    </div>
                </div>
            </div>

            {/* Labor Cost Widget - CLICKABLE */}
            <div 
                onClick={() => setDetailModalType('GAJI')}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group"
            >
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1 group-hover:text-amber-600">
                            Beban Gaji Rider (Estimasi) <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <h3 className="text-xl font-black text-slate-800">Rp {analysis.totalEstimatedLabor.toLocaleString('id-ID')}</h3>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${analysis.pctGaji > 15 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {analysis.pctGaji.toFixed(1)}% dari Omset
                    </div>
                </div>
                
                <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                        <div className="flex flex-col">
                           <span className="text-xs font-semibold text-slate-500">
                               Real Paid: <span className="text-emerald-600 font-black">Rp {analysis.totalPaidSalary.toLocaleString('id-ID')}</span>
                           </span>
                        </div>
                         {analysis.pctGaji > 15 && (
                             <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                                <AlertCircle size={12} /> Over Budget
                             </span>
                        )}
                    </div>
                    <div className="overflow-hidden h-2 mt-2 mb-4 text-xs flex rounded bg-slate-100">
                        <div style={{ width: `${Math.min(analysis.pctGaji, 100)}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${analysis.pctGaji > 15 ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                    </div>
                </div>
            </div>

         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cards Row 2: Performance */}
        <section className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Performa Dagang</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="grid grid-cols-2 gap-8 mb-6">
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1 font-medium">
                  <TrendingUp size={14} className="text-emerald-500" /> PEMASUKAN
                </p>
                <p className="text-2xl font-bold text-slate-800">Rp {summary.totalIncome.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1 flex items-center gap-1 font-medium">
                  <TrendingDown size={14} className="text-rose-500" /> PENGELUARAN
                </p>
                <p className="text-2xl font-bold text-slate-800">Rp {summary.totalExpense.toLocaleString('id-ID')}</p>
              </div>
            </div>
            
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={60} tick={{fontSize: 12, fill: '#64748b'}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Total']}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Recent History */}
        <section className="lg:col-span-1">
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Transaksi Terakhir</h2>
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p className="text-sm text-slate-400">Belum ada transaksi</p>
              </div>
            ) : (
              recentTransactions.map((t) => (
                <div key={t.id} className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {t.type === 'INCOME' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">{t.description}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(t.date).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})} • {t.paymentMethod === 'CASH' ? 'Tunai' : 'Transfer'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {t.type === 'INCOME' ? '+' : '-'} {t.amount.toLocaleString('id-ID')}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
