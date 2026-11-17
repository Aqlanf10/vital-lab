import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Branch,
  Clinic,
  CourierOrder,
  DentalCase,
  LabSettings,
  PaymentReceipt,
  Staff,
  StaffTransaction,
} from '../types';
import {
  COMPENSATION_TYPE_LABELS,
  computeClinicFinancials,
  computeStaffMonthlyPayroll,
  COURIER_DIRECTION_LABELS,
  COURIER_STATUS_LABELS,
  getStaffCompensationSummary,
  PAYMENT_METHOD_LABELS,
  STAFF_TRANSACTION_LABELS,
  STATUS_LABELS,
} from '../data/seedData';
import { Printer, ShieldCheck, X } from 'lucide-react';

export type PrintModalPayload =
  | { type: 'invoice'; dentalCase: DentalCase }
  | { type: 'job-card'; dentalCase: DentalCase }
  | { type: 'warranty-card'; dentalCase: DentalCase }
  | { type: 'courier-manifest'; courierOrder: CourierOrder }
  | { type: 'receipt'; receipt: PaymentReceipt; clinic?: Clinic }
  | { type: 'statement'; clinic: Clinic; dateFrom?: string; dateTo?: string }
  | {
      type: 'staff-payroll';
      staffMember: Staff;
      month: string;
      staffTransactions: StaffTransaction[];
    };

interface PrintModalsProps {
  payload: PrintModalPayload | null;
  onClose: () => void;
  branch: Branch;
  labSettings: LabSettings;
  cases: DentalCase[];
  receipts: PaymentReceipt[];
  staff: Staff[];
  clinics: Clinic[];
}

