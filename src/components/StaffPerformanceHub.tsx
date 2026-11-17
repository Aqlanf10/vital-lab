import React, { useMemo, useState } from 'react';
import {
  CompensationType,
  DentalCase,
  Staff,
  StaffTransaction,
  StaffTransactionType,
  UserRole,
} from '../types';
import {
  COMPENSATION_TYPE_LABELS,
  computeStaffKPIs,
  computeStaffMonthlyPayroll,
  computeStaffWorkload,
  getStaffCompensationSummary,
  ROLE_LABELS,
  STAFF_TRANSACTION_LABELS,
  STATUS_LABELS,
} from '../data/seedData';
import { PrintModalPayload } from './PrintModals';
import {
  Activity,
  ArrowLeftRight,
  Award,
  CheckCircle2,
  KeyRound,
  PlusCircle,
  Printer,
  ShieldCheck,
  Star,
  Trash2,
  UserCog,
  Wallet,
} from 'lucide-react';

interface StaffPerformanceHubProps {
  staff: Staff[];
  cases: DentalCase[];
  staffTransactions: StaffTransaction[];
  currentUser: Staff | null;
  currency: string;
  canManageStaff: boolean;
  canManagePayroll: boolean;
  canEditCases: boolean;
  onUpdateStaffList: (next: Staff[]) => void;
  onAddStaffMember: (newMember: Omit<Staff, 'id'>) => void;
  onDeleteStaffMember: (id: string) => void;
  onAddStaffTransaction: (tx: Omit<StaffTransaction, 'id'>) => void;
  onDeleteStaffTransaction: (id: string) => void;
  onOpenTransferModal: (dentalCase: DentalCase) => void;
  onOpenQualityModal: (dentalCase: DentalCase) => void;
  onOpenPrint: (payload: PrintModalPayload) => void;
}

type StaffSubTab = 'workload' | 'performance' | 'payroll' | 'contracts';

