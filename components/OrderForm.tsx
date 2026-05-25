'use client';

import { useState, useRef } from 'react';
import { X, Plus, Paperclip, ChevronDown, Calendar, User, AlignLeft, Loader as Loader2 } from 'lucide-react';

type OrderType = 'leave_paid' | 'leave_unpaid' | 'leave_sick' | 'leave_maternity' | 'mission' | 'duty' | 'hire' | 'dismiss' | 'education' | 'other';

type FileData = { name: string; mimeType: string; data: string };

interface OrderFormProps {
  onClose: () => void;
  onSave: (doc: Record<string, string>, fileData?: FileData | null) => void;
  submitting: boolean;
}

const ORDER_TYPES: { value: OrderType | ''; label: string }[] = [
  { value: '', label: 'Изберете вид...' },
  { value: 'leave_paid', label: 'Отпуск — платен' },
  { value: 'leave_unpaid', label: 'Отпуск — неплатен' },
  { value: 'leave_sick', label: 'Отпуск — болничен' },
  { value: 'leave_maternity', label: 'Отпуск — майчинство' },
  { value: 'mission', label: 'Командировка' },
  { value: 'duty', label: 'Дежурство' },
  { value: 'hire', label: 'Назначаване' },
  { value: 'dismiss', label: 'Освобождаване' },
  { value: 'education', label: 'Учебна дейност' },
  { value: 'other', label: 'Друга' },
];

const isLeave = (type: string) => type.startsWith('leave');
const isMission = (type: string) => type === 'mission' || type === 'duty';

export default function OrderForm({ onClose, onSave, submitting }: OrderFormProps) {
  const [form, setForm] = useState({
    regNumber: '',
    date: new Date().toISOString().split('T')[0],
    orderType: '' as OrderType | '',
    employee: '',
    subject: '',
    fromDate: '',
    toDate: '',
    days: '',
    destination: '',
    fileName: '',
  });
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setFileData({ name: file.name, mimeType: file.type, data: base64 });
        setForm((f) => ({ ...f, fileName: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setFileData({ name: file.name, mimeType: file.type, data: base64 });
        setForm((f) => ({ ...f, fileName: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const calcDays = (from: string, to: string) => {
    if (from && to) {
      const diff = Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diff > 0) setForm((f) => ({ ...f, days: String(diff) }));
    }
  };

  const orderTypeLabel = ORDER_TYPES.find(t => t.value === form.orderType)?.label || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let fullSubject = `[${orderTypeLabel}] ${form.employee}`;
    if (form.subject) fullSubject += ` — ${form.subject}`;
    if (isLeave(form.orderType) && form.fromDate && form.toDate) {
      fullSubject += ` (${form.fromDate} — ${form.toDate}, ${form.days} дни)`;
    }
    if (isMission(form.orderType) && form.destination) {
      fullSubject += ` → ${form.destination}`;
      if (form.fromDate && form.toDate) fullSubject += ` (${form.fromDate} — ${form.toDate})`;
    }

    onSave({
      regNumber: form.regNumber,
      date: form.date,
      correspondent: form.employee,
      subject: fullSubject,
      resolution: 'director',
      status: 'new',
      fileName: fileData?.name || form.fileName || '',
    }, fileData);
  };

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Нова заповед</h3>
        </div>
        <button onClick={onClose} disabled={submitting} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Номер <span className="text-slate-400 normal-case font-normal">(оставете празно за автоматичен)</span>
          </label>
          <input type="text" placeholder="напр. РД-01-125/24.05.2026" value={form.regNumber} onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            <Calendar className="inline w-3 h-3 mr-1" />Дата на заповедта
          </label>
          <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Вид заповед</label>
          <div className="relative">
            <select required value={form.orderType} onChange={(e) => setForm((f) => ({ ...f, orderType: e.target.value as OrderType }))} disabled={submitting} className="appearance-none w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50 cursor-pointer">
              {ORDER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            <User className="inline w-3 h-3 mr-1" />Служител
          </label>
          <input type="text" required placeholder="Име и длъжност..." value={form.employee} onChange={(e) => setForm((f) => ({ ...f, employee: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
        </div>

        {isLeave(form.orderType) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">От дата</label>
                <input type="date" required value={form.fromDate} onChange={(e) => { setForm((f) => ({ ...f, fromDate: e.target.value })); calcDays(e.target.value, form.toDate); }} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">До дата</label>
                <input type="date" required value={form.toDate} onChange={(e) => { setForm((f) => ({ ...f, toDate: e.target.value })); calcDays(form.fromDate, e.target.value); }} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Брой дни</label>
              <input type="number" min="1" required value={form.days} onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
            </div>
          </>
        )}

        {isMission(form.orderType) && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Дестинация / Място</label>
              <input type="text" required placeholder="Град, институция..." value={form.destination} onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">От дата</label>
                <input type="date" value={form.fromDate} onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">До дата</label>
                <input type="date" value={form.toDate} onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            <AlignLeft className="inline w-3 h-3 mr-1" />Допълнително описание <span className="text-slate-400 normal-case font-normal">— незадължително</span>
          </label>
          <textarea rows={2} placeholder="Допълнителна информация..." value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 resize-none disabled:opacity-50" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            <Paperclip className="inline w-3 h-3 mr-1" />Прикачен файл
          </label>
          <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-lg px-4 py-4 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : form.fileName ? 'border-teal-300 bg-teal-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
            <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={handleFileChange} disabled={submitting} />
            {form.fileName || fileData ? (
              <div className="flex items-center justify-center gap-2">
                <Paperclip className="w-4 h-4 text-teal-500" />
                <span className="text-sm text-teal-700 font-medium">{form.fileName || fileData?.name}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, fileName: '' })); setFileData(null); }} disabled={submitting} className="ml-1 text-teal-400 hover:text-teal-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div>
                <Paperclip className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-500">Плъзнете файл или <span className="text-blue-600 font-medium">изберете от компютъра</span></p>
                <p className="text-xs text-slate-400 mt-0.5">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1 pb-2">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 py-2.5 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">Отказ</button>
          <button type="submit" disabled={submitting} className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Запазване...</span></>) : 'Запази заповед'}
          </button>
        </div>
      </form>
    </>
  );
}
