'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, FileText, X, Paperclip, CircleCheck as CheckCircle2, Clock, ChevronDown, Calendar, User, ExternalLink, Loader as Loader2, BookOpen, ScrollText, MailOpen, Send, Printer, Pencil } from 'lucide-react';
import ContractForm from './ContractForm';
import OrderForm from './OrderForm';
import PrintView from './PrintView';

type DocStatus = 'new' | 'in_progress' | 'completed' | 'archived' | 'active' | 'expired' | 'terminated';
type ResolutionType = 'director' | 'zdasd' | 'zdud' | 'accounting' | 'specialists';
type SheetType = 'Входяща' | 'Изходяща' | 'Договори' | 'Заповеди';

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
  { key: 'Входяща',  label: 'Входяща',  icon: <MailOpen className="w-4 h-4" /> },
  { key: 'Изходяща', label: 'Изходяща', icon: <Send className="w-4 h-4" /> },
  { key: 'Договори', label: 'Договори', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'Заповеди', label: 'Заповеди', icon: <ScrollText className="w-4 h-4" /> },
];

const CORRESPONDENT_LABEL: Record<SheetType, string> = {
  'Входяща':  'Подател',
  'Изходяща': 'Получател',
  'Договори': 'Контрагент',
  'Заповеди': 'Служител',
};

