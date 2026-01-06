
import React, { useState, useMemo } from 'react';
import { Transaction, Rider, PaymentMethod } from '../types';
import { 
  Banknote, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Share2, 
  CheckCircle2, 
  Wallet, 
  Smartphone, 
  CreditCard, 
  X, 
  Save,
  Plus,
  ChevronLeft,
  ChevronRight,
  Info,
  Gift
} from 'lucide-react';

interface SalaryCalculatorProps {
  transactions: Transaction[];
  riders: Rider[];
  onAddTransaction: (transaction: Transaction) => void;
}

const SalaryCalculator: React.FC<SalaryCalculatorProps> = ({ transactions, riders, onAddTransaction }) => {
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Form State for Payment
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [adminFee, setAdminFee] = useState('0');
  const [bonusAmount, setBonusAmount] = useState('0');
  const [bonusNote, setBonusNote] = useState('');

  // FIX: Month Navigation with manual YYYY-MM formatting to avoid Timezone shifts
  const changeMonth = (delta: number) => {
    const [year, monthVal] = month.split('-').map(Number);
    const newDate = new Date(year, (monthVal - 1) + delta, 1);
    const y = newDate.getFullYear();
    const m = (newDate.getMonth() + 1).toString().padStart(2, '0');
    setMonth(`${y}-${m}`);
    setSelectedRiderId(null);
  };

  const allRidersSummary = useMemo(() => {
    return riders.map(rider => {
      const riderTxs = transactions.filter(t => t.riderName === rider.name && t.date.startsWith(month));
      const incomeTxs = riderTxs.filter(t => t.type === 'INCOME');
      let totalCups = 0, totalMeal = 0;
      incomeTxs.forEach(t => { totalCups += (t.qty || 0); totalMeal += (t.mealCost || 0); });
      const totalCommission = totalCups * 1400;
      const totalKasbon = riderTxs.filter(t => t.type === 'EXPENSE' && t.category === 'Kasbon').reduce((sum, t) => sum + t.amount, 0);
      
      const monthLabel = new Date(month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      const isPaid = transactions.some(t => 
        t.type === 'EXPENSE' && 
        t.category === 'GAJI' && 
        t.description.includes(`Gaji ${rider.name}`) && 
        t.description.includes(monthLabel)
      );

      return { 
        ...rider, 
        totalCups, 
        totalCommission, 
        totalMeal, 
        totalKasbon, 
        netSalary: (totalCommission + totalMeal) - totalKasbon,
        isPaid
      };
    });
  }, [riders, transactions, month]);

  const grandTotalSalary = useMemo(() => allRidersSummary.reduce((sum, r) => sum + r.netSalary, 0), [allRidersSummary]);

  const detailData = useMemo(() => {
    if (!selectedRiderId) return null;
    const summary = allRidersSummary.find(r => r.id === selectedRiderId);
    if (!summary) return null;
    const riderTxs = transactions.filter(t => t.riderName === summary.name && t.date.startsWith(month));
    
    const dailyMap: Record<string, any> = {};
    riderTxs.filter(t => t.type === 'INCOME').forEach(t => {
      const dateKey = t.date.substring(0, 10);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, cups: 0, meal: 0 };
      dailyMap[dateKey].cups += (t.qty || 0);
      dailyMap[dateKey].meal += (t.mealCost || 0);
    });
    
    const dailyBreakdown = Object.values(dailyMap).map(day => ({ 
      date: day.date, 
      cups: day.cups, 
      commission: day.cups * 1400, 
      meal: day.meal, 
      totalIncome: (day.cups * 1400) + day.meal 
    })).sort((a, b) => b.date.localeCompare(a.date));

    const kasbonList = riderTxs.filter(t => t.type === 'EXPENSE' && t.category === 'Kasbon').map(t => ({ 
      id: t.id, 
      date: t.date, 
      amount: t.amount, 
      note: t.description 
    })).sort((a, b) => b.date.localeCompare(a.date));

    return { summary, dailyBreakdown, kasbonList };
  }, [selectedRiderId, allRidersSummary, transactions, month]);

  // Combined Payable Calculation
  const totalPayable = useMemo(() => {
    if (!detailData) return 0;
    return detailData.summary.netSalary + (parseInt(bonusAmount) || 0);
  }, [detailData, bonusAmount]);

  const handleProcessPayment = () => {
    if (!detailData) return;
    const { summary } = detailData;
    const monthLabel = new Date(month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    
    const finalBonus = parseInt(bonusAmount) || 0;
    const confirmMsg = `Bayar Gaji ${summary.name} periode ${monthLabel} sebesar Rp ${totalPayable.toLocaleString('id-ID')} (Termasuk bonus Rp ${finalBonus.toLocaleString('id-ID')}) via ${payMethod}?`;
    
    if (window.confirm(confirmMsg)) {
      const timestamp = Date.now();
      const finalDate = new Date(paymentDate);
      const now = new Date();
      finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      // 1. Transaction Gaji (Net + Bonus)
      onAddTransaction({
        id: `sal-${timestamp}`,
        date: finalDate.toISOString(),
        type: 'EXPENSE',
        amount: totalPayable,
        paymentMethod: payMethod,
        category: 'GAJI',
        description: `Gaji ${summary.name} (${monthLabel})`,
        riderName: summary.name,
        notes: `Total Jual: ${summary.totalCups} Cup. Bonus: Rp ${finalBonus.toLocaleString('id-ID')} (${bonusNote || 'Tanpa ket'})`
      });

      // 2. Transaction Fee (if Transfer)
      const fee = parseInt(adminFee) || 0;
      if (payMethod === 'TRANSFER' && fee > 0) {
        onAddTransaction({
          id: `sal-fee-${timestamp}`,
          date: finalDate.toISOString(),
          type: 'EXPENSE',
          amount: fee,
          paymentMethod: 'TRANSFER',
          category: 'OPERASIONAL',
          description: `Biaya Admin Transfer Gaji ${summary.name}`,
        });
      }

      setIsPaymentModalOpen(false);
      setBonusAmount('0');
      setBonusNote('');
      alert('Pembayaran gaji berhasil dicatat!');
    }
  };

  const generateSlipText = () => {
    if (!detailData) return '';
    const period = new Date(month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const kasbons = detailData.kasbonList.map(k => `- ${new Date(k.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}: Rp ${k.amount.toLocaleString('id-ID')}`).join('\n');
    const bonusVal = parseInt(bonusAmount) || 0;

    return `*SLIP GAJI RIDER BR4DA COFFEE*
---------------------------------
👤 Nama: ${detailData.summary.name}
📅 Periode: ${period}

*PENDAPATAN*
☕ Total Jual: ${detailData.summary.totalCups} Cup
💰 Komisi (x1400): Rp ${detailData.summary.totalCommission.toLocaleString('id-ID')}
🍲 Uang Makan: Rp ${detailData.summary.totalMeal.toLocaleString('id-ID')}
✨ Bonus/Insentif: Rp ${bonusVal.toLocaleString('id-ID')} ${bonusNote ? `(${bonusNote})` : ''}
---------------------------------
Total Kotor: Rp ${(detailData.summary.totalCommission + detailData.summary.totalMeal + bonusVal).toLocaleString('id-ID')}

*POTONGAN (KASBON)*
${kasbons || '- Tidak ada kasbon'}
---------------------------------
Total Potongan: Rp ${detailData.summary.totalKasbon.toLocaleString('id-ID')}

*TOTAL BERSIH (TAKE HOME PAY)*
🔥 *Rp ${totalPayable.toLocaleString('id-ID')}*
---------------------------------
_Status: SUDAH DIBAYAR_
_Dicetak secara otomatis via Br4da Management System_`;
  };

  const copySlip = () => { navigator.clipboard.writeText(generateSlipText()); alert("Slip gaji disalin!"); };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><Banknote size={24}/></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gaji & Insentif</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Periode: {new Date(month).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
           <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-amber-600 transition-all">
              <ChevronLeft size={20}/>
           </button>
           <input 
              type="month" 
              value={month} 
              onChange={(e) => {setMonth(e.target.value); setSelectedRiderId(null);}} 
              className="bg-transparent border-none text-sm font-black text-slate-700 outline-none text-center px-2 cursor-pointer"
            />
           <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-amber-600 transition-all">
              <ChevronRight size={20}/>
           </button>
        </div>
      </section>

      {!selectedRiderId ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-slate-900 rounded-[32px] p-8 text-white flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Banknote size={120} />
               </div>
               <div className="text-center sm:text-left z-10">
                 <h3 className="text-lg font-bold">Total Est. Gaji Semua Rider</h3>
                 <p className="text-slate-400 text-[10px] uppercase tracking-widest font-black mt-1">Estimasi Payout Bulan Ini</p>
               </div>
               <p className="text-4xl font-black text-emerald-400 z-10">Rp {grandTotalSalary.toLocaleString('id-ID')}</p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allRidersSummary.map(rider => (
                    <div key={rider.id} className="bg-white rounded-3xl border p-6 space-y-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        {rider.isPaid && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl shadow-sm flex items-center gap-1.5">
                            <CheckCircle2 size={12}/> Lunas
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <h3 className="font-black text-slate-800 uppercase tracking-tight">{rider.name}</h3>
                          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-1 rounded-lg font-black border border-amber-100">{rider.totalCups} Cup</span>
                        </div>
                        <div className="text-3xl font-black text-slate-800">Rp {rider.netSalary.toLocaleString('id-ID')}</div>
                        <button 
                          onClick={() => setSelectedRiderId(rider.id)} 
                          className="w-full py-3.5 bg-slate-50 text-slate-600 font-black rounded-2xl hover:bg-amber-600 hover:text-white transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                        >
                           Buka Panel Gaji <ArrowRight size={16}/>
                        </button>
                    </div>
                ))}
             </div>
          </div>
      ) : (
          detailData && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
                <div className="flex justify-between items-center">
                    <button onClick={() => setSelectedRiderId(null)} className="text-slate-500 font-bold flex items-center gap-2 hover:text-slate-800 transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100"><ArrowLeft size={16}/> Kembali ke Daftar</button>
                    <div className="flex gap-2">
                        <button onClick={copySlip} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"><Copy size={14}/> Salin Slip</button>
                        <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(generateSlipText())}`, '_blank')} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-colors"><Share2 size={14}/> Kirim ke WhatsApp</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 bg-white rounded-[32px] border p-8 space-y-6 shadow-sm relative overflow-hidden">
                        {detailData.summary.isPaid && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-white px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-bl-3xl flex items-center gap-2">
                             <CheckCircle2 size={18}/> Sudah Terbayar
                          </div>
                        )}
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rincian Rider</p>
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{detailData.summary.name}</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-2xl border border-slate-100">
                               <span className="font-bold text-slate-500">Komisi ({detailData.summary.totalCups} Cup)</span>
                               <span className="font-black text-slate-800">Rp {detailData.summary.totalCommission.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded-2xl border border-slate-100">
                               <span className="font-bold text-slate-500">Uang Makan</span>
                               <span className="font-black text-slate-800">Rp {detailData.summary.totalMeal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm p-3 bg-rose-50 rounded-2xl border border-rose-100">
                               <span className="font-bold text-rose-600">Potongan Kasbon</span>
                               <span className="font-black text-rose-700">- Rp {detailData.summary.totalKasbon.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        <div className="bg-slate-900 text-center p-6 rounded-[24px] shadow-xl relative overflow-hidden">
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 relative z-10">Total Gaji Bersih</p>
                          <p className="text-3xl font-black text-emerald-400 relative z-10">Rp {detailData.summary.netSalary.toLocaleString('id-ID')}</p>
                          <Banknote className="absolute right-0 bottom-0 text-white/5" size={80}/>
                        </div>

                        {!detailData.summary.isPaid ? (
                           <button 
                             onClick={() => setIsPaymentModalOpen(true)}
                             className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4 uppercase tracking-widest text-xs"
                           >
                              <Banknote size={22}/> PROSES PEMBAYARAN
                           </button>
                        ) : (
                          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-center text-emerald-700 font-black text-sm flex items-center justify-center gap-2">
                             <CheckCircle2 size={18}/> Transaksi Tercatat di Buku Besar
                          </div>
                        )}
                    </div>
                    
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
                           <div className="p-5 bg-slate-50 border-b font-black text-slate-700 text-xs uppercase tracking-widest flex items-center gap-2">
                              <CheckCircle2 className="text-amber-500" size={16}/> Rincian Pendapatan Harian
                           </div>
                           <div className="max-h-64 overflow-y-auto no-scrollbar">
                              <table className="w-full text-sm text-left">
                                 <thead className="bg-white text-slate-400 uppercase text-[9px] font-black tracking-widest border-b">
                                    <tr><th className="px-6 py-3">Tanggal</th><th className="px-6 py-3 text-center">Cup</th><th className="px-6 py-3 text-right">Penghasilan</th></tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-50">
                                    {detailData.dailyBreakdown.map(row => (
                                       <tr key={row.date} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-6 py-4 font-bold text-slate-600">{new Date(row.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short', weekday:'short'})}</td>
                                          <td className="px-6 py-4 text-center font-black text-slate-800">{row.cups}</td>
                                          <td className="px-6 py-4 text-right font-black text-emerald-600">Rp {row.totalIncome.toLocaleString('id-ID')}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </div>

                        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                           <div className="p-5 bg-rose-50 border-b font-black text-rose-800 text-xs uppercase tracking-widest flex items-center gap-2">
                              <ArrowLeft className="rotate-45" size={16}/> Log Pemotongan Kasbon
                           </div>
                           <div className="max-h-48 overflow-y-auto no-scrollbar">
                              {detailData.kasbonList.length === 0 ? (
                                <div className="p-8 text-center text-slate-300 italic text-sm">Tidak ada pemotongan kasbon bulan ini.</div>
                              ) : (
                                <table className="w-full text-sm text-left">
                                  <tbody className="divide-y divide-slate-50">
                                     {detailData.kasbonList.map(row => (
                                        <tr key={row.id} className="hover:bg-rose-50/50">
                                           <td className="px-6 py-4 text-slate-500 font-medium">{new Date(row.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'})}</td>
                                           <td className="px-6 py-4 text-xs font-bold text-slate-700">{row.note}</td>
                                           <td className="px-6 py-4 text-right font-black text-rose-600">- Rp {row.amount.toLocaleString('id-ID')}</td>
                                        </tr>
                                     ))}
                                  </tbody>
                                </table>
                              )}
                           </div>
                        </div>
                    </div>
                </div>
            </div>
          )
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && detailData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh]">
              <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
                 <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Proses Bayar Gaji</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{detailData.summary.name} • {new Date(month).toLocaleDateString('id-ID', {month:'long', year:'numeric'})}</p>
                 </div>
                 <button onClick={() => setIsPaymentModalOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
              </div>

              <div className="p-8 space-y-8 overflow-y-auto no-scrollbar">
                 {/* Auto-Calculated Summary Display */}
                 <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center relative overflow-hidden">
                    <Banknote size={80} className="absolute -left-4 -bottom-4 text-emerald-100/50" />
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 relative z-10">Total Dana Dikeluarkan</p>
                    <p className="text-4xl font-black text-emerald-800 relative z-10">Rp {totalPayable.toLocaleString('id-ID')}</p>
                    {parseInt(bonusAmount) > 0 && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-2 animate-bounce">
                        Gaji Rp {detailData.summary.netSalary.toLocaleString('id-ID')} + Bonus Rp {parseInt(bonusAmount).toLocaleString('id-ID')}
                      </p>
                    )}
                 </div>

                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Tgl Keluar Gaji</label>
                            <input 
                                type="date" 
                                value={paymentDate} 
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-amber-200 transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Metode Bayar</label>
                            <select 
                                value={payMethod} 
                                onChange={(e) => setPayMethod(e.target.value as any)}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-amber-200 transition-all text-sm cursor-pointer"
                            >
                                <option value="CASH">Tunai / Kas</option>
                                <option value="QRIS">QRIS</option>
                                <option value="TRANSFER">Transfer Bank</option>
                            </select>
                        </div>
                    </div>

                    {/* BONUS INPUT SECTION */}
                    <div className="bg-amber-50/50 p-6 rounded-[32px] border border-amber-100 space-y-4">
                        <div className="flex items-center gap-2 text-amber-700 font-black text-[10px] uppercase tracking-widest mb-2">
                           <Gift size={14}/> Bonus & Insentif Tambahan
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-black text-xs">Rp</span>
                                <input 
                                    type="number" 
                                    value={bonusAmount} 
                                    onChange={(e) => setBonusAmount(e.target.value)} 
                                    placeholder="0"
                                    className="w-full pl-10 p-4 bg-white border border-amber-200 rounded-2xl font-black text-amber-700 outline-none focus:ring-4 focus:ring-amber-200/50 transition-all"
                                />
                            </div>
                            <input 
                                type="text" 
                                value={bonusNote} 
                                onChange={(e) => setBonusNote(e.target.value)} 
                                placeholder="Keterangan bonus..."
                                className="w-full p-4 bg-white border border-amber-200 rounded-2xl font-bold text-slate-600 outline-none focus:ring-4 focus:ring-amber-200/50 transition-all text-sm"
                            />
                        </div>
                        <div className="flex gap-2 items-start opacity-70">
                           <Info size={12} className="text-amber-500 mt-0.5 shrink-0"/>
                           <p className="text-[9px] text-amber-800 font-medium leading-relaxed italic">Bonus akan otomatis dijumlahkan ke total gaji dan tercatat di buku besar serta slip gaji.</p>
                        </div>
                    </div>

                    {payMethod === 'TRANSFER' && (
                      <div className="animate-in slide-in-from-top-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Biaya Admin TF</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                          <input 
                            type="number" 
                            value={adminFee} 
                            onChange={(e) => setAdminFee(e.target.value)}
                            className="w-full pl-11 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )}
                 </div>
              </div>

              <div className="p-8 bg-slate-50 border-t flex flex-col gap-3">
                 <button 
                   onClick={handleProcessPayment}
                   className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl shadow-xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                 >
                    <Save size={20}/> SIMPAN & BAYAR SEKARANG
                 </button>
                 <button 
                   onClick={() => setIsPaymentModalOpen(false)}
                   className="w-full py-4 bg-white border border-slate-200 text-slate-400 font-black rounded-3xl uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-colors"
                 >
                    BATALKAN
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SalaryCalculator;
