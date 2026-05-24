'use client';

import { useRef } from 'react';
import { Printer, X } from 'lucide-react';

interface Document {
  id: string;
  regNumber: string;
  date: string;
  correspondent: string;
  subject: string;
  resolution: string;
  status: string;
  fileName?: string;
}

interface PrintViewProps {
  docs: Document[];
  sheetName: string;
  onClose: () => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Нов', in_progress: 'В процес', completed: 'Изпълнен', archived: 'Архивиран',
  active: 'Активен', expired: 'Изтекъл', terminated: 'Прекратен',
};

const RESOLUTION_LABELS: Record<string, string> = {
  director: 'Директор', zdasd: 'ЗДАСД', zdud: 'ЗДУД',
  accounting: 'Счетоводство', specialists: 'Специалисти',
  'Директор (Светлана Иванова)': 'Директор',
  'ЗДАСД (Йордан Йорданов)': 'ЗДАСД',
  'ЗДУД (Силвия Кьошкерян)': 'ЗДУД',
  'Счетоводство (Радка Георгиева)': 'Счетоводство',
};

const SHEET_TITLES: Record<string, string> = {
  'Входяща': 'Входящ регистър',
  'Изходяща': 'Изходящ регистър',
  'Договори': 'Регистър на договорите',
  'Заповеди': 'Регистър на заповедите',
};

const CORRESPONDENT_LABEL: Record<string, string> = {
  'Входяща': 'Подател',
  'Изходяща': 'Получател',
  'Договори': 'Контрагент',
  'Заповеди': 'Служител',
};

export default function PrintView({ docs, sheetName, onClose, dateFrom, dateTo, onDateFromChange, onDateToChange }: PrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Филтър по период
  const filtered = docs.filter((d) => {
    if (!dateFrom && !dateTo) return true;
    const parts = d.date.split('.');
    if (parts.length !== 3) return true;
    const docDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    if (dateFrom && docDate < new Date(dateFrom)) return false;
    if (dateTo && docDate > new Date(dateTo)) return false;
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('bg-BG');
  const title = SHEET_TITLES[sheetName] || sheetName;
  const corrLabel = CORRESPONDENT_LABEL[sheetName] || 'Подател';

  return (
    <>
      {/* Екранен изглед */}
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-4 print:hidden">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
          
          {/* Контроли */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Преглед за печат — {title}</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Филтър по период */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">От дата</label>
              <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">До дата</label>
              <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" />
            </div>
            <div className="text-sm text-slate-500">
              Намерени: <strong>{filtered.length}</strong> записа
            </div>
            <button onClick={handlePrint} className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Printer className="w-4 h-4" />
              Печат
            </button>
          </div>

          {/* Преглед */}
          <div className="p-6">
            <div ref={printRef}>
              {/* Заглавие */}
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-slate-900">ЦСОП Варна</h1>
                <h2 className="text-lg font-semibold text-slate-700 mt-1">{title}</h2>
                {(dateFrom || dateTo) && (
                  <p className="text-sm text-slate-500 mt-1">
                    Период: {dateFrom ? new Date(dateFrom).toLocaleDateString('bg-BG') : '—'} до {dateTo ? new Date(dateTo).toLocaleDateString('bg-BG') : '—'}
                  </p>
                )}
              </div>

              {/* Таблица */}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">№</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">Номер</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">Дата</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700">{corrLabel}</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700">Относно</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">Резолюция</th>
                    <th className="border border-slate-300 px-3 py-2 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="border border-slate-300 px-3 py-8 text-center text-slate-400">Няма записи за избрания период</td>
                    </tr>
                  ) : (
                    filtered.map((doc, idx) => (
                      <tr key={doc.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-300 px-3 py-2 text-xs text-slate-500">{idx + 1}</td>
                        <td className="border border-slate-300 px-3 py-2 text-xs font-mono font-medium whitespace-nowrap">{doc.regNumber}</td>
                        <td className="border border-slate-300 px-3 py-2 text-xs whitespace-nowrap">{doc.date}</td>
                        <td className="border border-slate-300 px-3 py-2 text-xs">{doc.correspondent}</td>
                        <td className="border border-slate-300 px-3 py-2 text-xs">{doc.subject}</td>
                        <td className="border border-slate-300 px-3 py-2 text-xs whitespace-nowrap">{RESOLUTION_LABELS[doc.resolution] || doc.resolution}</td>
                        <td className="border border-slate-300 px-3 py-2 text-xs whitespace-nowrap">{STATUS_LABELS[doc.status] || doc.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Подпис */}
              <div className="mt-8 flex justify-between items-end">
                <div className="text-xs text-slate-500">
                  Справката е изготвена на: <strong>{today}</strong><br />
                  Общо записи: <strong>{filtered.length}</strong>
                </div>
                <div className="text-center">
                  <div className="border-b border-slate-400 w-48 mb-1"></div>
                  <p className="text-xs text-slate-500">Подпис и печат</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS за печат */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </>
  );
}
