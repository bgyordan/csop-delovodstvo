'use client';

import { useState, useRef } from 'react';
import { X, Plus, Paperclip, ChevronDown, Calendar, User, AlignLeft, Loader as Loader2, Building2, Banknote, Clock } from 'lucide-react';

type DocStatus = 'active' | 'expired' | 'terminated' | 'in_progress';
type ContractType = 'delivery' | 'service' | 'rent' | 'labor' | 'civil' | 'other';

type FileData = { name: string; mimeType: string; data: string };

interface ContractFormProps {
  onClose: () => void;
  onSave: (doc: Record<string, string>, fileData?: FileData | null) => void;
  submitting: boolean;
}

const CONTRACT_TYPES: { value: ContractType | ''; label: string }[] = [
  { value: '', label: 'Изберете вид...' },
  { value: 'delivery', label: 'Доставка' },
  { value: 'service', label: 'Услуга' },
  { value: 'rent', label: 'Наем' },
  { value: 'labor', label: 'Трудов' },
  { value: 'civil', label: 'Граждански' },
  { value: 'other', label: 'Друг' },
];

const RESPONSIBLE_PERSONS = [
  'Светлана Иванова (Директор)',
  'Йордан Йорданов (ЗДАСД)',
  'Силвия Кьошкерян (ЗДУД)',
  'Радка Георгиева (Счетоводство)',
  'Друго лице',
];

export default function ContractForm({ onClose, onSave, submitting }: ContractFormProps) {
  const [form, setForm] = useState({
    regNumber: '',
    date: new Date().toISOString().split('T')[0],
    correspondent: '',
    subject: '',
    contractType: '' as ContractType | '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    value: '',
    responsiblePerson: '',
    customResponsible: '',
    status: 'active' as DocStatus,
    notes: '',
    fileName: '',
  });
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showCustomResponsible, setShowCustomResponsible] = useState(false);
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

  const handleResponsibleChange = (value: string) => {
    if (value === 'Друго лице') {
      setShowCustomResponsible(true);
      setForm((f) => ({ ...f, responsiblePerson: '' }));
    } else {
      setShowCustomResponsible(false);
      setForm((f) => ({ ...f, responsiblePerson: value, customResponsible: '' }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const responsible = showCustomResponsible ? form.customResponsible : form.responsiblePerson;
    const contractTypeLabel = CONTRACT_TYPES.find(t => t.value === form.contractType)?.label || '';
    const fullSubject = `[${contractTypeLabel}] ${form.subject}`;

    onSave({
      regNumber: form.regNumber,
      date: form.date,
      correspondent: form.correspondent,
      subject: fullSubject,
      resolution: responsible,
      status: form.status,
      fileName: fileData?.name || form.fileName || '',
      startDate: form.startDate,
      endDate: form.endDate,
      value: form.value,
      notes: form.notes,
    }, fileData);
  };

  const daysUntilExpiry = form.endDate ? Math.ceil((new Date(form.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const expiryColor = daysUntilExpiry === null ? '' : daysUntilExpiry < 0 ? 'text-red-600' : daysUntilExpiry < 30 ? 'text-amber-600' : 'text-teal-600';
  const expiryText = daysUntilExpiry === null ? '' : daysUntilExpiry < 0 ? `Изтекъл преди ${Math.abs(daysUntilExpiry)} дни!` : daysUntilExpiry === 0 ? 'Изтича днес!' : daysUntilExpiry < 30 ? `Изтича след ${daysUntilExpiry} дни` : `${daysUntilExpiry} дни остават`;

  return (
    <>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Нов договор</h3>
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
          <input type="text" placeholder="напр. Д-1/2026" value={form.regNumber} onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            <Building2 className="inline w-3 h-3 mr-1" />Вид договор
          </label>
          <div className="relative">
            <select required value={form.contractType} onChange={(e) => setForm((f) => ({ ...f, contractType: e.target.value as ContractType }))} disabled={submitting} className="appearance-none w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50 cursor-pointer">
              {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            <User className="inline w-3 h-3 mr-1" />Контрагент
          </label>
          <input type="text" required placeholder="Фирма или лице..." value={form.correspondent} onChange={(e) => setForm((f) => ({ ...f, correspondent: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            <AlignLeft className="inline w-3 h-3 mr-1" />Предмет на договора
          </label>
          <textarea required rows={2} placeholder="Кратко описание..." value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 resize-none disabled:opacity-50" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              <Calendar className="inline w-3 h-3 mr-1" />Начална дата
            </label>
            <input type="date" required value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              <Clock className="inline w-3 h-3 mr-1" />Крайна дата
            </label>
            <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
          </div>
        </div>
        {expiryText && <p className={`text-xs font-medium ${expiryColor} -mt-2`}>{expiryText}</p>}

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            <Banknote className="inline w-3 h-3 mr-1" />Стойност (лв.) <span className="text-slate-400 normal-case font-normal">— незадължително</span>
          </label>
          <input type="number" min="0" step="0.01" placeholder="0.00" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Отговорно лице</label>
          <div className="relative mb-2">
            <select value={showCustomResponsible ? 'Друго лице' : form.responsiblePerson} onChange={(e) => handleResponsibleChange(e.target.value)} disabled={submitting} className="appearance-none w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50 cursor-pointer">
              <option value="">Изберете...</option>
              {RESPONSIBLE_PERSONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {showCustomResponsible && (
            <input type="text" required placeholder="Въведете ime и длъжност..." value={form.customResponsible} onChange={(e) => setForm((f) => ({ ...f, customResponsible: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Статус</label>
          <div className="relative">
            <select required value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DocStatus }))} disabled={submitting} className="appearance-none w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50 cursor-pointer">
              <option value="active">Активен</option>
              <option value="in_progress">В изпълнение</option>
              <option value="expired">Изтекъл</option>
              <option value="terminated">Прекратен</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Бележки <span className="text-slate-400 normal-case font-normal">— незадължително</span>
          </label>
          <textarea rows={2} placeholder="Допълнителна информация..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 resize-none disabled:opacity-50" />
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
            {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Запазване...</span></>) : 'Запази договор'}
          </button>
        </div>
      </form>
    </>
  );
}
