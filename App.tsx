
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Coffee, 
  ArrowRightLeft,
  Settings,
  BookOpen,
  Landmark,
  Menu,
  X,
  Users,
  Banknote,
  CircleDollarSign,
  Wallet,
  PieChart,
  Boxes
} from 'lucide-react';
import { Product, Transaction, Capital, BankReconciliation, Rider, ExpenseItem, BookkeepingItem, StockOpname } from './types';
import Dashboard from './components/Dashboard';
import MenuManager from './components/MenuManager';
import TransactionLog from './components/TransactionLog';
import CapitalSettings from './components/CapitalSettings';
import Bookkeeping from './components/Bookkeeping';
import Banking from './components/Banking';
import SalaryCalculator from './components/SalaryCalculator';
import Finance from './components/Finance';
import Analytics from './components/Analytics';
import StockOpnameComp from './components/StockOpname';

// Mock Initial Data
const DEFAULT_CAPITAL: Capital = {
  initialCash: 500000,
  initialBank: 1000000,
  initialCupStock: 0, 
  month: new Date().toISOString().slice(0, 7),
  ownerNote: ''
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'Americano', price: 8000, category: 'Kopi', hpp: 4000 },
  { id: '2', name: 'Kopi Susu', price: 10000, category: 'Kopi', hpp: 5000 },
  { id: '3', name: 'Kopsu Aren', price: 12000, category: 'Kopi', hpp: 6000 },
  { id: '4', name: 'Kopi Klepon', price: 15000, category: 'Signature', hpp: 7000 },
  { id: '5', name: 'Kopi Butterscotch', price: 15000, category: 'Signature', hpp: 7000 },
  { id: '6', name: 'Kopi Caramel', price: 15000, category: 'Signature', hpp: 7000 },
  { id: '7', name: 'Kopsu Pandan', price: 12000, category: 'Signature', hpp: 6000 },
  { id: '8', name: 'Coklat', price: 10000, category: 'Non-Kopi', hpp: 5000 },
  { id: '9', name: 'Matcha', price: 12000, category: 'Non-Kopi', hpp: 6000 },
];

const DEFAULT_EXPENSE_ITEMS: ExpenseItem[] = [
  { id: 'e1', name: 'Es Batu', category: 'BAHAN_BAKU' },
  { id: 'e2', name: 'SKM', category: 'BAHAN_BAKU' },
  { id: 'e3', name: 'UHT', category: 'BAHAN_BAKU' },
  { id: 'e4', name: 'Air', category: 'BAHAN_BAKU' },
  { id: 'e5', name: 'Plastik', category: 'BAHAN_BAKU' },
  { id: 'e6', name: 'Sedotan', category: 'BAHAN_BAKU' },
  { id: 'e7', name: 'Cup', category: 'BAHAN_BAKU' },
  { id: 'e8', name: 'Kresek', category: 'BAHAN_BAKU' },
  { id: 'e9', name: 'Tisu', category: 'BAHAN_BAKU' },
  { id: 'e10', name: 'Bensin', category: 'OPERASIONAL' },
  { id: 'e11', name: 'Lainnya', category: 'LAINNYA' },
];

const DEFAULT_BOOKKEEPING_ITEMS: BookkeepingItem[] = [
  { id: 'b1', category: 'Produksi', name: 'Bubuk Kopi' },
  { id: 'b2', category: 'Produksi', name: 'SKM' },
  { id: 'b3', category: 'Produksi', name: 'Krimer' },
  { id: 'b4', category: 'Produksi', name: 'Coklat' },
  { id: 'b5', category: 'Produksi', name: 'Matcha' },
  { id: 'b6', category: 'Sirup', name: 'Butterscotch' },
  { id: 'b7', category: 'Sirup', name: 'Hazel' },
  { id: 'b8', category: 'Sirup', name: 'Caramel' },
  { id: 'b9', category: 'Sirup', name: 'Pandan' },
  { id: 'b10', category: 'Sirup', name: 'Aren' },
  { id: 'b11', category: 'Aset', name: 'Cup' },
  { id: 'b12', category: 'Aset', name: 'Sedotan' },
  { id: 'b13', category: 'Aset', name: 'Plastik' },
];

