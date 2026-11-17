import React, { useMemo, useState } from 'react';
import {
  CaseStatus,
  Clinic,
  CourierDirection,
  CourierOrder,
  CourierStatus,
  DentalCase,
} from '../types';
import {
  COURIER_DIRECTION_LABELS,
  COURIER_STATUS_LABELS,
  STATUS_LABELS,
} from '../data/seedData';
import { PrintModalPayload } from './PrintModals';
import {
  CheckCircle2,
  MapPin,
  MessageSquare,
  PlusCircle,
  Printer,
  Trash2,
  Truck,
  UserCheck,
} from 'lucide-react';

interface CourierAndTryInHubProps {
  courierOrders: CourierOrder[];
  cases: DentalCase[];
  clinics: Clinic[];
  canManageCourier: boolean;
  labName: string;
  branchName: string;
  whatsappPhone: string;
  onAddCourierOrder: (order: Omit<CourierOrder, 'id'>) => void;
  onUpdateCourierOrder: (id: string, updates: Partial<CourierOrder>) => void;
  onDeleteCourierOrder: (id: string) => void;
  onUpdateCaseStatus: (caseId: string, status: CaseStatus) => void;
  onOpenCaseDrawer: (dentalCase: DentalCase) => void;
  onOpenPrint: (payload: PrintModalPayload) => void;
}

