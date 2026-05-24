'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, FileText, X, Paperclip, CircleCheck as CheckCircle2, Clock, ChevronDown, Calendar, User, AlignLeft, ExternalLink, Loader as Loader2 } from 'lucide-react';

type DocStatus = 'new' | 'in_progress' | 'completed' | 'archived';
type ResolutionType = 'director' | 'zdasd' | 'zdud' | 'accounting' | 'specialists';

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

export default function CorrespondenceApp() {
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
  const [fileData, setFileData] = useState<{
    name: string;
    mimeType: string;
    data: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents from API
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents');
      const data = await response.json();

      if (response.ok) {
        setDocs(data.documents || []);
        setError(null);
      } else {
        setError(data.error || 'Failed to load documents');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filtered = docs.filter((d) => {
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchResolution = filterResolution === 'all' || d.resolution === filterResolution;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      d.regNumber.toLowerCase().includes(q) ||
      d.subject.toLowerCase().includes(q) ||
      d.correspondent.toLowerCase().includes(q);
    return matchStatus && matchResolution && matchSearch;
  });

  const totalNew = docs.filter((d) => d.status === 'new').length;
  const totalInProgress = docs.filter((d) => d.status === 'in_progress').length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: {
            regNumber: form.regNumber,
            date: form.date,
            correspondent: form.correspondent,
            subject: form.subject,
            resolution: form.resolution,
            status: form.status,
            fileName: fileData?.name || form.fileName || '',
          },
          fileData: fileData,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDocs((prev) => [...prev, data.document]);
        setModalOpen(false);
        setForm({
          regNumber: '',
          date: new Date().toISOString().split('T')[0],
          correspondent: '',
          subject: '',
          resolution: '',
          status: 'new',
          fileName: '',
        });
        setFileData(null);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save document');
      }
    } catch {
      alert('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setFileData({
          name: file.name,
          mimeType: file.type,
          data: base64,
        });
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
        setFileData({
          name: file.name,
          mimeType: file.type,
          data: base64,
        });
        setForm((f) => ({ ...f, fileName: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const statusLabels: Record<DocStatus, string> = {
    new: 'Нов',
    in_progress: 'В процес',
    completed: 'Изпълнен',
    archived: 'За сведение / Архивиран',
  };

  const resolutionLabels: Record<ResolutionType, string> = {
    director: 'Директор (Светлана Иванова)',
    zdasd: 'ЗДАСД (Йордан Йорданов)',
    zdud: 'ЗДУД (Силвия Кьошкерян)',
    accounting: 'Счетоводство (Радка Георгиева)',
    specialists: 'Специалисти',
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 leading-tight">
                  Деловодна система
                </h1>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Общо документи"
            value={docs.length}
            icon={<FileText className="w-5 h-5 text-slate-600" />}
            color="bg-slate-100"
            textColor="text-slate-700"
          />
          <StatCard
            label="Нови"
            value={totalNew}
            icon={<FileText className="w-5 h-5 text-blue-600" />}
            color="bg-blue-50"
            textColor="text-blue-700"
            accent="border-blue-200"
          />
          <StatCard
            label="В процес"
            value={totalInProgress}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
            color="bg-amber-50"
            textColor="text-amber-700"
            accent="border-amber-200"
          />
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Регистър на документите</h2>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Търсене по номер, подател или относно..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-72 placeholder:text-slate-400"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | DocStatus)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto cursor-pointer"
                >
                  <option value="all">Всички статуси</option>
                  <option value="new">Нов</option>
                  <option value="in_progress">В процес</option>
                  <option value="completed">Изпълнен</option>
                  <option value="archived">За сведение / Архивиран</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* Resolution Filter */}
              <div className="relative">
                <select
                  value={filterResolution}
                  onChange={(e) => setFilterResolution(e.target.value as 'all' | ResolutionType)}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto cursor-pointer"
                >
                  <option value="all">Всички резолюции</option>
                  <option value="director">Директор</option>
                  <option value="zdasd">ЗДАСД</option>
                  <option value="zdud">ЗДУД</option>
                  <option value="accounting">Счетоводство</option>
                  <option value="specialists">Специалисти</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {/* New document */}
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Нов документ
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Номер</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Дата</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Подател / Получател</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Относно</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Резолюция</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Файл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-400 text-sm">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-slate-300" />
                      <span className="text-xs">Зареждане на документи...</span>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-slate-400 text-sm">
                      <FileText className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      Няма намерени документи
                    </td>
                  </tr>
                ) : (
                  filtered.map((doc) => (
                    <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-700 font-medium whitespace-nowrap">
                        {doc.regNumber}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {doc.date}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 max-w-[180px]">
                        <span className="truncate block">{doc.correspondent}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-[260px]">
                        <span className="truncate block">{doc.subject}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <ResolutionBadge resolution={doc.resolution} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        {doc.fileName || doc.fileUrl ? (
                          doc.fileUrl ? (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span className="max-w-[100px] truncate">{doc.fileName}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Paperclip className="w-3 h-3" />
                              <span className="max-w-[100px] truncate">{doc.fileName}</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {filtered.length} {filtered.length === 1 ? 'документ' : 'документа'}
            </span>
          </div>
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !submitting) setModalOpen(false); }}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Нов документ</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                disabled={submitting}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Registration Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Номер
                </label>
                <input
                  type="text"
                  required
                  placeholder="Въведете номер..."
                  value={form.regNumber}
                  onChange={(e) => setForm((f) => ({ ...f, regNumber: e.target.value }))}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400 disabled:opacity-50"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  <Calendar className="inline w-3 h-3 mr-1" />Дата
                </label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 disabled:opacity-50"
                />
              </div>

              {/* Correspondent */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  <User className="inline w-3 h-3 mr-1" />Подател / Получател
                </label>
                <input
                  type="text"
                  required
                  placeholder="Организация или лице..."
                  value={form.correspondent}
                  onChange={(e) => setForm((f) => ({ ...f, correspondent: e.target.value }))}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400 disabled:opacity-50"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  <AlignLeft className="inline w-3 h-3 mr-1" />Относно
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Кратко описание на документа..."
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400 resize-none disabled:opacity-50"
                />
              </div>

              {/* Resolution */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Резолюция
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.resolution}
                    onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value as ResolutionType }))}
                    disabled={submitting}
                    className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
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

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Статус
                </label>
                <div className="relative">
                  <select
                    required
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DocStatus }))}
                    disabled={submitting}
                    className="appearance-none w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 disabled:opacity-50 cursor-pointer"
                  >
                    <option value="new">Нов</option>
                    <option value="in_progress">В процес</option>
                    <option value="completed">Изпълнен</option>
                    <option value="archived">За сведение / Архивиран</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                  <Paperclip className="inline w-3 h-3 mr-1" />Прикачен файл
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-all ${
                    dragOver
                      ? 'border-blue-400 bg-blue-50'
                      : form.fileName
                      ? 'border-teal-300 bg-teal-50/50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />
                  {form.fileName || fileData ? (
                    <div className="flex items-center justify-center gap-2">
                      <Paperclip className="w-4 h-4 text-teal-500" />
                      <span className="text-sm text-teal-700 font-medium">{form.fileName || fileData?.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setForm((f) => ({ ...f, fileName: '' })); setFileData(null); }}
                        disabled={submitting}
                        className="ml-1 text-teal-400 hover:text-teal-600 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Paperclip className="w-5 h-5 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-500">
                        Плъзнете файл или <span className="text-blue-600 font-medium">изберете от компютъра</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Отказ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Запазване...</span>
                    </>
                  ) : (
                    'Запази документ'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  textColor,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  textColor: string;
  accent?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border ${accent ?? 'border-slate-200'} shadow-sm p-5 flex items-center gap-4`}>
      <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${textColor} leading-none`}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DocStatus }) {
  const config: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    'Нов': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: <FileText className="w-3 h-3" /> },
    'В процес': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: <Clock className="w-3 h-3" /> },
    'Изпълнен': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', icon: <CheckCircle2 className="w-3 h-3" /> },
    'За сведение / Архивиран': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', icon: <CheckCircle2 className="w-3 h-3" /> },
    // Keep English keys for backwards compatibility
    'new': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: <FileText className="w-3 h-3" /> },
    'in_progress': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: <Clock className="w-3 h-3" /> },
    'completed': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', icon: <CheckCircle2 className="w-3 h-3" /> },
    'archived': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', icon: <CheckCircle2 className="w-3 h-3" /> },
  };

  const fallback = { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: null };
  const c = config[status] || fallback;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${c.bg} ${c.text} text-xs font-medium border ${c.border}`}>
      {c.icon}
      {status}
    </span>
  );
}

function ResolutionBadge({ resolution }: { resolution: ResolutionType }) {
  const labels: Record<string, string> = {
    director: 'Директор',
    zdasd: 'ЗДАСД',
    zdud: 'ЗДУД',
    accounting: 'Счетоводство',
    specialists: 'Специалисти',
    'Директор (Светлана Иванова)': 'Директор',
    'ЗДАСД (Йордан Йорданов)': 'ЗДАСД',
    'ЗДУД (Силвия Кьошкерян)': 'ЗДУД',
    'Счетоводство (Радка Георгиева)': 'Счетоводство',
    'Специалисти': 'Специалисти',
  };

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
      {labels[resolution] || resolution}
    </span>
  );
}