export const PrintModals: React.FC<PrintModalsProps> = ({
  payload,
  onClose,
  branch,
  labSettings,
  cases,
  receipts,
  staff,
  clinics,
}) => {
  if (!payload) return null;

  const currency = labSettings.currency || 'ر.س';
  const secondaryCurrency = labSettings.secondaryCurrency || '';
  const exchangeRate = Number(labSettings.exchangeRate || 0);

  const handlePrint = () => {
    window.print();
  };

  const buildCaseQrUrl = (caseId: string) => {
    const base = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
    return `${base}?case=${encodeURIComponent(caseId)}&branch=${encodeURIComponent(branch.id)}`;
  };

  const renderHeader = (
    docTitle: string,
    docCode: string,
    docDate: string,
    qrValue?: string
  ) => (
    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{labSettings.labName}</h1>
        <p className="text-xs font-semibold text-blue-700 mt-1">
          {branch.name} · {branch.location}
        </p>
        <div className="text-xs text-slate-500 mt-2 space-y-0.5">
          <p>{labSettings.address}</p>
          <p className="font-mono tabular-nums">هاتف: {branch.phone || labSettings.whatsappPhone}</p>
          {labSettings.taxNumber && (
            <p className="font-mono tabular-nums">الرقم الضريبي: {labSettings.taxNumber}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-left">
        <div>
          <div className="text-lg font-extrabold text-slate-900">{docTitle}</div>
          <div className="text-sm font-mono tabular-nums font-semibold text-blue-700 mt-1">
            {docCode}
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500 mt-1">
            التاريخ: {docDate}
          </div>
        </div>
        {qrValue && (
          <div className="p-1.5 bg-white border border-slate-300 rounded-lg shrink-0">
            <QRCodeSVG value={qrValue} size={64} level="M" />
          </div>
        )}
      </div>
    </div>
  );

  const renderBody = () => {
    if (payload.type === 'invoice') {
      const c = payload.dentalCase;
      const matchedClinic = clinics.find(
        (cl) => cl.id === c.clinicRefId || cl.name === c.clinicId || cl.id === c.clinicId
      );
      const gross =
        (c.unitPrice || Math.round((c.price + (c.discount || 0)) / Math.max(1, c.units))) *
        c.units;
      const discount = Number(c.discount || 0);
      const secondaryEquivalent =
        secondaryCurrency && exchangeRate > 0
          ? Math.round((c.price / exchangeRate) * 100) / 100
          : null;

      return (
        <div>
          {renderHeader(
            'فاتورة مطالبة مالية',
            `INV-${c.id}`,
            c.receivedDate,
            buildCaseQrUrl(c.id)
          )}

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs text-slate-500 mb-1">الجهة الطبية / العيادة</div>
              <div className="font-bold text-slate-900">{matchedClinic?.name || c.clinicId}</div>
              {matchedClinic?.doctorName && (
                <div className="text-xs text-slate-600 mt-0.5">د. {matchedClinic.doctorName}</div>
              )}
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="text-xs text-slate-500 mb-1">بيانات المريض والحالة</div>
              <div className="font-bold text-slate-900">{c.patientName}</div>
              <div className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
                رقم الحالة: #{c.id} · التسليم: {c.dueDate}
              </div>
            </div>
          </div>

          <table className="w-full text-right border-collapse border border-slate-200 mb-6 text-sm">
            <thead>
              <tr className="bg-slate-900 text-white text-xs">
                <th className="p-3 border border-slate-800">نوع العمل والتركيبة</th>
                <th className="p-3 border border-slate-800 text-center">أرقام الأسنان (FDI)</th>
                <th className="p-3 border border-slate-800 text-center">اللون</th>
                <th className="p-3 border border-slate-800 text-center">الوحدات</th>
                <th className="p-3 border border-slate-800 text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3.5 border border-slate-200 font-semibold text-slate-900">
                  <div>{c.serviceType}</div>
                  {c.connectionType && (
                    <div className="text-xs text-slate-500 mt-0.5">
                      {c.connectionType === 'bridge' ? 'جسر متصل' : 'وحدات منفصلة'}
                    </div>
                  )}
                </td>
                <td className="p-3.5 border border-slate-200 text-center font-mono tabular-nums text-xs">
                  {c.selectedTeeth && c.selectedTeeth.length > 0
                    ? c.selectedTeeth.join(c.connectionType === 'bridge' ? '-' : ', ')
                    : '—'}
                </td>
                <td className="p-3.5 border border-slate-200 text-center font-mono font-bold">
                  {c.shade}
                </td>
                <td className="p-3.5 border border-slate-200 text-center font-mono tabular-nums font-bold">
                  {c.units}
                </td>
                <td className="p-3.5 border border-slate-200 text-left font-mono tabular-nums font-bold">
                  {gross.toLocaleString()} {currency}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end mb-10">
            <div className="w-80 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-mono tabular-nums">
                  {gross.toLocaleString()} {currency}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>الخصم الممنوح:</span>
                  <span className="font-mono tabular-nums">
                    - {discount.toLocaleString()} {currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-extrabold text-base text-slate-900 border-t-2 border-slate-900 pt-2">
                <span>الصافي المستحق:</span>
                <span className="font-mono tabular-nums text-blue-700">
                  {c.price.toLocaleString()} {currency}
                </span>
              </div>
              {secondaryEquivalent !== null && (
                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>المعادل بالعملة الأجنبية (سعر الصرف {exchangeRate}):</span>
                  <span className="font-mono tabular-nums font-bold text-slate-800">
                    {secondaryEquivalent.toLocaleString()} {secondaryCurrency}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs text-slate-500">
            <div>
              <p className="font-semibold text-slate-700 mb-6">توقيع استلام العيادة:</p>
              <div className="w-44 border-b border-slate-300" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-700 mb-6">ختم وتوقيع المعمل:</p>
              <div className="w-44 border-b border-slate-300 mr-auto" />
            </div>
          </div>
        </div>
      );
    }

    if (payload.type === 'job-card') {
      const c = payload.dentalCase;
      const tech = staff.find((s) => s.id === c.staffId);
      return (
        <div>
          {renderHeader(
            'بطاقة أمر تشغيل فني (Job Card + QR)',
            `JOB-${c.id}`,
            c.receivedDate,
            buildCaseQrUrl(c.id)
          )}

          <div className="grid grid-cols-3 gap-3 mb-6 text-sm">
            <div className="p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">اسم المريض</div>
              <div className="font-bold text-slate-900 mt-0.5">{c.patientName}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">العيادة / الطبيب</div>
              <div className="font-bold text-slate-900 mt-0.5">{c.clinicId}</div>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-500">الفني المسؤول والأولوية</div>
              <div className="font-bold text-slate-900 mt-0.5">
                {tech?.name || 'غير معين'} · {c.priority === 'urgent' ? 'مستعجل جداً' : 'عادي'}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 mb-6 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs text-slate-500 block">نوع التركيبة المطلوبة</span>
                <strong className="text-base text-slate-900">{c.serviceType}</strong>
              </div>
              <div className="text-left">
                <span className="text-xs text-slate-500 block">درجة اللون (Shade)</span>
                <strong className="text-lg font-mono text-blue-700">{c.shade}</strong>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-1 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">أرقام الأسنان (FDI)</span>
                <strong className="font-mono tabular-nums text-slate-900">
                  {c.selectedTeeth && c.selectedTeeth.length > 0
                    ? c.selectedTeeth.join(c.connectionType === 'bridge' ? ' - ' : ' , ')
                    : `${c.units} وحدات`}
                </strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">مصدر الطبعة / المسح الرقمي</span>
                <strong className="text-slate-900">
                  {c.scanFileUrl ? `مسح رقمي (${c.scanPlatform || 'STL'})` : 'طبعة تقليدية'}
                </strong>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">موعد التسليم النهائي</span>
                <strong className="font-mono tabular-nums text-red-700">{c.dueDate}</strong>
              </div>
            </div>
          </div>

          {c.commissionSplits && c.commissionSplits.length > 1 && (
            <div className="p-4 rounded-xl border border-slate-200 mb-4 text-xs">
              <div className="font-bold text-slate-800 mb-2">
                توزيع الفنيين المشاركين وحصص العمولة المعتمدة:
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {c.commissionSplits.map((sp) => (
                  <div key={sp.staffId} className="text-slate-700">
                    <strong>{sp.staffName}</strong>:{' '}
                    <span className="font-mono tabular-nums font-bold text-blue-700">
                      {sp.sharePercent}%
                    </span>
                    {sp.roleNote ? ` (${sp.roleNote})` : ''}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl border border-slate-200 mb-6">
            <div className="text-xs font-semibold text-slate-600 mb-1">
              الملاحظات السريرية والفنية:
            </div>
            <p className="text-sm text-slate-800 min-h-[36px]">
              {c.notes || 'لا توجد ملاحظات إضافية مسجلة.'}
            </p>
            {(c.deductedItemName || c.qualityRating || c.isRemake) && (
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-600 flex flex-wrap items-center gap-3">
                {c.deductedItemName && (
                  <span className="text-emerald-700 font-semibold">
                    خامة مستهلكة: {c.deductedItemName}
                  </span>
                )}
                {c.qualityRating && (
                  <span>
                    تقييم الجودة: <strong className="font-mono">{c.qualityRating}/5</strong>
                  </span>
                )}
                {c.isRemake && (
                  <span className="text-red-700 font-semibold">
                    مسجلة كحالة إعادة / تعديل ({c.remakeReason || 'مراجعة فنية'})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-700 mb-3">
              توقيع فحص الجودة لمراحل الإنتاج:
            </div>
            <div className="grid grid-cols-6 gap-2 text-center text-xs">
              {(['Scanning', 'Designing', 'Milling', 'Sintering', 'Finishing', 'Ready'] as const).map(
                (st) => (
                  <div key={st} className="border border-slate-200 rounded-lg p-2.5">
                    <div className="font-semibold text-slate-700 mb-4">{STATUS_LABELS[st]}</div>
                    <div className="border-t border-dashed border-slate-300 pt-1 text-[10px] text-slate-400">
                      توقيع الفني
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      );
    }

    if (payload.type === 'warranty-card') {
      const c = payload.dentalCase;
      const matchedClinic = clinics.find(
        (cl) => cl.id === c.clinicRefId || cl.name === c.clinicId || cl.id === c.clinicId
      );
      const years = c.warrantyYears ?? labSettings.warrantyYears ?? 5;
      const issueDateStr = c.deliveredDate || new Date().toISOString().split('T')[0];
      const issueYear = Number(issueDateStr.slice(0, 4)) || new Date().getFullYear();
      const expiryDateStr = `${issueYear + years}${issueDateStr.slice(4)}`;
      const serialCode = c.warrantySerial || `WR-${branch.id.toUpperCase()}-${c.id}`;

      return (
        <div>
          <div className="border-2 border-slate-900 rounded-2xl p-7 bg-white space-y-6">
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-700">شهادة ضمان جودة وأصالة معتمدة</div>
                  <h1 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                    {labSettings.labName} — شهادة ضمان تركيبة سنية
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {branch.name} · {branch.location}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-left">
                <div>
                  <div className="text-[11px] text-slate-500">الرقم التسلسلي للضمان</div>
                  <div className="text-sm font-mono tabular-nums font-extrabold text-blue-700">
                    {serialCode}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
                    الحالة #{c.id}
                  </div>
                </div>
                <div className="p-1.5 border border-slate-300 rounded-lg bg-white">
                  <QRCodeSVG value={buildCaseQrUrl(c.id)} size={68} level="M" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="text-xs text-slate-500">اسم المريض المستفيد</div>
                <div className="text-base font-extrabold text-slate-900">{c.patientName}</div>
                <div className="text-xs text-slate-600 pt-1">
                  العيادة المعالجة: <strong>{matchedClinic?.name || c.clinicId}</strong>
                  {matchedClinic?.doctorName ? ` (د. ${matchedClinic.doctorName})` : ''}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="text-xs text-slate-500">فترة سريان الضمان</div>
                <div className="text-base font-extrabold text-emerald-700">
                  ضمان معتمد لمدة ({years}) سنوات
                </div>
                <div className="text-xs font-mono tabular-nums text-slate-600 pt-1">
                  من تاريخ: <strong>{issueDateStr}</strong> — حتى تاريخ: <strong>{expiryDateStr}</strong>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">نوع المادة والتركيبة</span>
                <strong className="text-slate-900 mt-1 block">{c.serviceType}</strong>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">أرقام الأسنان (FDI)</span>
                <strong className="font-mono tabular-nums text-slate-900 mt-1 block">
                  {c.selectedTeeth && c.selectedTeeth.length > 0
                    ? c.selectedTeeth.join(', ')
                    : `${c.units} وحدات`}
                </strong>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">درجة اللون (VITA)</span>
                <strong className="font-mono text-blue-700 mt-1 block">{c.shade}</strong>
              </div>
              <div className="p-3.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">عدد الوحدات المضمونة</span>
                <strong className="font-mono tabular-nums text-slate-900 mt-1 block">
                  {c.units} وحدة
                </strong>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed space-y-1">
              <div className="font-bold text-slate-900">شروط وأحكام الضمان:</div>
              <p>
                • يشمل هذا الضمان الكسر المصنعي أو تغير اللون للبلوكات الخزفية وأقراص الزيركون الأصلية المعتمدة لدى {labSettings.labName}.
              </p>
              <p>
                • يُشترط سريان الضمان التزام المريض بالمراجعة الدورية لدى الطبيب المعالج وعدم تعرض التركيبة لحوادث خارجية أو سوء استخدام غير طبيعي.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs text-slate-600">
              <div>
                <p className="font-semibold mb-6">اعتماد وختم الطبيب المعالج:</p>
                <div className="w-44 border-b border-slate-300" />
              </div>
              <div className="text-left">
                <p className="font-semibold mb-6">ختم ضمان الجودة — {labSettings.labName}:</p>
                <div className="w-44 border-b border-slate-300 mr-auto" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (payload.type === 'courier-manifest') {
      const order = payload.courierOrder;
      const linkedCases = cases.filter((c) => order.caseIds.includes(c.id));

      return (
        <div>
          {renderHeader(
            'حافظة تسليم واستلام مندوب (Delivery Slip)',
            order.id,
            order.updatedAt || order.requestedAt,
            `${typeof window !== 'undefined' ? window.location.origin : ''}?courier=${order.id}`
          )}

          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
              <div className="text-xs text-slate-500">الجهة الطبية / العيادة</div>
              <div className="font-bold text-slate-900">{order.clinicName}</div>
              {order.doctorName && (
                <div className="text-xs text-slate-600">د. {order.doctorName}</div>
              )}
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
              <div className="text-xs text-slate-500">بيانات المندوب ونوع المهمة</div>
              <div className="font-bold text-slate-900">
                المندوب: {order.courierName || 'غير محدد بعد'}
                {order.courierPhone ? ` (${order.courierPhone})` : ''}
              </div>
              <div className="text-xs text-blue-700 font-semibold">
                {COURIER_DIRECTION_LABELS[order.direction]} — ({COURIER_STATUS_LABELS[order.status]})
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs font-bold text-slate-800 mb-2">
              بيان الحالات / الطرود المرفقة مع المندوب ({linkedCases.length}):
            </div>
            <table className="w-full text-right border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-2.5 border border-slate-800">رقم الحالة</th>
                  <th className="p-2.5 border border-slate-800">اسم المريض</th>
                  <th className="p-2.5 border border-slate-800">نوع العمل</th>
                  <th className="p-2.5 border border-slate-800 text-center">الوحدات / اللون</th>
                  <th className="p-2.5 border border-slate-800 text-center">حالة الفحص</th>
                </tr>
              </thead>
              <tbody>
                {linkedCases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      مهمة استلام طبعات جديدة من العيادة (يُدون العدد الفعلي عند الاستلام أدناه)
                    </td>
                  </tr>
                ) : (
                  linkedCases.map((c) => (
                    <tr key={c.id} className="even:bg-slate-50/60">
                      <td className="p-2.5 border border-slate-200 font-mono tabular-nums font-bold">
                        #{c.id}
                      </td>
                      <td className="p-2.5 border border-slate-200 font-semibold">{c.patientName}</td>
                      <td className="p-2.5 border border-slate-200">{c.serviceType}</td>
                      <td className="p-2.5 border border-slate-200 text-center font-mono tabular-nums">
                        {c.units} وحدات · {c.shade}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-center">
                        {STATUS_LABELS[c.status]}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {order.notes && (
            <div className="p-4 rounded-xl border border-slate-200 mb-8 text-xs">
              <span className="font-bold text-slate-700 ml-2">تعليمات وملاحظات التسليم:</span>
              <span className="text-slate-800">{order.notes}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs text-slate-600">
            <div>
              <p className="font-semibold mb-6">توقيع مشرف المعمل المسلّم:</p>
              <div className="w-36 border-b border-slate-300" />
            </div>
            <div>
              <p className="font-semibold mb-6">توقيع المندوب الناقل:</p>
              <div className="w-36 border-b border-slate-300" />
            </div>
            <div className="text-left">
              <p className="font-semibold mb-6">توقيع وختم استلام العيادة:</p>
              <div className="w-36 border-b border-slate-300 mr-auto" />
            </div>
          </div>
        </div>
      );
    }

    if (payload.type === 'receipt') {
      const r = payload.receipt;
      const clinicObj =
        payload.clinic ||
        clinics.find((cl) => cl.id === r.clinicId || cl.name === r.clinicName);
      const fin = clinicObj ? computeClinicFinancials(clinicObj, cases, receipts) : null;

      return (
        <div>
          {renderHeader('سند قبض مالي رسمي', r.id, r.date)}

          <div className="p-6 rounded-xl border-2 border-slate-900 bg-slate-50/50 mb-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs text-slate-500 block">استلمنا من السادة / العيادة:</span>
                <strong className="text-lg text-slate-900">
                  {r.clinicName} {clinicObj ? `(د. ${clinicObj.doctorName})` : ''}
                </strong>
              </div>
              <div className="bg-white border border-slate-300 rounded-xl px-5 py-3 text-left">
                <span className="text-[11px] text-slate-500 block">المبلغ المقبوض</span>
                <strong className="text-2xl font-mono tabular-nums text-emerald-700">
                  {r.amount.toLocaleString()} {currency}
                </strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 block">طريقة السداد:</span>
                <strong className="text-slate-900">{PAYMENT_METHOD_LABELS[r.method]}</strong>
                {r.referenceNo && (
                  <span className="font-mono text-xs text-slate-600 mr-2">
                    (مرجع: {r.referenceNo})
                  </span>
                )}
              </div>
              <div>
                <span className="text-xs text-slate-500 block">وذلك مقابل:</span>
                <strong className="text-slate-900">
                  {r.caseId ? `دفعة على الحالة رقم #${r.caseId}` : 'دفعة من الحساب الجاري للعيادة'}
                </strong>
              </div>
            </div>

            {r.notes && (
              <div className="text-sm pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500 ml-2">بيان إضافي:</span>
                <span className="text-slate-800">{r.notes}</span>
              </div>
            )}
          </div>

          {fin && (
            <div className="grid grid-cols-3 gap-4 mb-8 text-center text-xs">
              <div className="p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">إجمالي المطالبات والافتتاحي</span>
                <strong className="font-mono tabular-nums text-sm text-slate-900 mt-1 block">
                  {(fin.opening + fin.totalBilled).toLocaleString()} {currency}
                </strong>
              </div>
              <div className="p-3 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">إجمالي المسدد حتى تاريخه</span>
                <strong className="font-mono tabular-nums text-sm text-emerald-700 mt-1 block">
                  {fin.totalPaid.toLocaleString()} {currency}
                </strong>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <span className="text-slate-500 block">الرصيد المتبقي الحالي</span>
                <strong className="font-mono tabular-nums text-sm text-blue-700 mt-1 block">
                  {fin.netBalance.toLocaleString()} {currency}
                </strong>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs text-slate-600">
            <div>
              <p className="font-semibold mb-6">
                المستلم (أمين الصندوق / المحاسب): {r.receivedBy}
              </p>
              <div className="w-44 border-b border-slate-300" />
            </div>
            <div className="text-left">
              <p className="font-semibold mb-6">ختم الحسابات الرسمي:</p>
              <div className="w-44 border-b border-slate-300 mr-auto" />
            </div>
          </div>
        </div>
      );
    }

    if (payload.type === 'statement') {
      const { clinic, dateFrom, dateTo } = payload;
      const fin = computeClinicFinancials(clinic, cases, receipts);

      type LedgerRow = {
        date: string;
        ref: string;
        description: string;
        debit: number;
        credit: number;
      };

      const rows: LedgerRow[] = [];
      if (fin.opening !== 0) {
        rows.push({
          date: '0000-00-00',
          ref: 'OPEN',
          description: 'رصيد افتتاحي سابق',
          debit: fin.opening > 0 ? fin.opening : 0,
          credit: fin.opening < 0 ? Math.abs(fin.opening) : 0,
        });
      }

      fin.clinicCases.forEach((c) => {
        if (dateFrom && c.receivedDate < dateFrom) return;
        if (dateTo && c.receivedDate > dateTo) return;
        rows.push({
          date: c.receivedDate,
          ref: `#${c.id}`,
          description: `حالة المريض: ${c.patientName} (${c.serviceType} - ${c.units} وحدات)`,
          debit: Number(c.price) || 0,
          credit: 0,
        });
      });

      fin.clinicReceipts.forEach((r) => {
        if (dateFrom && r.date < dateFrom) return;
        if (dateTo && r.date > dateTo) return;
        rows.push({
          date: r.date,
          ref: r.id,
          description: `سند قبض (${PAYMENT_METHOD_LABELS[r.method]})${r.notes ? ` - ${r.notes}` : ''}`,
          debit: 0,
          credit: Number(r.amount) || 0,
        });
      });

      rows.sort((a, b) => a.date.localeCompare(b.date));

      let running = 0;

      return (
        <div>
          {renderHeader(
            'كشف حساب عيادة تفصيلي',
            `STM-${clinic.id}`,
            new Date().toISOString().split('T')[0]
          )}

          <div className="flex justify-between items-center p-4 rounded-xl border border-slate-200 bg-slate-50/60 mb-6 text-sm">
            <div>
              <div className="font-bold text-slate-900">{clinic.name}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                د. {clinic.doctorName} · هاتف: <span className="font-mono">{clinic.phone}</span>
              </div>
            </div>
            <div className="text-left text-xs text-slate-600">
              <div>
                الفترة: {dateFrom || 'بداية التعامل'} إلى {dateTo || 'تاريخ اليوم'}
              </div>
              <div className="font-bold text-slate-900 mt-1 font-mono tabular-nums">
                صافي الرصيد الكلي: {fin.netBalance.toLocaleString()} {currency}
              </div>
            </div>
          </div>

          <table className="w-full text-right border-collapse border border-slate-200 mb-6 text-xs">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-2.5 border border-slate-800">التاريخ</th>
                <th className="p-2.5 border border-slate-800">المرجع</th>
                <th className="p-2.5 border border-slate-800">البيان والتفاصيل</th>
                <th className="p-2.5 border border-slate-800 text-left">مدين (عليه)</th>
                <th className="p-2.5 border border-slate-800 text-left">دائن (له)</th>
                <th className="p-2.5 border border-slate-800 text-left">الرصيد التراكمي</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                running += row.debit - row.credit;
                return (
                  <tr key={idx} className="even:bg-slate-50/60">
                    <td className="p-2.5 border border-slate-200 font-mono tabular-nums">
                      {row.date === '0000-00-00' ? 'افتتاحي' : row.date}
                    </td>
                    <td className="p-2.5 border border-slate-200 font-mono tabular-nums font-semibold">
                      {row.ref}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-slate-800">
                      {row.description}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-left font-mono tabular-nums">
                      {row.debit > 0 ? row.debit.toLocaleString() : '—'}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-left font-mono tabular-nums text-emerald-700">
                      {row.credit > 0 ? row.credit.toLocaleString() : '—'}
                    </td>
                    <td className="p-2.5 border border-slate-200 text-left font-mono tabular-nums font-bold">
                      {running.toLocaleString()} {currency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200 text-xs text-slate-500">
            <span>صادر آلياً من نظام Vital Dental Lab — تطوير دكتور عقلان الكامل</span>
            <span className="font-mono tabular-nums font-bold text-slate-900">
              إجمالي الرصيد المستحق: {running.toLocaleString()} {currency}
            </span>
          </div>
        </div>
      );
    }

    if (payload.type === 'staff-payroll') {
      const { staffMember, month, staffTransactions } = payload;
      const payroll = computeStaffMonthlyPayroll(staffMember, cases, staffTransactions, month);
      const compType = staffMember.compensationType || 'per_unit';

      return (
        <div>
          {renderHeader(
            'كشف راتب ومستحقات فني شهري',
            `PAY-${staffMember.id}-${month}`,
            new Date().toISOString().split('T')[0]
          )}

          <div className="flex justify-between items-center p-4 rounded-xl border border-slate-200 bg-slate-50/60 mb-6 text-sm">
            <div>
              <div className="font-bold text-slate-900">{staffMember.name}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                {staffMember.role} · نظام التعاقد:{' '}
                <strong>{COMPENSATION_TYPE_LABELS[compType]}</strong> (
                {getStaffCompensationSummary(staffMember, currency)})
              </div>
            </div>
            <div className="text-left text-xs text-slate-600">
              <div className="font-mono tabular-nums">الشهر المالي: {month}</div>
              <div className="font-bold text-blue-700 mt-1 font-mono tabular-nums text-sm">
                المتبقي للصرف: {payroll.remainingBalance.toLocaleString()} {currency}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-6 text-center text-xs">
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">الراتب الأساسي</span>
              <strong className="font-mono tabular-nums text-sm text-slate-900 mt-1 block">
                {payroll.baseSalary.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">عمولات ومكافآت</span>
              <strong className="font-mono tabular-nums text-sm text-emerald-700 mt-1 block">
                + {(payroll.earnedCommissions + payroll.bonuses).toLocaleString()} {currency}
              </strong>
            </div>
            <div className="p-3 rounded-lg border border-slate-200">
              <span className="text-slate-500 block">السلف والخصومات</span>
              <strong className="font-mono tabular-nums text-sm text-red-600 mt-1 block">
                - {payroll.totalDeductionsAndAdvances.toLocaleString()} {currency}
              </strong>
            </div>
            <div className="p-3 rounded-lg border border-slate-900 bg-slate-50">
              <span className="text-slate-600 font-semibold block">صافي الاستحقاق</span>
              <strong className="font-mono tabular-nums text-sm text-blue-700 mt-1 block">
                {payroll.netPayable.toLocaleString()} {currency}
              </strong>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs font-bold text-slate-800 mb-2">
              1. تفصيل الحالات الإنتاجية المنجزة خلال الشهر ({payroll.caseBreakdowns.length} حالة):
            </div>
            <table className="w-full text-right border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-2 border border-slate-800">رقم الحالة</th>
                  <th className="p-2 border border-slate-800">المريض والتركيبة</th>
                  <th className="p-2 border border-slate-800 text-center">إجمالي الوحدات</th>
                  <th className="p-2 border border-slate-800 text-center">حصة الفني</th>
                  <th className="p-2 border border-slate-800 text-left">العمولة المكتسبة</th>
                </tr>
              </thead>
              <tbody>
                {payroll.caseBreakdowns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      لا توجد حالات مكتملة مقيدة لهذا الموظف في الشهر المحدد
                    </td>
                  </tr>
                ) : (
                  payroll.caseBreakdowns.map((item) => (
                    <tr key={item.dentalCase.id} className="even:bg-slate-50/60">
                      <td className="p-2 border border-slate-200 font-mono tabular-nums font-bold">
                        #{item.dentalCase.id}
                      </td>
                      <td className="p-2 border border-slate-200">
                        {item.dentalCase.patientName} — {item.dentalCase.serviceType}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-mono tabular-nums">
                        {item.dentalCase.units}
                      </td>
                      <td className="p-2 border border-slate-200 text-center font-mono tabular-nums font-semibold">
                        {item.sharePercent}%
                      </td>
                      <td className="p-2 border border-slate-200 text-left font-mono tabular-nums font-bold text-emerald-700">
                        {item.earnedCommission.toLocaleString()} {currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mb-8">
            <div className="text-xs font-bold text-slate-800 mb-2">
              2. سجل السلف والمكافآت والخصومات والدفعات المصروفة ({payroll.monthTransactions.length}):
            </div>
            <table className="w-full text-right border-collapse border border-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold">
                  <th className="p-2 border border-slate-200">التاريخ</th>
                  <th className="p-2 border border-slate-200">نوع الحركة</th>
                  <th className="p-2 border border-slate-200">البيان</th>
                  <th className="p-2 border border-slate-200 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {payroll.monthTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      لا توجد سلف أو خصومات أو دفعات مسجلة لهذا الشهر
                    </td>
                  </tr>
                ) : (
                  payroll.monthTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="p-2 border border-slate-200 font-mono tabular-nums">
                        {tx.date}
                      </td>
                      <td className="p-2 border border-slate-200 font-semibold">
                        {STAFF_TRANSACTION_LABELS[tx.type]}
                      </td>
                      <td className="p-2 border border-slate-200 text-slate-700">
                        {tx.notes || '—'}
                      </td>
                      <td className="p-2 border border-slate-200 text-left font-mono tabular-nums font-bold">
                        {tx.amount.toLocaleString()} {currency}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs text-slate-600">
            <div>
              <p className="font-semibold mb-6">توقيع الموظف / الفني المستلم:</p>
              <div className="w-44 border-b border-slate-300" />
            </div>
            <div className="text-left">
              <p className="font-semibold mb-6">اعتماد المحاسب والإدارة العامة:</p>
              <div className="w-44 border-b border-slate-300 mr-auto" />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print">
          <div className="text-sm font-bold text-slate-800">معاينة المستند الرسمي للطباعة</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Printer size={15} />
              <span>طباعة الآن / حفظ PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto bg-white" id="printable-area" dir="rtl">
          {renderBody()}
        </div>
      </div>
    </div>
  );
};