export const CourierAndTryInHub: React.FC<CourierAndTryInHubProps> = ({
  courierOrders,
  cases,
  clinics,
  canManageCourier,
  labName,
  branchName,
  whatsappPhone,
  onAddCourierOrder,
  onUpdateCourierOrder,
  onDeleteCourierOrder,
  onUpdateCaseStatus,
  onOpenCaseDrawer,
  onOpenPrint,
}) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'TRY_IN'>('ALL');
  const [clinicId, setClinicId] = useState<string>(clinics[0]?.id || '');
  const [direction, setDirection] = useState<CourierDirection>('final_delivery');
  const [courierName, setCourierName] = useState<string>('أكرم الحميري');
  const [courierPhone, setCourierPhone] = useState<string>('967775551199');
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  const selectedClinic = clinics.find((c) => c.id === clinicId) || clinics[0];
  const clinicCandidateCases = useMemo(() => {
    if (!selectedClinic) return [];
    return cases.filter(
      (c) =>
        (c.clinicRefId === selectedClinic.id || c.clinicId === selectedClinic.name) &&
        c.status !== 'Delivered'
    );
  }, [cases, selectedClinic]);

  const tryInCases = useMemo(
    () => cases.filter((c) => c.status === 'TryIn_Out' || c.status === 'TryIn_Returned'),
    [cases]
  );

  const kpis = useMemo(() => {
    const pickupRequests = courierOrders.filter(
      (o) => o.direction === 'pickup_impression' && o.status !== 'arrived_lab' && o.status !== 'delivered'
    ).length;
    const inTransit = courierOrders.filter(
      (o) => o.status === 'assigned' || o.status === 'in_transit'
    ).length;
    const completed = courierOrders.filter(
      (o) => o.status === 'arrived_lab' || o.status === 'delivered'
    ).length;
    return {
      pickupRequests,
      inTransit,
      tryInCount: tryInCases.length,
      completed,
    };
  }, [courierOrders, tryInCases]);

  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) return;
    const today = new Date().toISOString().split('T')[0];

    onAddCourierOrder({
      clinicId: selectedClinic.id,
      clinicName: selectedClinic.name,
      doctorName: selectedClinic.doctorName,
      direction,
      status: courierName.trim() ? 'assigned' : 'requested',
      courierName: courierName.trim() || undefined,
      courierPhone: courierPhone.trim() || undefined,
      caseIds: selectedCaseIds,
      requestedAt: today,
      updatedAt: today,
      notes: notes.trim() || undefined,
      requestedBy: 'lab',
    });

    if (direction === 'try_in_dispatch') {
      selectedCaseIds.forEach((cid) => onUpdateCaseStatus(cid, 'TryIn_Out'));
    }

    setSelectedCaseIds([]);
    setNotes('');
  };

  const toggleCaseCheckbox = (id: string) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'ACTIVE') {
      return courierOrders.filter((o) => o.status !== 'delivered' && o.status !== 'arrived_lab');
    }
    return courierOrders;
  }, [courierOrders, statusFilter]);

  const getWhatsAppHref = (phone: string, text: string) => {
    const clean = (phone || whatsappPhone).replace(/\D/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">طلبات استلام طبعات من العيادات</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-amber-700 mt-2">
            {kpis.pickupRequests}
          </div>
          <div className="text-xs text-slate-500 mt-1">واردة مباشرة من بوابة الأطباء</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">مناديب قيد التوصيل الآن</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-blue-700 mt-2">
            {kpis.inTransit}
          </div>
          <div className="text-xs text-slate-500 mt-1">مهام استلام وتسليم نشطة في الميدان</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">حالات بالتجربة السريرية (Try-In)</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-violet-700 mt-2">
            {kpis.tryInCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">بانتظار فحص الطبيب والعودة للتشطيب</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">عمليات استلام وتسليم مكتملة</div>
          <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 mt-2">
            {kpis.completed}
          </div>
          <div className="text-xs text-slate-500 mt-1">موثقة بحوافظ تسليم رسمية</div>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
            statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          حركة المناديب والطلبات ({courierOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
            statusFilter === 'ACTIVE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          المهام الجارية فقط
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('TRY_IN')}
          className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer ${
            statusFilter === 'TRY_IN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          متابعة جلسات التجربة السريرية Try-In ({tryInCases.length})
        </button>
      </div>

      {statusFilter === 'TRY_IN' ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              سجل الحالات الموجودة بالتجربة السريرية أو العائدة للتشطيب
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              يمكنك فتح ملف الحالة لقراءة ملاحظات الطبيب حول الانطباق واللون أو تحويلها لقسم التشطيب
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4">المريض والعيادة</th>
                  <th className="py-3 px-4">التركيبة واللون</th>
                  <th className="py-3 px-4">حالة التجربة</th>
                  <th className="py-3 px-4">آخر ملاحظة تجربة</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tryInCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      لا توجد حالات في مرحلة التجربة السريرية حالياً
                    </td>
                  </tr>
                ) : (
                  tryInCases.map((c) => {
                    const lastTry = c.tryInHistory?.[c.tryInHistory.length - 1];
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-violet-700">
                          #{c.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{c.patientName}</div>
                          <div className="text-slate-500">{c.clinicId}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {c.serviceType} · <strong className="font-mono">{c.shade}</strong>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-700">
                          {STATUS_LABELS[c.status]}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {lastTry?.doctorFeedback || c.notes || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenCaseDrawer(c)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white rounded-lg font-bold cursor-pointer"
                            >
                              ملف وملاحظات التجربة
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateCaseStatus(c.id, 'Finishing')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 size={13} />
                              <span>نقل للتشطيب النهائي</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Create Courier Dispatch Form */}
          {canManageCourier && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck size={18} className="text-blue-600" />
                  <span>إصدار أمر حركة مندوب جديد (استلام طبعة / إرسال تجربة / توصيل نهائي)</span>
                </h3>
              </div>

              <form onSubmit={handleCreateDispatch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">العيادة المستهدفة</label>
                    <select
                      value={clinicId}
                      onChange={(e) => {
                        setClinicId(e.target.value);
                        setSelectedCaseIds([]);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                    >
                      {clinics.map((cl) => (
                        <option key={cl.id} value={cl.id}>
                          {cl.name} (د. {cl.doctorName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">نوع المهمة</label>
                    <select
                      value={direction}
                      onChange={(e) => setDirection(e.target.value as CourierDirection)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                    >
                      {Object.entries(COURIER_DIRECTION_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">اسم المندوب المكلف</label>
                    <input
                      type="text"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="اسم المندوب..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">جوال المندوب</label>
                    <input
                      type="text"
                      value={courierPhone}
                      onChange={(e) => setCourierPhone(e.target.value)}
                      placeholder="967..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>

                {clinicCandidateCases.length > 0 && direction !== 'pickup_impression' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 block">
                      اختر الحالات المرفقة مع المندوب في هذه الحافظة:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {clinicCandidateCases.map((c) => {
                        const checked = selectedCaseIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => toggleCaseCheckbox(c.id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                              checked
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            #{c.id} · {c.patientName} ({STATUS_LABELS[c.status]})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">ملاحظات العنوان أو الموعد</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="مثلاً: تسليم للاستقبال واستلام طبعة جديدة بنفس المشوار..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    <span>اعتماد وإصدار أمر المندوب</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Courier Orders Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">سجل أوامر حركة المناديب وطلبات الأطباء</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">رقم الأمر</th>
                    <th className="py-3 px-4">العيادة والمصدر</th>
                    <th className="py-3 px-4">نوع المهمة والحالات</th>
                    <th className="py-3 px-4">المندوب المكلف</th>
                    <th className="py-3 px-4">الحالة التشغيلية</th>
                    <th className="py-3 px-4 text-center">إجراءات وحافظة التسليم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        لا توجد مهام مناديب مسجلة حالياً
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-slate-900">
                          {order.id}
                          <div className="text-[10px] text-slate-400">{order.requestedAt}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <MapPin size={12} className="text-blue-600" />
                            <span>{order.clinicName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {order.requestedBy === 'doctor' ? (
                              <span className="text-violet-700 font-bold">طلب مباشر من بوابة الطبيب</span>
                            ) : (
                              <span>توجيه من إدارة المعمل</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {COURIER_DIRECTION_LABELS[order.direction]}
                          </div>
                          {order.caseIds.length > 0 && (
                            <div className="text-[11px] font-mono text-blue-700 mt-0.5">
                              الحالات: {order.caseIds.map((id) => `#${id}`).join(' ، ')}
                            </div>
                          )}
                          {order.notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{order.notes}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {canManageCourier ? (
                            <div className="flex items-center gap-1.5">
                              <UserCheck size={13} className="text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={order.courierName || ''}
                                onChange={(e) =>
                                  onUpdateCourierOrder(order.id, {
                                    courierName: e.target.value,
                                    status:
                                      order.status === 'requested' && e.target.value.trim()
                                        ? 'assigned'
                                        : order.status,
                                  })
                                }
                                placeholder="عيّن مندوباً..."
                                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold w-32"
                              />
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-800">
                              {order.courierName || 'بانتظار التكليف'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={order.status}
                            disabled={!canManageCourier}
                            onChange={(e) => {
                              const nextSt = e.target.value as CourierStatus;
                              onUpdateCourierOrder(order.id, {
                                status: nextSt,
                                updatedAt: new Date().toISOString().split('T')[0],
                              });
                              if (nextSt === 'delivered' && order.direction === 'final_delivery') {
                                order.caseIds.forEach((cid) => onUpdateCaseStatus(cid, 'Delivered'));
                              }
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer"
                          >
                            {Object.entries(COURIER_STATUS_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onOpenPrint({ type: 'courier-manifest', courierOrder: order })
                              }
                              className="px-2.5 py-1 border border-slate-200 hover:border-blue-500 rounded-md font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                              title="طباعة حافظة تسليم المندوب"
                            >
                              <Printer size={13} />
                              <span>الحافظة</span>
                            </button>

                            <a
                              href={getWhatsAppHref(
                                order.courierPhone || whatsappPhone,
                                `مهمة مندوب (${order.id}) — ${labName} (${branchName}):\nالعيادة: ${order.clinicName}\nالمهمة: ${COURIER_DIRECTION_LABELS[order.direction]}\nملاحظات: ${order.notes || 'لا يوجد'}`
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md"
                              title="إرسال تفاصيل المشوار للمندوب واتساب"
                            >
                              <MessageSquare size={14} />
                            </a>

                            {canManageCourier && (
                              <button
                                type="button"
                                onClick={() => onDeleteCourierOrder(order.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                                title="حذف الأمر"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
