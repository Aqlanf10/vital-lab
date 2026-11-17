import React, { useMemo, useState } from 'react';
import {
  Clinic,
  DentalCase,
  ExpenseCategory,
  LabExpense,
  PaymentMethod,
  PaymentReceipt,
  Staff,
  StaffTransaction,
  Supplier,
} from '../types';
import {
  computeBranchMonthlyPnL,
  computeClinicFinancials,
  EXPENSE_CATEGORY_LABELS,
  matchCaseToClinic,
  PAYMENT_METHOD_LABELS,
} from '../data/seedData';
import { PrintModalPayload } from './PrintModals';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Package,
  PlusCircle,
  Printer,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  Wallet,
} from 'lucide-react';

interface BillingAndStatementsProps {
  clinics: Clinic[];
  cases: DentalCase[];
  receipts: PaymentReceipt[];
  expenses: LabExpense[];
  suppliers: Supplier[];
  staff: Staff[];
  staffTransactions: StaffTransaction[];
  canManageBilling: boolean;
  currentUserName: string;
  currency: string;
  secondaryCurrency?: string;
  exchangeRate?: number;
  onAddReceipt: (receipt: Omit<PaymentReceipt, 'id'>) => void;
  onDeleteReceipt: (id: string) => void;
  onAddExpense: (expense: Omit<LabExpense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  onDeleteSupplier: (id: string) => void;
  onOpenPrint: (payload: PrintModalPayload) => void;
}

export const BillingAndStatements: React.FC<BillingAndStatementsProps> = ({
  clinics,
  cases,
  receipts,
  expenses,
  suppliers,
  staff,
  staffTransactions,
  canManageBilling,
  currentUserName,
  currency,
  secondaryCurrency,
  exchangeRate,
  onAddReceipt,
  onDeleteReceipt,
  onAddExpense,
  onDeleteExpense,
  onAddSupplier,
  onDeleteSupplier,
  onOpenPrint,
}) => {
  const [subTab, setSubTab] = useState<'statements' | 'receipts' | 'expenses' | 'pnl'>(
    'statements'
  );
  const [selectedClinicId, setSelectedClinicId] = useState<string>(clinics[0]?.id || '');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [receiptSearch, setReceiptSearch] = useState<string>('');

  // Receipt Form State
  const [formClinicId, setFormClinicId] = useState<string>(clinics[0]?.id || '');
  const [formCaseId, setFormCaseId] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formMethod, setFormMethod] = useState<PaymentMethod>('cash');
  const [formRefNo, setFormRefNo] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formNotes, setFormNotes] = useState<string>('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Expense & Supplier Form State
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('materials');
  const [expTitle, setExpTitle] = useState<string>('');
  const [expSupplier, setExpSupplier] = useState<string>('');
  const [expAmount, setExpAmount] = useState<string>('');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('cash');
  const [expDate, setExpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState<string>('');

  const [supName, setSupName] = useState<string>('');
  const [supSpecialty, setSupSpecialty] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');

  // P&L Month Filter
  const [pnlMonth, setPnlMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));

  const activeClinic =
    clinics.find((c) => c.id === selectedClinicId) || clinics[0] || null;

  // Overall Financial Summary
  const summary = useMemo(() => {
    const totalOpening = clinics.reduce((s, c) => s + Number(c.openingBalance || 0), 0);
    const totalBilled = cases.reduce((s, c) => s + (Number(c.price) || 0), 0);
    const totalCollected = receipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalExpenses = expenses.reduce((s, ex) => s + (Number(ex.amount) || 0), 0);
    const totalOutstanding = totalOpening + totalBilled - totalCollected;
    const collectionRate =
      totalOpening + totalBilled > 0
        ? Math.min(100, (totalCollected / (totalOpening + totalBilled)) * 100)
        : 0;

    return {
      totalOpening,
      totalBilled,
      totalCollected,
      totalExpenses,
      totalOutstanding,
      collectionRate,
    };
  }, [clinics, cases, receipts, expenses]);

  const pnlReport = useMemo(
    () =>
      computeBranchMonthlyPnL({
        month: pnlMonth,
        cases,
        receipts,
        expenses,
        staff,
        staffTransactions,
      }),
    [pnlMonth, cases, receipts, expenses, staff, staffTransactions]
  );

  // Selected Clinic Ledger Rows
  const clinicLedger = useMemo(() => {
    if (!activeClinic) return { rows: [], fin: null };
    const fin = computeClinicFinancials(activeClinic, cases, receipts);

    type Row = {
      date: string;
      type: 'opening' | 'invoice' | 'receipt';
      ref: string;
      description: string;
      debit: number;
      credit: number;
      rawCase?: DentalCase;
      rawReceipt?: PaymentReceipt;
    };

    const rows: Row[] = [];
    if (fin.opening !== 0) {
      rows.push({
        date: '0000-00-00',
        type: 'opening',
        ref: 'OPEN',
        description: 'رصيد افتتاحي سابق للعيادة',
        debit: fin.opening > 0 ? fin.opening : 0,
        credit: fin.opening < 0 ? Math.abs(fin.opening) : 0,
      });
    }

    fin.clinicCases.forEach((c) => {
      if (dateFrom && c.receivedDate < dateFrom) return;
      if (dateTo && c.receivedDate > dateTo) return;
      rows.push({
        date: c.receivedDate,
        type: 'invoice',
        ref: `#${c.id}`,
        description: `حالة المريض: ${c.patientName} · ${c.serviceType} (${c.units} وحدات)`,
        debit: Number(c.price) || 0,
        credit: 0,
        rawCase: c,
      });
    });

    fin.clinicReceipts.forEach((r) => {
      if (dateFrom && r.date < dateFrom) return;
      if (dateTo && r.date > dateTo) return;
      rows.push({
        date: r.date,
        type: 'receipt',
        ref: r.id,
        description: `سند قبض (${PAYMENT_METHOD_LABELS[r.method]})${r.notes ? ` · ${r.notes}` : ''}`,
        debit: 0,
        credit: Number(r.amount) || 0,
        rawReceipt: r,
      });
    });

    rows.sort((a, b) => a.date.localeCompare(b.date));

    let running = 0;
    const withRunning = rows.map((r) => {
      running += r.debit - r.credit;
      return { ...r, balanceAfter: running };
    });

    return { rows: withRunning, fin };
  }, [activeClinic, cases, receipts, dateFrom, dateTo]);

  const formClinicObj = clinics.find((c) => c.id === formClinicId) || clinics[0];
  const formClinicCases = useMemo(() => {
    if (!formClinicObj) return [];
    return cases.filter((c) => matchCaseToClinic(c, formClinicObj));
  }, [formClinicObj, cases]);

  const handleSubmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClinicObj || !Number(formAmount)) return;
    onAddReceipt({
      clinicId: formClinicObj.id,
      clinicName: formClinicObj.name,
      caseId: formCaseId || undefined,
      amount: Number(formAmount),
      method: formMethod,
      date: formDate,
      receivedBy: currentUserName,
      referenceNo: formRefNo.trim() || undefined,
      notes: formNotes.trim() || undefined,
    });
    setFormAmount('');
    setFormCaseId('');
    setFormRefNo('');
    setFormNotes('');
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !Number(expAmount)) return;
    onAddExpense({
      category: expCategory,
      title: expTitle.trim(),
      supplierName: expSupplier.trim() || undefined,
      amount: Number(expAmount),
      method: expMethod,
      date: expDate,
      notes: expNotes.trim() || undefined,
      createdBy: currentUserName,
    });
    setExpTitle('');
    setExpAmount('');
    setExpNotes('');
  };

  const handleSubmitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    onAddSupplier({
      name: supName.trim(),
      specialty: supSpecialty.trim() || 'مورد مواد وخامات سنية',
      phone: supPhone.trim(),
      balance: 0,
    });
    setSupName('');
    setSupSpecialty('');
    setSupPhone('');
  };

  const exportStatementCSV = () => {
    if (!activeClinic || !clinicLedger.rows.length) return;
    const headers = ['التاريخ', 'المرجع', 'البيان', 'مدين (عليه)', 'دائن (له)', 'الرصيد التراكمي'];
    const csvRows = [
      headers.join(','),
      ...clinicLedger.rows.map((r) =>
        [
          r.date === '0000-00-00' ? 'افتتاحي' : r.date,
          r.ref,
          `"${r.description.replace(/"/g, '""')}"`,
          r.debit,
          r.credit,
          r.balanceAfter,
        ].join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement-${activeClinic.name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPnLCSV = () => {
    const rows = [
      ['البند المالي', 'المبلغ (' + currency + ')'],
      ['الفترة المحاسبية', pnlMonth || 'كافة الفترات'],
      ['إجمالي المبيعات المفوترة', String(pnlReport.billedRevenue)],
      ['إجمالي المقبوضات النقدية والبنكية', String(pnlReport.collectedCash)],
      ['إجمالي رواتب وعمولات الطاقم الفني', String(pnlReport.totalPayrollAccrued)],
      ['إجمالي المصروفات التشغيلية والمشتريات', String(pnlReport.totalOperatingExpenses)],
      ['صافي الربح التشغيلي للفرع', String(pnlReport.netOperatingProfit)],
      ['صافي التدفق النقدي الفعلي', String(pnlReport.netCashFlow)],
    ];
    const blob = new Blob(['\uFEFF' + rows.map((r) => r.join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnl-report-${pnlMonth || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredReceipts = useMemo(() => {
    const q = receiptSearch.toLowerCase();
    return receipts.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.clinicName.toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q) ||
        (r.caseId || '').toLowerCase().includes(q)
    );
  }, [receipts, receiptSearch]);

  return (
    <div className="space-y-6">
      {/* Financial KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">إجمالي المطالبات والفواتير</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
            {(summary.totalOpening + summary.totalBilled).toLocaleString()}{' '}
            <span className="text-xs font-sans font-semibold text-slate-500">{currency}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            منها {cases.length} حالة مسجلة في الفرع
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">إجمالي المقبوضات (سندات القبض)</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 mt-2">
            {summary.totalCollected.toLocaleString()}{' '}
            <span className="text-xs font-sans font-semibold text-slate-500">{currency}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            كفاءة التحصيل: {summary.collectionRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">إجمالي المديونيات المتبقية</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-700 mt-2">
            {summary.totalOutstanding.toLocaleString()}{' '}
            <span className="text-xs font-sans font-semibold text-slate-500">{currency}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            مستحقة التحصيل لدى العيادات
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">صافي ربح الشهر الحالي (P&L)</div>
          <div
            className={`text-2xl font-extrabold font-mono tabular-nums mt-2 ${
              pnlReport.netOperatingProfit >= 0 ? 'text-blue-700' : 'text-red-600'
            }`}
          >
            {pnlReport.netOperatingProfit.toLocaleString()}{' '}
            <span className="text-xs font-sans font-semibold text-slate-500">{currency}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            بعد خصم الرواتب والعمولات والمصروفات ({expenses.length} قيد)
          </div>
        </div>
      </div>

      {/* Sub-navigation Segmented Control */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('statements')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'statements'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet size={15} className="text-blue-600" />
            <span>كشوف حساب العيادات</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('receipts')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'receipts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt size={15} className="text-emerald-600" />
            <span>سندات القبض ({receipts.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('expenses')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'expenses'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingDown size={15} className="text-red-600" />
            <span>المصروفات والموردون ({expenses.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('pnl')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'pnl'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={15} className="text-violet-600" />
            <span>الأرباح والخسائر (P&L)</span>
          </button>
        </div>

        {canManageBilling && subTab === 'statements' && (
          <button
            type="button"
            onClick={() => {
              if (activeClinic) setFormClinicId(activeClinic.id);
              setSubTab('receipts');
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <Wallet size={15} />
            <span>إصدار سند قبض جديد</span>
          </button>
        )}
      </div>

      {/* TAB 1: STATEMENTS */}
      {subTab === 'statements' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900">أرصدة العيادات المتعاقدة</h3>
              <p className="text-xs text-slate-500 mt-0.5">اختر عيادة لعرض كشف الحساب التفصيلي</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto">
              {clinics.map((c) => {
                const fin = computeClinicFinancials(c, cases, receipts);
                const isSelected = activeClinic?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClinicId(c.id)}
                    className={`w-full text-right p-4 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 truncate flex items-center gap-1.5">
                        <span>{c.name}</span>
                        {c.isVip && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">
                        د. {c.doctorName} · {fin.casesCount} حالات
                      </div>
                    </div>
                    <div className="text-left shrink-0">
                      <div
                        className={`text-sm font-mono tabular-nums font-bold ${
                          fin.netBalance > 0
                            ? 'text-amber-700'
                            : fin.netBalance < 0
                            ? 'text-blue-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {fin.netBalance.toLocaleString()} {currency}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {fin.netBalance > 0
                          ? 'مديونية مستحقة'
                          : fin.netBalance === 0
                          ? 'خالص السداد'
                          : 'رصيد دائن'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
            {activeClinic && clinicLedger.fin ? (
              <>
                <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      كشف حساب: {activeClinic.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      د. {activeClinic.doctorName} · جوال:{' '}
                      <span className="font-mono tabular-nums">{activeClinic.phone}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                    <span className="text-xs text-slate-400">إلى</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={exportStatementCSV}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Download size={14} />
                      <span>CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenPrint({
                          type: 'statement',
                          clinic: activeClinic,
                          dateFrom: dateFrom || undefined,
                          dateTo: dateTo || undefined,
                        })
                      }
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Printer size={14} />
                      <span>طباعة الكشف</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200 bg-slate-50/60 border-b border-slate-200 text-center py-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block">إجمالي الفواتير + الافتتاحي</span>
                    <strong className="text-sm font-mono tabular-nums text-slate-900">
                      {(clinicLedger.fin.opening + clinicLedger.fin.totalBilled).toLocaleString()}{' '}
                      {currency}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">إجمالي الدفعات المسددة</span>
                    <strong className="text-sm font-mono tabular-nums text-emerald-700">
                      {clinicLedger.fin.totalPaid.toLocaleString()} {currency}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">صافي الرصيد المتبقي</span>
                    <strong className="text-sm font-mono tabular-nums text-blue-700">
                      {clinicLedger.fin.netBalance.toLocaleString()} {currency}
                    </strong>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">التاريخ</th>
                        <th className="py-3 px-4">المرجع</th>
                        <th className="py-3 px-4">البيان</th>
                        <th className="py-3 px-4 text-left">مدين (عليه)</th>
                        <th className="py-3 px-4 text-left">دائن (له)</th>
                        <th className="py-3 px-4 text-left">الرصيد</th>
                        <th className="py-3 px-4 text-center">مستند</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clinicLedger.rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400">
                            لا توجد حركات مالية مسجلة لهذه العيادة في الفترة المحددة
                          </td>
                        </tr>
                      ) : (
                        clinicLedger.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                              {row.date === '0000-00-00' ? 'رصيد سابق' : row.date}
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                              {row.ref}
                            </td>
                            <td className="py-3 px-4 text-slate-700">{row.description}</td>
                            <td className="py-3 px-4 text-left font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                              {row.debit > 0 ? row.debit.toLocaleString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-left font-mono tabular-nums font-semibold text-emerald-700 whitespace-nowrap">
                              {row.credit > 0 ? row.credit.toLocaleString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-left font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                              {row.balanceAfter.toLocaleString()} {currency}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {row.rawCase && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenPrint({ type: 'invoice', dentalCase: row.rawCase! })
                                  }
                                  className="text-blue-600 hover:underline font-semibold cursor-pointer"
                                >
                                  فاتورة
                                </button>
                              )}
                              {row.rawReceipt && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenPrint({
                                      type: 'receipt',
                                      receipt: row.rawReceipt!,
                                      clinic: activeClinic,
                                    })
                                  }
                                  className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                                >
                                  سند قبض
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-sm text-slate-500">
                أضف عيادة أولاً لعرض كشوفات الحساب.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RECEIPTS */}
      {subTab === 'receipts' && (
        <div className="space-y-6">
          {canManageBilling && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="mb-5">
                <h3 className="text-base font-bold text-slate-900">إصدار سند قبض مالي جديد</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يُخصم المبلغ تلقائياً من مديونية العيادة ويُحفظ برقم تسلسلي جاهز للطباعة
                </p>
              </div>

              <form onSubmit={handleSubmitReceipt} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">العيادة الدافعة</label>
                  <select
                    value={formClinicId}
                    onChange={(e) => {
                      setFormClinicId(e.target.value);
                      setFormCaseId('');
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
                  >
                    {clinics.map((c) => {
                      const fin = computeClinicFinancials(c, cases, receipts);
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} (الرصيد: {fin.netBalance.toLocaleString()} {currency})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    ربط بحالة محددة (اختياري)
                  </label>
                  <select
                    value={formCaseId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setFormCaseId(cid);
                      const matched = formClinicCases.find((cs) => cs.id === cid);
                      if (matched && !formAmount) {
                        setFormAmount(String(matched.price));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-600 focus:bg-white"
                  >
                    <option value="">دفعة عامة على الحساب الجاري</option>
                    {formClinicCases.map((cs) => (
                      <option key={cs.id} value={cs.id}>
                        #{cs.id} — {cs.patientName} ({cs.price} {currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    المبلغ المقبوض ({currency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono tabular-nums font-bold text-emerald-700 outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">طريقة السداد</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">تاريخ السند</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    رقم الحوالة / المرجع (اختياري)
                  </label>
                  <input
                    type="text"
                    value={formRefNo}
                    onChange={(e) => setFormRefNo(e.target.value)}
                    placeholder="مثلاً: TR-90128"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">ملاحظات البيان</label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="دفعة من الحساب الجاري أو سداد فاتورة شهرية..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <PlusCircle size={16} />
                    <span>اعتماد وحفظ سند القبض</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-slate-900">سجل سندات القبض الصادرة</h3>
              <div className="relative">
                <Search size={15} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={receiptSearch}
                  onChange={(e) => setReceiptSearch(e.target.value)}
                  placeholder="بحث برقم السند أو اسم العيادة..."
                  className="bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-1.5 text-xs w-64 outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">رقم السند</th>
                    <th className="py-3 px-4">التاريخ</th>
                    <th className="py-3 px-4">العيادة</th>
                    <th className="py-3 px-4">طريقة السداد</th>
                    <th className="py-3 px-4">البيان / الحالة</th>
                    <th className="py-3 px-4 text-left">المبلغ</th>
                    <th className="py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceipts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        لا توجد سندات قبض مطابقة للبحث
                      </td>
                    </tr>
                  ) : (
                    filteredReceipts.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-900">
                          {r.id}
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600">
                          {r.date}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{r.clinicName}</td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {PAYMENT_METHOD_LABELS[r.method]}
                          {r.referenceNo ? ` · ${r.referenceNo}` : ''}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {r.caseId ? `حالة #${r.caseId}` : 'دفعة حساب جاري'}
                          {r.notes ? ` · ${r.notes}` : ''}
                        </td>
                        <td className="py-3.5 px-4 text-left font-mono tabular-nums font-bold text-emerald-700">
                          {r.amount.toLocaleString()} {currency}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenPrint({ type: 'receipt', receipt: r })}
                              className="px-2.5 py-1 border border-slate-200 hover:border-blue-500 hover:text-blue-700 rounded-md font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer size={13} />
                              <span>طباعة</span>
                            </button>
                            {canManageBilling &&
                              (confirmDeleteId === r.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteReceipt(r.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 bg-red-600 text-white rounded-md font-bold cursor-pointer"
                                >
                                  تأكيد الحذف
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(r.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                                  title="حذف السند"
                                >
                                  <Trash2 size={14} />
                                </button>
                              ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OPERATING EXPENSES & SUPPLIERS */}
      {subTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {canManageBilling && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  تسجيل مصروف تشغيلي أو فاتورة شراء خامات للفرع
                </h3>
                <form onSubmit={handleSubmitExpense} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">بند المصروف</label>
                    <select
                      value={expCategory}
                      onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                    >
                      {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">بيان المصروف / الفاتورة</label>
                    <input
                      type="text"
                      required
                      value={expTitle}
                      onChange={(e) => setExpTitle(e.target.value)}
                      placeholder="مثلاً: شراء أقراص زيركون A1 أو صيانة فرن التلبيد..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">المورد / الجهة (اختياري)</label>
                    <input
                      type="text"
                      list="suppliers-list"
                      value={expSupplier}
                      onChange={(e) => setExpSupplier(e.target.value)}
                      placeholder="اختر أو اكتب اسم المورد..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                    <datalist id="suppliers-list">
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">
                      المبلغ ({currency})
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-red-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">التاريخ</label>
                    <input
                      type="date"
                      required
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">وسيلة الدفع</label>
                    <select
                      value={expMethod}
                      onChange={(e) => setExpMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                    >
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">ملاحظات</label>
                    <input
                      type="text"
                      value={expNotes}
                      onChange={(e) => setExpNotes(e.target.value)}
                      placeholder="رقم فاتورة المورد..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-red-600 text-white rounded-lg py-2 px-4 text-xs font-bold transition-colors cursor-pointer"
                    >
                      اعتماد قيد المصروف
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">دفتر المصروفات التشغيلية والمشتريات</h3>
                <span className="text-xs font-mono font-bold text-red-600">
                  الإجمالي: {summary.totalExpenses.toLocaleString()} {currency}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">البند</th>
                      <th className="py-3 px-4">البيان والمورد</th>
                      <th className="py-3 px-4 text-left">المبلغ</th>
                      <th className="py-3 px-4 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          لا توجد مصروفات مسجلة
                        </td>
                      </tr>
                    ) : (
                      expenses.map((ex) => (
                        <tr key={ex.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-600">
                            {ex.date}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {EXPENSE_CATEGORY_LABELS[ex.category]}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{ex.title}</div>
                            {ex.supplierName && (
                              <div className="text-[11px] text-slate-500">المورد: {ex.supplierName}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-left font-mono tabular-nums font-bold text-red-600">
                            {ex.amount.toLocaleString()} {currency}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {canManageBilling && (
                              <button
                                type="button"
                                onClick={() => onDeleteExpense(ex.id)}
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Suppliers Directory */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package size={17} className="text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">دليل شركات وموردي الخامات</h3>
                <p className="text-[11px] text-slate-500">شركات الزيركون والإيماكس والصيانة</p>
              </div>
            </div>

            {canManageBilling && (
              <form onSubmit={handleSubmitSupplier} className="space-y-2.5">
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="اسم الشركة الموردة..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                />
                <input
                  type="text"
                  value={supSpecialty}
                  onChange={(e) => setSupSpecialty(e.target.value)}
                  placeholder="التخصص (أقراص زيركون / أفران)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="هاتف المورد..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-xs font-bold cursor-pointer"
                  >
                    إضافة
                  </button>
                </div>
              </form>
            )}

            <div className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <div key={s.id} className="py-3 flex items-start justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-slate-500 mt-0.5">{s.specialty}</div>
                    {s.phone && <div className="font-mono text-slate-600 mt-0.5">{s.phone}</div>}
                  </div>
                  {canManageBilling && (
                    <button
                      type="button"
                      onClick={() => onDeleteSupplier(s.id)}
                      className="text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATED PROFIT & LOSS (P&L) */}
      {subTab === 'pnl' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                قائمة الدخل والأرباح والخسائر الشهرية للفرع (Profit & Loss Statement)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                احتساب آلي يدمج مبيعات الحالات، مقبوضات الصندوق، رواتب وعمولات الطاقم، والمصروفات التشغيلية
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="month"
                value={pnlMonth}
                onChange={(e) => setPnlMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold"
              />
              <button
                type="button"
                onClick={() => setPnlMonth('')}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer"
              >
                تراكمي شامل
              </button>
              <button
                type="button"
                onClick={exportPnLCSV}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} />
                <span>تصدير CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500 block">1. إجمالي المبيعات المفوترة</span>
              <strong className="text-xl font-mono tabular-nums text-slate-900 mt-1 block">
                {pnlReport.billedRevenue.toLocaleString()} {currency}
              </strong>
              <span className="text-[11px] text-slate-500">عدد الحالات: {pnlReport.casesCount}</span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500 block">2. تكلفة رواتب وعمولات الطاقم</span>
              <strong className="text-xl font-mono tabular-nums text-amber-700 mt-1 block">
                - {pnlReport.totalPayrollAccrued.toLocaleString()} {currency}
              </strong>
              <span className="text-[11px] text-slate-500">
                رواتب: {pnlReport.totalBaseSalaries.toLocaleString()} · عمولات:{' '}
                {pnlReport.totalTechCommissions.toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500 block">3. المصروفات التشغيلية والخامات</span>
              <strong className="text-xl font-mono tabular-nums text-red-600 mt-1 block">
                - {pnlReport.totalOperatingExpenses.toLocaleString()} {currency}
              </strong>
              <span className="text-[11px] text-slate-500">شاملة الخامات والصيانة والمناديب</span>
            </div>

            <div className="p-4 rounded-xl border-2 border-slate-900 bg-slate-900 text-white">
              <span className="text-xs text-slate-300 block">4. صافي الربح المحاسبي للفرع</span>
              <strong
                className={`text-xl font-mono tabular-nums mt-1 block ${
                  pnlReport.netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {pnlReport.netOperatingProfit.toLocaleString()} {currency}
              </strong>
              <span className="text-[11px] text-slate-300">
                هامش الربح: {pnlReport.profitMarginPct}%
                {secondaryCurrency && exchangeRate && exchangeRate > 0
                  ? ` · يعادل ${Math.round(pnlReport.netOperatingProfit / exchangeRate).toLocaleString()} ${secondaryCurrency}`
                  : ''}
              </span>
            </div>
          </div>

          {/* Expense Breakdown by Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">تحليل بنود المصروفات التشغيلية</h4>
              {(Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][]).map(
                ([catKey, label]) => {
                  const val = pnlReport.categoryTotals[catKey] || 0;
                  const pct =
                    pnlReport.totalOperatingExpenses > 0
                      ? Math.round((val / pnlReport.totalOperatingExpenses) * 100)
                      : 0;
                  return (
                    <div key={catKey} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">{label}</span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {val.toLocaleString()} {currency} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-900">ملخص السيولة النقدية الفعلية (Cash Flow)</h4>
                <p className="text-xs text-slate-500">
                  يقارن المقبوضات الفعلية المسجلة بسندات القبض مقابل إجمالي التكاليف والرواتب والمصروفات:
                </p>
              </div>
              <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">النقد المحصل فعلياً (سندات قبض):</span>
                  <strong className="font-mono tabular-nums text-emerald-700">
                    + {pnlReport.collectedCash.toLocaleString()} {currency}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">إجمالي الأجور والمصروفات المقيدة:</span>
                  <strong className="font-mono tabular-nums text-red-600">
                    - {pnlReport.totalAllCosts.toLocaleString()} {currency}
                  </strong>
                </div>
                <div className="flex justify-between text-sm font-extrabold border-t border-slate-200 pt-2">
                  <span className="text-slate-900">صافي فائض / عجز السيولة النقدية:</span>
                  <span
                    className={`font-mono tabular-nums ${
                      pnlReport.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {pnlReport.netCashFlow.toLocaleString()} {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
