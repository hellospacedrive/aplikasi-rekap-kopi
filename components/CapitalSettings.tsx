
import React, { useState, useEffect, useRef } from 'react';
// Added StockOpname to the import list from '../types'
import { Capital, Transaction, Product, Rider, BankReconciliation, ExpenseItem, BookkeepingItem, StockOpname } from '../types';
import { Settings, Save, AlertCircle, Download, Upload, Database, FileSpreadsheet, Package } from 'lucide-react';
import * as XLSX from 'xlsx';

// Added stockOpnames to the allData interface to fix the type error reported in App.tsx
interface CapitalSettingsProps {
  capital: Capital;
  onUpdateCapital: (capital: Capital) => void;
  allData: {
    products: Product[];
    expenseItems: ExpenseItem[];
    bookkeepingItems: BookkeepingItem[];
    riders: Rider[];
    transactions: Transaction[];
    capital: Capital;
    bankRecons: BankReconciliation[];
    stockOpnames: StockOpname[];
  }; 
  onRestore: (data: any) => void; 
}

const CapitalSettings: React.FC<CapitalSettingsProps> = ({ capital, onUpdateCapital, allData, onRestore }) => {
  const [cash, setCash] = useState(capital.initialCash.toString());
  const [bank, setBank] = useState(capital.initialBank.toString());
  const [cupStock, setCupStock] = useState(capital.initialCupStock?.toString() || '0');
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync if props change externally
  useEffect(() => {
    setCash(capital.initialCash.toString());
    setBank(capital.initialBank.toString());
    setCupStock(capital.initialCupStock?.toString() || '0');
  }, [capital]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCapital({
      ...capital,
      initialCash: parseInt(cash) || 0,
      initialBank: parseInt(bank) || 0,
      initialCupStock: parseInt(cupStock) || 0
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(allData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `kopikeliling-backup-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Sheet Transaksi (Gabungan Input Harian & Pembukuan)
    // Flatten data for nice columns
    const txData = allData.transactions.map(t => ({
        ID: t.id,
        Tanggal: new Date(t.date).toLocaleDateString('id-ID'),
        Jam: new Date(t.date).toLocaleTimeString('id-ID'),
        Tipe: t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
        Kategori: t.category || (t.id.startsWith('book-') ? 'Pembukuan' : 'Operasional'),
        Deskripsi: t.description,
        Nominal: t.amount,
        MetodeBayar: t.paymentMethod,
        Rider: t.riderName || '-',
        Qty_Jual: t.qty || 0,
        Selisih_Setoran: t.variance || 0
    }));
    const wsTx = XLSX.utils.json_to_sheet(txData);
    XLSX.utils.book_append_sheet(wb, wsTx, "Transaksi Gabungan");

    // 2. Sheet Pembukuan Belanja (Filter only 'book-' or Expenses that are strictly bookkeeping categories)
    const bookData = allData.transactions
        .filter(t => t.id.startsWith('book-') || (t.type === 'EXPENSE' && t.category && t.category !== 'Gaji'))
        .map(t => ({
            Tanggal: new Date(t.date).toLocaleDateString('id-ID'),
            Item: t.description,
            Kategori: t.category,
            Nominal: t.amount,
            Metode: t.paymentMethod
        }));
    const wsBook = XLSX.utils.json_to_sheet(bookData);
    XLSX.utils.book_append_sheet(wb, wsBook, "Pembukuan Belanja");

    // 3. Sheet Menu Produk
    const menuData = allData.products.map(p => ({
        Nama_Menu: p.name,
        Harga_Jual: p.price,
        Modal_HPP: p.hpp || 0,
        Profit_Per_Cup: p.price - (p.hpp || 0),
        Kategori: p.category
    }));
    const wsMenu = XLSX.utils.json_to_sheet(menuData);
    XLSX.utils.book_append_sheet(wb, wsMenu, "Menu Produk");

    // 4. Sheet Data Item Pengeluaran
    const expenseData = allData.expenseItems.map(e => ({
        Nama_Item: e.name,
        Kategori: e.category
    }));
    const wsExpense = XLSX.utils.json_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(wb, wsExpense, "Data Item Pengeluaran");

    // 5. Sheet Data Item Belanja (Bookkeeping Items) - NEW
    const bookkeepingItemsData = allData.bookkeepingItems.map(b => ({
        Nama_Item: b.name,
        Kategori: b.category
    }));
    const wsBookkeepingItems = XLSX.utils.json_to_sheet(bookkeepingItemsData);
    XLSX.utils.book_append_sheet(wb, wsBookkeepingItems, "Data Item Belanja");

    // 6. Sheet Data Rider
    const riderData = allData.riders.map(r => ({
        Nama: r.name,
        Status: r.status,
        No_HP: r.phone || '-'
    }));
    const wsRider = XLSX.utils.json_to_sheet(riderData);
    XLSX.utils.book_append_sheet(wb, wsRider, "Data Rider");

    // 7. Sheet Rekonsiliasi Bank
    const reconData = allData.bankRecons.map(r => ({
        Tanggal: r.date,
        Qris_Sistem: r.systemQrisAmount,
        Qris_Bank: r.manualQrisAmount,
        Selisih: r.variance,
        Status: r.variance === 0 ? 'MATCH' : 'SELISIH'
    }));
    const wsRecon = XLSX.utils.json_to_sheet(reconData);
    XLSX.utils.book_append_sheet(wb, wsRecon, "Rekonsiliasi Bank");

    // 8. Sheet Modal
    const modalData = [{
        Tipe: 'Modal Awal Tunai', Nominal: allData.capital.initialCash
    }, {
        Tipe: 'Modal Awal Bank', Nominal: allData.capital.initialBank
    }, {
        Tipe: 'Bulan Periode', Nilai: allData.capital.month
    }];
    const wsModal = XLSX.utils.json_to_sheet(modalData);
    XLSX.utils.book_append_sheet(wb, wsModal, "Modal & Info");

    // Generate File
    const fileName = `Laporan_Br4da_Coffee_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onRestore(json);
      } catch (error) {
        alert("Gagal membaca file backup. Pastikan format JSON benar.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Capital Section */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Pengaturan Modal & Stok</h2>
              <p className="text-xs text-slate-400">Atur modal dan stok awal bulan ini.</p>
            </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3 mb-6">
          <AlertCircle className="text-amber-600 min-w-[20px] mt-0.5" size={20} />
          <p className="text-sm text-amber-800 leading-relaxed">
            Angka ini akan menjadi patokan dasar. Stok Cup akan berkurang otomatis saat penjualan dan bertambah saat Anda input belanja dengan nama "Cup".
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Modal Awal (Cash/Tunai)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                <input 
                  type="number" 
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Modal Awal (Bank/ATM)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rp</span>
                <input 
                  type="number" 
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-600 mb-2">Stok Awal Cup (Pcs)</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="number" 
                  value={cupStock}
                  onChange={(e) => setCupStock(e.target.value)}
                  placeholder="0"
                  className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold text-slate-800"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                 Total Cup di gudang/toko pada awal bulan.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              className="bg-amber-700 text-white font-bold py-3 px-6 rounded-xl hover:bg-amber-800 active:scale-[0.98] transition-all flex justify-center items-center gap-2 shadow-md"
            >
              <Save size={18} />
              {saved ? 'Tersimpan!' : 'Simpan Pengaturan'}
            </button>
          </div>
        </form>
      </section>

      {/* Data Management Section */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Database size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Manajemen Data</h2>
              <p className="text-xs text-slate-400">Export laporan Excel atau Backup/Restore database.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* EXCEL EXPORT CARD */}
          <div className="p-4 border border-emerald-200 rounded-xl bg-emerald-50">
            <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                <FileSpreadsheet size={18} /> Laporan Excel
            </h3>
            <p className="text-xs text-emerald-600 mb-4">
              Download laporan lengkap (Transaksi, Pembukuan, Gaji, dll) dalam format Excel (.xlsx) dengan Tab terpisah.
            </p>
            <button 
              onClick={handleExportExcel}
              className="w-full py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Download size={16} /> Download Excel
            </button>
          </div>

          <div className="space-y-4">
            {/* JSON BACKUP */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Download size={16} /> Backup Database (JSON)</h3>
                <p className="text-xs text-slate-500 mb-4">
                Simpan seluruh data aplikasi ke file JSON untuk cadangan.
                </p>
                <button 
                onClick={handleExportJSON}
                className="w-full py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                >
                Download JSON
                </button>
            </div>

            {/* RESTORE */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Upload size={16} /> Restore Database</h3>
                <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleImport}
                />
                <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                >
                Upload File Backup
                </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default CapitalSettings;
