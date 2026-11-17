import React, { useMemo, useState } from 'react';
import {
  Branch,
  CaseAttachment,
  CaseMessage,
  CasePriority,
  CaseStatus,
  Clinic,
  CourierOrder,
  DentalCase,
  LabSettings,
  PaymentReceipt,
  RestorationConnection,
  ScanPlatform,
  Service,
  Staff,
  TryInCycleEvent,
} from '../types';
import {
  computeClinicFinancials,
  COURIER_DIRECTION_LABELS,
  COURIER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  resolveClinicServicePrice,
  STATUS_LABELS,
  STATUS_ORDER,
} from '../data/seedData';
import { DentalChartSelector, VitaShadeSelector } from './DentalChartSelector';
import { PrintModalPayload, PrintModals } from './PrintModals';
import { CaseInteractiveDrawer, compressClinicalImage } from './CaseInteractiveDrawer';
import { OfflineIndicator, PWAInstallButton } from './PWAWidgets';
import {
  Camera,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  Link2,
  LogOut,
  MessageSquare,
  PlusCircle,
  Printer,
  Search,
  Send,
  ShieldCheck,
  Stethoscope,
  Truck,
} from 'lucide-react';

interface DoctorPortalViewProps {
  branch: Branch;
  clinic: Clinic;
  cases: DentalCase[];
  receipts: PaymentReceipt[];
  courierOrders: CourierOrder[];
  services: Service[];
  staff: Staff[];
  clinics: Clinic[];
  labSettings: LabSettings;
  onSubmitNewCase: (newCase: Omit<DentalCase, 'id'>) => void;
  onSendCaseMessage: (caseId: string, msg: CaseMessage) => void;
  onUpdateCaseAttachmentsAndScan: (
    caseId: string,
    updates: {
      scanFileUrl?: string;
      scanPlatform?: ScanPlatform;
      attachments?: CaseAttachment[];
    }
  ) => void;
  onRecordTryInAction: (
    caseId: string,
    nextStatus: CaseStatus,
    tryInEvent: TryInCycleEvent
  ) => void;
  onRequestCourierPickup: (notes: string) => void;
  onLogout: () => void;
}