export const StaffPerformanceHub: React.FC<StaffPerformanceHubProps> = ({
  staff,
  cases,
  staffTransactions,
  currentUser,
  currency,
  canManageStaff,
  canManagePayroll,
  canEditCases,
  onUpdateStaffList,
  onAddStaffMember,
  onDeleteStaffMember,
  onAddStaffTransaction,
  onDeleteStaffTransaction,
  onOpenTransferModal,
  onOpenQualityModal,
  onOpenPrint,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const defaultMonth = todayStr.slice(0, 7);

  const [subTab, setSubTab] = useState<StaffSubTab>('workload');
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [kpiScope, setKpiScope] = useState<'all' | 'month'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // New Staff Form State
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('technician');
  const [newPin, setNewPin] = useState('2222');
  const [newCompType, setNewCompType] = useState<CompensationType>('per_unit');
  const [newBaseSalary, setNewBaseSalary] = useState<number>(0);
  const [newCommissionRate, setNewCommissionRate] = useState<number>(35);
  const [newPercentageRate, setNewPercentageRate] = useState<number>(15);
  const [newMaxUnits, setNewMaxUnits] = useState<number>(18);

  // Staff Financial Transaction Form State
  const [txStaffId, setTxStaffId] = useState<string>(() => staff[1]?.id || staff[0]?.id || '');
  const [txType, setTxType] = useState<StaffTransactionType>('advance');
  const [txAmount, setTxAmount] = useState<string>('');
  const [txDate, setTxDate] = useState<string>(todayStr);
  const [txNotes, setTxNotes] = useState<string>('');

  const productionStaff = useMemo(
    () =>
      staff.filter(
        (s) => s.active !== false && (s.userRole === 'technician' || s.userRole === 'supervisor')
      ),
    [staff]
  );

  // Global Workload Metrics
  const workloadOverview = useMemo(() => {
    const items = productionStaff.map((tech) => ({
      tech,
      wl: computeStaffWorkload(tech, cases, todayStr),
    }));
    const totalActiveUnits = items.reduce((s, x) => s + x.wl.activeUnits, 0);
    const totalCapacity = items.reduce((s, x) => s + x.wl.maxUnits, 0);
    const avgLoad = totalCapacity > 0 ? Math.round((totalActiveUnits / totalCapacity) * 100) : 0;
    const transferredCasesCount = cases.filter(
      (c) => c.transferHistory && c.transferHistory.length > 0
    ).length;

    return { items, totalActiveUnits, avgLoad, transferredCasesCount };
  }, [productionStaff, cases, todayStr]);

  // Visible Staff in Payroll (Admin/Accountant sees all; Technician sees only self)
  const visiblePayrollStaff = useMemo(() => {
    if (canManagePayroll) return staff;
    if (!currentUser) return [];
    return staff.filter((s) => s.id === currentUser.id);
  }, [staff, canManagePayroll, currentUser]);

  const payrollRows = useMemo(
    () =>
      visiblePayrollStaff.map((member) => ({
        member,
        calc: computeStaffMonthlyPayroll(member, cases, staffTransactions, selectedMonth),
      })),
    [visiblePayrollStaff, cases, staffTransactions, selectedMonth]
  );

  const payrollTotals = useMemo(() => {
    return payrollRows.reduce(
      (acc, r) => ({
        baseSalaries: acc.baseSalaries + r.calc.baseSalary,
        commissionsAndBonuses:
          acc.commissionsAndBonuses + r.calc.earnedCommissions + r.calc.bonuses,
        deductionsAndAdvances:
          acc.deductionsAndAdvances + r.calc.totalDeductionsAndAdvances,
        remainingBalance: acc.remainingBalance + r.calc.remainingBalance,
      }),
      {
        baseSalaries: 0,
        commissionsAndBonuses: 0,
        deductionsAndAdvances: 0,
        remainingBalance: 0,
      }
    );
  }, [payrollRows]);

  const handleCreateStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUsername.trim()) return;

    onAddStaffMember({
      name: newName.trim(),
      username: newUsername.trim(),
      phone: newPhone.trim(),
      role: newRoleTitle.trim() || 'فني معمل رقمي',
      userRole: newUserRole,
      pin: newPin.trim() || '2222',
      compensationType: newCompType,
      baseSalary:
        newCompType === 'fixed_salary' || newCompType === 'hybrid'
          ? Number(newBaseSalary) || 0
          : 0,
      commissionRate:
        newCompType === 'per_unit' || newCompType === 'hybrid'
          ? Number(newCommissionRate) || 0
          : 0,
      percentageRate:
        newCompType === 'percentage' || newCompType === 'hybrid'
          ? Number(newPercentageRate) || 0
          : 0,
      maxActiveUnits: Math.max(5, Number(newMaxUnits) || 18),
      active: true,
    });

    setNewName('');
    setNewUsername('');
    setNewPhone('');
    setNewRoleTitle('');
  };

  const handleCreateTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(txAmount);
    const targetMember = staff.find((s) => s.id === txStaffId) || staff[0];
    if (!targetMember || numericAmount <= 0) return;

    onAddStaffTransaction({
      staffId: targetMember.id,
      staffName: targetMember.name,
      type: txType,
      amount: numericAmount,
      month: txDate.slice(0, 7) || selectedMonth,
      date: txDate,
      notes: txNotes.trim() || undefined,
      createdBy: currentUser?.name || 'الإدارة المالية',
    });

    setTxAmount('');
    setTxNotes('');
  };

  const updateSingleStaffField = <K extends keyof Staff>(
    staffId: string,
    field: K,
    value: Staff[K]
  ) => {
    onUpdateStaffList(
      staff.map((u) => (u.id === staffId ? { ...u, [field]: value } : u))
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('workload')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'workload'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity size={15} className="text-blue-600" />
            <span>ضغط العمل وتوزيع المهام</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('performance')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'performance'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award size={15} className="text-emerald-600" />
            <span>تقييم الأداء والجودة</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('payroll')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === 'payroll'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wallet size={15} className="text-violet-600" />
            <span>
              {canManagePayroll ? 'مسيرات الرواتب والسلف والخصومات' : 'كشف مستحقاتي الشهري'}
            </span>
          </button>

          {canManageStaff && (
            <button
              type="button"
              onClick={() => setSubTab('contracts')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                subTab === 'contracts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCog size={15} className="text-slate-700" />
              <span>العقود والصلاحيات وحسابات الدخول</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: LIVE WORKLOAD & FAIR DISTRIBUTION / REASSIGNMENT               */}
      {/* ===================================================================== */}
      {subTab === 'workload' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-500">الفنيون والمشرفون النشطون</div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
                {productionStaff.length}
              </div>
              <div className="text-xs text-slate-500 mt-1">جاهزون لاستلام أوامر التشغيل</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-500">إجمالي الوحدات قيد التنفيذ</div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-blue-700 mt-2">
                {workloadOverview.totalActiveUnits}
              </div>
              <div className="text-xs text-slate-500 mt-1">موزعة حالياً على خطوط الإنتاج</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-500">متوسط نسبة إشغال الطاقم</div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
                {workloadOverview.avgLoad}%
              </div>
              <div className="text-xs text-slate-500 mt-1">مقارنة بالسعة القياسية للفنيين</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200">
              <div className="text-xs font-semibold text-slate-500">حالات محولة / مشتركة</div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-700 mt-2">
                {workloadOverview.transferredCasesCount}
              </div>
              <div className="text-xs text-slate-500 mt-1">تمت موازنتها أو تقاسم عمولتها</div>
            </div>
          </div>

          {/* Technician Capacity & Active Queue Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {workloadOverview.items.map(({ tech, wl }) => {
              const barColor =
                wl.loadStatus === 'overloaded'
                  ? 'bg-red-600'
                  : wl.loadStatus === 'busy'
                  ? 'bg-amber-500'
                  : 'bg-emerald-600';
              const statusTextColor =
                wl.loadStatus === 'overloaded'
                  ? 'text-red-600'
                  : wl.loadStatus === 'busy'
                  ? 'text-amber-700'
                  : 'text-emerald-700';

              return (
                <div
                  key={tech.id}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col"
                >
                  <div className="p-5 border-b border-slate-100 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{tech.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {tech.role} · {COMPENSATION_TYPE_LABELS[tech.compensationType || 'per_unit']}
                        </p>
                      </div>
                      <div className="text-left">
                        <span className={`text-xs font-bold block ${statusTextColor}`}>
                          {wl.loadLabel}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500">
                          الإشغال: {wl.loadPercent}%
                        </span>
                      </div>
                    </div>

                    {/* Capacity Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-600">
                          حالات نشطة: <strong className="font-mono">{wl.activeCasesCount}</strong>
                          {wl.overdueCount > 0 && (
                            <span className="text-red-600 font-bold mr-2">
                              · {wl.overdueCount} متأخرة عن الموعد
                            </span>
                          )}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {wl.activeUnits} / {wl.maxUnits} وحدة
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                          style={{ width: `${Math.min(100, wl.loadPercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active Cases Assigned to This Tech */}
                  <div className="p-4 flex-1 bg-slate-50/40">
                    <div className="text-[11px] font-bold text-slate-500 mb-2.5">
                      المهام المسندة قيد التنفيذ حالياً ({wl.activeCases.length})
                    </div>

                    {wl.activeCases.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        <CheckCircle2 size={20} className="mx-auto text-emerald-500 mb-1.5" />
                        لا توجد حالات متراكمة حالياً — الفني متاح فوراً لاستلام عمل جديد
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {wl.activeCases.map((c) => {
                          const isOverdue = c.dueDate < todayStr;
                          return (
                            <div
                              key={c.id}
                              className="p-3 rounded-lg bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900">
                                  <span className="font-mono tabular-nums text-blue-700 ml-1.5">
                                    #{c.id}
                                  </span>
                                  {c.patientName}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {c.serviceType} ·{' '}
                                  <span className="font-mono tabular-nums">{c.units} وحدات</span> ·{' '}
                                  <strong>{STATUS_LABELS[c.status]}</strong>
                                  {isOverdue && (
                                    <span className="text-red-600 font-bold mr-1.5">· متأخرة</span>
                                  )}
                                </div>
                              </div>

                              {canEditCases && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => onOpenTransferModal(c)}
                                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="سحب الحالة من هذا الفني وتحويلها لفني آخر"
                                  >
                                    <ArrowLeftRight size={12} />
                                    <span>سحب / تحويل</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenQualityModal(c)}
                                    className="p-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md transition-colors cursor-pointer"
                                    title="تقييم الجودة أو تسجيل إعادة"
                                  >
                                    <Star size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PERFORMANCE, SPEED, QUALITY & REMAKE SCORECARD                 */}
      {/* ===================================================================== */}
      {subTab === 'performance' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                مصفوفة قياس الأداء، سرعة الإنجاز، وجودة التركيبات
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تقييم موضوعي يدمج الالتزام بالمواعيد (40%)، متوسط الجودة الفنية (40%)، وعدم الإعادة (20%)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setKpiScope('all')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                    kpiScope === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  تراكمي شامل
                </button>
                <button
                  type="button"
                  onClick={() => setKpiScope('month')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                    kpiScope === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  حسب الشهر
                </button>
              </div>
              {kpiScope === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                />
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3.5 px-4">الفني / التخصص</th>
                    <th className="py-3.5 px-4 text-center">الحالات المنجزة</th>
                    <th className="py-3.5 px-4 text-center">الوحدات الفعلية</th>
                    <th className="py-3.5 px-4 text-center">سرعة الإنجاز</th>
                    <th className="py-3.5 px-4 text-center">الالتزام بالموعد</th>
                    <th className="py-3.5 px-4 text-center">تقييم الجودة</th>
                    <th className="py-3.5 px-4 text-center">معدل الإعادة (Remake)</th>
                    <th className="py-3.5 px-4 text-left">مؤشر الكفاءة الشامل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productionStaff.map((tech) => {
                    const kpi = computeStaffKPIs(
                      tech,
                      cases,
                      kpiScope === 'month' ? selectedMonth : undefined
                    );
                    const effColor =
                      kpi.efficiencyScore >= 85
                        ? 'text-emerald-700'
                        : kpi.efficiencyScore >= 70
                        ? 'text-amber-700'
                        : 'text-red-600';

                    return (
                      <tr key={tech.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{tech.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{tech.role}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums font-semibold">
                          {kpi.completedCasesCount} / {kpi.participatedCasesCount}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums font-bold text-blue-700">
                          {kpi.completedEffectiveUnits}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-700">
                          {kpi.avgTurnaroundDays > 0 ? `${kpi.avgTurnaroundDays} يوم` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums font-bold">
                          <span
                            className={
                              kpi.onTimeRate >= 85
                                ? 'text-emerald-700'
                                : kpi.onTimeRate >= 65
                                ? 'text-amber-700'
                                : 'text-red-600'
                            }
                          >
                            {kpi.onTimeRate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-slate-900">
                            <Star size={13} className="text-amber-500 fill-amber-500" />
                            <span>{kpi.avgQualityRating.toFixed(1)}</span>
                            <span className="text-[10px] text-slate-400">/ 5</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono tabular-nums">
                          {kpi.remakeCount === 0 ? (
                            <span className="text-emerald-700 font-semibold">0% (بلا إعادة)</span>
                          ) : (
                            <span className="text-red-600 font-bold">
                              {kpi.remakeRate}% ({kpi.remakeCount})
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-left">
                          <div className={`font-mono tabular-nums text-sm font-extrabold ${effColor}`}>
                            {kpi.efficiencyScore}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: MONTHLY PAYROLL, ADVANCES, BONUSES & DEDUCTIONS                */}
      {/* ===================================================================== */}
      {subTab === 'payroll' && (
        <div className="space-y-6">
          {/* Month Picker & Summary Strip */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {canManagePayroll
                  ? 'مسير الرواتب والعمولات والسلف الشهري للفرع'
                  : `كشف مستحقاتك الشهري (${currentUser?.name})`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                يحسب تلقائياً الراتب الثابت + عمولات الحالات الفردية والمشتركة + المكافآت ناقصاً السلف والخصومات
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">الشهر المالي:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {canManagePayroll && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">إجمالي الرواتب الأساسية</span>
                <strong className="text-xl font-extrabold font-mono tabular-nums text-slate-900 mt-1 block">
                  {payrollTotals.baseSalaries.toLocaleString()} {currency}
                </strong>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">العمولات الإنتاجية والمكافآت</span>
                <strong className="text-xl font-extrabold font-mono tabular-nums text-emerald-700 mt-1 block">
                  + {payrollTotals.commissionsAndBonuses.toLocaleString()} {currency}
                </strong>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">إجمالي السلف والخصومات</span>
                <strong className="text-xl font-extrabold font-mono tabular-nums text-red-600 mt-1 block">
                  - {payrollTotals.deductionsAndAdvances.toLocaleString()} {currency}
                </strong>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">صافي المتبقي للصرف بالشهر</span>
                <strong className="text-xl font-extrabold font-mono tabular-nums text-blue-700 mt-1 block">
                  {payrollTotals.remainingBalance.toLocaleString()} {currency}
                </strong>
              </div>
            </div>
          )}

          {/* Record Staff Financial Entry (Admin / Accountant only) */}
          {canManagePayroll && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h4 className="text-xs font-bold text-slate-900 mb-3">
                تسجيل حركة مالية على حساب موظف / فني (سلفة، مكافأة، خصم، أو صرف مستحقات)
              </h4>
              <form
                onSubmit={handleCreateTransactionSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
              >
                <select
                  value={txStaffId}
                  onChange={(e) => setTxStaffId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as StaffTransactionType)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
                >
                  <option value="advance">سلفة مالية</option>
                  <option value="bonus">مكافأة تشجيعية</option>
                  <option value="deduction">خصم إداري / إعادة عمل</option>
                  <option value="payout">صرف راتب / تصفية مستحقات</option>
                </select>

                <input
                  type="number"
                  min={1}
                  step="any"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder={`المبلغ (${currency})`}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums font-bold outline-none focus:border-blue-600"
                />

                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-blue-600"
                />

                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="البيان / السبب..."
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-600"
                />

                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PlusCircle size={14} />
                  <span>قيد الحركة</span>
                </button>
              </form>
            </div>
          )}

          {/* Monthly Payroll Statement Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3.5 px-4">الموظف ونظام التعاقد</th>
                    <th className="py-3.5 px-4 text-left">الراتب الثابت</th>
                    <th className="py-3.5 px-4 text-left">عمولات الإنتاج</th>
                    <th className="py-3.5 px-4 text-left">المكافآت</th>
                    <th className="py-3.5 px-4 text-left">السلف والخصومات</th>
                    <th className="py-3.5 px-4 text-left">المصروف فعلياً</th>
                    <th className="py-3.5 px-4 text-left">المتبقي للصرف</th>
                    <th className="py-3.5 px-4 text-center">كشف رسمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollRows.map(({ member, calc }) => (
                    <tr key={member.id} className="hover:bg-slate-50/70">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{member.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {getStaffCompensationSummary(member, currency)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono tabular-nums">
                        {calc.baseSalary.toLocaleString()} {currency}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono tabular-nums font-bold text-emerald-700">
                        {calc.earnedCommissions.toLocaleString()} {currency}
                        {calc.caseBreakdowns.length > 0 && (
                          <div className="text-[10px] font-sans text-slate-400 font-normal">
                            ({calc.caseBreakdowns.length} حالات منجزة)
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono tabular-nums text-emerald-700">
                        {calc.bonuses > 0 ? `+${calc.bonuses.toLocaleString()}` : '0'}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono tabular-nums text-red-600">
                        {calc.totalDeductionsAndAdvances > 0
                          ? `-${calc.totalDeductionsAndAdvances.toLocaleString()}`
                          : '0'}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono tabular-nums text-slate-600">
                        {calc.payouts.toLocaleString()} {currency}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono tabular-nums font-extrabold text-blue-700">
                        {calc.remainingBalance.toLocaleString()} {currency}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenPrint({
                                type: 'staff-payroll',
                                staffMember: member,
                                month: selectedMonth,
                                staffTransactions,
                              })
                            }
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-600 text-slate-800 hover:text-white rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <Printer size={13} />
                            <span>طباعة كشف</span>
                          </button>

                          {canManagePayroll && calc.remainingBalance > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                onAddStaffTransaction({
                                  staffId: member.id,
                                  staffName: member.name,
                                  type: 'payout',
                                  amount: calc.remainingBalance,
                                  month: selectedMonth,
                                  date: todayStr,
                                  notes: `تصفية وصرف صافي مستحقات شهر ${selectedMonth}`,
                                  createdBy: currentUser?.name || 'المحاسب',
                                })
                              }
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer"
                              title="صرف وتصفية الرصيد المتبقي بالكامل"
                            >
                              صرف المتبقي
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Staff Ledger Transactions List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900">
                سجل الحركات المالية المسجلة للشهر ({selectedMonth})
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-2.5 px-4">التاريخ</th>
                    <th className="py-2.5 px-4">الموظف</th>
                    <th className="py-2.5 px-4">نوع الحركة</th>
                    <th className="py-2.5 px-4">البيان</th>
                    <th className="py-2.5 px-4 text-left">المبلغ</th>
                    {canManagePayroll && <th className="py-2.5 px-4 text-center">إجراء</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffTransactions
                    .filter(
                      (tx) =>
                        tx.month === selectedMonth &&
                        (canManagePayroll || tx.staffId === currentUser?.id)
                    )
                    .map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-mono tabular-nums">{tx.date}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{tx.staffName}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-700">
                          {STAFF_TRANSACTION_LABELS[tx.type]}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">{tx.notes || '—'}</td>
                        <td className="py-2.5 px-4 text-left font-mono tabular-nums font-bold">
                          {tx.amount.toLocaleString()} {currency}
                        </td>
                        {canManagePayroll && (
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => onDeleteStaffTransaction(tx.id)}
                              className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                              title="حذف الحركة"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  {staffTransactions.filter(
                    (tx) =>
                      tx.month === selectedMonth &&
                      (canManagePayroll || tx.staffId === currentUser?.id)
                  ).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        لا توجد سلف أو خصومات أو مكافآت مقيدة في شهر {selectedMonth}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: STAFF CONTRACTS, FLEXIBLE COMPENSATION & RBAC ACCOUNTS         */}
      {/* ===================================================================== */}
      {subTab === 'contracts' && canManageStaff && (
        <div className="space-y-6">
          {/* Add New Staff & Compensation Contract Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                إضافة موظف / فني جديد وتحديد نظام التعاقد والمستحقات
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                اختر آلية المحاسبة المناسبة لكل فني (راتب ثابت، عمولة بالوحدة، نسبة مئوية من الحالة، أو مختلط)
              </p>
            </div>

            <form onSubmit={handleCreateStaffSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">الاسم الكامل</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثلاً: فني عمر الشامي"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">اسم الدخول</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="مثلاً: tech3"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">رقم الجوال</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="96777..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">كلمة المرور</label>
                  <input
                    type="text"
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">التخصص / المسمى</label>
                  <input
                    type="text"
                    required
                    value={newRoleTitle}
                    onChange={(e) => setNewRoleTitle(e.target.value)}
                    placeholder="أخصائي خزف / مصمم CAD"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">الصلاحية في النظام</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-blue-600"
                  >
                    <option value="technician">فني معمل</option>
                    <option value="supervisor">مشرف إنتاج</option>
                    <option value="accountant">محاسب مالي</option>
                    <option value="admin">مدير عام</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">نظام المستحقات</label>
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value as CompensationType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-blue-800 outline-none focus:border-blue-600"
                  >
                    <option value="per_unit">عمولة مقطوعة لكل وحدة</option>
                    <option value="percentage">نسبة مئوية % من قيمة الحالة</option>
                    <option value="fixed_salary">راتب شهري ثابت فقط</option>
                    <option value="hybrid">نظام مختلط (راتب + عمولة/نسبة)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    السعة القصوى (وحدات نشطة)
                  </label>
                  <input
                    type="number"
                    min={5}
                    value={newMaxUnits}
                    onChange={(e) => setNewMaxUnits(Number(e.target.value) || 18)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Dynamic Compensation Fields */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  {(newCompType === 'fixed_salary' || newCompType === 'hybrid') && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        الراتب الشهري الثابت ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newBaseSalary}
                        onChange={(e) => setNewBaseSalary(Number(e.target.value) || 0)}
                        className="w-36 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums font-bold"
                      />
                    </div>
                  )}

                  {(newCompType === 'per_unit' || newCompType === 'hybrid') && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        عمولة الوحدة الواحدة ({currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newCommissionRate}
                        onChange={(e) => setNewCommissionRate(Number(e.target.value) || 0)}
                        className="w-36 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums font-bold"
                      />
                    </div>
                  )}

                  {(newCompType === 'percentage' || newCompType === 'hybrid') && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        نسبة الفني من صافي الحالة (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newPercentageRate}
                        onChange={(e) => setNewPercentageRate(Number(e.target.value) || 0)}
                        className="w-36 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono tabular-nums font-bold"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  حفظ واعتماد عقد الموظف
                </button>
              </div>
            </form>
          </div>

          {/* Existing Staff Editable Contracts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {staff.map((s) => {
              const compType = s.compensationType || 'per_unit';
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{s.name}</div>
                      <div className="text-slate-500 mt-0.5">
                        {s.role} · <strong className="text-blue-700">{ROLE_LABELS[s.userRole]}</strong>
                      </div>
                    </div>

                    {s.id !== currentUser?.id &&
                      (confirmDeleteId === s.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteStaffMember(s.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-bold cursor-pointer"
                        >
                          تأكيد الحذف
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(s.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                          title="حذف الحساب"
                        >
                          <Trash2 size={14} />
                        </button>
                      ))}
                  </div>

                  {/* Compensation Contract Controls */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1">نظام المستحقات</span>
                        <select
                          value={compType}
                          onChange={(e) =>
                            updateSingleStaffField(
                              s.id,
                              'compensationType',
                              e.target.value as CompensationType
                            )
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 font-bold text-slate-900"
                        >
                          <option value="per_unit">عمولة بالوحدة</option>
                          <option value="percentage">نسبة مئوية %</option>
                          <option value="fixed_salary">راتب شهري ثابت</option>
                          <option value="hybrid">مختلط (راتب + عمولة)</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-[11px] text-slate-500 block mb-1">
                          سعة الوحدات النشطة
                        </span>
                        <input
                          type="number"
                          min={5}
                          value={s.maxActiveUnits || 18}
                          onChange={(e) =>
                            updateSingleStaffField(
                              s.id,
                              'maxActiveUnits',
                              Math.max(5, Number(e.target.value) || 18)
                            )
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 font-mono tabular-nums font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">
                          الراتب ({currency})
                        </span>
                        <input
                          type="number"
                          min={0}
                          disabled={compType === 'per_unit' || compType === 'percentage'}
                          value={s.baseSalary || 0}
                          onChange={(e) =>
                            updateSingleStaffField(
                              s.id,
                              'baseSalary',
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-full bg-white disabled:bg-slate-100 disabled:text-slate-400 border border-slate-200 rounded px-2 py-1 font-mono tabular-nums font-bold"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">
                          عمولة الوحدة
                        </span>
                        <input
                          type="number"
                          min={0}
                          disabled={compType === 'fixed_salary' || compType === 'percentage'}
                          value={s.commissionRate || 0}
                          onChange={(e) =>
                            updateSingleStaffField(
                              s.id,
                              'commissionRate',
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-full bg-white disabled:bg-slate-100 disabled:text-slate-400 border border-slate-200 rounded px-2 py-1 font-mono tabular-nums font-bold"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-500 block mb-0.5">النسبة (%)</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={compType === 'fixed_salary' || compType === 'per_unit'}
                          value={s.percentageRate || 0}
                          onChange={(e) =>
                            updateSingleStaffField(
                              s.id,
                              'percentageRate',
                              Number(e.target.value) || 0
                            )
                          }
                          className="w-full bg-white disabled:bg-slate-100 disabled:text-slate-400 border border-slate-200 rounded px-2 py-1 font-mono tabular-nums font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Login Credentials & Role */}
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">اسم الدخول</span>
                        <input
                          type="text"
                          value={s.username || ''}
                          onChange={(e) =>
                            updateSingleStaffField(s.id, 'username', e.target.value)
                          }
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-0.5">جوال الدخول</span>
                        <input
                          type="text"
                          value={s.phone || ''}
                          onChange={(e) => updateSingleStaffField(s.id, 'phone', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <KeyRound size={13} className="text-slate-400" />
                        <span>الرمز:</span>
                        <input
                          type="text"
                          value={s.pin}
                          onChange={(e) => updateSingleStaffField(s.id, 'pin', e.target.value)}
                          className="w-20 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-mono text-center"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-600">
                        <ShieldCheck size={13} className="text-blue-600" />
                        <select
                          value={s.userRole}
                          onChange={(e) =>
                            updateSingleStaffField(
                              s.id,
                              'userRole',
                              e.target.value as UserRole
                            )
                          }
                          className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-semibold"
                        >
                          <option value="admin">مدير عام</option>
                          <option value="supervisor">مشرف</option>
                          <option value="technician">فني</option>
                          <option value="accountant">محاسب</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
