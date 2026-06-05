import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mic, MicOff, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { parseEstimationText, type ParsedEstimationItem } from '../../lib/estimatorParser';
import { formatRupiahFull } from '../../lib/estimatorFormat';
import { loadPricelistItems } from '../../services/pricelistService';
import type { PricelistItem } from '../../types/estimator';

interface Props {
  orgId: string;
  defaultMargin?: number;
  onClose: () => void;
  onConfirm: (items: ParsedEstimationItem[]) => void;
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognition;
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function SmartInputModal({ orgId, defaultMargin = 20, onClose, onConfirm }: Props) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedEstimationItem[]>([]);
  const [pricelist, setPricelist] = useState<PricelistItem[]>([]);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSpeechSupported(!!getSpeechRecognition());
    loadPricelistItems(orgId).then(setPricelist).catch(() => {});
  }, [orgId]);

  const runParse = useCallback((input: string) => {
    setParsed(parseEstimationText(input, pricelist, defaultMargin));
  }, [pricelist, defaultMargin]);

  useEffect(() => {
    const t = setTimeout(() => runParse(text), 200);
    return () => clearTimeout(t);
  }, [text, runParse]);

  const updateParsed = (index: number, patch: Partial<ParsedEstimationItem>) => {
    setParsed(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const toggleMic = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new Ctor();
    rec.lang = 'id-ID';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      if (transcript) {
        setText(prev => (prev ? `${prev}\n${transcript}` : transcript));
      }
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const handleConfirm = () => {
    const valid = parsed.filter(p => p.name.trim() && p.qty > 0);
    if (valid.length === 0) return;
    onConfirm(valid);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Smart Input</h2>
              <p className="text-xs text-slate-500">Ketik atau bicara — 1 baris = 1 item</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="relative">
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`Contoh:\nPasang plafon gypsum 25m2 hpp 85rb margin 30\nACP 50 meter persegi 350000 25%\nUpah pasang 5 hari @150rb`}
              rows={5}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:border-indigo-400 outline-none"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                className={`absolute bottom-3 right-3 p-2.5 rounded-xl transition-colors ${
                  listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                }`}
                title={listening ? 'Stop rekaman' : 'Input suara'}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>

          {parsed.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                Preview ({parsed.length} item)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                      <th className="p-2 w-6" />
                      <th className="p-2">Item</th>
                      <th className="p-2 w-12">Qty</th>
                      <th className="p-2 w-12">Unit</th>
                      <th className="p-2 w-24">HPP</th>
                      <th className="p-2 w-14">Mrg%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((item, idx) => (
                      <tr key={idx} className="border-t border-slate-50">
                        <td className="p-2">
                          {item.confidence >= 0.7
                            ? <Check className="w-4 h-4 text-emerald-500" />
                            : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        </td>
                        <td className="p-1">
                          <input
                            value={item.name}
                            onChange={e => updateParsed(idx, { name: e.target.value })}
                            className="w-full px-2 py-1 border border-transparent hover:border-slate-200 rounded text-sm"
                          />
                          {item.matched_pricelist && (
                            <div className="text-[10px] text-indigo-500 px-2">↳ {item.matched_pricelist}</div>
                          )}
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={item.qty}
                            onChange={e => updateParsed(idx, { qty: Number(e.target.value) })}
                            className="w-full px-1 py-1 border border-slate-200 rounded text-right text-sm"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            value={item.unit}
                            onChange={e => updateParsed(idx, { unit: e.target.value })}
                            className="w-full px-1 py-1 border border-slate-200 rounded text-sm"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={item.hpp_per_unit}
                            onChange={e => updateParsed(idx, { hpp_per_unit: Number(e.target.value) })}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-right text-sm"
                          />
                          <div className="text-[10px] text-slate-400 text-right px-1">
                            {formatRupiahFull(item.hpp_per_unit)}
                          </div>
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={Math.round(item.margin_pct)}
                            onChange={e => updateParsed(idx, { margin_pct: Number(e.target.value) })}
                            className="w-full px-1 py-1 border border-slate-200 rounded text-right text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={parsed.length === 0}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-50"
          >
            Tambahkan ke Estimasi ({parsed.length})
          </button>
        </div>
      </motion.div>
    </div>
  );
}