const DEFAULT_RIDERS: Rider[] = [
  { id: 'r1', name: 'Rider 1', status: 'ACTIVE' },
  { id: 'r2', name: 'Rider 2', status: 'ACTIVE' },
];

enum Tab {
  DASHBOARD = 'dashboard',
  TRANSACTIONS = 'transactions',
  BOOKKEEPING = 'bookkeeping',
  BANKING = 'banking',
  SALARY = 'salary',
  FINANCE = 'finance',
  ANALYTICS = 'analytics', 
  STOCK_OPNAME = 'stock_opname',
  MANAGEMENT = 'management', 
  SETTINGS = 'settings'
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile menu state
  const [recapToEdit, setRecapToEdit] = useState<string | null>(null); // NEW: Shared edit trigger
  
  // State Management with Safety Checks
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('kopikeliling_products');
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    } catch (e) {
      console.error("Error loading products", e);
      return DEFAULT_PRODUCTS;
    }
  });

  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>(() => {
    try {
      const saved = localStorage.getItem('kopikeliling_expense_items');
      return saved ? JSON.parse(saved) : DEFAULT_EXPENSE_ITEMS;
    } catch (e) {
      console.error("Error loading expense items", e);
      return DEFAULT_EXPENSE_ITEMS;
    }
  });

  const [bookkeepingItems, setBookkeepingItems] = useState<BookkeepingItem[]>(() => {
    try {
      const saved = localStorage.getItem('kopikeliling_bookkeeping_items');
      return saved ? JSON.parse(saved) : DEFAULT_BOOKKEEPING_ITEMS;
    } catch (e) {
      console.error("Error loading bookkeeping items", e);
      return DEFAULT_BOOKKEEPING_ITEMS;
    }
  });

  const [riders, setRiders] = useState<Rider[]>(() => {
    try {
      const saved = localStorage.getItem('kopikeliling_riders');
      return saved ? JSON.parse(saved) : DEFAULT_RIDERS;
    } catch (e) {
      console.error("Error loading riders", e);
      return DEFAULT_RIDERS;
    }
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('kopikeliling_transactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((t: any) => t && t.id && t.date) : [];
      }
      return [];
    } catch (e) {
      console.error("Error loading transactions", e);
      return [];
    }
  });

  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>(() => {
    try {
      const saved = localStorage.getItem('kopikeliling_stock_opnames');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading stock opnames", e);
      return [];
    }
  });

  const [capital, setCapital] = useState<Capital>(() => {
    try {
      const saved = localStorage.getItem('kopikeliling_capital');
      return saved ? JSON.parse(saved) : DEFAULT_CAPITAL;
    } catch (e) {
      console.error("Error loading capital", e);
      return DEFAULT_CAPITAL;
    }
  });

  const [bankRecons, setBankRecons] = useState<BankReconciliation[]>(() => {
    try {
      const saved = localStorage.getItem('kopikeliling_bank_recons');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading bank recons", e);
      return [];
    }
  });

  // Persistence
  useEffect(() => {
    localStorage.setItem('kopikeliling_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('kopikeliling_expense_items', JSON.stringify(expenseItems));
  }, [expenseItems]);

  useEffect(() => {
    localStorage.setItem('kopikeliling_bookkeeping_items', JSON.stringify(bookkeepingItems));
  }, [bookkeepingItems]);

  useEffect(() => {
    localStorage.setItem('kopikeliling_riders', JSON.stringify(riders));
  }, [riders]);

  useEffect(() => {
    localStorage.setItem('kopikeliling_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('kopikeliling_stock_opnames', JSON.stringify(stockOpnames));
  }, [stockOpnames]);

  useEffect(() => {
    localStorage.setItem('kopikeliling_capital', JSON.stringify(capital));
  }, [capital]);

  useEffect(() => {
    localStorage.setItem('kopikeliling_bank_recons', JSON.stringify(bankRecons));
  }, [bankRecons]);

  // Derived Statistics with Safety Checks
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let cashChange = 0;
    let bankChange = 0;
    let totalCups = 0; 

    const currentMonth = new Date().toISOString().slice(0, 7);

    transactions.forEach(t => {
      if (!t || !t.date) return;

      if (t.type === 'INCOME') {
        income += (t.amount || 0);
        if (t.paymentMethod === 'CASH') cashChange += (t.amount || 0);
        else bankChange += (t.amount || 0);
      } else {
        expense += (t.amount || 0);
        if (t.paymentMethod === 'CASH') cashChange -= (t.amount || 0);
        else bankChange -= (t.amount || 0);
      }

      if (t.type === 'INCOME' && t.date.startsWith(currentMonth)) {
         let txQty = t.qty || 0;
         if (txQty === 0 && t.description && t.description.includes('Detail:')) {
             try {
                 const detailPart = t.description.split('Detail: ')[1];
                 const items = detailPart.split(', ');
                 items.forEach(itemStr => {
                     const lastXIndex = itemStr.lastIndexOf(' x');
                     if (lastXIndex !== -1) {
                         const qStr = itemStr.substring(lastXIndex + 2);
                         const q = parseInt(qStr);
                         if (!isNaN(q)) txQty += q;
                     }
                 });
             } catch (e) {}
         }
         totalCups += txQty;
      }
    });

    const monthlyTransactions = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
    const monthlyIncome = monthlyTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + (t.amount || 0), 0);
    const monthlyExpense = monthlyTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + (t.amount || 0), 0);

    return {
      totalIncome: income,
      totalExpense: expense,
      netProfit: monthlyIncome - monthlyExpense,
      currentCash: capital.initialCash + cashChange,
      currentBank: capital.initialBank + bankChange,
      totalCupsMonth: totalCups
    };
  }, [transactions, capital]);

  // Handlers
  const handleAddProduct = (product: Product) => setProducts(prev => [...prev, product]);
  const handleUpdateProduct = (updatedProduct: Product) => setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  const handleDeleteProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));
  
  const handleReorderProduct = (startIndex: number, endIndex: number) => {
    setProducts(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const handleAddExpenseItem = (item: ExpenseItem) => setExpenseItems(prev => [...prev, item]);
  const handleUpdateExpenseItem = (updatedItem: ExpenseItem) => setExpenseItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  const handleDeleteExpenseItem = (id: string) => setExpenseItems(prev => prev.filter(e => e.id !== id));

  const handleAddBookkeepingItem = (item: BookkeepingItem) => setBookkeepingItems(prev => [...prev, item]);
  const handleUpdateBookkeepingItem = (updatedItem: BookkeepingItem) => setBookkeepingItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  // Fix: Corrected filter predicate to use a function (item => item.id !== id) instead of a boolean.
  const handleDeleteBookkeepingItem = (id: string) => setBookkeepingItems(prev => prev.filter(item => item.id !== id));

  const handleAddRider = (rider: Rider) => {
    setRiders(prev => {
      const idx = prev.findIndex(r => r.id === rider.id);
      if (idx >= 0) {
        const newRiders = [...prev];
        newRiders[idx] = rider;
        return newRiders;
      }
      return [...prev, rider];
    });
  };
  const handleDeleteRider = (id: string) => setRiders(prev => prev.filter(r => r.id !== id));

  const handleAddTransaction = (transaction: Transaction) => setTransactions(prev => [transaction, ...prev]);
  const handleUpdateTransaction = (updatedTransaction: Transaction) => setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
  const handleDeleteTransaction = (id: string) => setTransactions(prev => prev.filter(t => t.id !== id));

  const handleSaveStockOpname = (opname: StockOpname) => {
    setStockOpnames(prev => {
      const filtered = prev.filter(o => o.month !== opname.month);
      return [opname, ...filtered];
    });
  };

  const handleUpdateCapital = (newCapital: Capital) => setCapital(newCapital);
  
  const handleAddBankRecon = (recon: BankReconciliation) => {
    setBankRecons(prev => {
      const filtered = prev.filter(r => r.date !== recon.date);
      return [recon, ...filtered];
    });
  };

  const handleRestoreData = (data: any) => {
    if (data.products) setProducts(data.products);
    if (data.expenseItems) setExpenseItems(data.expenseItems);
    if (data.bookkeepingItems) setBookkeepingItems(data.bookkeepingItems);
    if (data.riders) setRiders(data.riders);
    if (data.transactions) setTransactions(data.transactions);
    if (data.capital) setCapital(data.capital);
    if (data.bankRecons) setBankRecons(data.bankRecons);
    if (data.stockOpnames) setStockOpnames(data.stockOpnames);
    alert('Data berhasil dipulihkan!');
  };

  // Cross-menu Navigation Handler
  const handleJumpToEditRecap = (key: string) => {
    setRecapToEdit(key);
    setActiveTab(Tab.TRANSACTIONS);
  };

  const renderContent = () => {
    try {
      switch (activeTab) {
        case Tab.DASHBOARD:
          return <Dashboard summary={summary} capital={capital} recentTransactions={transactions.slice(0, 5)} transactions={transactions} onUpdateCapital={handleUpdateCapital} />;
        case Tab.TRANSACTIONS:
          return <TransactionLog transactions={transactions} products={products} expenseItems={expenseItems} riders={riders} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} initialEditKey={recapToEdit} onClearEdit={() => setRecapToEdit(null)} />;
        case Tab.BOOKKEEPING:
          return <Bookkeeping transactions={transactions} riders={riders} bookkeepingItems={bookkeepingItems} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />;
        case Tab.BANKING:
          return <Banking transactions={transactions} reconciliations={bankRecons} onSaveReconciliation={handleAddBankRecon} onAddTransaction={handleAddTransaction} capital={capital} onEditRecap={handleJumpToEditRecap} />;
        case Tab.SALARY:
          return <SalaryCalculator transactions={transactions} riders={riders} onAddTransaction={handleAddTransaction} />;
        case Tab.FINANCE:
          return <Finance transactions={transactions} riders={riders} />;
        case Tab.ANALYTICS:
          return <Analytics transactions={transactions} products={products} reconciliations={bankRecons} onUpdateTransaction={handleUpdateTransaction} onAddTransaction={handleAddTransaction} />;
        case Tab.STOCK_OPNAME:
          return <StockOpnameComp transactions={transactions} bookkeepingItems={bookkeepingItems} stockOpnames={stockOpnames} onSave={handleSaveStockOpname} />;
        case Tab.MANAGEMENT:
          return <MenuManager products={products} expenseItems={expenseItems} bookkeepingItems={bookkeepingItems} riders={riders} onAddProduct={handleAddProduct} onUpdateProduct={handleUpdateProduct} onDeleteProduct={handleDeleteProduct} onReorderProduct={handleReorderProduct} onAddExpenseItem={handleAddExpenseItem} onUpdateExpenseItem={handleUpdateExpenseItem} onDeleteExpenseItem={handleDeleteExpenseItem} onAddBookkeepingItem={handleAddBookkeepingItem} onUpdateBookkeepingItem={handleUpdateBookkeepingItem} onDeleteBookkeepingItem={handleDeleteBookkeepingItem} onAddRider={handleAddRider} onDeleteRider={handleDeleteRider} />;
        case Tab.SETTINGS:
          return <CapitalSettings capital={capital} onUpdateCapital={handleUpdateCapital} allData={{ products, expenseItems, bookkeepingItems, riders, transactions, capital, bankRecons, stockOpnames }} onRestore={handleRestoreData} />;
        default:
          return null;
      }
    } catch (error) {
      console.error("Render Error:", error);
      return <div className="p-8 text-center text-rose-500">Terjadi kesalahan tampilan. Silakan refresh atau reset data di pengaturan jika memungkinkan.</div>;
    }
  };

  const NavItem = ({ tab, icon: Icon, label }: { tab: Tab, icon: any, label: string }) => (
    <button 
      onClick={() => { setActiveTab(tab); setIsSidebarOpen(false); }}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left ${
        activeTab === tab 
          ? 'bg-amber-100 text-amber-800 font-bold shadow-sm' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-medium'
      }`}
    >
      <Icon size={20} className={activeTab === tab ? 'text-amber-600' : 'text-slate-400'} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold flex items-center gap-2 text-slate-800">
              <Coffee className="w-7 h-7 text-amber-600" /> 
              <span>Br4da Coffee</span>
            </h1>
            <p className="text-xs text-amber-600 font-medium mt-1 ml-9">Management System</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          <NavItem tab={Tab.DASHBOARD} icon={LayoutDashboard} label="Ringkasan" />
          <NavItem tab={Tab.TRANSACTIONS} icon={ArrowRightLeft} label="Input Harian" />
          <NavItem tab={Tab.BOOKKEEPING} icon={BookOpen} label="Pembukuan" />
          <NavItem tab={Tab.BANKING} icon={Landmark} label="Perbankan" />
          <NavItem tab={Tab.SALARY} icon={Banknote} label="Gaji Rider" />
          <NavItem tab={Tab.STOCK_OPNAME} icon={Boxes} label="Stok Opname" />
          <NavItem tab={Tab.FINANCE} icon={CircleDollarSign} label="Keuangan" />
          <NavItem tab={Tab.ANALYTICS} icon={PieChart} label="Analisa" />
          <NavItem tab={Tab.MANAGEMENT} icon={Users} label="Manajemen" />
          <NavItem tab={Tab.SETTINGS} icon={Settings} label="Pengaturan" />
        </nav>

        <div className="m-4 space-y-3">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
             <p className="text-[10px] text-emerald-600 mb-2 uppercase tracking-wider font-black flex items-center gap-1">
               <Wallet size={12} /> Saldo Real
             </p>
             <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                   <span className="text-[9px] font-bold text-slate-500 uppercase">Cash</span>
                   <span className="text-sm font-black text-emerald-800">Rp {summary.currentCash.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[9px] font-bold text-slate-500 uppercase">Bank</span>
                   <span className="text-sm font-black text-blue-800">Rp {summary.currentBank.toLocaleString('id-ID')}</span>
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Mobile Header */}
        <header className="md:hidden bg-amber-700 text-white p-4 sticky top-0 z-30 shadow-md flex justify-between items-center">
          <button onClick={() => setIsSidebarOpen(true)}>
             <Menu size={24} />
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            Br4da Coffee
          </h1>
          <div className="w-6"></div> 
        </header>

        {/* Desktop Header Bar */}
        <header className="hidden md:flex bg-white border-b border-slate-200 p-4 px-8 justify-between items-center z-20">
          <h2 className="text-lg font-bold text-slate-800 capitalize">
            {activeTab === Tab.DASHBOARD ? 'Ringkasan Usaha' : 
             activeTab === Tab.TRANSACTIONS ? 'Input Rekap Harian' :
             activeTab === Tab.BOOKKEEPING ? 'Pembukuan Pengeluaran' :
             activeTab === Tab.BANKING ? 'Perbankan & Kas' :
             activeTab === Tab.SALARY ? 'Kalkulator Gaji' :
             activeTab === Tab.FINANCE ? 'Laporan Keuangan' :
             activeTab === Tab.ANALYTICS ? 'Analisa Bisnis' :
             activeTab === Tab.STOCK_OPNAME ? 'Audit Stok Opname' :
             activeTab === Tab.MANAGEMENT ? 'Manajemen Menu, Pengeluaran & Rider' : 'Pengaturan'}
          </h2>
          <div className="flex gap-4 items-center">
             <div className="text-right border-r border-slate-200 pr-4 mr-1">
               <span className="text-xs text-slate-400 block">Total Cup (Bulan Ini)</span>
               <span className="font-bold text-slate-800 flex items-center justify-end gap-1">
                  <Coffee size={14} className="text-amber-500" /> {summary.totalCupsMonth} Cup
               </span>
            </div>
            <div className="text-right">
               <span className="text-xs text-slate-400 block">Total Profit Bulan Ini</span>
               <span className={`font-bold ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                 Rp {summary.netProfit.toLocaleString('id-ID')}
               </span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
          <div className="max-w-6xl mx-auto pb-20 md:pb-0">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
