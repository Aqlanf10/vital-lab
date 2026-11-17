import React, { useMemo, useState } from 'react';
import {
  CaseStatus,
  Clinic,
  DentalCase,
  InventoryItem,
  PaymentReceipt,
  Staff,
} from '../types';
import {
  computeClinicFinancials,
  computeStaffKPIs,
  STATUS_LABELS,
} from '../data/seedData';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Download,
  PackagePlus,
} from 'lucide-react';

interface ReportsAndAlertsProps {
  cases: DentalCase[];
  clinics: Clinic[];
  staff: Staff[];
  inventory: InventoryItem[];
  receipts: PaymentReceipt[];
  currency: string;
  canViewFinancials: boolean;
  onUpdateCaseStatus: (id: string, status: CaseStatus) => void;
  onRestockItem: (id: string, delta: number) => void;
}

export const ReportsAndAlerts: React.FC<ReportsAndAlertsProps> = ({
  cases,
  clinics,
  staff,
  inventory,
  receipts,
  currency,
  canViewFinancials,
  onUpdateCaseStatus,
  onRestockItem,
}) => {
  const [viewMode, setViewMode] = useState<'reports' | 'alerts'>('reports');
  const [periodDays, setPeriodDays] = useState<'all' | '7' | '30' | '365'>('all');

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Alerts Computations
  const overdueCases = useMemo(
    () =>
      cases.filter(
        (c) => c.status !== 'Delivered' && c.status !== 'Ready' && c.dueDate < todayStr
      ),
    [cases, todayStr]
  );

  const dueSoonCases = useMemo(
    () =>
      cases.filter(
        (c) =>
          c.status !== 'Delivered' &&
          (c.dueDate === todayStr || c.dueDate === tomorrowStr)
      ),
    [cases, todayStr, tomorrowStr]
  );

  const lowStockItems = useMemo(
    () => inventory.filter((i) => i.quantity <= i.minThreshold),
    [inventory]
  );

  const totalAlertsCount = overdueCases.length + dueSoonCases.length + lowStockItems.length;

  // Filtered Cases by Period
  const periodCases = useMemo(() => {
    if (periodDays === 'all') return cases;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(periodDays));
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return cases.filter((c) => c.receivedDate >= cutoffStr);
  }, [cases, periodDays]);

  // Clinic Performance Chart Data
  const clinicChartData = useMemo(
    () =>
      clinics.map((cl) => {
        const fin = computeClinicFinancials(cl, periodCases, receipts);
        return {
          name: cl.name.length > 18 ? cl.name.slice(0, 18) + '…' : cl.name,
          billed: fin.totalBilled,
          paid: fin.totalPaid,
          balance: Math.max(0, fin.netBalance),
        };
      }),
    [clinics, periodCases, receipts]
  );

  // Technician Performance Data (Supports Split Commissions, Quality & Remakes)
  const techReportData = useMemo(
    () =>
      staff
        .filter((s) => s.userRole === 'technician' || s.userRole === 'supervisor')
        .map((s) => {
          const kpi = computeStaffKPIs(s, periodCases);
          return {
            id: s.id,
            name: s.name,
            role: s.role,
            totalCases: kpi.participatedCasesCount,
            totalUnits: kpi.totalAssignedUnits,
            completedUnits: kpi.completedEffectiveUnits,
            commission: kpi.totalEarnedCommission,
            onTimeRate: kpi.onTimeRate,
            avgQuality: kpi.avgQualityRating,
            remakeRate: kpi.remakeRate,
          };
        }),
    [staff, periodCases]
  );

  // Service Breakdown
  const serviceBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; units: number; revenue: number }>();
    periodCases.forEach((c) => {
      const prev = map.get(c.serviceType) || { count: 0, units: 0, revenue: 0 };
      map.set(c.serviceType, {
        count: prev.count + 1,
        units: prev.units + (Number(c.units) || 0),
        revenue: prev.revenue + (Number(c.price) || 0),
      });
    });
    return Array.from(map.entries())
      .map(([service, vals]) => ({ service, ...vals }))
      .sort((a, b) => b.units - a.units);
  }, [periodCases]);

  const exportFullReportCSV = () => {
    const headers = [
      'رقم الحالة',
      'التاريخ',
      'موعد التسليم',
      'العيادة',
      'المريض',
      'نوع التركيبة',
      'الوحدات',
      'اللون',
      'المرحلة',
      'السعر الصافي',
    ];
    const rows = [
      headers.join(','),
      ...periodCases.map((c) =>
        [
          c.id,
          c.receivedDate,
          c.dueDate,
          `"${c.clinicId.replace(/"/g, '""')}"`,
          `"${c.patientName.replace(/"/g, '""')}"`,
          `"${c.serviceType.replace(/"/g, '""')}"`,
          c.units,
          c.shade,
          STATUS_LABELS[c.status],
          canViewFinancials ? c.price : '-',
        ].join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vital-lab-report-${todayStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Mode & Period Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('reports')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'reports'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={15} className="text-blue-600" />
            <span>التقارير التحليلية والإنتاجية</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('alerts')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              viewMode === 'alerts'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BellRing size={15} className="text-amber-600" />
            <span>تنبيهات التسليم والمخزون ({totalAlertsCount})</span>
          </button>
        </div>

        {viewMode === 'reports' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
              {(
                [
                  { id: 'all', label: 'كل الفترات' },
                  { id: '7', label: 'آخر 7 أيام' },
                  { id: '30', label: 'آخر 30 يوم' },
                  { id: '365', label: 'هذا العام' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriodDays(p.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    periodDays === p.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={exportFullReportCSV}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Download size={14} />
              <span>تصدير CSV</span>
            </button>
          </div>
        )}
      </div>

      {viewMode === 'alerts' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overdue Cases Column */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-red-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={17} className="text-red-600" />
                <h3 className="text-sm font-bold text-slate-900">حالات متأخرة عن الموعد</h3>
              </div>
              <span className="font-mono tabular-nums text-xs font-bold text-red-700">
                {overdueCases.length}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {overdueCases.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                  لا توجد أي حالات متأخرة عن موعد التسليم
                </div>
              ) : (
                overdueCases.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-lg border border-red-200 bg-red-50/30 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          #{c.id} · {c.patientName}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{c.clinicId}</div>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums font-bold text-red-700">
                        استحقاق: {c.dueDate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-600">
                        المرحلة: <strong>{STATUS_LABELS[c.status]}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateCaseStatus(c.id, 'Ready')}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-600 text-white rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        تحويل لجاهز للتسليم
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Due Today / Tomorrow Column */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-amber-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={17} className="text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">تسليمات اليوم وغداً</h3>
              </div>
              <span className="font-mono tabular-nums text-xs font-bold text-amber-700">
                {dueSoonCases.length}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {dueSoonCases.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  لا توجد تسليمات مجدولة لليوم أو الغد
                </div>
              ) : (
                dueSoonCases.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-lg border border-amber-200 bg-amber-50/30 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          #{c.id} · {c.patientName}
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          {c.serviceType} ({c.units} وحدات)
                        </div>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums font-bold text-amber-800">
                        {c.dueDate === todayStr ? 'اليوم' : 'غداً'} ({c.dueDate})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600">
                      العيادة: {c.clinicId} · الحالة: <strong>{STATUS_LABELS[c.status]}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low Inventory Stock Column */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackagePlus size={17} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">نواقص المخزون الحرجة</h3>
              </div>
              <span className="font-mono tabular-nums text-xs font-bold text-slate-700">
                {lowStockItems.length}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {lowStockItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-2" />
                  كافة أصناف الزيركون والإيماكس فوق الحد الأدنى
                </div>
              ) : (
                lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="text-[11px] text-red-600 font-semibold mt-0.5 font-mono tabular-nums">
                        المتبقي: {item.quantity} {item.unit} (الحد الأدنى: {item.minThreshold})
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRestockItem(item.id, 5)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      + توريد 5
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {canViewFinancials && (
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900">
                    مقارنة الفواتير والتحصيل المالي حسب العيادة
                  </h3>
                  <p className="text-xs text-slate-500">إجمالي المطالبات مقابل المقبوضات الفعلية ({currency})</p>
                </div>
                <div className="h-72 w-full" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clinicChartData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="billed" name="إجمالي الفواتير" fill="#2563EB" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="paid" name="المسدد فعلياً" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className={`bg-white rounded-xl border border-slate-200 p-6 ${!canViewFinancials ? 'lg:col-span-2' : ''}`}>
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">إنتاجية الفنيين والوحدات المنجزة</h3>
                <p className="text-xs text-slate-500">مقارنة إجمالي الوحدات المسندة مقابل المكتملة</p>
              </div>
              <div className="h-72 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={techReportData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalUnits" name="إجمالي الوحدات المسندة" fill="#64748B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completedUnits" name="الوحدات المنجزة" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Service Type Breakdown & Tech Commissions Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">تحليل الطلب حسب نوع التركيبة</h3>
              </div>
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">الخدمة</th>
                    <th className="py-3 px-4 text-center">الحالات</th>
                    <th className="py-3 px-4 text-center">الوحدات</th>
                    {canViewFinancials && <th className="py-3 px-4 text-left">الإيراد</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceBreakdown.map((item) => (
                    <tr key={item.service} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{item.service}</td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">{item.count}</td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums font-bold text-blue-700">
                        {item.units}
                      </td>
                      {canViewFinancials && (
                        <td className="py-3 px-4 text-left font-mono tabular-nums font-bold text-slate-900">
                          {item.revenue.toLocaleString()} {currency}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  كشف كفاءة وجودة وعمولات الطاقم الفني
                </h3>
              </div>
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">الفني</th>
                    <th className="py-3 px-4 text-center">وحدات فعلية</th>
                    <th className="py-3 px-4 text-center">الالتزام</th>
                    <th className="py-3 px-4 text-center">الجودة / الإعادة</th>
                    {canViewFinancials && <th className="py-3 px-4 text-left">عمولة الإنتاج</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {techReportData.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{t.name}</div>
                        <div className="text-[11px] text-slate-500">{t.role}</div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums font-bold text-emerald-700">
                        {t.completedUnits} / {t.totalUnits}
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums font-semibold">
                        {t.onTimeRate}%
                      </td>
                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        <span className="font-bold text-slate-900">{t.avgQuality.toFixed(1)}/5</span>
                        <span className="text-slate-300 mx-1">·</span>
                        <span className={t.remakeRate > 0 ? 'text-red-600 font-bold' : 'text-emerald-700'}>
                          إعادة {t.remakeRate}%
                        </span>
                      </td>
                      {canViewFinancials && (
                        <td className="py-3 px-4 text-left font-mono tabular-nums font-bold text-slate-900">
                          {t.commission.toLocaleString()} {currency}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
