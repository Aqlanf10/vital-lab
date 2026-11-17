import React, { useEffect, useState } from 'react';
import { AuthSession, Branch, Clinic, Staff } from '../types';
import {
  getSeedDataForBranch,
  matchClinicCredentials,
  matchStaffCredentials,
  normalizeClinicsList,
  normalizeStaffList,
} from '../data/seedData';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { OfflineIndicator, PWAInstallButton } from './PWAWidgets';

interface IsolatedPortalGateProps {
  branches: Branch[];
  initialPortalMode: 'lab' | 'doctor';
  initialBranchId?: string;
  isDoctorPortalLocked: boolean;
  onSwitchPortalMode: (mode: 'lab' | 'doctor') => void;
  onAuthenticated: (session: AuthSession, branch: Branch) => void;
}

export const DualEntryGate: React.FC<IsolatedPortalGateProps> = ({
  branches,
  initialPortalMode,
  initialBranchId,
  isDoctorPortalLocked,
  onSwitchPortalMode,
  onAuthenticated,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>(() => {
    if (initialBranchId && branches.some((b) => b.id === initialBranchId)) {
      return initialBranchId;
    }
    return branches[0]?.id || 'taiz';
  });

  const [branchStaff, setBranchStaff] = useState<Staff[]>([]);
  const [branchClinics, setBranchClinics] = useState<Clinic[]>([]);

  // Staff Login Inputs (Completely blank - zero exposed names!)
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  // Doctor Login Inputs (Completely blank - zero exposed clinic names!)
  const [doctorPhone, setDoctorPhone] = useState('');
  const [doctorSecretPin, setDoctorSecretPin] = useState('');
  const [showDoctorPin, setShowDoctorPin] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  const activeBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const portalMode = isDoctorPortalLocked ? 'doctor' : initialPortalMode;

  useEffect(() => {
    if (!activeBranch) return;
    const prefix = `vital_${activeBranch.id}_`;
    const rawStaff = localStorage.getItem(`${prefix}staff`);
    const rawClinics = localStorage.getItem(`${prefix}clinics`);

    const parsedStaff = normalizeStaffList(
      rawStaff ? JSON.parse(rawStaff) : [],
      activeBranch.id
    );
    const parsedClinics = normalizeClinicsList(
      rawClinics ? JSON.parse(rawClinics) : [],
      activeBranch.id
    );

    if (!rawStaff) {
      localStorage.setItem(`${prefix}staff`, JSON.stringify(parsedStaff));
    }
    if (!rawClinics) {
      const seeded = getSeedDataForBranch(activeBranch.id);
      localStorage.setItem(`${prefix}clinics`, JSON.stringify(parsedClinics));
      if (!localStorage.getItem(`${prefix}cases`)) {
        localStorage.setItem(`${prefix}cases`, JSON.stringify(seeded.cases));
      }
      if (!localStorage.getItem(`${prefix}receipts`)) {
        localStorage.setItem(`${prefix}receipts`, JSON.stringify(seeded.receipts));
      }
      if (!localStorage.getItem(`${prefix}inventory`)) {
        localStorage.setItem(`${prefix}inventory`, JSON.stringify(seeded.inventory));
      }
      if (!localStorage.getItem(`${prefix}expenses`)) {
        localStorage.setItem(`${prefix}expenses`, JSON.stringify(seeded.expenses));
      }
      if (!localStorage.getItem(`${prefix}suppliers`)) {
        localStorage.setItem(`${prefix}suppliers`, JSON.stringify(seeded.suppliers));
      }
      if (!localStorage.getItem(`${prefix}courier_orders`)) {
        localStorage.setItem(`${prefix}courier_orders`, JSON.stringify(seeded.courierOrders));
      }
    }

    setBranchStaff(parsedStaff);
    setBranchClinics(parsedClinics);
    setErrorMsg('');
  }, [selectedBranchId, activeBranch]);

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const matchedUser = matchStaffCredentials(branchStaff, staffIdentifier, staffPassword);
    if (!matchedUser) {
      setErrorMsg('بيانات الدخول غير صحيحة، يرجى التحقق من اسم المستخدم أو الجوال وكلمة المرور.');
      return;
    }
    onAuthenticated(
      { mode: 'lab', branchId: activeBranch.id, userId: matchedUser.id },
      activeBranch
    );
  };

  const handleDoctorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const matchedClinic = matchClinicCredentials(branchClinics, doctorPhone, doctorSecretPin);
    if (!matchedClinic) {
      setErrorMsg('تعذر تسجيل الدخول؛ يرجى التأكد من رقم الجوال المسجل لدى المعمل والرمز السري للعيادة.');
      return;
    }
    onAuthenticated(
      { mode: 'doctor', branchId: activeBranch.id, clinicId: matchedClinic.id },
      activeBranch
    );
  };

  // ============================================================================
  // 1. STANDALONE ISOLATED DOCTOR PORTAL LOGIN SCREEN
  // ============================================================================
  if (portalMode === 'doctor') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between" dir="rtl">
        <header className="bg-white border-b border-slate-200 px-6 lg:px-12 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center">
              <Stethoscope size={17} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Vital Dental Lab · بوابة الأطباء
            </span>
          </div>

          <div className="hidden md:flex items-center gap-5 text-xs text-slate-500 font-medium">
            <span>إرسال الوصفات الرقمية</span>
            <span aria-hidden="true">·</span>
            <span>تتبع مراحل التصنيع</span>
            <span aria-hidden="true">·</span>
            <span>كشوف الحساب والفواتير</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <PWAInstallButton variant="violet" />
            {!isDoctorPortalLocked ? (
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  onSwitchPortalMode('lab');
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>بوابة الإدارة والطاقم</span>
                <ArrowLeft size={14} />
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-medium whitespace-nowrap shrink-0 hidden sm:inline">
                البوابة الإلكترونية للعيادات المتعاقدة
              </span>
            )}
          </div>
        </header>
        <OfflineIndicator />

        <main className="max-w-lg w-full mx-auto px-6 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
            <div className="space-y-1.5 text-right">
              <div className="text-xs font-bold text-violet-700">بوابة الأطباء والعيادات المتعاقدة</div>
              <h1 className="text-2xl font-extrabold text-slate-900">تسجيل دخول الطبيب</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                أدخل رقم الجوال المعتمد لدى المعمل والرمز السري الخاص بعيادتك للوصول إلى حالات مرضاك وكشف حسابك.
              </p>
            </div>

            <form onSubmit={handleDoctorLogin} className="space-y-4" autoComplete="off">
              {/* Branch Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">فرع المعمل</label>
                <div className="relative">
                  <Building2 size={16} className="text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-violet-600 focus:bg-white"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} — {b.location}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Manual Doctor Phone Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  رقم جوال الطبيب المسجل
                </label>
                <div className="relative">
                  <Phone size={16} className="text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={doctorPhone}
                    onChange={(e) => setDoctorPhone(e.target.value)}
                    placeholder="أدخل رقم الجوال المسجل لدى المعمل..."
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm font-mono tabular-nums text-right outline-none focus:border-violet-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Manual Clinic Secret Code Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  رمز العيادة السري
                </label>
                <div className="relative">
                  <KeyRound size={16} className="text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showDoctorPin ? 'text' : 'password'}
                    required
                    value={doctorSecretPin}
                    onChange={(e) => setDoctorSecretPin(e.target.value)}
                    placeholder="أدخل الرمز السري الخاص بالعيادة..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-10 py-3 text-sm font-mono tabular-nums outline-none focus:border-violet-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDoctorPin(!showDoctorPin)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showDoctorPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
                  >
                    {showDoctorPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock size={16} />
                <span>دخول إلى بوابة الطبيب</span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
              في حال فقدان رمز البوابة الخاص بعيادتك، يرجى التواصل مع إدارة المعمل لتزويدك به.
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-500">
          <span>Vital Dental Lab</span>
          <span className="mx-2">·</span>
          <span>بوابة الأطباء الرقمية</span>
          <span className="mx-2">·</span>
          <span className="font-semibold text-slate-700">تطوير دكتور عقلان الكامل</span>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // 2. STANDALONE STAFF & ADMINISTRATION LOGIN SCREEN (DEFAULT MAIN PORTAL)
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between" dir="rtl">
      <header className="border-b border-slate-800/80 bg-slate-900/60 px-6 lg:px-12 py-4 flex items-center justify-between gap-8">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <ShieldCheck size={17} />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-white">
            Vital Dental Lab
          </span>
        </div>

        <div className="hidden md:flex items-center gap-5 text-xs text-slate-400">
          <span>نظام الإدارة الداخلية والإنتاج</span>
          <span aria-hidden="true">·</span>
          <span>دخول مصرح لطاقم المعمل فقط</span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PWAInstallButton variant="dark" />
          <button
            type="button"
            onClick={() => {
              setErrorMsg('');
              onSwitchPortalMode('doctor');
            }}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Stethoscope size={14} className="text-violet-400" />
            <span>الانتقال لبوابة الأطباء</span>
          </button>
        </div>
      </header>
      <OfflineIndicator />

      <main className="max-w-5xl w-full mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Right Column: Branch Selection Only (Zero Staff or Clinic Names!) */}
        <section className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold text-blue-400 mb-2">بوابة الإدارة وطاقم التشغيل</p>
              <h1 className="text-2xl font-extrabold leading-snug text-white text-balance">
                اختر الفرع التشغيلي لتسجيل الدخول
              </h1>
              <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                يرجى تحديد الفرع ثم إدخال معرّف المستخدم أو رقم الجوال وكلمة المرور الخاصة بك.
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-400 block">الفروع المعتمدة</span>
              <div className="space-y-2 max-h-64 overflow-y-auto pl-1">
                {branches.map((branch) => {
                  const isSelected = branch.id === activeBranch?.id;
                  return (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => setSelectedBranchId(branch.id)}
                      className={`w-full text-right p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 size={18} className={isSelected ? 'text-white shrink-0' : 'text-blue-400 shrink-0'} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold truncate">{branch.name}</div>
                          <div
                            className={`text-[11px] flex items-center gap-1 mt-0.5 truncate ${
                              isSelected ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            <MapPin size={11} />
                            <span>{branch.location}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold shrink-0">
                        {isSelected ? 'محدد' : 'اختيار'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800 text-[11px] text-slate-500">
            منظومة محمية بصلاحيات متعددة المستويات؛ تخضع كافة عمليات الدخول لسياسة الخصوصية الداخلية للمعمل.
          </div>
        </section>

        {/* Left Column: Clean Manual Staff Credentials Form */}
        <section className="lg:col-span-7 bg-white text-slate-900 rounded-2xl border border-slate-200 p-8 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 block mb-1">
                {activeBranch?.name}
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">
                تسجيل دخول الإدارة والفنيين
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                أدخل اسم المستخدم أو رقم الجوال متبوعاً بكلمة المرور
              </p>
            </div>

            <form onSubmit={handleStaffLogin} className="space-y-4" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  اسم المستخدم أو رقم الجوال
                </label>
                <div className="relative">
                  <User size={16} className="text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={staffIdentifier}
                    onChange={(e) => setStaffIdentifier(e.target.value)}
                    placeholder="أدخل معرّف المستخدم أو رقم الجوال..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  كلمة المرور / رمز الدخول
                </label>
                <div className="relative">
                  <KeyRound size={16} className="text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showStaffPassword ? 'text' : 'password'}
                    required
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-10 py-3 text-sm font-mono tabular-nums text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showStaffPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  >
                    {showStaffPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock size={16} />
                <span>تسجيل الدخول للنظام</span>
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        <span>Vital Dental Lab</span>
        <span className="mx-2">·</span>
        <span>جميع الحقوق محفوظة &copy; {new Date().getFullYear()}</span>
        <span className="mx-2">·</span>
        <span className="font-semibold text-slate-400">التصميم والتطوير: دكتور عقلان الكامل</span>
      </footer>
    </div>
  );
};
