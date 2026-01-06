
import React, { useState, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Product, Transaction } from '../types';
import { Camera, Upload, Sparkles, X, Check, Loader2, AlertCircle } from 'lucide-react';

interface SmartScanProps {
  products: Product[];
  onScanComplete: (transactions: Transaction[]) => void;
  onClose: () => void;
}

const SmartScan: React.FC<SmartScanProps> = ({ products, onScanComplete, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'UPLOAD' | 'REVIEW'>('UPLOAD');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data url prefix (e.g. "data:image/jpeg;base64,")
        const base64Data = base64String.split(',')[1];
        setImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!imageBase64) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      // Use named parameter for apiKey and directly access process.env.API_KEY
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Construct a context-aware prompt
      const menuContext = products.map(p => `${p.name} (Rp ${p.price})`).join(', ');
      
      const prompt = `
        Analisa gambar laporan harian/struk ini.
        Konteks Menu & Harga saya: [${menuContext}]

        Tugas:
        1. Identifikasi "Menu Terjual" atau item penjualan sebagai INCOME. Jika harga tidak ada di gambar, gunakan harga dari Konteks Menu.
        2. Identifikasi "Pengeluaran" atau belanja stok sebagai EXPENSE.
        3. Identifikasi metode pembayaran. Jika ada info "QRIS" atau "Transfer", tandai item yang relevan sebagai TRANSFER. Default CASH.
        
        Kembalikan HANYA JSON valid dengan struktur:
        {
          "transactions": [
            {
              "description": "Nama Item",
              "amount": 10000,
              "type": "INCOME" atau "EXPENSE",
              "paymentMethod": "CASH" atau "TRANSFER"
            }
          ]
        }
        Jangan gunakan markdown formatting.
      `;

      // Use gemini-3-flash-preview as recommended for basic/multimodal tasks
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            { text: prompt }
          ]
        }
      });

      // Extract text output using the .text property (not a method)
      const textResponse = response.text || "{}";
      // Clean up markdown code blocks if present
      const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const result = JSON.parse(cleanJson);
      
      if (result.transactions && Array.isArray(result.transactions)) {
        const parsedTransactions: Transaction[] = result.transactions.map((t: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          date: new Date().toISOString(),
          type: t.type,
          amount: t.amount,
          paymentMethod: t.paymentMethod,
          description: t.description,
          productId: undefined // AI generated items might not link perfectly to IDs
        }));
        
        setCandidates(parsedTransactions);
        setStep('REVIEW');
      } else {
        throw new Error("Format respon tidak sesuai");
      }

    } catch (err) {
      console.error(err);
      setError("Gagal menganalisa gambar. Pastikan gambar jelas atau coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    onScanComplete(candidates);
    onClose();
  };

  const removeCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Sparkles className="text-amber-500 fill-amber-500" size={20} />
            Smart Scan AI
          </h3>
          <button onClick={onClose} className="p-2 bg-white rounded-full hover:bg-slate-200 border border-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {step === 'UPLOAD' ? (
            <div className="space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-50 hover:border-amber-400 transition-colors bg-slate-50/50"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="max-h-64 object-contain rounded-lg shadow-sm" />
                ) : (
                  <>
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                      <Camera size={32} />
                    </div>
                    <p className="text-sm text-slate-500 font-medium text-center">
                      Tap untuk ambil foto atau upload<br/>Ringkasan Harian / Catatan
                    </p>
                  </>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden"
                  onChange={handleFileChange} 
                />
              </div>

              {error && (
                <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <button 
                onClick={processImage}
                disabled={!imageBase64 || isProcessing}
                className="w-full py-3 bg-amber-600 disabled:bg-slate-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Menganalisa...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} /> Analisa Sekarang
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 flex gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <p>AI telah mendeteksi <strong>{candidates.length} transaksi</strong>. Silakan periksa sebelum disimpan.</p>
               </div>

               <div className="space-y-2">
                 {candidates.map((t) => (
                   <div key={t.id} className="flex justify-between items-center bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                     <div className="flex items-center gap-3 overflow-hidden">
                       <button onClick={() => removeCandidate(t.id)} className="text-slate-300 hover:text-rose-500">
                         <X size={18} />
                       </button>
                       <div className="min-w-0">
                         <p className="font-semibold text-slate-800 text-sm truncate">{t.description}</p>
                         <div className="flex gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {t.type === 'INCOME' ? 'MASUK' : 'KELUAR'}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {t.paymentMethod}
                            </span>
                         </div>
                       </div>
                     </div>
                     <span className="font-bold text-sm whitespace-nowrap">Rp {t.amount.toLocaleString('id-ID')}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === 'REVIEW' && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
             <button 
                onClick={() => setStep('UPLOAD')}
                className="flex-1 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl"
              >
                Ulangi
              </button>
             <button 
                onClick={handleSave}
                className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg"
              >
                <Check size={20} /> Simpan ({candidates.length})
              </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartScan;