export const DoctorPortalView: React.FC<DoctorPortalViewProps> = ({
  branch,
  clinic,
  cases,
  receipts,
  courierOrders,
  services,
  staff,
  clinics,
  labSettings,
  onSubmitNewCase,
  onSendCaseMessage,
  onUpdateCaseAttachmentsAndScan,
  onRecordTryInAction,
  onRequestCourierPickup,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<
    'my-cases' | 'new-order' | 'courier' | 'statement'
  >('my-cases');
  const [searchTerm, setSearchTerm] = useState('');
  const [printPayload, setPrintPayload] = useState<PrintModalPayload | null>(null);
  const [drawerCaseId, setDrawerCaseId] = useState<string | null>(null);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string>('');

  // New Order Form State
  const [patientName, setPatientName] = useState('');
  const [serviceType, setServiceType] = useState(services[0]?.name || '');
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [connectionType, setConnectionType] = useState<RestorationConnection>('single');
  const [manualUnits, setManualUnits] = useState<number>(1);
  const [shade, setShade] = useState('A1');
  const [priority, setPriority] = useState<CasePriority>('normal');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [scanPlatform, setScanPlatform] = useState<ScanPlatform>('Medit');
  const [scanFileUrl, setScanFileUrl] = useState('');
  const [draftAttachments, setDraftAttachments] = useState<CaseAttachment[]>([]);

  // Courier Pickup Request State
  const [pickupNotes, setPickupNotes] = useState('');

  const currency = labSettings.currency || 'ر.س';

  const fin = useMemo(
    () => computeClinicFinancials(clinic, cases, receipts),
    [clinic, cases, receipts]
  );

  const myCourierOrders = useMemo(
    () =>
      courierOrders.filter(
        (o) => o.clinicId === clinic.id || o.clinicName === clinic.name
      ),
    [courierOrders, clinic]
  );

  const activeDrawerCase = useMemo(
    () => fin.clinicCases.find((c) => c.id === drawerCaseId) || null,
    [fin.clinicCases, drawerCaseId]
  );

  const myFilteredCases = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return fin.clinicCases.filter(
      (c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.serviceType.toLowerCase().includes(q) ||
        STATUS_LABELS[c.status].toLowerCase().includes(q)
    );
  }, [fin.clinicCases, searchTerm]);

  const effectiveUnits = selectedTeeth.length > 0 ? selectedTeeth.length : Math.max(1, manualUnits);
  const selectedServiceObj = services.find((s) => s.name === serviceType) || services[0];
  const resolvedPricing = resolveClinicServicePrice(clinic, selectedServiceObj);
  const unitPrice = resolvedPricing.price;
  const estimatedTotal = effectiveUnits * unitPrice;

  const handleDraftPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressClinicalImage(file);
      setDraftAttachments((prev) => [
        ...prev.slice(-4),
        {
          id: `ATT-${Date.now().toString().slice(-4)}`,
          label: 'صورة مطابقة لون مرفقة من العيادة',
          dataUrl: compressed,
          uploadedBy: `د. ${clinic.doctorName}`,
          uploadedAt: new Date().toISOString().split('T')[0],
        },
      ]);
    } catch {
      // Ignore invalid file
    }
    e.target.value = '';
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;
    const defaultTech = staff.find((s) => s.userRole === 'technician') || staff[0];

    onSubmitNewCase({
      clinicId: clinic.name,
      clinicRefId: clinic.id,
      doctorName: clinic.doctorName,
      patientName: patientName.trim(),
      serviceType,
      selectedTeeth: selectedTeeth.length > 0 ? selectedTeeth : undefined,
      connectionType,
      units: effectiveUnits,
      shade,
      unitPrice,
      discount: 0,
      price: estimatedTotal,
      staffId: defaultTech?.id || '',
      status: 'Pending',
      priority,
      receivedDate: new Date().toISOString().split('T')[0],
      dueDate,
      notes: notes.trim() || undefined,
      source: 'doctor-portal',
      scanPlatform: scanFileUrl.trim() ? scanPlatform : undefined,
      scanFileUrl: scanFileUrl.trim() || undefined,
      attachments: draftAttachments.length > 0 ? draftAttachments : undefined,
      warrantyYears: selectedServiceObj?.warrantyYears ?? labSettings.warrantyYears ?? 5,
    });

    setPatientName('');
    setSelectedTeeth([]);
    setManualUnits(1);
    setNotes('');
    setScanFileUrl('');
    setDraftAttachments([]);
    setSubmitSuccessMsg('تم إرسال طلب الحالة والمرفقات بنجاح إلى المعمل وبدء جدولتها في قسم الإنتاج.');
    setActiveTab('my-cases');
    setTimeout(() => setSubmitSuccessMsg(''), 5000);
  };

  const handleRequestCourierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestCourierPickup(
      pickupNotes.trim() || 'يرجى إرسال مندوب لاستلام طبعات جاهزة من استقبال العيادة.'
    );
    setPickupNotes('');
    setSubmitSuccessMsg('تم إرسال طلب استدعاء المندوب إلى إدارة المعمل فوراً.');
    setTimeout(() => setSubmitSuccessMsg(''), 5000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" dir="rtl">
      <OfflineIndicator />

      <PrintModals
        payload={printPayload}
        onClose={() => setPrintPayload(null)}
        branch={branch}
        labSettings={labSettings}
        cases={cases}
        receipts={receipts}
        staff={staff}
        clinics={clinics}
      />

      <CaseInteractiveDrawer
        dentalCase={activeDrawerCase}
        branchId={branch.id}
        viewerRole="doctor"
        viewerName={`د. ${clinic.doctorName}`}
        onClose={() => setDrawerCaseId(null)}
        onSendMessage={onSendCaseMessage}
        onUpdateAttachmentsAndScan={onUpdateCaseAttachmentsAndScan}
        onRecordTryInAction={onRecordTryInAction}
        onOpenPrint={setPrintPayload}
      />

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-4 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center">
            <Stethoscope size={18} />
          </div>
          <div>
            <div className="text-base font-extrabold text-slate-900">
              بوابة الأطباء — {labSettings.labName}
            </div>
            <div className="text-xs text-slate-500">
              {clinic.name} · د. {clinic.doctorName} · {branch.name}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('my-cases')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'my-cases'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            متابعة الحالات ({fin.casesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new-order')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'new-order'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            إرسال حالة جديدة
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('courier')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'courier'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            طلب مندوب ({myCourierOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('statement')}
            className={`py-1 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'statement'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            كشف الحساب والفواتير
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton variant="violet" />
          <button
            type="button"
            onClick={onLogout}
            className="px-3.5 py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
          >
            <LogOut size={15} />
            <span>خروج</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'my-cases', label: 'متابعة الحالات' },
            { id: 'new-order', label: 'إرسال حالة' },
            { id: 'courier', label: 'طلب مندوب' },
            { id: 'statement', label: 'كشف الحساب' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeTab === t.id ? 'bg-violet-600 text-white' : 'text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto px-6 py-8 flex-1 space-y-6">
        {submitSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{submitSuccessMsg}</span>
          </div>
        )}

        {/* Clinic Overview Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500">إجمالي حالات العيادة</div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-1">
              {fin.casesCount}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500">حالات قيد التصنيع أو التجربة</div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-violet-700 mt-1">
              {fin.clinicCases.filter((c) => c.status !== 'Delivered').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500">حالات جاهزة للاستلام</div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 mt-1">
              {fin.clinicCases.filter((c) => c.status === 'Ready').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-500">الرصيد المالي المتبقي</div>
            <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-700 mt-1">
              {fin.netBalance.toLocaleString()}{' '}
              <span className="text-xs font-sans font-semibold text-slate-500">{currency}</span>
            </div>
          </div>
        </div>

        {activeTab === 'my-cases' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">تتبع مراحل تصنيع حالات المرضى</h2>
                <p className="text-xs text-slate-500">
                  تحديث مباشر من أقسام التصميم والخرط والخزف مع إمكانية المحادثة وإصدار شهادة الضمان
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={15} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث باسم المريض أو رقم الحالة..."
                    className="bg-white border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-xs w-60 outline-none focus:border-violet-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('courier')}
                  className="px-3.5 py-2 border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Truck size={14} />
                  <span>طلب مندوب</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('new-order')}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <PlusCircle size={15} />
                  <span>طلب حالة جديدة</span>
                </button>
              </div>
            </div>

            {myFilteredCases.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
                <ClipboardList size={32} className="mx-auto text-slate-300" />
                <div className="text-sm font-bold text-slate-800">لا توجد حالات مسجلة حالياً</div>
                <p className="text-xs text-slate-500">يمكنك إرسال أول حالة رقمية للمعمل مباشرة عبر البوابة</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('new-order')}
                  className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  إرسال حالة جديدة الآن
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myFilteredCases.map((c) => {
                  const stageIdx = Math.max(0, STATUS_ORDER.indexOf(c.status));
                  const progressPct = Math.round(((stageIdx + 1) / STATUS_ORDER.length) * 100);
                  const msgCount = c.messages?.length || 0;

                  return (
                    <div
                      key={c.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono tabular-nums text-sm font-bold text-violet-700">
                              #{c.id}
                            </span>
                            <span className="text-slate-300">·</span>
                            <h3 className="text-base font-bold text-slate-900">{c.patientName}</h3>
                            {c.priority === 'urgent' && (
                              <span className="text-xs font-bold text-red-600">· مستعجل</span>
                            )}
                            {c.status === 'TryIn_Out' && (
                              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                بانتظار اعتماد التجربة السريرية لديكم
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 mt-1">
                            <span>{c.serviceType}</span>
                            <span className="mx-1.5">·</span>
                            <span>
                              اللون: <strong className="font-mono">{c.shade}</strong>
                            </span>
                            <span className="mx-1.5">·</span>
                            <span>
                              العدد: <strong className="font-mono tabular-nums">{c.units}</strong> وحدات
                            </span>
                            {c.selectedTeeth && c.selectedTeeth.length > 0 && (
                              <>
                                <span className="mx-1.5">·</span>
                                <span>
                                  الأسنان:{' '}
                                  <strong className="font-mono tabular-nums text-slate-900">
                                    {c.selectedTeeth.join(', ')}
                                  </strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-left ml-2">
                            <div className="text-sm font-mono tabular-nums font-bold text-slate-900">
                              {c.price.toLocaleString()} {currency}
                            </div>
                            <div className="text-[11px] font-mono tabular-nums text-slate-500">
                              التسليم المتوقع: {c.dueDate}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setDrawerCaseId(c.id)}
                            className="px-3 py-1.5 bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white border border-violet-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MessageSquare size={14} />
                            <span>المحادثة والمرفقات ({msgCount})</span>
                          </button>

                          {(c.status === 'Ready' || c.status === 'Delivered') && (
                            <button
                              type="button"
                              onClick={() => setPrintPayload({ type: 'warranty-card', dentalCase: c })}
                              className="px-3 py-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ShieldCheck size={14} />
                              <span>شهادة الضمان</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setPrintPayload({ type: 'invoice', dentalCase: c })}
                            className="px-3 py-1.5 border border-slate-200 hover:border-violet-500 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer size={14} />
                            <span>الفاتورة</span>
                          </button>
                        </div>
                      </div>

                      {/* Production Stage Stepper */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">
                            المرحلة الحالية:{' '}
                            <strong className="text-violet-700">{STATUS_LABELS[c.status]}</strong>
                          </span>
                          <span className="font-mono tabular-nums text-slate-500">{progressPct}%</span>
                        </div>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
                          {STATUS_ORDER.map((st, idx) => {
                            const done = idx <= stageIdx;
                            const current = idx === stageIdx;
                            return (
                              <div
                                key={st}
                                className={`px-1.5 py-1.5 rounded-md text-center text-[10px] font-semibold border truncate ${
                                  current
                                    ? 'bg-violet-600 border-violet-600 text-white'
                                    : done
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-slate-50 border-slate-200/70 text-slate-400'
                                }`}
                                title={STATUS_LABELS[st]}
                              >
                                {STATUS_LABELS[st]}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'new-order' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  إرسال وصفة عمل رقمية جديدة إلى {branch.name}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  حدد الأسنان من المخطط التفاعلي، اختر درجة اللون، وأرفق رابط المسح ثلاثي الأبعاد أو صورة اللون السريرية
                </p>
              </div>
              {clinic.isVip && (
                <span className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                  مفعل لعيادتكم قائمة أسعار تعاقد خاصة (VIP)
                </span>
              )}
            </div>

            <form onSubmit={handleOrderSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">اسم المريض الثلاثي</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="أدخل اسم المريض..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-violet-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">نوع التركيبة المطلوبة</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-violet-600 focus:bg-white"
                  >
                    {services.map((s) => {
                      const pr = resolveClinicServicePrice(clinic, s);
                      return (
                        <option key={s.id} value={s.name}>
                          {s.name} ({pr.price} {currency}
                          {pr.isCustomVip ? ' - سعر تعاقد خاص' : ''})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">تاريخ التسليم المطلوب</label>
                    <input
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:border-violet-600 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">الأولوية</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as CasePriority)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-violet-600 focus:bg-white"
                    >
                      <option value="normal">اعتيادي</option>
                      <option value="urgent">مستعجل (VIP)</option>
                    </select>
                  </div>
                </div>
              </div>

              <DentalChartSelector
                selectedTeeth={selectedTeeth}
                onChange={setSelectedTeeth}
                connectionType={connectionType}
                onConnectionTypeChange={setConnectionType}
              />

              <VitaShadeSelector value={shade} onChange={setShade} />

              {/* Digital Intraoral Scan Link & Clinical Shade Photo */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Link2 size={13} className="text-violet-600" />
                    <span>منصة الماسح الرقمي (اختياري)</span>
                  </label>
                  <select
                    value={scanPlatform}
                    onChange={(e) => setScanPlatform(e.target.value as ScanPlatform)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                  >
                    <option value="Medit">Medit Link</option>
                    <option value="3Shape">3Shape Communicate</option>
                    <option value="Sirona">Dentsply Sirona</option>
                    <option value="STL_URL">رابط ملف STL مباشر</option>
                  </select>
                </div>

                <div className="md:col-span-6 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    رابط ملف المسح الضوئي ثلاثي الأبعاد (STL / Link)
                  </label>
                  <input
                    type="url"
                    value={scanFileUrl}
                    onChange={(e) => setScanFileUrl(e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-left"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="w-full py-2 px-3 bg-white hover:bg-violet-50 border border-violet-300 text-violet-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer">
                    <Camera size={14} />
                    <span>إرفاق صورة لون ({draftAttachments.length})</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDraftPhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {selectedTeeth.length === 0 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      عدد الوحدات (في حال عدم التحديد من المخطط)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={manualUnits}
                      onChange={(e) => setManualUnits(Number(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm font-mono tabular-nums outline-none focus:border-violet-600 focus:bg-white"
                    />
                  </div>
                )}

                <div
                  className={
                    selectedTeeth.length === 0 ? 'md:col-span-2 space-y-1.5' : 'md:col-span-3 space-y-1.5'
                  }
                >
                  <label className="text-xs font-semibold text-slate-700 block">
                    الملاحظات السريرية وتعليمات الإطباق والحواف
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب أي تعليمات خاصة للفني حول شفافية الحد القاطع، شكل الدمى، أو نوع خط الإنهاء..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm min-h-[80px] outline-none focus:border-violet-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs space-y-0.5">
                  <div className="text-slate-400">
                    ملخص التكلفة التقديرية للطلب{' '}
                    {resolvedPricing.isCustomVip ? '(شامل سعر التعاقد الخاص بعيادتكم)' : ''}
                  </div>
                  <div className="text-base font-bold">
                    {effectiveUnits} وحدات × {unitPrice} {currency} ={' '}
                    <span className="font-mono tabular-nums text-violet-300 text-lg">
                      {estimatedTotal.toLocaleString()} {currency}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Send size={16} />
                  <span>اعتماد وإرسال الحالة للمعمل</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'courier' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center">
                  <Truck size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">استدعاء مندوب المعمل للعيادة</h2>
                  <p className="text-xs text-slate-500">يصل إشعار فوري لقسم الحركة في {branch.name}</p>
                </div>
              </div>

              <form onSubmit={handleRequestCourierSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    تفاصيل الطبعات الجاهزة أو الموعد المناسب للاستلام
                  </label>
                  <textarea
                    value={pickupNotes}
                    onChange={(e) => setPickupNotes(e.target.value)}
                    placeholder="مثلاً: يوجد طبعتان سيليكون جاهزتان في الاستقبال يرجى المرور قبل الساعة 3 عصراً..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs min-h-[95px] outline-none focus:border-violet-600 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Truck size={15} />
                  <span>إرسال طلب استلام طبعة الآن</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  سجل طلبات المندوب والتوصيل الخاصة بعيادتكم ({myCourierOrders.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {myCourierOrders.length === 0 ? (
                  <div className="p-10 text-center text-xs text-slate-400">
                    لا توجد طلبات مندوب سابقة مسجلة لهذه العيادة.
                  </div>
                ) : (
                  myCourierOrders.map((ord) => (
                    <div key={ord.id} className="p-4 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">
                          <span className="font-mono text-violet-700 ml-2">{ord.id}</span>
                          {COURIER_DIRECTION_LABELS[ord.direction]}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          التاريخ: {ord.requestedAt}
                          {ord.courierName ? ` · المندوب المكلف: ${ord.courierName}` : ''}
                        </div>
                        {ord.notes && <div className="text-slate-600 mt-1">{ord.notes}</div>}
                      </div>
                      <span className="px-3 py-1 rounded-lg bg-slate-100 font-bold text-slate-800 shrink-0">
                        {COURIER_STATUS_LABELS[ord.status]}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statement' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-violet-600" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">كشف الحساب المالي وسندات السداد</h2>
                  <p className="text-xs text-slate-500">شفافية مالية كاملة لجميع الحالات المسلمة والدفعات المسجلة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrintPayload({ type: 'statement', clinic })}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <Printer size={14} />
                <span>طباعة كشف الحساب الكامل</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200">
              <div className="p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  فواتير الحالات ({fin.clinicCases.length}) — الإجمالي:{' '}
                  <span className="font-mono tabular-nums">
                    {fin.totalBilled.toLocaleString()} {currency}
                  </span>
                </h3>
                <div className="divide-y divide-slate-100">
                  {fin.clinicCases.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">
                          #{c.id} · {c.patientName}
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {c.receivedDate} · {c.serviceType} ({c.units} وحدات)
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono tabular-nums font-bold text-slate-900">
                          {c.price.toLocaleString()} {currency}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPrintPayload({ type: 'invoice', dentalCase: c })}
                          className="text-violet-700 hover:underline font-semibold cursor-pointer"
                        >
                          طباعة
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  سندات القبض المسددة ({fin.clinicReceipts.length}) — الإجمالي:{' '}
                  <span className="font-mono tabular-nums text-emerald-700">
                    {fin.totalPaid.toLocaleString()} {currency}
                  </span>
                </h3>
                <div className="divide-y divide-slate-100">
                  {fin.clinicReceipts.length === 0 ? (
                    <div className="py-6 text-xs text-slate-400">لا توجد سندات سداد مسجلة بعد.</div>
                  ) : (
                    fin.clinicReceipts.map((r) => (
                      <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">
                            {r.id} · {PAYMENT_METHOD_LABELS[r.method]}
                          </div>
                          <div className="text-slate-500 mt-0.5">
                            {r.date} {r.notes ? `· ${r.notes}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono tabular-nums font-bold text-emerald-700">
                            {r.amount.toLocaleString()} {currency}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPrintPayload({ type: 'receipt', receipt: r, clinic })}
                            className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                          >
                            السند
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
