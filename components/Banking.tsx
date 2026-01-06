
import React, { useState, useMemo } from 'react';
import { Transaction, BankReconciliation, Capital } from '../types';
import { 
  Landmark, 
  Calendar, 
  Save, 
  AlertTriangle, 
  CheckCircle, 
  Wallet, 
  ScanLine, 
  Wrench, 
  History, 
  Check,
  Calculator,
  Plus,
  Minus,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Users,
  User,
  ChevronRight,
  Edit3
} from 'lucide-react';

interface BankingProps {
  transactions: Transaction[];
  reconciliations: BankReconciliation[];
  onSaveReconciliation: (recon: BankReconciliation) => void;
  onAddTransaction: (transaction: Transaction) => void; 
  capital: Capital;
  onEditRecap?: (key: string) => void;
}

const Banking: React.FC<BankingProps> = ({ transactions, reconciliations, onSaveReconciliation, onAddTransaction, capital, onEditRecap }) => {
  const [activeTab, setActiveTab] = useState<'RECON' | 'CASH' | 'BANK'>('RECON');
  const [reconDate, setReconDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualQris, setManualQris] = useState('');

  // Perhitungan nilai sistem untuk tanggal yang sedang dipilih di form
  const systemQrisTotal = useMemo(() => {
    return transactions
      .filter(t => 
        t.date.startsWith(reconDate) && 
        t.type === 'INCOME' && 
        (t.paymentMethod === 'QRIS' || t.paymentMethod === 'TRANSFER')
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, reconDate]);

  const currentVariance = (parseInt(manualQris) || 0) - systemQrisTotal;

  // Helper untuk menghitung data sistem secara dinamis untuk baris riwayat manapun
  const getDynamicSystemData = (date: string) => {
    const relevantTxs = transactions.filter(t => 
        t.date.startsWith(date) && 
        t.type === 'INCOME' && 
        (t.paymentMethod === 'QRIS' || t.paymentMethod === 'TRANSFER')
    );
    
    const total = relevantTxs.reduce((sum, t) => sum + t.amount, 0);
    
    // Kelompokkan per rider
    const breakdown: Record<string, number> = {};
    relevantTxs.forEach(t => {
        const name = t.riderName || 'Umum';
        breakdown[name] = (breakdown[name] || 0) + t.amount;
    });

    return { total, breakdown: Object.entries(breakdown) };
  };

  const totalVarianceAll = useMemo(() => {
    return reconciliations.reduce((sum, r) => {
        const dynamicData = getDynamicSystemData(r.date);
        return sum + (r.manualQrisAmount - dynamicData.total);
    }, 0);
  }, [reconciliations, transactions]);

  const handleSaveRecon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQris) return;
    
    const manualAmount = parseInt(manualQris) || 0;
    onSaveReconciliation({
      id: `recon-${reconDate}-${Date.now()}`,
      date: reconDate,
      manualQrisAmount: manualAmount,
      systemQrisAmount: systemQrisTotal, // Tetap simpan snapshot tapi display akan pakai yang dinamis
      variance: manualAmount - systemQrisTotal
    });
    setManualQris('');
    alert('Hasil pengecekan berhasil disimpan ke riwayat.');
  };

  const handleCorrection = (date: string, variance: number) => {
    const isPositive = variance > 0;
    const absVariance = Math.abs(variance);
    
    const confirmMsg = `Buat transaksi ${isPositive ? 'PEMASUKAN' : 'PENGELUARAN'} sebesar Rp ${absVariance.toLocaleString('id-ID')} untuk menyeimbangkan saldo sistem dengan bank pada tanggal ${date}?`;
    
    if (window.confirm(confirmMsg)) {
        const now = new Date();
        const txDate = new Date(date);
        txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

        onAddTransaction({
            id: `correct-${Date.now()}`,
            date: txDate.toISOString(), 
            type: isPositive ? 'INCOME' : 'EXPENSE',
            amount: absVariance,
            paymentMethod: 'TRANSFER',
            category: 'Koreksi Saldo',
            description: `Koreksi Selisih QRIS (${new Date(date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})})`
        });
        alert(`Saldo berhasil dikoreksi!`);
    }
  };

  const isDateCorrected = (date: string) => {
    return transactions.some(t => t.category === 'Koreksi Saldo' && t.description.includes(new Date(date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})));
  };

  const cashFlow = useMemo(() => {
    const items = transactions.filter(t => t.paymentMethod === 'CASH').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalIncome = items.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpense = items.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { items, totalIncome, totalExpense, currentBalance: capital.initialCash + totalIncome - totalExpense, initial: capital.initialCash };
  }, [transactions, capital.initialCash]);

  const bankFlow = useMemo(() => {
    const items = transactions.filter(t => t.paymentMethod === 'TRANSFER' || t.paymentMethod === 'QRIS').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const totalIncome = items.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpense = items.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    return { items, totalIncome, totalExpense, currentBalance: capital.initialBank + totalIncome - totalExpense, initial: capital.initialBank };
  }, [transactions, capital.initialBank]);

  const renderTransactionList = (flowData: any, type: 'CASH' | 'BANK') => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
             <div className="flex items-center gap-3 border-b pb-4">
                 <div className={`p-2 rounded-lg ${type === 'CASH' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {type === 'CASH' ? <Wallet size={20}/> : <Landmark size={20}/>}
                 </div>
                 <h3 className="font-bold text-slate-800">Rincian Perhitungan {type}</h3>
             </div>
             <div className="space-y-3">
                 <div className="flex justify-between text-sm"><span className="text-slate-500">Modal Awal</span><span className="font-bold">Rp {flowData.initial.toLocaleString('id-ID')}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-emerald-600 flex items-center gap-1"><Plus size={12}/> Total Masuk</span><span className="font-bold text-emerald-600">Rp {flowData.totalIncome.toLocaleString('id-ID')}</span></div>
                 <div className="flex justify-between text-sm"><span className="text-rose-600 flex items-center gap-1"><Minus size={12}/> Total Keluar</span><span className="font-bold text-rose-600">Rp {flowData.totalExpense.toLocaleString('id-ID')}</span></div>
                 <div className="pt-3 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-slate-400">Saldo Akhir</span>
                    <span className={`text-xl font-black ${type==='CASH'?'text-emerald-700':'text-blue-700'}`}>Rp {flowData.currentBalance.toLocaleString('id-ID')}</span>
                 </div>
             </div>
        </div>

        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm h-[350px] overflow-y-auto no-scrollbar">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0 z-10">
                    <tr><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Keterangan</th><th className="px-4 py-3 text-right">Nominal</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {flowData.items.map((t: Transaction) => (
                        <tr key={t.id} className={`hover:bg-slate-50 ${t.category === 'Koreksi Saldo' ? 'bg-amber-50/50' : ''}`}>
                            <td className="px-4 py-3 text-slate-600 text-xs">
                                {new Date(t.date).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'})}
                                <span className="text-[10px] text-slate-400 block">{new Date(t.date).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</span>
                            </td>
                            <td className="px-4 py-3">
                                <p className="font-bold text-slate-700 text-xs">{t.description}</p>
                                {t.category && <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 rounded font-bold uppercase">{t.category}</span>}
                            </td>
                            <td className={`px-4 py-3 text-right font-black ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {t.type === 'INCOME' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-1.5 rounded-2xl shadow-sm border flex gap-2">
         <button onClick={() => setActiveTab('CASH')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all ${activeTab === 'CASH' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Wallet size={18}/> CASH</button>
         <button onClick={() => setActiveTab('BANK')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all ${activeTab === 'BANK' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><Landmark size={18}/> BANK</button>
         <button onClick={() => setActiveTab('RECON')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-black transition-all ${activeTab === 'RECON' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><ScanLine size={18}/> CEK QRIS</button>
      </div>

      {activeTab === 'RECON' && (
        <div className="space-y-6">
            <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-6 border-b pb-4">
                    <ScanLine className="text-amber-500" />
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Input Pengecekan Bank</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                    <form onSubmit={handleSaveRecon} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">1. Tanggal Mutasi</label>
                            <input type="date" value={reconDate} onChange={(e) => setReconDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-amber-200 outline-none"/>
                        </div>
                        <div className="p-4 bg-slate-900 rounded-2xl text-white relative overflow-hidden">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total QRIS/TF (Sistem)</p>
                            <p className="text-2xl font-black text-amber-400">Rp {systemQrisTotal.toLocaleString('id-ID')}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {getDynamicSystemData(reconDate).breakdown.map(([name, val]) => (
                                    <span key={name} className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">{name}: {val.toLocaleString('id-ID')}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">2. Total Real di Bank</label>
                            <input 
                                type="number" 
                                value={manualQris} 
                                onChange={(e) => setManualQris(e.target.value)} 
                                placeholder="Masukkan nominal bank..."
                                className="w-full p-4 bg-white border-2 border-blue-100 rounded-xl font-black text-blue-700 text-xl focus:border-blue-500 outline-none shadow-inner"
                            />
                        </div>
                        <button type="submit" className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                            <Save size={18}/> SIMPAN HASIL CEK
                        </button>
                    </form>
                    <div className={`p-6 rounded-3xl border-2 flex flex-col items-center justify-center text-center h-full min-h-[250px] transition-all ${!manualQris ? 'bg-slate-50 border-dashed border-slate-200' : currentVariance === 0 ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100' : 'bg-rose-50 border-rose-200 shadow-rose-100 shadow-lg'}`}>
                        {!manualQris ? (
                            <div className="text-slate-300">
                                <Landmark size={48} className="mx-auto mb-2 opacity-20"/>
                                <p className="text-sm font-bold uppercase italic">Menunggu Input Bank</p>
                            </div>
                        ) : (
                            <>
                                {currentVariance === 0 ? <CheckCircle className="text-emerald-500 mb-3" size={56} /> : <AlertTriangle className="text-rose-500 mb-3 animate-bounce" size={56} />}
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">{currentVariance === 0 ? 'STATUS: MATCH' : 'STATUS: SELISIH'}</p>
                                <p className={`text-4xl font-black ${currentVariance === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {currentVariance === 0 ? 'PAS' : `Rp ${Math.abs(currentVariance).toLocaleString('id-ID')}`}
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-5 bg-slate-50 border-b flex justify-between items-center">
                    <h3 className="font-black text-slate-700 flex items-center gap-2 uppercase tracking-widest text-xs">
                        <History size={16} className="text-slate-400"/> Riwayat Pengecekan QRIS (Dinamis)
                    </h3>
                    <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${totalVarianceAll >= 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                        {totalVarianceAll >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
                        <span className="text-[10px] font-black uppercase">Total Selisih: Rp {totalVarianceAll.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse min-w-[800px]">
                        <thead className="bg-white text-slate-400 font-bold border-b text-[10px] uppercase">
                            <tr>
                                <th className="px-6 py-4 sticky left-0 bg-white z-10 border-r">Tanggal</th>
                                <th className="px-4 py-4">Rincian Rider (Aplikasi)</th>
                                <th className="px-4 py-4 text-right">Sistem</th>
                                <th className="px-4 py-4 text-right">Bank (Real)</th>
                                <th className="px-4 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {reconciliations.length === 0 ? (
                                <tr><td colSpan={6} className="p-10 text-center text-slate-300 italic">Belum ada riwayat pengecekan.</td></tr>
                            ) : (
                                reconciliations.sort((a,b) => b.date.localeCompare(a.date)).map((r) => {
                                    const dynamicData = getDynamicSystemData(r.date);
                                    const variance = r.manualQrisAmount - dynamicData.total;
                                    const corrected = isDateCorrected(r.date);

                                    return (
                                        <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-black text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10 border-r">{new Date(r.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {dynamicData.breakdown.length === 0 ? (
                                                        <span className="text-[10px] text-slate-300 italic">Tidak ada input QRIS</span>
                                                    ) : dynamicData.breakdown.map(([name, val]) => (
                                                        <div key={name} className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 group/item">
                                                            <User size={10} className="text-slate-400"/>
                                                            <span className="text-[9px] font-bold text-slate-600">{name}: <span className="text-amber-600">{val.toLocaleString('id-ID')}</span></span>
                                                            {onEditRecap && (
                                                              <button 
                                                                onClick={() => onEditRecap(`${r.date}|${name}`)} 
                                                                className="ml-1 p-0.5 text-slate-300 hover:text-amber-600 hover:bg-white rounded transition-all opacity-0 group-hover/item:opacity-100"
                                                                title="Edit Rekap Rider"
                                                              >
                                                                <Edit3 size={10}/>
                                                              </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Aplikasi</p>
                                                <p className="font-black text-emerald-700">Rp {dynamicData.total.toLocaleString('id-ID')}</p>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Real Bank</p>
                                                <p className="font-black text-blue-700">Rp {r.manualQrisAmount.toLocaleString('id-ID')}</p>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {variance === 0 ? (
                                                    <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[10px] font-black uppercase">Match</span>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded text-[10px] font-black uppercase">Selisih</span>
                                                        <span className={`text-[9px] font-bold ${variance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{variance > 0 ? '+' : ''}{variance.toLocaleString('id-ID')}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {variance !== 0 ? (
                                                    corrected ? (
                                                        <span className="text-[10px] font-black text-emerald-500 flex items-center justify-end gap-1"><Check size={14}/> TERKOREKSI</span>
                                                    ) : (
                                                        <button onClick={() => handleCorrection(r.date, variance)} className="bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ml-auto"><Wrench size={12}/> Koreksi</button>
                                                    )
                                                ) : <span className="text-slate-300 text-[10px]">—</span>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
      )}
      {activeTab === 'CASH' && renderTransactionList(cashFlow, 'CASH')}
      {activeTab === 'BANK' && renderTransactionList(bankFlow, 'BANK')}
    </div>
  );
};

export default Banking;
