'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, FileText, X, Paperclip, CircleCheck as CheckCircle2, Clock, ChevronDown, Calendar, User, AlignLeft, ExternalLink, Loader as Loader2, BookOpen, ScrollText } from 'lucide-react';

type DocStatus = 'new' | 'in_progress' | 'completed' | 'archived';
type ResolutionType = 'director' | 'zdasd' | 'zdud' | 'accounting' | 'specialists';
type SheetType = 'Документи' | 'Договори' | 'Заповеди';

interface Document {
  id: string;
  regNumber: string;
  date: string;
  correspondent: string;
  subject: string;
  resolution: ResolutionType;
  status: DocStatus;
  fileName?: string;
  fileUrl?: string;
}

const TABS: { key: SheetType; label: string; icon: React.ReactNode }[] = [
  { key: 'Документи', label: 'Документи', icon: <FileText className="w-4 h-4" /> },
  { key: 'Договори',  label: 'Договори',  icon: <BookOpen className="w-4 h-4" /> },
  { key: 'Заповеди', label: 'Заповеди',  icon: <ScrollText className="w-4 h-4" /> },
];

const CORRESPONDENT_LABEL: Record<SheetType, string> = {
  'Документи': 'Подател / Получател',
  'Договори':  'Контрагент',
  'Заповеди':  'Относно',
};