export default function CorrespondenceApp() {
  const [activeSheet, setActiveSheet] = useState<SheetType>('Входяща');
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterResolution, setFilterResolution] = useState<'all' | ResolutionType>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
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
  const [userRole, setUserRole] = useState<string>('viewer');
  const [userName, setUserName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const getCookie = (name: string) => document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1] || '';
      setUserRole(getCookie('role') || 'viewer');
      setUserName(getCookie('username') || '');
    }
  }, []);

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

  const resetForm = () => {
    setForm({ regNumber: '', date: new Date().toISOString().split('T')[0], correspondent: '', subject: '', resolution: '', status: 'new', fileName: '' });
    setFileData(null);
  };

  const openEdit = (doc: Document) => {
    setEditDoc(doc);
    setForm({
      regNumber: doc.regNumber,
      date: doc.date.includes('.') ? doc.date.split('.').reverse().join('-') : doc.date,
      correspondent: doc.correspondent,
      subject: doc.subject,
      resolution: doc.resolution,
      status: doc.status,
      fileName: doc.fileName || '',
    });
  };

  const saveDocument = async (docData: Record<string, string>) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet: activeSheet, document: docData, fileData }),
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

  const updateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDoc) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/documents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet: activeSheet,
          document: {
            ...editDoc,
            regNumber: form.regNumber,
            date: form.date,
            correspondent: form.correspondent,
            subject: form.subject,
            resolution: form.resolution,
            status: form.status,
            fileName: form.fileName,
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setDocs((prev) => prev.map(d => d.id === editDoc.id ? { ...d, ...data.document } : d));
        setEditDoc(null);
        resetForm();
      } else {
        const data = await response.json();
        alert(data.error || 'Грешка при редактиране');
      }
    } catch {
      alert('Грешка при свързване');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDocument({
      regNumber: form.regNumber,
      date: form.date,
      correspondent: form.correspondent,
      subject: form.subject,
      resolution: form.resolution,
      status: form.status,
      fileName: fileData?.name || form.fileName || '',
    });
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
  const statusOptions = activeSheet === 'Договори'
    ? [{ value: 'all', label: 'Всички статуси' }, { value: 'active', label: 'Активен' }, { value: 'in_progress', label: 'В изпълнение' }, { value: 'expired', label: 'Изтекъл' }, { value: 'terminated', label: 'Прекратен' }]
    : [{ value: 'all', label: 'Всички статуси' }, { value: 'new', label: 'Нов' }, { value: 'in_progress', label: 'В процес' }, { value: 'completed', label: 'Изпълнен' }, { value: 'archived', label: 'Архивиран' }];
  const isSpecialForm = activeSheet === 'Договори' || activeSheet === 'Заповеди';

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 leading-tight">ЦСОП Варна</h1>
                <p className="text-xs text-slate-500 leading-tight">Деловодна система</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date().toLocaleDateString('bg-BG')}</span>
              </div>
              {userName && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 hidden sm:block">{userName}</span>
                  <button onClick={() => { document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; document.cookie = 'role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; window.location.href = '/login'; }} className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">Изход</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        <div className="grid grid-cols-3 gap-3 mb-6">
          {activeSheet === 'Договори' ? (
            <>
              <StatCard label="Общо договори" value={docs.length} icon={<FileText className="w-4 h-4 text-slate-600" />} color="bg-slate-100" textColor="text-slate-700" />
              <StatCard label="Активни" value={docs.filter(d => d.status === 'active').length} icon={<FileText className="w-4 h-4 text-teal-600" />} color="bg-teal-50" textColor="text-teal-700" accent="border-teal-200" />
              <StatCard label="Изтичат до 30 дни" value={docs.filter(d => { if (!d.subject) return false; const match = d.subject.match(/\d{2}\.\d{2}\.\d{4}/g); if (!match || match.length < 2) return false; const endStr = match[match.length - 1]; const [dd, mm, yyyy] = endStr.split('.'); const endDate = new Date(`${yyyy}-${mm}-${dd}`); const diff = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)); return diff >= 0 && diff <= 30; }).length} icon={<Clock className="w-4 h-4 text-amber-600" />} color="bg-amber-50" textColor="text-amber-700" accent="border-amber-200" />
            </>
          ) : (
            <>
              <StatCard label="Общо" value={docs.length} icon={<FileText className="w-4 h-4 text-slate-600" />} color="bg-slate-100" textColor="text-slate-700" />
              <StatCard label="Тази година" value={docs.filter(d => { const parts = d.date?.split('.'); return parts?.length === 3 && parts[2] === String(new Date().getFullYear()); }).length} icon={<FileText className="w-4 h-4 text-blue-600" />} color="bg-blue-50" textColor="text-blue-700" accent="border-blue-200" />
              <StatCard label="Този месец" value={docs.filter(d => { const parts = d.date?.split('.'); const now = new Date(); return parts?.length === 3 && parts[1] === String(now.getMonth() + 1).padStart(2, '0') && parts[2] === String(now.getFullYear()); }).length} icon={<Clock className="w-4 h-4 text-teal-600" />} color="bg-teal-50" textColor="text-teal-700" accent="border-teal-200" />
            </>
          )}
        </div>

        <div className="flex gap-1 mb-4 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveSheet(tab.key)} className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeSheet === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">Регистър — {activeSheet}</h2>
                <div className="flex gap-2">
                  {userRole === 'admin' && (
                    <button onClick={async () => { if (!confirm(`Архивирай "${activeSheet}" за ${new Date().getFullYear()}?\n\nЗаписите ще се преместят в нов sheet и регистърът ще се изчисти.`)) return; const res = await fetch('/api/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sheet: activeSheet }) }); const data = await res.json(); if (res.ok) { alert(data.message); fetchDocuments(activeSheet); } else { alert(data.error); } }} className="flex items-center gap-1.5 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                      <span className="hidden sm:inline">Архивирай</span>
                      <span className="sm:hidden">Арх.</span>
                    </button>
                  )}
                  <button onClick={() => setPrintOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Печат</span>
                  </button>
                  {userRole !== 'viewer' && (
                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap">
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Нов запис</span>
                      <span className="sm:hidden">Нов</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Търсене..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full placeholder:text-slate-400" />
              </div>
              <div className="flex gap-2">
                {activeSheet === 'Договори' && (
                  <div className="relative flex-1">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="appearance-none w-full pl-3 pr-7 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                      {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                )}
                {!isSpecialForm && (
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
                )}
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Относно / Предмет</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{isSpecialForm ? 'Отговорник' : 'Резолюция'}</th>
                  {activeSheet === 'Договори' && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Файл</th>
                  {userRole !== 'viewer' && <th className="px-4 py-3"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400"><Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-slate-300" /><span className="text-xs">Зареждане...</span></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400"><FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />Няма намерени записи</td></tr>
                ) : (
                  filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700 font-medium whitespace-nowrap">{doc.regNumber}</td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{doc.date}</td>
                      <td className="px-4 py-3.5 text-slate-700 max-w-[160px]"><span className="truncate block">{doc.correspondent}</span></td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[220px]"><span className="truncate block">{doc.subject}</span></td>
                      <td className="px-4 py-3.5"><ResolutionBadge resolution={doc.resolution} isSpecial={isSpecialForm} /></td>
                      {activeSheet === 'Договори' && <td className="px-4 py-3.5"><StatusBadge status={doc.status} /></td>}
                      <td className="px-4 py-3.5">
                        {doc.fileUrl ? (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Paperclip className="w-3 h-3" /><span className="max-w-[80px] truncate">{doc.fileName}</span><ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : doc.fileName ? (
                          <span className="flex items-center gap-1 text-xs text-slate-400"><Paperclip className="w-3 h-3" /><span className="max-w-[80px] truncate">{doc.fileName}</span></span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      {userRole !== 'viewer' && (
                        <td className="px-4 py-3.5">
                          <button onClick={() => openEdit(doc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-16 text-center text-slate-400"><Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-slate-300" /><span className="text-xs">Зареждане...</span></div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400"><FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" /><p className="text-sm">Няма намерени записи</p></div>
            ) : (
              filtered.map((doc) => (
                <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{doc.regNumber}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={doc.status} />
                      {userRole !== 'viewer' && (
                        <button onClick={() => openEdit(doc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-slate-800 mb-1">{doc.subject}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-2">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{doc.correspondent}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{doc.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <ResolutionBadge resolution={doc.resolution} isSpecial={isSpecialForm} />
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

      {printOpen && (
        <PrintView docs={docs} sheetName={activeSheet} onClose={() => setPrintOpen(false)} dateFrom={dateFrom} dateTo={dateTo} onDateFromChange={setDateFrom} onDateToChange={setDateTo} />
      )}

      {/* Edit Modal */}
      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget && !submitting) { setEditDoc(null); resetForm(); } }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border border-slate-200 overflow-hidden max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                  <Pencil className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Редактирай — {editDoc.regNumber}</h3>
              </div>
              <button onClick={() => { setEditDoc(null); resetForm(); }} disabled={submitting} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={updateDocument} className="px-5 py-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Номер</label>
                <input type="text" value={form.regNumber} onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"><Calendar className="inline w-3 h-3 mr-1" />Дата</label>
                <input type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"><User className="inline w-3 h-3 mr-1" />{correspondentLabel}</label>
                <input type="text" required value={form.correspondent} onChange={(e) => setForm((f) => ({ ...f, correspondent: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Относно</label>
                <textarea required rows={3} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 resize-none disabled:opacity-50" />
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
              <div className="flex gap-2 pt-1 pb-2">
                <button type="button" onClick={() => { setEditDoc(null); resetForm(); }} disabled={submitting} className="flex-1 py-2.5 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">Отказ</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? (<><Loader2 className="w-4 h-4 animate-spin" /><span>Запазване...</span></>) : 'Запази промените'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Document Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget && !submitting) { setModalOpen(false); resetForm(); } }}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border border-slate-200 overflow-hidden max-h-[95vh] flex flex-col">
            {activeSheet === 'Договори' ? (
              <ContractForm onClose={() => { setModalOpen(false); resetForm(); }} onSave={(docData) => saveDocument(docData)} submitting={submitting} />
            ) : activeSheet === 'Заповеди' ? (
              <OrderForm onClose={() => { setModalOpen(false); resetForm(); }} onSave={(docData) => saveDocument(docData)} submitting={submitting} />
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      {activeSheet === 'Входяща' ? <MailOpen className="w-4 h-4 text-white" /> : <Send className="w-4 h-4 text-white" />}
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">Нов запис — {activeSheet} поща</h3>
                  </div>
                  <button onClick={() => { setModalOpen(false); resetForm(); }} disabled={submitting} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Номер <span className="text-slate-400 normal-case font-normal">(оставете празно за автоматичен)</span></label>
                    <input type="text" placeholder={activeSheet === 'Входяща' ? 'напр. Вх. № 1/24.05.2026' : 'напр. Изх. № 1/24.05.2026'} value={form.regNumber} onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))} disabled={submitting} className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400 disabled:opacity-50" />
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
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Относно</label>
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
              </>
            )}
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
    active:     { bg: 'bg-teal-50',   text: 'text-teal-700',  border: 'border-teal-100',  icon: <CheckCircle2 className="w-3 h-3" />,  label: 'Активен' },
    expired:    { bg: 'bg-red-50',    text: 'text-red-700',   border: 'border-red-100',   icon: <Clock className="w-3 h-3" />,         label: 'Изтекъл' },
    terminated: { bg: 'bg-slate-50',  text: 'text-slate-600', border: 'border-slate-200', icon: <X className="w-3 h-3" />,             label: 'Прекратен' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: null, label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${c.bg} ${c.text} text-xs font-medium border ${c.border} whitespace-nowrap`}>
      {c.icon}{c.label}
    </span>
  );
}

function ResolutionBadge({ resolution, isSpecial }: { resolution: ResolutionType; isSpecial?: boolean }) {
  if (isSpecial) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 whitespace-nowrap max-w-[140px] truncate">
        {resolution}
      </span>
    );
  }
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
