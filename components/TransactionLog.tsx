
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, Product, Rider, ExpenseItem, ExpenseCategoryType } from '../types';
import { 
  PlusCircle, 
  MinusCircle, 
  Trash2, 
  User, 
  Archive, 
  Save, 
  ArrowRight, 
  CheckCircle, 
  Calculator, 
  AlertTriangle, 
  FileText, 
  Edit3, 
  Plus, 
  StickyNote, 
  Receipt, 
  ShoppingBag, 
  Coffee,
  X,
  Wallet,
  Smartphone,
  CreditCard,
  ChevronRight,
  Tag,
  AlertCircle,
  ListChecks,
  Wrench,
  Check
} from 'lucide-react';

interface TransactionLogProps {
  transactions: Transaction[];
  products: Product[];
  expenseItems: ExpenseItem[];
  riders: Rider[];
  onAddTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  initialEditKey?: string | null;
  onClearEdit?: () => void;
}

interface HistoryGroup {
  idKey: string;
  date: string;
  riderName: string;
  cups: number;
  omset: number;
  shopping: number;
  qris: number;
  cashOnHand: number;
  variance: number;
  ids: string[];
  description: string;
  notes: string;
  expenseDetails: { name: string; amount: number; category?: string }[];
}

const TransactionLog: React.FC<TransactionLogProps> = ({ transactions, products, expenseItems, riders, onAddTransaction, onDeleteTransaction, initialEditKey, onClearEdit }) => {
  const [activeView, setActiveView] = useState<'FORM' | 'HISTORY'>('FORM');
  const [wizardStep, setWizardStep] = useState(0); 
  
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [riderName, setRiderName] = useState('');
  const [mealCostInput, setMealCostInput] = useState('');
  const [dailyNote, setDailyNote] = useState('');
  const [salesData, setSalesData] = useState<Record<string, number>>({});
  
  const [expenseValues, setExpenseValues] = useState<Record<string, { qty: string, price: string }>>({});
  const [customExpenses, setCustomExpenses] = useState<{id: string, name: string, qty: string, price: string, category: ExpenseCategoryType, note: string}[]>([]);
  
  const [customExpenseName, setCustomExpenseName] = useState('');
  const [customExpenseQty, setCustomExpenseQty] = useState('1');
  const [customExpensePrice, setCustomExpensePrice] = useState('');
  const [customExpenseCategory, setCustomExpenseCategory] = useState<ExpenseCategoryType>('BAHAN_BAKU');

  const [cashOnHandInput, setCashOnHandInput] = useState<string>('');
  const [qrisAmountInput, setQrisAmountInput] = useState<string>('');
  const [editingRecapKey, setEditingRecapKey] = useState<string | null>(null);
  const [selectedDetailKey, setSelectedDetailKey] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus logic for wizard
  useEffect(() => {
    if (wizardStep > 0 && wizardStep <= products.length) {
      setTimeout(() => {
        qtyInputRef.current?.focus();
        qtyInputRef.current?.select();
      }, 100);
    }
  }, [wizardStep, products.length]);

  // Jump-to-Edit Logic for cross-menu navigation
  useEffect(() => {
    if (initialEditKey) {
        handleEditRecap(initialEditKey);
        if (onClearEdit) onClearEdit();
    }
  }, [initialEditKey]);

  const handleNextStep = () => {
    if (wizardStep === 0 && !editingRecapKey) {
        const isDuplicate = transactions.some(t => 
            t.type === 'INCOME' && 
            t.riderName === riderName && 
            t.date.startsWith(date)
        );
        if (isDuplicate) {
            const proceed = window.confirm(`PERINGATAN: Rider ${riderName} sudah memiliki input data untuk tanggal ${date}. Tetap lanjutkan input data baru (Duplikat)?`);
            if (!proceed) return;
        }
    }
    setWizardStep(prev => prev + 1);
  };
  
  const handlePrevStep = () => setWizardStep(prev => Math.max(0, prev - 1));

  const totalCupsSold = useMemo(() => (Object.values(salesData) as number[]).reduce((a, b) => a + b, 0), [salesData]);
  const totalOmset = useMemo(() => {
    return (Object.entries(salesData) as [string, number][]).reduce((total, [id, qty]) => {
      const product = products.find(p => p.id === id);
      return total + (product ? product.price * qty : 0);
    }, 0);
  }, [salesData, products]);

  const totalExpense = useMemo(() => {
    const predefinedTotal = Object.values(expenseValues).reduce((total: number, val: any) => {
        const q = parseInt(val.qty) || 0;
        const p = parseInt(val.price) || 0;
        return total + (q * p);
    }, 0);
    const customTotal = customExpenses.reduce((sum, item) => {
        const q = parseInt(item.qty) || 0;
        const p = parseInt(item.price) || 0;
        return sum + (q * p);
    }, 0);
    return predefinedTotal + customTotal;
  }, [expenseValues, customExpenses]);

  const reconciliation = useMemo(() => {
    const qris = parseInt(qrisAmountInput) || 0;
    const actualCash = parseInt(cashOnHandInput) || 0;
    const expectedCash = (totalOmset - qris) - totalExpense;
    return { expectedCash, actualCash, variance: actualCash - expectedCash, qris };
  }, [totalOmset, totalExpense, qrisAmountInput, cashOnHandInput]);

  const historyData = useMemo<HistoryGroup[]>(() => {
    const groups: Record<string, HistoryGroup> = {};
    transactions.forEach(t => {
      if (!t || !t.date) return;
      
      if (t.category === 'GAJI' || t.category === 'Gaji' || t.category === 'Koreksi Saldo') return;

      const dateKey = t.date.substring(0, 10);
      const riderKey = t.riderName || 'Umum';
      const compositeKey = `${dateKey}|${riderKey}`;
      
      if (!groups[compositeKey]) {
        groups[compositeKey] = { 
          idKey: compositeKey, 
          date: dateKey, 
          riderName: riderKey, 
          cups: 0, 
          omset: 0, 
          shopping: 0, 
          qris: 0, 
          cashOnHand: 0, 
          variance: 0, 
          ids: [], 
          description: '', 
          notes: '',
          expenseDetails: []
        };
      }

      if (t.type === 'INCOME') {
        groups[compositeKey].ids.push(t.id);
        groups[compositeKey].omset += t.amount;
        if (t.paymentMethod === 'QRIS' || t.paymentMethod === 'TRANSFER') groups[compositeKey].qris += t.amount;
        if (t.qty) groups[compositeKey].cups += t.qty;
        if (t.actualCash !== undefined) groups[compositeKey].cashOnHand = t.actualCash; 
        if (t.variance !== undefined) groups[compositeKey].variance = t.variance;
        if (t.notes) groups[compositeKey].notes = t.notes;
        if (t.amount > 0 && !groups[compositeKey].description && t.description.includes('Detail:')) groups[compositeKey].description = t.description;
      } else if (!t.id.startsWith('book-')) {
        groups[compositeKey].ids.push(t.id);
        if (t.category !== 'Kasbon') {
          groups[compositeKey].shopping += t.amount;
          groups[compositeKey].expenseDetails.push({ 
            name: t.description.replace(` (${riderKey})`, '').replace('Beli ', ''), 
            amount: t.amount,
            category: t.category
          });
        }
      }
    });
    return (Object.values(groups) as HistoryGroup[]).filter(g => g.omset > 0 || g.shopping > 0);
  }, [transactions]);

  const sortedHistory = useMemo(() => {
    let items = [...historyData];
    if (sortConfig.key) {
      items.sort((a, b) => {
        const valA = (a as any)[sortConfig.key];
        const valB = (b as any)[sortConfig.key];
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [historyData, sortConfig]);

  const isRecapCorrected = (riderName: string, date: string) => {
    return transactions.some(t => 
        t.category === 'Koreksi Saldo' && 
        t.description.includes(`Koreksi Kas ${riderName}`) && 
        t.description.includes(new Date(date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'}))
    );
  };

  const handleApplyCorrection = (row: HistoryGroup) => {
    const isPositive = row.variance > 0;
    const absVariance = Math.abs(row.variance);
    const riderLabel = row.riderName;
    const dateLabel = new Date(row.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short'});

    const confirmMsg = `Buat transaksi ${isPositive ? 'PEMASUKAN' : 'PENGELUARAN'} sebesar Rp ${absVariance.toLocaleString('id-ID')} untuk menyeimbangkan saldo sistem dengan uang fisik Rider ${riderLabel} (${dateLabel})?`;

    if (window.confirm(confirmMsg)) {
        const now = new Date();
        const txDate = new Date(row.date);
        txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

        onAddTransaction({
            id: `corr-cash-${Date.now()}`,
            date: txDate.toISOString(),
            type: isPositive ? 'INCOME' : 'EXPENSE',
            amount: absVariance,
            paymentMethod: 'CASH',
            category: 'Koreksi Saldo',
            description: `Koreksi Kas ${riderLabel} (${dateLabel})`,
            notes: `Penyesuaian selisih rekap harian agar saldo aplikasi sesuai uang fisik.`
        });
        alert('Saldo aplikasi berhasil disesuaikan!');
    }
  };

  const handleEditRecap = (key: string) => {
    const data = historyData.find(h => h.idKey === key);
    if (!data) return;
    const relevantTxs = transactions.filter(t => data.ids.includes(t.id));
    setDate(data.date);
    setRiderName(data.riderName);
    setDailyNote(data.notes || '');
    const mainTx = relevantTxs.find(t => t.type === 'INCOME' && t.actualCash !== undefined);
    if (mainTx) { 
      setCashOnHandInput(mainTx.actualCash?.toString() || ''); 
      setMealCostInput(mainTx.mealCost?.toString() || ''); 
    }
    setQrisAmountInput(data.qris.toString());

    const newExpenseValues: Record<string, {qty: string, price: string}> = {};
    const newCustomExpenses: any[] = [];
    
    relevantTxs.filter((t: Transaction) => t.type === 'EXPENSE').forEach((t: Transaction) => {
      const desc = t.description || '';
      const matchedItem = expenseItems.find((item: ExpenseItem) => 
        desc.includes(item.name || '')
      );
      if (matchedItem) {
        const q = t.qty || 1;
        newExpenseValues[matchedItem.name] = {
            qty: q.toString(),
            price: (t.amount / q).toString()
        };
      } else {
        const q = t.qty || 1;
        newCustomExpenses.push({ 
            id: t.id, 
            name: t.description.replace(` (${data.riderName})`, '').replace('Beli ', ''), 
            qty: q.toString(),
            price: (t.amount / q).toString(),
            category: (t.category as ExpenseCategoryType) || 'LAINNYA',
            note: t.notes || ''
        });
      }
    });
    const newSalesData: any = {};
    const incomeTx = relevantTxs.find(t => t.description.includes('Detail:'));
    if (incomeTx) {
      const detail = incomeTx.description.split('Detail: ')[1];
      if (detail) detail.split(', ').forEach((itemStr: string) => {
        const lastX = itemStr.lastIndexOf(' x');
        if (lastX !== -1) {
          const prod = products.find(p => p.name === itemStr.substring(0, lastX).trim());
          if (prod) newSalesData[prod.id] = parseInt(itemStr.substring(lastX + 2)) || 0;
        }
      });
    }
    setSalesData(newSalesData);
    setExpenseValues(newExpenseValues);
    setCustomExpenses(newCustomExpenses);
    setEditingRecapKey(key);
    setActiveView('FORM');
    setWizardStep(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveRecap = () => {
    if (editingRecapKey) {
      const data = historyData.find((h) => h.idKey === editingRecapKey);
      if (data) {
        data.ids.forEach((id: string) => onDeleteTransaction(id));
      }
    }
    const timestamp = Date.now().toString();
    if (totalOmset > 0) {
      const salesDetail = Object.entries(salesData).filter(([_, qty]) => (qty as number) > 0).map(([id, qty]) => `${products.find(p => p.id === id)?.name} x${qty}`).join(', ');
      const qris = reconciliation.qris;
      const cashSales = totalOmset - qris;
      const statsPayload = { qty: totalCupsSold, actualCash: parseInt(cashOnHandInput) || 0, variance: reconciliation.variance, riderName, mealCost: parseInt(mealCostInput) || 0, notes: dailyNote };

      if (cashSales > 0) {
        onAddTransaction({ id: `inc-cash-${timestamp}`, date: new Date(date).toISOString(), type: 'INCOME', amount: cashSales, paymentMethod: 'CASH', description: `Setoran Tunai ${riderName}. Detail: ${salesDetail}`, ...statsPayload });
        if (qris > 0) onAddTransaction({ id: `inc-qris-${timestamp}`, date: new Date(date).toISOString(), type: 'INCOME', amount: qris, paymentMethod: 'QRIS', description: `Setoran QRIS/Transfer ${riderName}`, riderName });
      } else if (qris > 0) {
        onAddTransaction({ id: `inc-qris-${timestamp}`, date: new Date(date).toISOString(), type: 'INCOME', amount: qris, paymentMethod: 'QRIS', description: `Setoran QRIS Full ${riderName}. Detail: ${salesDetail}`, ...statsPayload });
      }
    }
    
    let expCount = 0;
    Object.entries(expenseValues).forEach(([name, val]: [string, any]) => {
      const q = parseInt(val.qty) || 0;
      const p = parseInt(val.price) || 0;
      const amt = q * p; 
      if (amt > 0) {
          onAddTransaction({ 
              id: `exp-${timestamp}-${expCount++}`, 
              date: new Date(date).toISOString(), 
              type: 'EXPENSE', 
              amount: amt, 
              qty: q,
              paymentMethod: 'CASH', 
              description: `Beli ${name} (${riderName})`, 
              riderName, 
              category: expenseItems.find(i => i.name === name)?.category || 'LAINNYA' 
          });
      }
    });

    customExpenses.forEach(item => {
      const q = parseInt(item.qty) || 0;
      const p = parseInt(item.price) || 0;
      const amt = q * p;
      if (amt > 0) {
          onAddTransaction({ 
              id: `exp-c-${timestamp}-${expCount++}`, 
              date: new Date(date).toISOString(), 
              type: 'EXPENSE', 
              amount: amt, 
              qty: q,
              paymentMethod: 'CASH', 
              description: `Beli ${item.name} (${riderName})`, 
              riderName, 
              category: item.category, 
              notes: item.note 
          });
      }
    });

    resetForm();
    setEditingRecapKey(null);
    setActiveView('HISTORY');
    alert("Berhasil disimpan!");
  };

  const resetForm = () => { setSalesData({}); setExpenseValues({}); setCustomExpenses([]); setRiderName(''); setCashOnHandInput(''); setQrisAmountInput(''); setMealCostInput(''); setDailyNote(''); setWizardStep(0); setDate(new Date().toISOString().slice(0, 10)); };

  const handleCancelEdit = () => {
    setEditingRecapKey(null);
    resetForm();
  };

  const renderStepContent = () => {
    if (wizardStep === 0) {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><User className="text-amber-600" /> Identitas Penjual</h3>
             <div className="space-y-4">
                <div><label className="block text-sm font-bold text-slate-500 mb-2">Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none"/></div>
                <div><label className="block text-sm font-bold text-slate-500 mb-2">Pilih Rider</label><select value={riderName} onChange={(e) => setRiderName(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-lg outline-none cursor-pointer"><option value="" disabled>-- Pilih Rider --</option>{riders.map(r => (<option key={r.id} value={r.name}>{r.name}</option>))}</select></div>
                <div><label className="block text-sm font-bold text-slate-500 mb-2">Uang Makan</label><div className="flex gap-2">{[10000, 15000].map(amt => (<button key={amt} onClick={() => setMealCostInput(amt.toString())} className={`flex-1 py-3 rounded-xl border-2 font-bold ${mealCostInput === amt.toString() ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-400'}`}>Rp {amt.toLocaleString('id-ID')}</button>))}</div></div>
             </div>
          </div>
          <button onClick={handleNextStep} disabled={!riderName} className="w-full py-4 bg-amber-600 disabled:bg-slate-300 text-white font-bold text-lg rounded-xl shadow-lg flex items-center justify-center gap-2">Lanjut <ArrowRight/></button>
        </div>
      );
    }
    if (wizardStep > 0 && wizardStep <= products.length) {
      const prod = products[wizardStep - 1];
      const qty = (salesData[prod.id] as number) || 0;
      return (
        <div className="flex flex-col h-[50vh] justify-center items-center space-y-8 animate-in zoom-in-95">
          <div className="text-center"><span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase">Menu {wizardStep}/{products.length}</span><h2 className="text-3xl font-black text-slate-800">{prod.name}</h2><p className="text-lg text-slate-400">Rp {prod.price.toLocaleString('id-ID')}</p></div>
          <div className="flex items-center gap-6"><button onClick={() => setSalesData({...salesData, [prod.id]: Math.max(0, qty-1)})} className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500"><MinusCircle className="mx-auto" size={28}/></button><input ref={qtyInputRef} type="number" value={qty||''} placeholder="0" onChange={(e) => setSalesData({...salesData, [prod.id]: parseInt(e.target.value)||0})} onKeyDown={(e) => e.key==='Enter' && handleNextStep()} className="w-32 text-center text-5xl font-black text-slate-800 border-b-4 border-amber-500 outline-none focus:outline-none"/><button onClick={() => setSalesData({...salesData, [prod.id]: qty+1})} className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600"><PlusCircle className="mx-auto" size={28}/></button></div>
          <div className="flex gap-3 w-full max-w-sm"><button onClick={handlePrevStep} className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl">Kembali</button><button onClick={handleNextStep} className="flex-[2] py-3 bg-slate-900 text-white font-bold rounded-xl flex justify-center items-center gap-2">Lanjut <ArrowRight size={18}/></button></div>
        </div>
      );
    }
    if (wizardStep === products.length + 1) {
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2 text-amber-600"><ListChecks /> Tinjauan Menu Terinput</h3>
               <div className="space-y-3">
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex justify-between items-center mb-4">
                     <div>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Total Terjual</p>
                        <p className="text-2xl font-black text-amber-800">{totalCupsSold} Cup</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Estimasi Omset</p>
                        <p className="text-2xl font-black text-emerald-600">Rp {totalOmset.toLocaleString('id-ID')}</p>
                     </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto no-scrollbar border rounded-xl">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold sticky top-0">
                            <tr><th className="px-4 py-2 text-left">Nama Produk</th><th className="px-4 py-2 text-center">Qty</th><th className="px-4 py-2 text-right">Subtotal</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {(Object.entries(salesData) as [string, number][]).filter(([_, qty]) => qty > 0).map(([id, qty]) => {
                                const prod = products.find(p => p.id === id);
                                return (
                                    <tr key={id}>
                                        <td className="px-4 py-3 font-medium text-slate-700">{prod?.name}</td>
                                        <td className="px-4 py-3 text-center font-bold text-amber-600">{qty}</td>
                                        <td className="px-4 py-3 text-right font-black text-slate-800">Rp {(qty * (prod?.price || 0)).toLocaleString('id-ID')}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                  </div>
               </div>
            </div>
            <div className="flex gap-3"><button onClick={handlePrevStep} className="flex-1 py-4 bg-white border text-slate-500 font-bold rounded-xl">Edit Menu</button><button onClick={handleNextStep} className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-xl flex justify-center items-center gap-2">Lanjut Belanja <ArrowRight/></button></div>
          </div>
        );
    }
    if (wizardStep === products.length + 2) {
      return (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Archive className="text-rose-500"/> Input Pengeluaran</h3>
              
              <div className="space-y-3 mb-6">
                  {expenseItems.map(item => {
                    const val = expenseValues[item.name] || { qty: '', price: '' };
                    const q = parseInt(val.qty) || 0;
                    const p = parseInt(val.price) || 0;
                    const subtotal = q * p;
                    
                    return (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-100 group transition-all hover:bg-white hover:shadow-sm">
                            <span className="md:col-span-4 text-sm font-black text-slate-600 truncate">{item.name}</span>
                            <div className="md:col-span-8 grid grid-cols-10 gap-2 items-center">
                                <div className="col-span-3">
                                    <input 
                                        type="number" 
                                        placeholder="Qty" 
                                        value={val.qty} 
                                        onChange={(e) => setExpenseValues({...expenseValues, [item.name]: { ...val, qty: e.target.value }})} 
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-center text-sm font-black outline-none focus:ring-2 focus:ring-rose-200"
                                    />
                                </div>
                                <div className="col-span-1 text-center text-slate-300 font-bold">x</div>
                                <div className="col-span-3">
                                    <input 
                                        type="number" 
                                        placeholder="Harga" 
                                        value={val.price} 
                                        onChange={(e) => setExpenseValues({...expenseValues, [item.name]: { ...val, price: e.target.value }})} 
                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-black text-rose-600 outline-none focus:ring-2 focus:ring-rose-200"
                                    />
                                </div>
                                <div className="col-span-3 text-right overflow-hidden">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total</p>
                                    <p className="text-xs font-black text-slate-800 truncate">Rp {subtotal.toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                        </div>
                    );
                  })}
              </div>

              <div className="border-t pt-4 mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-1"><Tag size={12}/> Item Tambahan</p>
                <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <input type="text" placeholder="Barang..." value={customExpenseName} onChange={(e) => setCustomExpenseName(e.target.value)} className="flex-[2] p-3 bg-white border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-200"/>
                  <input type="number" placeholder="Qty" value={customExpenseQty} onChange={(e) => setCustomExpenseQty(e.target.value)} className="w-16 p-3 bg-white border rounded-xl text-sm font-black text-center outline-none focus:ring-2 focus:ring-rose-200"/>
                  <input type="number" placeholder="Harga" value={customExpensePrice} onChange={(e) => setCustomExpensePrice(e.target.value)} className="w-24 p-3 bg-white border rounded-xl text-sm font-black text-rose-600 outline-none focus:ring-2 focus:ring-rose-200"/>
                  <select value={customExpenseCategory} onChange={(e) => setCustomExpenseCategory(e.target.value as ExpenseCategoryType)} className="flex-1 p-3 bg-white border rounded-xl text-[10px] font-black uppercase text-slate-500 outline-none">
                    <option value="BAHAN_BAKU">Baku</option>
                    <option value="OPERASIONAL">Ops</option>
                  </select>
                  <button onClick={() => {if(customExpenseName && customExpensePrice){setCustomExpenses([...customExpenses, {id:Math.random().toString(), name:customExpenseName, qty: customExpenseQty, price: customExpensePrice, category: customExpenseCategory, note: ''}]); setCustomExpenseName(''); setCustomExpensePrice(''); setCustomExpenseQty('1');}}} className="bg-slate-900 text-white p-3 rounded-xl hover:bg-rose-600 transition-all flex items-center justify-center shrink-0"><Plus size={18}/></button>
                </div>
                
                <div className="mt-3 space-y-2">
                  {customExpenses.map((ce) => {
                    const q = parseInt(ce.qty) || 0;
                    const p = parseInt(ce.price) || 0;
                    return (
                        <div key={ce.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-xs shadow-sm">
                        <div className="flex flex-col">
                            <span className="font-black text-slate-700">{ce.name} <span className="text-slate-400">({ce.qty} x {parseInt(ce.price).toLocaleString('id-ID')})</span></span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{ce.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="font-black text-rose-600">Rp {(q * p).toLocaleString('id-ID')}</span>
                            <button onClick={() => setCustomExpenses(customExpenses.filter(x => x.id !== ce.id))} className="text-slate-300 hover:text-rose-500"><X size={14}/></button>
                        </div>
                        </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t font-black text-rose-600"><span>TOTAL SEMUA BELANJA</span><span>Rp {totalExpense.toLocaleString('id-ID')}</span></div>
          </div>
          <div className="flex gap-3"><button onClick={handlePrevStep} className="flex-1 py-4 bg-white border text-slate-500 font-bold rounded-xl">Kembali</button><button onClick={handleNextStep} className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-xl">Verifikasi <ArrowRight/></button></div>
        </div>
      );
    }
    if (wizardStep === products.length + 3) {
      return (
        <div className="space-y-6 animate-in slide-in-from-right-4">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><Calculator className="text-blue-600"/> Hitung Setoran</h3>
              <div className="space-y-4">
                <div><label className="block text-sm font-bold text-slate-500 mb-2">Total QRIS</label><input type="number" value={qrisAmountInput} onChange={(e) => setQrisAmountInput(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-xl outline-none"/></div>
                <div><label className="block text-sm font-bold text-slate-500 mb-2">Cash On Hand (Uang Fisik)</label><input type="number" value={cashOnHandInput} onChange={(e) => setCashOnHandInput(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-xl font-bold text-xl text-emerald-700 outline-none"/></div>
              </div>
           </div>
           <div className="flex gap-3"><button onClick={handlePrevStep} className="flex-1 py-4 bg-white border text-slate-500 font-bold rounded-xl">Kembali</button><button onClick={handleNextStep} className="flex-[2] py-4 bg-slate-900 text-white font-bold rounded-xl">Lihat Ringkasan <ArrowRight/></button></div>
        </div>
      );
    }
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CheckCircle className="text-emerald-500"/> Hasil Akhir & Rincian</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1">{riderName} • {new Date(date).toLocaleDateString('id-ID', {weekday:'long', day:'2-digit', month:'long'})}</p>
                </div>
                <div className={`p-3 rounded-xl text-right ${reconciliation.variance === 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">Selisih Setoran</p>
                    <p className="text-xl font-black">{reconciliation.variance > 0 ? '+' : ''}{reconciliation.variance.toLocaleString('id-ID')}</p>
                </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Receipt size={12}/> Rincian Omset ({totalCupsSold} Cup)</p>
                    <div className="space-y-1">
                        {(Object.entries(salesData) as [string, number][]).filter(([_, qty]) => qty > 0).map(([id, qty]) => {
                            const prod = products.find(p => p.id === id);
                            return (
                                <div key={id} className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-600">{prod?.name} x{qty}</span>
                                    <span className="font-bold text-slate-800">Rp {(qty * (prod?.price || 0)).toLocaleString('id-ID')}</span>
                                </div>
                            )
                        })}
                        <div className="pt-2 border-t mt-2 flex justify-between font-black text-emerald-600 text-sm">
                            <span>TOTAL OMSET</span>
                            <span>Rp {totalOmset.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><ShoppingBag size={12}/> Rincian Belanja</p>
                    <div className="space-y-1">
                        {Object.entries(expenseValues).map(([name, val]: [string, any]) => {
                            const q = parseInt(val.qty) || 0;
                            const p = parseInt(val.price) || 0;
                            const amt = q * p;
                            if (amt <= 0) return null;
                            return (
                                <div key={name} className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-600">{name} ({q}x)</span>
                                    <span className="font-bold text-rose-600">Rp {amt.toLocaleString('id-ID')}</span>
                                </div>
                            )
                        })}
                        {customExpenses.map(ce => {
                             const q = parseInt(ce.qty) || 0;
                             const p = parseInt(ce.price) || 0;
                             const amt = q * p;
                             return (
                                <div key={ce.id} className="flex justify-between text-xs font-medium">
                                    <span className="text-slate-600">{ce.name} ({q}x)</span>
                                    <span className="font-bold text-rose-600">Rp {amt.toLocaleString('id-ID')}</span>
                                </div>
                             );
                        })}
                        <div className="pt-2 border-t mt-2 flex justify-between font-black text-rose-600 text-sm">
                            <span>TOTAL BELANJA</span>
                            <span>Rp {totalExpense.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </div>
           </div>

           <div className="space-y-3 bg-slate-900 p-5 rounded-2xl text-white mb-6 shadow-xl">
              <div className="flex justify-between items-center text-xs opacity-70"><span>Tunai Sistem (Omset - Belanja - QRIS)</span><span>Rp {reconciliation.expectedCash.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between items-center text-sm font-black text-emerald-400"><span>Uang Fisik (Cash On Hand)</span><span>Rp {reconciliation.actualCash.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between items-center text-sm font-black text-blue-400"><span>Setoran QRIS/Transfer</span><span>Rp {reconciliation.qris.toLocaleString('id-ID')}</span></div>
           </div>

           <div className="mt-4">
              <label className="block text-sm font-bold text-slate-500 mb-2 flex items-center gap-2"><StickyNote size={16}/> Catatan Hari Ini</label>
              <textarea value={dailyNote} onChange={(e) => setDailyNote(e.target.value)} placeholder="Tulis catatan, misal: sisa stok, kendala rider, dll..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none h-24 resize-none"/>
           </div>
        </div>
        <div className="flex gap-3"><button onClick={handlePrevStep} className="flex-1 py-4 bg-white border text-slate-500 font-bold rounded-xl">Kembali</button><button onClick={handleSaveRecap} className="flex-[2] py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-all"><Save size={20}/> SIMPAN REKAP REAL</button></div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
        <button onClick={() => setActiveView('FORM')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeView === 'FORM' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{editingRecapKey ? 'Edit Rekap' : 'Input Rekap'}</button>
        <button onClick={() => {if(editingRecapKey) handleCancelEdit(); setActiveView('HISTORY');}} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeView === 'HISTORY' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Riwayat Tabel</button>
      </div>

      {activeView === 'FORM' ? (<>{wizardStep > 0 && <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-4"><div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${(wizardStep / (products.length + 5)) * 100}%` }}/></div>}{renderStepContent()}</>) : (
        <div className="space-y-4">
           <div className="md:hidden space-y-4">
              {sortedHistory.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-300">
                  <p className="text-slate-400">Belum ada riwayat rekap harian.</p>
                </div>
              ) : (
                sortedHistory.map((row) => {
                  const corrected = isRecapCorrected(row.riderName, row.date);
                  return (
                    <div key={row.idKey} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{new Date(row.date).toLocaleDateString('id-ID', {weekday: 'long', day: '2-digit', month: 'long'})}</p>
                          <h4 className="text-lg font-black text-slate-800">{row.riderName}</h4>
                        </div>
                        <div className={`px-3 py-1 rounded-lg font-black text-xs ${row.variance === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {row.variance > 0 ? '+' : ''}{row.variance.toLocaleString('id-ID')}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Omset</p>
                          <p className="font-bold text-emerald-600">Rp {row.omset.toLocaleString('id-ID')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Terjual</p>
                          <p className="font-bold text-slate-700">{row.cups} Cup</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2">
                         <button onClick={() => setSelectedDetailKey(row.idKey)} className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all"><FileText size={16}/> Detail</button>
                         <button onClick={() => handleEditRecap(row.idKey)} className="flex items-center justify-center gap-2 py-3 bg-blue-100 text-blue-600 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all"><Edit3 size={16}/> Edit</button>
                         {row.variance !== 0 && !corrected ? (
                            <button onClick={() => handleApplyCorrection(row)} className="flex items-center justify-center gap-2 py-3 bg-amber-500 text-white rounded-xl text-xs font-black shadow-lg active:scale-95 transition-all animate-pulse"><Wrench size={16}/> Koreksi</button>
                         ) : row.variance !== 0 ? (
                            <div className="flex items-center justify-center gap-1 py-3 text-emerald-600 text-[10px] font-black uppercase"><Check size={14}/> Sesuai</div>
                         ) : (
                            <button onClick={() => window.confirm('Hapus rekap ini?') && row.ids.forEach((id: string) => onDeleteTransaction(id))} className="flex items-center justify-center gap-2 py-3 bg-rose-100 text-rose-600 rounded-xl text-xs font-black shadow-sm active:scale-95 transition-all"><Trash2 size={16}/> Hapus</button>
                         )}
                      </div>
                    </div>
                  );
                })
              )}
           </div>

           <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50 border-b text-slate-500 uppercase text-xs font-bold">
                        <tr>
                          <th className="px-6 py-4 cursor-pointer" onClick={() => setSortConfig({key:'date', direction:sortConfig.direction==='asc'?'desc':'asc'})}>Tanggal</th>
                          <th className="px-6 py-4">Rider</th>
                          <th className="px-6 py-4 text-right">Omset</th>
                          <th className="px-6 py-4 text-center">Selisih</th>
                          <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedHistory.map((row) => {
                          const corrected = isRecapCorrected(row.riderName, row.date);
                          return (
                            <tr key={row.idKey} className="hover:bg-slate-50 transition-colors group">
                               <td className="px-6 py-4 font-medium text-slate-600">{new Date(row.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</td>
                               <td className="px-6 py-4 font-bold text-slate-800">{row.riderName}</td>
                               <td className="px-6 py-4 text-right font-bold text-emerald-600">Rp {row.omset.toLocaleString('id-ID')}</td>
                               <td className="px-6 py-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black ${row.variance === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                      {row.variance > 0 ? '+' : ''}{row.variance.toLocaleString('id-ID')}
                                    </span>
                                    {row.variance !== 0 && corrected && <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-0.5"><Check size={8}/> Terkoreksi</span>}
                                  </div>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => setSelectedDetailKey(row.idKey)} className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-800 hover:text-white transition-all shadow-sm" title="Detail"><FileText size={16}/></button>
                                      <button onClick={() => handleEditRecap(row.idKey)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Edit"><Edit3 size={16} /></button>
                                      {row.variance !== 0 && !corrected && (
                                        <button onClick={() => handleApplyCorrection(row)} className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all shadow-md animate-pulse" title="Koreksi Saldo"><Wrench size={16}/></button>
                                      )}
                                      <button onClick={() => window.confirm('Hapus rekap ini?') && row.ids.forEach((id: string) => onDeleteTransaction(id))} className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Hapus"><Trash2 size={16} /></button>
                                  </div>
                               </td>
                            </tr>
                          );
                        })}
                      </tbody>
                   </table>
               </div>
           </div>
        </div>
      )}

      {selectedDetailKey && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
               <div className="p-6 bg-slate-50 border-b flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-800 text-xl tracking-tight">Rincian Rekap Harian</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">{new Date(historyData.find(h => h.idKey === selectedDetailKey)?.date || '').toLocaleDateString('id-ID', {weekday: 'long', day: '2-digit', month: 'long'})}</span>
                      <span className="text-sm font-black text-slate-500">• {historyData.find(h => h.idKey === selectedDetailKey)?.riderName}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDetailKey(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
               </div>

               <div className="p-6 space-y-8 overflow-y-auto no-scrollbar">
                  {(() => {
                    const data = historyData.find(h => h.idKey === selectedDetailKey);
                    if (!data) return null;
                    const corrected = isRecapCorrected(data.riderName, data.date);

                    return (
                      <div className="space-y-8">
                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                               <div className="flex items-center gap-2 text-emerald-600 mb-1"><Receipt size={14}/><span className="text-[9px] font-black uppercase">Omset Kotor</span></div>
                               <p className="text-lg font-black text-emerald-900">Rp {data.omset.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                               <div className="flex items-center gap-2 text-blue-600 mb-1"><Smartphone size={14}/><span className="text-[9px] font-black uppercase tracking-tight">QRIS/Transfer</span></div>
                               <p className="text-lg font-black text-blue-900">Rp {data.qris.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                               <div className="flex items-center gap-2 text-rose-600 mb-1"><ShoppingBag size={14}/><span className="text-[9px] font-black uppercase">Belanja</span></div>
                               <p className="text-lg font-black text-rose-900">Rp {data.shopping.toLocaleString('id-ID')}</p>
                            </div>
                            <div className={`p-4 rounded-2xl border ${data.variance === 0 ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-100'}`}>
                               <div className="flex items-center gap-2 text-slate-400 mb-1"><AlertTriangle size={14}/><span className="text-[9px] font-black uppercase tracking-tight">Selisih Uang</span></div>
                               <p className={`text-lg font-black ${data.variance === 0 ? 'text-slate-700' : 'text-rose-700'}`}>
                                  {data.variance > 0 ? '+' : ''}{data.variance.toLocaleString('id-ID')}
                                </p>
                            </div>
                         </div>

                         <div className="p-5 bg-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
                            <div className="flex justify-between items-center mb-4 relative z-10">
                               <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2"><Calculator size={14}/> Perhitungan Rekonsiliasi</span>
                               {corrected && <span className="text-[10px] font-black bg-emerald-500 px-3 py-1 rounded-full text-white flex items-center gap-1 shadow-lg animate-in zoom-in-50"><Check size={12}/> Terkoreksi</span>}
                            </div>
                            <div className="space-y-3 relative z-10">
                               <div className="flex justify-between text-sm">
                                  <span className="opacity-70">Uang Seharusnya (Tunai Sistem)</span>
                                  <span className="font-bold text-amber-200">Rp {(data.omset - data.qris - data.shopping).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="opacity-70">Uang Tunai Nyata (Fisik)</span>
                                  <span className="font-bold text-emerald-400">Rp {data.cashOnHand.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-white/10 items-end">
                                   <span className="text-xs font-black text-amber-400 uppercase">TOTAL HASIL SELISIH</span>
                                   <div className="text-right">
                                      <p className={`text-2xl font-black ${data.variance === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                         {data.variance > 0 ? '+' : ''}{data.variance.toLocaleString('id-ID')}
                                      </p>
                                   </div>
                                </div>
                            </div>
                            {data.variance !== 0 && !corrected && (
                                <button 
                                    onClick={() => handleApplyCorrection(data)}
                                    className="w-full mt-6 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                                >
                                    <Wrench size={18}/> KOREKSI SALDO APLIKASI SEKARANG
                                </button>
                            )}
                         </div>

                         <div>
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                               <Coffee size={14} className="text-amber-500"/> Rincian Penjualan ({data.cups} Cup)
                            </h4>
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                               <table className="w-full text-sm">
                                  <tbody className="divide-y divide-slate-50">
                                     {data.description.replace('Detail: ', '').split(', ').map((item: string, idx: number) => {
                                        const lastX = item.lastIndexOf(' x');
                                        if (lastX === -1) return null;
                                        const name = item.substring(0, lastX);
                                        const qty = item.substring(lastX + 2);
                                        return (
                                          <tr key={idx} className="hover:bg-slate-50">
                                             <td className="px-4 py-3 font-bold text-slate-700">{name}</td>
                                             <td className="px-4 py-3 text-right font-black text-amber-600">{qty} <span className="text-[10px] font-normal text-slate-400">Cup</span></td>
                                          </tr>
                                        )
                                     })}
                                  </tbody>
                               </table>
                            </div>
                         </div>
                      </div>
                    )
                  })()}
               </div>

               <div className="p-6 bg-slate-50 border-t flex gap-3">
                  <button onClick={() => setSelectedDetailKey(null)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-black rounded-2xl shadow-sm active:scale-95 transition-all">TUTUP</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default TransactionLog;