export default function CorrespondenceApp() {
  const [activeSheet, setActiveSheet] = useState<SheetType>('Документи');
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | DocStatus>('all');
  const [filterResolution, setFilterResolution] = useState<'all' | ResolutionType>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    regNumber: '',
    date: new Date().toISOString().split('T')[0],
    correspondent: '',
    subject: '',
    resolution: '' as ResolutionType | '',
    status: 'new' as DocStatus,
    fileName: '',
  });
  const [dragOver, setDragOver] = useState(false);
  const [fileData, setFileData] = useState<{ name: string; mimeType: string; data: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async (sheet: SheetType) => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/documents?sheet=${encodeURIComponent(sheet)}`);
      const data = await response.json();
      if (response.ok) {
        setDocs(data.documents || []);
      } else {
        setError(data.error || 'Грешка при зареждане');
      }
    } catch {
      setError('Грешка при свързване');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(activeSheet);
    setSearch('');
    setFilterStatus('all');
    setFilterResolution('all');
  }, [activeSheet]);

  const filtered = docs.filter((d) => {
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchResolution = filterResolution === 'all' || d.resolution === filterResolution;
    const q = search.toLowerCase();
    const matchSearch = !q || d.regNumber?.toLowerCase().includes(q) || d.subject?.toLowerCase().includes(q) || d.correspondent?.toLowerCase().includes(q);
    return matchStatus && matchResolution && matchSearch;
  });

  const totalNew = docs.filter((d) => d.status === 'new').length;
  const totalInProgress = docs.filter((d) => d.status === 'in_progress').length;

  const resetForm = () => {
    setForm({ regNumber: '', date: new Date().toISOString().split('T')[0], correspondent: '', subject: '', resolution: '', status: 'new', fileName: '' });
    setFileData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: activeSheet,
          document: {
            regNumber: form.regNumber,
            date: form.date,
            correspondent: form.correspondent,
            subject: form.subject,
            resolution: form.resolution,
            status: form.status,
            fileName: fileData?.name || form.fileName || '',
          },
          fileData,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setDocs((prev) => [...prev, data.document]);
        setModalOpen(false);
        resetForm();
      } else {
        const data = await response.json();
        alert(data.error || 'Грешка при запазване');
      }
    } catch {
      alert('Грешка при свързване');
    } finally {
      setSubmitting(false);
    }
  };

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

  const correspondentLabel = CORRESPONDENT_LABEL[activeSheet];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 leading-tight">Деловодна система</h1>
                <p className="text-xs text-slate-500 leading-tight">Управление на кореспонденция</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>{new Date().toLocaleDateString('bg-BG')}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Общо" value={docs.length} icon={<FileText className="w-4 h-4 text-slate-600" />} color="bg-slate-100" textColor="text-slate-700" />
          <StatCard label="Нови" value={totalNew} icon={<FileText className="w-4 h-4 text-blue-600" />} color="bg-blue-50" textColor="text-blue-700" accent="border-blue-200" />
          <StatCard label="В процес" value={totalInProgress} icon={<Clock className="w-4 h-4 text-amber-600" />} color="bg-amber-50" textColor="text-amber-700" accent="border-amber-200" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-full sm:w-auto sm:inline-flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveSheet(tab.key)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeSheet === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Регистър — {activeSheet}</h2>
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Нов запис</span>
                  <span className="sm:hidden">Нов</span>
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Търсене по номер, подател или относно..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | DocStatus)} className="appearance-none w-full pl-3 pr-7 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="all">Всички статуси</option>
                    <option value="new">Нов</option>
                    <option value="in_progress">В процес</option>
                    <option value="completed">Изпълнен</option>
                    <option value="archived">Архивиран</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
                <div className="relative flex-1">
                  <select value={filterResolution} onChange={(e) => setFilterResolution(e.target.value as 'all' | ResolutionType)} className="appearance-none w-full pl-3 pr-7 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="all">Всички резолюции</option>
                    <option value="director">Директор</option>
                    <option value="zdasd">ЗДАСД</option>
                    <option value="zdud">ЗДУД</option>
                    <option value="accounting">Счетоводство</option>
                    <option value="specialists">Специалисти</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Номер</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Дата</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{correspondentLabel}</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Относно</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Резолюция</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Файл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-slate-300" />
                    <span className="text-xs">Зареждане...</span>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    Няма намерени записи
                  </td></tr>
                ) : (
                  filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700 font-medium whitespace-nowrap">{doc.regNumber}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{doc.date}</td>
                      <td className="px-4 py-3.5 text-slate-700 max-w-[160px]"><span className="truncate block">{doc.correspondent}</span></td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[220px]"><span className="truncate block">{doc.subject}</span></td>
                      <td className="px-4 py-3.5"><ResolutionBadge resolution={doc.resolution} /></td>
                      <td className="px-4 py-3.5"><StatusBadge status={doc.status} /></td>
                      <td className="px-4 py-3.5">
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[80px] truncate">{doc.fileName}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : doc.fileName ? (
                          <span className="flex items-center gap-1 text-xs text-slate-400"><Paperclip className="w-3 h-3" /><span className="max-w-[80px] truncate">{doc.fileName}</span></span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-slate-300" />
                <span className="text-xs">Зареждане...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-sm">Няма намерени записи</p>
              </div>
            ) : (
              filtered.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{doc.regNumber}</span>
                    <StatusBadge status={doc.status} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 mb-1">{doc.subject}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.correspondent}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{doc.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <ResolutionBadge resolution={doc.resolution} />
                    {doc.fileUrl ? (
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Paperclip className="w-3 h-3" /><span className="max-w-[120px] truncate">{doc.fileName}</span><ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">{filtered.length} {filtered.length === 1 ? 'запис' : 'записа'}</span>
          </div>
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget && !submitting) setModalOpen(false); }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border border-slate-200 overflow-hidden max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Нов запис — {activeSheet}</h3>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }} disabled={submitting} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Номер <span className="text-slate-400 normal-case font-normal">(оставете празно за автоматичен)</span></label>
                <input type="text" placeholder="напр. 125/24.05.2026" value={form.regNumber} onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"><Calendar className="inline w-3 h-3 mr-1" />Дата</label>
                <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"><User className="inline w-3 h-3 mr-1" />{correspondentLabel}</label>
                <input type="text" required placeholder="Организация или лице..." value={form.correspondent} onChange={(e) => setForm((f) => ({ ...f, correspondent: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"><AlignLeft className="inline w-3 h-3 mr-1" />Относно / Предмет</label>
                <textarea required rows={3} placeholder="Кратко описание..." value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 resize-none disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Резолюция</label>
                <div className="relative">
                  <select value={form.resolution} onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value as ResolutionType }))} disabled={submitting} className="appearance-none w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50 cursor-pointer">
                    <option value="">Изберете резолюция...</option>
                    <option value="director">Директор (Светлана Иванова)</option>
                    <option value="zdasd">ЗДАСД (Йордан Йорданов)</option>
                    <option value="zdud">ЗДУД (Силвия Кьошкерян)</option>
                    <option value="accounting">Счетоводство (Радка Георгиева)</option>
                    <option value="specialists">Специалисти</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Статус</label>
                <div className="relative">
                  <select required value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DocStatus }))} disabled={submitting} className="appearance-none w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50 cursor-pointer">
                    <option value="new">Нов</option>
                    <option value="in_progress">В процес</option>
                    <option value="completed">Изпълнен</option>
                    <option value="archived">За сведение / Архивиран</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"><Paperclip className="inline w-3 h-3 mr-1" />Прикачен файл</label>
                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-400 bg-blue-50' : form.fileName ? 'border-teal-300 bg-teal-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={handleFileChange} disabled={submitting} />
                  {form.fileName || fileData ? (
                    <div className="flex items-center justify-center gap-2">
                      <Paperclip className="w-4 h-4 text-teal-500" />
                      <span className="text-sm text-teal-700 font-medium">{form.fileName || fileData?.name}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, fileName: '' })); setFileData(null); }} disabled={submitting} className="ml-1 text-teal-400 hover:text-teal-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div>
                      <Paperclip className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-500">Плъзнете файл или <span className="text-blue-600 font-medium">изберете от компютъра</span></p>
                      <p className="text-xs text-slate-400 mt-0.5">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-1 pb-2">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} disabled={submitting} className="flex-1 py-2.5 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">Отказ</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Запазване...</span></>) : 'Запази'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon, color, textColor, accent }: { label: string; value: number; icon: React.ReactNode; color: string; textColor: string; accent?: string; }) {
  return (
    <div className={`bg-white rounded-xl border ${accent ?? 'border-slate-200'} shadow-sm p-3 sm:p-5 flex items-center gap-3`}>
      <div className={`w-9 h-9 sm:w-11 sm:h-11 ${color} rounded-xl flex items-center justify-center shrink-0`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
        <p className={`text-xl sm:text-2xl font-bold ${textColor} leading-none`}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DocStatus }) {
  const config: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; label: string }> = {
    new:        { bg: 'bg-blue-50',   text: 'text-blue-700',  border: 'border-blue-100',  icon: <FileText className="w-3 h-3" />,      label: 'Нов' },
    in_progress:{ bg: 'bg-amber-50',  text: 'text-amber-700', border: 'border-amber-100', icon: <Clock className="w-3 h-3" />,         label: 'В процес' },
    completed:  { bg: 'bg-teal-50',   text: 'text-teal-700',  border: 'border-teal-100',  icon: <CheckCircle2 className="w-3 h-3" />,  label: 'Изпълнен' },
    archived:   { bg: 'bg-slate-50',  text: 'text-slate-600', border: 'border-slate-200', icon: <CheckCircle2 className="w-3 h-3" />,  label: 'Архивиран' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: null, label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${c.bg} ${c.text} text-xs font-medium border ${c.border} whitespace-nowrap`}>
      {c.icon}{c.label}
    </span>
  );
}

function ResolutionBadge({ resolution }: { resolution: ResolutionType }) {
  const labels: Record<string, string> = {
    director: 'Директор', zdasd: 'ЗДАСД', zdud: 'ЗДУД', accounting: 'Счетоводство', specialists: 'Специалисти',
    'Директор (Светлана Иванова)': 'Директор', 'ЗДАСД (Йордан Йорданов)': 'ЗДАСД',
    'ЗДУД (Силвия Кьошкерян)': 'ЗДУД', 'Счетоводство (Радка Георгиева)': 'Счетоводство', 'Специалисти': 'Специалисти',
  };
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 whitespace-nowrap">
      {labels[resolution] || resolution}
    </span>
  );
}
