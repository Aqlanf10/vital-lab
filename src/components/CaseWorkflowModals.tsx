import React, { useMemo, useState } from 'react';
import {
  CaseCommissionSplit,
  CaseStatus,
  CaseTransferEvent,
  DentalCase,
  Staff,
  StaffTransaction,
} from '../types';
import {
  computeFullCaseBaseCommission,
  computeStaffWorkload,
  getStaffCompensationSummary,
  getTechSharePercentForCase,
  STATUS_LABELS,
  TRANSFER_REASONS,
} from '../data/seedData';
import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  CheckCircle2,
  RotateCcw,
  Star,
  X,
} from 'lucide-react';

interface CaseTransferModalProps {
  dentalCase: DentalCase | null;
  staff: Staff[];
  allCases: DentalCase[];
  currentUserName: string;
  currency: string;
  canViewFinancials: boolean;
  onClose: () => void;
  onConfirmTransfer: (params: {
    caseId: string;
    newStaffId: string;
    commissionSplits?: CaseCommissionSplit[];
    transferEvent: CaseTransferEvent;
  }) => void;
}

export const CaseTransferModal: React.FC<CaseTransferModalProps> = ({
  dentalCase,
  staff,
  allCases,
  currentUserName,
  currency,
  canViewFinancials,
  onClose,
  onConfirmTransfer,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const eligibleTechs = useMemo(
    () =>
      staff.filter(
        (s) =>
          s.active !== false &&
          (s.userRole === 'technician' || s.userRole === 'supervisor') &&
          s.id !== dentalCase?.staffId
      ),
    [staff, dentalCase]
  );

  const currentTech = useMemo(
    () => staff.find((s) => s.id === dentalCase?.staffId) || null,
    [staff, dentalCase]
  );

  const [targetStaffId, setTargetStaffId] = useState<string>(
    () => eligibleTechs[0]?.id || ''
  );
  const [selectedReason, setSelectedReason] = useState<string>(TRANSFER_REASONS[0]);
  const [extraNote, setExtraNote] = useState<string>('');
  const [commissionMode, setCommissionMode] = useState<'full_transfer' | 'split'>('split');
  // Outgoing tech share of their current available share (default 40% to previous tech, 60% to new tech)
  const [previousKeepRatio, setPreviousKeepRatio] = useState<number>(40);

  if (!dentalCase) return null;

  const targetTech = staff.find((s) => s.id === targetStaffId) || eligibleTechs[0] || null;
  const currentTechExistingShare = currentTech
    ? getTechSharePercentForCase(dentalCase, currentTech.id) || 100
    : 100;

  const prevFinalShare =
    commissionMode === 'full_transfer'
      ? 0
      : Math.round((currentTechExistingShare * previousKeepRatio) / 100);
  const newFinalShare =
    commissionMode === 'full_transfer'
      ? 100
      : Math.max(0, currentTechExistingShare - prevFinalShare);

  const prevEstimatedCommission = currentTech
    ? Math.round(
        ((computeFullCaseBaseCommission(dentalCase, currentTech) * prevFinalShare) / 100) * 100
      ) / 100
    : 0;
  const newEstimatedCommission = targetTech
    ? Math.round(
        ((computeFullCaseBaseCommission(dentalCase, targetTech) * newFinalShare) / 100) * 100
      ) / 100
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTech) return;

    const fullReason = extraNote.trim()
      ? `${selectedReason} — ${extraNote.trim()}`
      : selectedReason;

    let updatedSplits: CaseCommissionSplit[] | undefined = undefined;

    if (commissionMode === 'full_transfer') {
      updatedSplits = [
        {
          staffId: targetTech.id,
          staffName: targetTech.name,
          sharePercent: 100,
          roleNote: 'نقل كامل المسؤولية والعمولة',
        },
      ];
    } else {
      // Preserve any third-party earlier splits, and split currentTech's portion between currentTech and targetTech
      const otherSplits = (dentalCase.commissionSplits || []).filter(
        (sp) => sp.staffId !== currentTech?.id && sp.staffId !== targetTech.id
      );
      const existingTargetShare =
        (dentalCase.commissionSplits || []).find((sp) => sp.staffId === targetTech.id)
          ?.sharePercent || 0;

      const nextSplits: CaseCommissionSplit[] = [...otherSplits];
      if (currentTech && prevFinalShare > 0) {
        nextSplits.push({
          staffId: currentTech.id,
          staffName: currentTech.name,
          sharePercent: prevFinalShare,
          roleNote: `مرحلة سابقة (${STATUS_LABELS[dentalCase.status]})`,
        });
      }
      if (existingTargetShare + newFinalShare > 0) {
        nextSplits.push({
          staffId: targetTech.id,
          staffName: targetTech.name,
          sharePercent: existingTargetShare + newFinalShare,
          roleNote: 'استكمال وتنفيذ الحالة بعد التحويل',
        });
      }
      updatedSplits = nextSplits;
    }

    const transferEvent: CaseTransferEvent = {
      id: `TRF-${Date.now().toString().slice(-4)}`,
      fromStaffId: currentTech?.id || dentalCase.staffId || 'NONE',
      fromStaffName: currentTech?.name || 'غير معين',
      toStaffId: targetTech.id,
      toStaffName: targetTech.name,
      reason: fullReason,
      commissionMode,
      previousSharePercent: prevFinalShare,
      newSharePercent: newFinalShare,
      stageAtTransfer: dentalCase.status,
      timestamp: new Date().toISOString().split('T')[0],
      transferredBy: currentUserName,
    };

    onConfirmTransfer({
      caseId: dentalCase.id,
      newStaffId: targetTech.id,
      commissionSplits: updatedSplits,
      transferEvent,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <ArrowLeftRight size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                سحب وتحويل الحالة #{dentalCase.id} إلى فني آخر
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                المريض: {dentalCase.patientName} · {dentalCase.units} وحدات · المرحلة:{' '}
                {STATUS_LABELS[dentalCase.status]}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Current Holder Summary */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">الفني المسؤول حالياً: </span>
              <strong className="text-slate-900">{currentTech?.name || 'غير معين'}</strong>
              {currentTech && (
                <span className="text-slate-500 mr-2">
                  · حصة العمولة الحالية:{' '}
                  <strong className="font-mono tabular-nums text-blue-700">
                    {currentTechExistingShare}%
                  </strong>
                </span>
              )}
            </div>
            {canViewFinancials && (
              <div className="font-mono tabular-nums text-slate-700">
                صافي الحالة: <strong>{dentalCase.price.toLocaleString()}</strong> {currency}
              </div>
            )}
          </div>

          {/* Step 1: Select Target Technician with Live Workload Indicator */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">
              1. اختر الفني البديل لاستلام الحالة (مع مؤشر ضغط العمل الحالي)
            </label>
            {eligibleTechs.length === 0 ? (
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
                لا يوجد فني آخر متاح في هذا الفرع. يرجى إضافة فني جديد من قسم الطاقم أولاً.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {eligibleTechs.map((tech) => {
                  const wl = computeStaffWorkload(tech, allCases, todayStr);
                  const isSelected = (targetTech?.id || '') === tech.id;
                  const barColor =
                    wl.loadStatus === 'overloaded'
                      ? 'bg-red-600'
                      : wl.loadStatus === 'busy'
                      ? 'bg-amber-500'
                      : 'bg-emerald-600';
                  const statusColor =
                    wl.loadStatus === 'overloaded'
                      ? 'text-red-600'
                      : wl.loadStatus === 'busy'
                      ? 'text-amber-700'
                      : 'text-emerald-700';

                  return (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => setTargetStaffId(tech.id)}
                      className={`p-3.5 rounded-xl border text-right transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-slate-900">{tech.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{tech.role}</div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                        )}
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`font-semibold ${statusColor}`}>{wl.loadLabel}</span>
                          <span className="font-mono tabular-nums text-slate-700 font-bold">
                            {wl.activeUnits} / {wl.maxUnits} وحدة
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                            style={{ width: `${Math.min(100, wl.loadPercent)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center justify-between">
                          <span>{wl.activeCasesCount} حالات قيد التنفيذ</span>
                          {wl.overdueCount > 0 && (
                            <span className="text-red-600 font-semibold">
                              متأخر: {wl.overdueCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Withdrawal / Transfer Reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                2. سبب سحب وتحويل الحالة
              </label>
              <select
                value={selectedReason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-600"
              >
                {TRANSFER_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">
                ملاحظة تسليم للفني الجديد (اختياري)
              </label>
              <input
                type="text"
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="مثلاً: تم إنهاء خرط الزيركون وبانتظار التزجيج..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Step 3: Commission Settlement Rule */}
          <div className="space-y-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
            <label className="text-xs font-bold text-slate-900 block">
              3. آلية معالجة العمولة المالية للحالة بعد السحب
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCommissionMode('split')}
                className={`px-3.5 py-2.5 rounded-lg border text-right text-xs transition-colors cursor-pointer ${
                  commissionMode === 'split'
                    ? 'border-blue-600 bg-white text-slate-900 font-bold'
                    : 'border-slate-200 bg-slate-100/60 text-slate-600 font-medium'
                }`}
              >
                <div>تقاسم العمولة بين الفني السابق والجديد</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                  يحفظ حق الفني الأول عن المرحلة المنجزة ويوزع الباقي للجديد
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCommissionMode('full_transfer')}
                className={`px-3.5 py-2.5 rounded-lg border text-right text-xs transition-colors cursor-pointer ${
                  commissionMode === 'full_transfer'
                    ? 'border-blue-600 bg-white text-slate-900 font-bold'
                    : 'border-slate-200 bg-slate-100/60 text-slate-600 font-medium'
                }`}
              >
                <div>نقل كامل العمولة (100%) للفني الجديد</div>
                <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                  تُسحب العمولة بالكامل من الفني السابق وتُقيد للفني البديل
                </div>
              </button>
            </div>

            {commissionMode === 'split' && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-semibold">
                    حصة {currentTech?.name || 'الفني السابق'}:{' '}
                    <strong className="font-mono tabular-nums text-amber-700">
                      {prevFinalShare}%
                    </strong>
                  </span>
                  <span className="text-slate-700 font-semibold">
                    حصة {targetTech?.name || 'الفني الجديد'}:{' '}
                    <strong className="font-mono tabular-nums text-emerald-700">
                      {newFinalShare}%
                    </strong>
                  </span>
                </div>

                <input
                  type="range"
                  min={5}
                  max={95}
                  step={5}
                  value={previousKeepRatio}
                  onChange={(e) => setPreviousKeepRatio(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />

                {canViewFinancials && (
                  <div className="grid grid-cols-2 gap-3 text-[11px] pt-1">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-500 block">
                        استحقاق {currentTech?.name || 'السابق'} عند الإنجاز
                      </span>
                      <strong className="font-mono tabular-nums text-slate-900 text-xs">
                        {prevEstimatedCommission.toLocaleString()} {currency}
                      </strong>
                      {currentTech && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ({getStaffCompensationSummary(currentTech, currency)})
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-slate-500 block">
                        استحقاق {targetTech?.name || 'الجديد'} عند الإنجاز
                      </span>
                      <strong className="font-mono tabular-nums text-emerald-700 text-xs">
                        {newEstimatedCommission.toLocaleString()} {currency}
                      </strong>
                      {targetTech && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          ({getStaffCompensationSummary(targetTech, currency)})
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={!targetTech}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeftRight size={14} />
              <span>اعتماد التحويل وتحديث العمولات</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. Quality Evaluation, Remake Tracking & Audit History Modal
// ============================================================================

interface CaseQualityModalProps {
  dentalCase: DentalCase | null;
  staff: Staff[];
  currentUserName: string;
  currency: string;
  canManageDeductions: boolean;
  onClose: () => void;
  onSaveQualityEvaluation: (params: {
    caseId: string;
    qualityRating: number;
    qualityNotes: string;
    isRemake: boolean;
    remakeReason?: string;
    remakeStaffId?: string;
    resetToDesigning?: boolean;
    deductionTransaction?: Omit<StaffTransaction, 'id'>;
  }) => void;
}

const REMAKE_REASONS = [
  'عدم تطابق درجة اللون (Shade Mismatch)',
  'تعديل إطباق مرتفع أو منخفض (Occlusion)',
  'نقص انطباق الحواف (Marginal Fit)',
  'كسر أو تشقق في طبقة الخزف',
  'تغيير خطة التحضير من العيادة',
];

export const CaseQualityModal: React.FC<CaseQualityModalProps> = ({
  dentalCase,
  staff,
  currentUserName,
  currency,
  canManageDeductions,
  onClose,
  onSaveQualityEvaluation,
}) => {
  const [rating, setRating] = useState<number>(() => dentalCase?.qualityRating || 5);
  const [qualityNotes, setQualityNotes] = useState<string>(() => dentalCase?.qualityNotes || '');
  const [isRemake, setIsRemake] = useState<boolean>(() => Boolean(dentalCase?.isRemake));
  const [remakeReason, setRemakeReason] = useState<string>(
    () => dentalCase?.remakeReason || REMAKE_REASONS[0]
  );
  const [remakeStaffId, setRemakeStaffId] = useState<string>(
    () => dentalCase?.remakeStaffId || dentalCase?.staffId || ''
  );
  const [resetToDesigning, setResetToDesigning] = useState<boolean>(false);
  const [deductionAmount, setDeductionAmount] = useState<number>(0);

  if (!dentalCase) return null;

  const techOptions = staff.filter(
    (s) => s.userRole === 'technician' || s.userRole === 'supervisor'
  );

  const ratingLabels: Record<number, string> = {
    5: 'ممتاز — مطابقة مثالية من المرة الأولى',
    4: 'جيد جداً — جودة عالية',
    3: 'مقبول — ضمن المعايير القياسية',
    2: 'دون المأمول — تطلب تعديلاً بسيطاً',
    1: 'مرفوض فنياً — تطلب إعادة عمل',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.slice(0, 7);
    const responsibleStaff = staff.find((s) => s.id === remakeStaffId);

    const deductionTx: Omit<StaffTransaction, 'id'> | undefined =
      isRemake && canManageDeductions && deductionAmount > 0 && responsibleStaff
        ? {
            staffId: responsibleStaff.id,
            staffName: responsibleStaff.name,
            type: 'deduction',
            amount: deductionAmount,
            month: currentMonth,
            date: todayStr,
            notes: `خصم إعادة تصنيع على الحالة #${dentalCase.id} (${remakeReason})`,
            createdBy: currentUserName,
          }
        : undefined;

    onSaveQualityEvaluation({
      caseId: dentalCase.id,
      qualityRating: rating,
      qualityNotes: qualityNotes.trim(),
      isRemake,
      remakeReason: isRemake ? remakeReason : undefined,
      remakeStaffId: isRemake ? remakeStaffId : undefined,
      resetToDesigning: isRemake && resetToDesigning,
      deductionTransaction: deductionTx,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Award size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                فحص الجودة وتقييم الأداء للحالة #{dentalCase.id}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {dentalCase.patientName} · {dentalCase.serviceType} ({dentalCase.units} وحدات)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Star Quality Rating */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-800 block">
              درجة جودة التنفيذ والانطباق والتلوين (1 إلى 5)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[1, 2, 3, 4, 5].map((score) => {
                const active = score <= rating;
                return (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setRating(score)}
                    className={`px-3.5 py-2 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      rating === score
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Star
                      size={15}
                      className={active ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}
                    />
                    <span className="font-mono tabular-nums">{score}/5</span>
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-600 font-semibold">{ratingLabels[rating]}</div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 block">
              ملاحظات مشرف الجودة الفاحص
            </label>
            <input
              type="text"
              value={qualityNotes}
              onChange={(e) => setQualityNotes(e.target.value)}
              placeholder="ملاحظات حول دقة الحواف، الإطباق، الشفافية..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs outline-none focus:border-blue-600"
            />
          </div>

          {/* Remake / Adjustment Toggle */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div className="flex items-center gap-2">
                <RotateCcw size={16} className={isRemake ? 'text-red-600' : 'text-slate-400'} />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    تسجيل حالة إعادة تصنيع أو تعديل سريري (Remake / Return)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    يُحتسب ضمن معدل الإعادة الشهري لتقييم أداء الفني المسؤول بدقة
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isRemake}
                onChange={(e) => {
                  setIsRemake(e.target.checked);
                  if (e.target.checked && rating > 2) setRating(2);
                }}
                className="w-4 h-4 accent-red-600 cursor-pointer"
              />
            </label>

            {isRemake && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      سبب الإعادة / التعديل
                    </label>
                    <select
                      value={remakeReason}
                      onChange={(e) => setRemakeReason(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                    >
                      {REMAKE_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      الفني المقيد عليه مؤشر الإعادة
                    </label>
                    <select
                      value={remakeStaffId}
                      onChange={(e) => setRemakeStaffId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                    >
                      {techOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resetToDesigning}
                      onChange={(e) => setResetToDesigning(e.target.checked)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span>إرجاع مرحلة الحالة تلقائياً إلى (تصميم CAD) لإعادة العمل</span>
                  </label>

                  {canManageDeductions && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-600">خصم تكلفة خامة (اختياري):</span>
                      <input
                        type="number"
                        min={0}
                        value={deductionAmount}
                        onChange={(e) => setDeductionAmount(Number(e.target.value) || 0)}
                        className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1 font-mono tabular-nums font-bold text-red-700"
                      />
                      <span className="text-slate-500">{currency}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Transfer Audit Log if any */}
          {dentalCase.transferHistory && dentalCase.transferHistory.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600" />
                <span>سجل تحويلات الفنيين على هذه الحالة ({dentalCase.transferHistory.length})</span>
              </div>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/40 text-xs">
                {dentalCase.transferHistory.map((tr) => (
                  <div key={tr.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        من {tr.fromStaffName} ← إلى {tr.toStaffName}
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-slate-500">
                        {tr.timestamp}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      السبب: {tr.reason} · توزيع العمولة:{' '}
                      <strong className="font-mono tabular-nums">
                        {tr.previousSharePercent}% للسابق / {tr.newSharePercent}% للجديد
                      </strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              حفظ تقييم الجودة والاعتماد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
