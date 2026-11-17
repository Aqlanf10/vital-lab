import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Edit3,
  FileCheck2,
  FileText,
  LayoutDashboard,
  Link2,
  LogOut,
  MessageSquare,
  Package,
  PlusCircle,
  Printer,
  Search,
  Settings,
  Star,
  Stethoscope,
  Store,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import {
  AuthSession,
  Branch,
  CaseCommissionSplit,
  CasePriority,
  CaseStatus,
  CaseTransferEvent,
  Clinic,
  DentalCase,
  InventoryItem,
  LabSettings,
  PaymentReceipt,
  Permission,
  RestorationConnection,
  Service,
  Staff,
  StaffTransaction,
} from './types';
import {
  computeClinicFinancials,
  computeStaffWorkload,
  DEFAULT_LAB_SETTINGS,
  getSeedDataForBranch,
  INITIAL_BRANCHES,
  INITIAL_SERVICES,
  normalizeClinicsList,
  normalizeStaffList,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  STATUS_LABELS,
} from './data/seedData';
import { DentalChartSelector, VitaShadeSelector } from './components/DentalChartSelector';
import { DualEntryGate } from './components/DualEntryGate';
import { PrintModalPayload, PrintModals } from './components/PrintModals';
import { BillingAndStatements } from './components/BillingAndStatements';
import { DoctorPortalView } from './components/DoctorPortalView';
import { ReportsAndAlerts } from './components/ReportsAndAlerts';
import { CaseQualityModal, CaseTransferModal } from './components/CaseWorkflowModals';
import { StaffPerformanceHub } from './components/StaffPerformanceHub';

type ActiveTab =
  | 'dashboard'
  | 'cases'
  | 'new-case'
  | 'billing'
  | 'clinics'
  | 'inventory'
  | 'staff'
  | 'reports'
  | 'settings';

export default function App() {
  // Global Branches & Settings
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('vital_branches');
    return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
  });

  const [labSettings, setLabSettings] = useState<LabSettings>(() => {
    const saved = localStorage.getItem('vital_lab_settings');
    return saved ? { ...DEFAULT_LAB_SETTINGS, ...JSON.parse(saved) } : DEFAULT_LAB_SETTINGS;
  });

  const [services, setServices] = useState<Service[]>(() => {
    const saved = localStorage.getItem('vital_services');
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  // Detect Direct Doctor Portal URL (?portal=doctor&branch=...)
  const [urlPortalConfig] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      isDoctorLocked: params.get('portal') === 'doctor',
      branchParam: params.get('branch') || undefined,
    };
  });

  const [portalEntryMode, setPortalEntryMode] = useState<'lab' | 'doctor'>(() =>
    urlPortalConfig.isDoctorLocked ? 'doctor' : 'lab'
  );

  // Auth Session & Selected Branch
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    const saved = localStorage.getItem('vital_auth_session');
    if (!saved) return null;
    try {
      const parsed: AuthSession = JSON.parse(saved);
      if (urlPortalConfig.isDoctorLocked && parsed.mode !== 'doctor') {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const selectedBranch = useMemo(() => {
    if (!authSession) return null;
    return branches.find((b) => b.id === authSession.branchId) || null;
  }, [authSession, branches]);

  // Branch-Scoped Entities
  const [cases, setCases] = useState<DentalCase[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [staffTransactions, setStaffTransactions] = useState<StaffTransaction[]>([]);
  const [branchLoadedId, setBranchLoadedId] = useState<string | null>(null);

  // UI Navigation & State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'OVERDUE' | 'READY' | 'DELIVERED'>('ALL');
  const [printPayload, setPrintPayload] = useState<PrintModalPayload | null>(null);
  const [transferModalCase, setTransferModalCase] = useState<DentalCase | null>(null);
  const [qualityModalCase, setQualityModalCase] = useState<DentalCase | null>(null);
  const [toastMsg, setToastMsg] = useState<string>('');
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);

  // Case Form State (Create & Edit)
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [caseClinicRefId, setCaseClinicRefId] = useState<string>('');
  const [casePatientName, setCasePatientName] = useState<string>('');
  const [caseServiceType, setCaseServiceType] = useState<string>(INITIAL_SERVICES[0].name);
  const [caseSelectedTeeth, setCaseSelectedTeeth] = useState<number[]>([]);
  const [caseConnectionType, setCaseConnectionType] = useState<RestorationConnection>('single');
  const [caseManualUnits, setCaseManualUnits] = useState<number>(1);
  const [caseShade, setCaseShade] = useState<string>('A1');
  const [caseUnitPrice, setCaseUnitPrice] = useState<number>(INITIAL_SERVICES[0].defaultPrice);
  const [caseDiscount, setCaseDiscount] = useState<number>(0);
  const [caseStaffId, setCaseStaffId] = useState<string>('');
  const [casePriority, setCasePriority] = useState<CasePriority>('normal');
  const [caseDueDate, setCaseDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [caseNotes, setCaseNotes] = useState<string>('');

  // Branch Edit State
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  // Clinic Edit State
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // Persist Global Settings
  useEffect(() => {
    localStorage.setItem('vital_branches', JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem('vital_lab_settings', JSON.stringify(labSettings));
  }, [labSettings]);

  useEffect(() => {
    localStorage.setItem('vital_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    if (authSession) {
      localStorage.setItem('vital_auth_session', JSON.stringify(authSession));
    } else {
      localStorage.removeItem('vital_auth_session');
    }
  }, [authSession]);

  // Load Scoped Data When Branch Changes
  useEffect(() => {
    if (!selectedBranch) {
      setBranchLoadedId(null);
      return;
    }

    const prefix = `vital_${selectedBranch.id}_`;
    const seeded = getSeedDataForBranch(selectedBranch.id);

    const savedCases = localStorage.getItem(`${prefix}cases`);
    const savedStaff = localStorage.getItem(`${prefix}staff`);
    const savedClinics = localStorage.getItem(`${prefix}clinics`);
    const savedInventory = localStorage.getItem(`${prefix}inventory`);
    const savedReceipts = localStorage.getItem(`${prefix}receipts`);
    const savedStaffTx = localStorage.getItem(`${prefix}staff_transactions`);

    const loadedStaff = normalizeStaffList(
      savedStaff ? JSON.parse(savedStaff) : seeded.staff,
      selectedBranch.id
    );
    const loadedClinics = normalizeClinicsList(
      savedClinics ? JSON.parse(savedClinics) : seeded.clinics,
      selectedBranch.id
    );
    const loadedCases: DentalCase[] = savedCases ? JSON.parse(savedCases) : seeded.cases;
    const loadedInventory: InventoryItem[] = savedInventory
      ? JSON.parse(savedInventory)
      : seeded.inventory;
    const loadedReceipts: PaymentReceipt[] = savedReceipts
      ? JSON.parse(savedReceipts)
      : seeded.receipts;
    const loadedStaffTx: StaffTransaction[] = savedStaffTx
      ? JSON.parse(savedStaffTx)
      : seeded.staffTransactions;

    setStaff(loadedStaff);
    setClinics(loadedClinics);
    setCases(loadedCases);
    setInventory(loadedInventory);
    setReceipts(loadedReceipts);
    setStaffTransactions(loadedStaffTx);
    setCaseClinicRefId(loadedClinics[0]?.id || '');
    setCaseStaffId(loadedStaff.find((s) => s.userRole === 'technician')?.id || loadedStaff[0]?.id || '');
    setBranchLoadedId(selectedBranch.id);
    localStorage.setItem('vital_selected_branch', JSON.stringify(selectedBranch));
  }, [selectedBranch]);

  // Persist Scoped Data On Mutation
  useEffect(() => {
    if (!selectedBranch || branchLoadedId !== selectedBranch.id) return;
    const prefix = `vital_${selectedBranch.id}_`;
    localStorage.setItem(`${prefix}cases`, JSON.stringify(cases));
    localStorage.setItem(`${prefix}staff`, JSON.stringify(staff));
    localStorage.setItem(`${prefix}clinics`, JSON.stringify(clinics));
    localStorage.setItem(`${prefix}inventory`, JSON.stringify(inventory));
    localStorage.setItem(`${prefix}receipts`, JSON.stringify(receipts));
    localStorage.setItem(`${prefix}staff_transactions`, JSON.stringify(staffTransactions));
  }, [cases, staff, clinics, inventory, receipts, staffTransactions, selectedBranch, branchLoadedId]);

  // Current Authenticated Staff User & Permissions
  const currentUser = useMemo(() => {
    if (!authSession || authSession.mode !== 'lab') return null;
    return staff.find((s) => s.id === authSession.userId) || staff[0] || null;
  }, [authSession, staff]);

  const userPermissions = useMemo<Permission[]>(() => {
    if (!currentUser) return [];
    return ROLE_PERMISSIONS[currentUser.userRole] || ROLE_PERMISSIONS.technician;
  }, [currentUser]);

  const hasPermission = (perm: Permission) => userPermissions.includes(perm);
  const canViewFinancials = hasPermission('billing.view');

  const handleLogout = () => {
    const previousMode = authSession?.mode || 'lab';
    setPortalEntryMode(urlPortalConfig.isDoctorLocked ? 'doctor' : previousMode);
    setAuthSession(null);
    localStorage.removeItem('vital_selected_branch');
  };

  const handleSwitchBranchQuick = (branchId: string) => {
    const targetBranch = branches.find((b) => b.id === branchId);
    if (!targetBranch || !authSession) return;
    const prefix = `vital_${targetBranch.id}_`;
    const rawStaff = localStorage.getItem(`${prefix}staff`);
    const targetStaff = normalizeStaffList(rawStaff ? JSON.parse(rawStaff) : [], targetBranch.id);
    const matchingRoleUser =
      targetStaff.find((s) => s.userRole === currentUser?.userRole) || targetStaff[0];

    setAuthSession({
      mode: 'lab',
      branchId: targetBranch.id,
      userId: matchingRoleUser?.id,
    });
    showToast(`تم التبديل إلى ${targetBranch.name}`);
  };

  // Alerts Count
  const todayStr = new Date().toISOString().split('T')[0];
  const alertsSummary = useMemo(() => {
    const overdue = cases.filter(
      (c) => c.status !== 'Delivered' && c.status !== 'Ready' && c.dueDate < todayStr
    ).length;
    const dueToday = cases.filter(
      (c) => c.status !== 'Delivered' && c.dueDate === todayStr
    ).length;
    const lowStock = inventory.filter((i) => i.quantity <= i.minThreshold).length;
    return { overdue, dueToday, lowStock, total: overdue + dueToday + lowStock };
  }, [cases, inventory, todayStr]);

  // Dashboard Statistics
  const stats = useMemo(() => {
    const totalRevenue = cases.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
    const totalCollected = receipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const activeCases = cases.filter((c) => c.status !== 'Delivered').length;
    const readyCases = cases.filter((c) => c.status === 'Ready').length;
    const totalUnits = cases.reduce((sum, c) => sum + (Number(c.units) || 0), 0);
    return { totalRevenue, totalCollected, activeCases, readyCases, totalUnits };
  }, [cases, receipts]);

  // Enhanced Search & Status Filtering for Cases
  const filteredCases = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return cases.filter((c) => {
      // If logged in strictly as technician, show all lab cases or highlight assigned
      if (statusFilter === 'ACTIVE' && c.status === 'Delivered') return false;
      if (statusFilter === 'READY' && c.status !== 'Ready') return false;
      if (statusFilter === 'DELIVERED' && c.status !== 'Delivered') return false;
      if (
        statusFilter === 'OVERDUE' &&
        (c.status === 'Delivered' || c.status === 'Ready' || c.dueDate >= todayStr)
      ) {
        return false;
      }

      if (!q) return true;

      const clinicObj = clinics.find(
        (cl) => cl.id === c.clinicRefId || cl.name === c.clinicId || cl.id === c.clinicId
      );
      const doctorName = c.doctorName || clinicObj?.doctorName || '';
      const staffMember = staff.find((s) => s.id === c.staffId);
      const staffName = staffMember?.name || '';
      const statusLabel = STATUS_LABELS[c.status] || '';
      const teethStr = (c.selectedTeeth || []).join(' ');

      return (
        c.patientName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.clinicId.toLowerCase().includes(q) ||
        doctorName.toLowerCase().includes(q) ||
        staffName.toLowerCase().includes(q) ||
        statusLabel.toLowerCase().includes(q) ||
        c.shade.toLowerCase().includes(q) ||
        c.serviceType.toLowerCase().includes(q) ||
        teethStr.includes(q)
      );
    });
  }, [cases, searchTerm, statusFilter, clinics, staff, todayStr]);

  // Effective Units & Net Price in Case Form
  const effectiveCaseUnits =
    caseSelectedTeeth.length > 0 ? caseSelectedTeeth.length : Math.max(1, caseManualUnits);
  const computedNetPrice = Math.max(0, effectiveCaseUnits * caseUnitPrice - (caseDiscount || 0));

  const resetCaseForm = () => {
    setEditingCaseId(null);
    setCasePatientName('');
    setCaseSelectedTeeth([]);
    setCaseConnectionType('single');
    setCaseManualUnits(1);
    setCaseShade('A1');
    const defaultSrv = services[0] || INITIAL_SERVICES[0];
    setCaseServiceType(defaultSrv.name);
    setCaseUnitPrice(defaultSrv.defaultPrice);
    setCaseDiscount(0);
    setCasePriority('normal');
    const d = new Date();
    d.setDate(d.getDate() + (defaultSrv.estimatedDays || 3));
    setCaseDueDate(d.toISOString().split('T')[0]);
    setCaseNotes('');
  };

  const openEditCase = (c: DentalCase) => {
    const matchedClinic = clinics.find(
      (cl) => cl.id === c.clinicRefId || cl.name === c.clinicId
    );
    setEditingCaseId(c.id);
    setCaseClinicRefId(matchedClinic?.id || clinics[0]?.id || '');
    setCasePatientName(c.patientName);
    setCaseServiceType(c.serviceType);
    setCaseSelectedTeeth(c.selectedTeeth || []);
    setCaseConnectionType(c.connectionType || 'single');
    setCaseManualUnits(c.units);
    setCaseShade(c.shade);
    setCaseUnitPrice(
      c.unitPrice || Math.round(((c.price || 0) + (c.discount || 0)) / Math.max(1, c.units))
    );
    setCaseDiscount(c.discount || 0);
    setCaseStaffId(c.staffId);
    setCasePriority(c.priority || 'normal');
    setCaseDueDate(c.dueDate);
    setCaseNotes(c.notes || '');
    setActiveTab('new-case');
  };

  const handleSaveCase = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenClinic =
      clinics.find((cl) => cl.id === caseClinicRefId) || clinics[0];
    if (!chosenClinic) {
      showToast('يرجى إضافة عيادة واحدة على الأقل قبل تسجيل الحالات');
      setActiveTab('clinics');
      return;
    }

    if (editingCaseId) {
      setCases(
        cases.map((c) =>
          c.id === editingCaseId
            ? {
                ...c,
                clinicId: chosenClinic.name,
                clinicRefId: chosenClinic.id,
                doctorName: chosenClinic.doctorName,
                patientName: casePatientName.trim(),
                serviceType: caseServiceType,
                selectedTeeth: caseSelectedTeeth.length > 0 ? caseSelectedTeeth : undefined,
                connectionType: caseConnectionType,
                units: effectiveCaseUnits,
                shade: caseShade,
                unitPrice: caseUnitPrice,
                discount: caseDiscount,
                price: computedNetPrice,
                staffId: caseStaffId,
                priority: casePriority,
                dueDate: caseDueDate,
                notes: caseNotes.trim() || undefined,
              }
            : c
        )
      );
      showToast(`تم تحديث بيانات الحالة #${editingCaseId}`);
    } else {
      const newCase: DentalCase = {
        id: `V-${Date.now().toString().slice(-4)}`,
        clinicId: chosenClinic.name,
        clinicRefId: chosenClinic.id,
        doctorName: chosenClinic.doctorName,
        patientName: casePatientName.trim(),
        serviceType: caseServiceType,
        selectedTeeth: caseSelectedTeeth.length > 0 ? caseSelectedTeeth : undefined,
        connectionType: caseConnectionType,
        units: effectiveCaseUnits,
        shade: caseShade,
        unitPrice: caseUnitPrice,
        discount: caseDiscount,
        price: computedNetPrice,
        staffId: caseStaffId,
        status: 'Pending',
        priority: casePriority,
        receivedDate: todayStr,
        dueDate: caseDueDate,
        notes: caseNotes.trim() || undefined,
        source: 'lab',
        stageHistory: [
          {
            status: 'Pending',
            timestamp: new Date().toLocaleString('ar-EG'),
            updatedBy: currentUser?.name || 'النظام',
          },
        ],
      };
      setCases([newCase, ...cases]);
      showToast(`تم اعتماد الحالة الجديدة #${newCase.id} بنجاح`);
    }

    resetCaseForm();
    setActiveTab('cases');
  };

  const updateCaseStatus = (id: string, status: CaseStatus) => {
    setCases(
      cases.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              deliveredDate: status === 'Delivered' ? todayStr : c.deliveredDate,
              stageHistory: [
                ...(c.stageHistory || []),
                {
                  status,
                  timestamp: new Date().toLocaleString('ar-EG'),
                  updatedBy: currentUser?.name || 'فني المعمل',
                },
              ],
            }
          : c
      )
    );
  };

  const handleAddReceipt = (receiptInput: Omit<PaymentReceipt, 'id'>) => {
    const newReceipt: PaymentReceipt = {
      ...receiptInput,
      id: `RCP-${Date.now().toString().slice(-4)}`,
    };
    setReceipts([newReceipt, ...receipts]);
    showToast(`تم إصدار سند القبض ${newReceipt.id} بمبلغ ${newReceipt.amount} ${labSettings.currency}`);
  };

  const handleDeleteReceipt = (id: string) => {
    setReceipts(receipts.filter((r) => r.id !== id));
    showToast('تم حذف سند القبض وتحديث رصيد العيادة');
  };

  // Clinic CRUD
  const handleSaveClinic = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const doctorName = (fd.get('doctorName') as string).trim();
    const phone = (fd.get('phone') as string).trim();
    const portalPin = ((fd.get('portalPin') as string) || '').trim() || phone.replace(/\D/g, '').slice(-4) || '1234';
    const address = ((fd.get('address') as string) || '').trim();
    const openingBalance = Number(fd.get('openingBalance') || 0);

    if (editingClinic) {
      setClinics(
        clinics.map((c) =>
          c.id === editingClinic.id
            ? { ...c, name, doctorName, phone, portalPin, address, openingBalance }
            : c
        )
      );
      setEditingClinic(null);
      showToast('تم تحديث بيانات العيادة');
    } else {
      const newClinic: Clinic = {
        id: `C-${Date.now().toString().slice(-4)}`,
        name,
        doctorName,
        phone,
        portalPin,
        address,
        openingBalance,
      };
      setClinics([...clinics, newClinic]);
      showToast('تمت إضافة العيادة وتفعيل رمز بوابة الطبيب');
    }
    e.currentTarget.reset();
  };

  // Staff / Payroll / Case Reassignment / QC Handlers
  const handleAddStaffMember = (memberInput: Omit<Staff, 'id'>) => {
    const newStaff: Staff = {
      ...memberInput,
      id: `S-${Date.now().toString().slice(-4)}`,
    };
    setStaff([...staff, newStaff]);
    showToast(`تم تسجيل عقد وحساب ${newStaff.name} بمعرّف (${newStaff.username})`);
  };

  const handleDeleteStaffMember = (id: string) => {
    setStaff(staff.filter((s) => s.id !== id));
    showToast('تم حذف حساب الموظف');
  };

  const handleAddStaffTransaction = (txInput: Omit<StaffTransaction, 'id'>) => {
    const created: StaffTransaction = {
      ...txInput,
      id: `STX-${Date.now().toString().slice(-4)}`,
    };
    setStaffTransactions([created, ...staffTransactions]);
    showToast(`تم قيد الحركة المالية (${created.amount} ${labSettings.currency}) لحساب ${created.staffName}`);
  };

  const handleDeleteStaffTransaction = (id: string) => {
    setStaffTransactions(staffTransactions.filter((tx) => tx.id !== id));
    showToast('تم حذف الحركة المالية وتحديث كشف الراتب');
  };

  const handleConfirmCaseTransfer = (params: {
    caseId: string;
    newStaffId: string;
    commissionSplits?: CaseCommissionSplit[];
    transferEvent: CaseTransferEvent;
  }) => {
    setCases(
      cases.map((c) =>
        c.id === params.caseId
          ? {
              ...c,
              staffId: params.newStaffId,
              commissionSplits: params.commissionSplits,
              transferHistory: [...(c.transferHistory || []), params.transferEvent],
              stageHistory: [
                ...(c.stageHistory || []),
                {
                  status: c.status,
                  timestamp: new Date().toLocaleString('ar-EG'),
                  updatedBy: `${params.transferEvent.transferredBy} (تحويل إلى ${params.transferEvent.toStaffName})`,
                },
              ],
            }
          : c
      )
    );
    setTransferModalCase(null);
    showToast(
      `تم سحب وتحويل الحالة #${params.caseId} إلى ${params.transferEvent.toStaffName} وتحديث توزيع العمولة`
    );
  };

  const handleSaveQualityEvaluation = (params: {
    caseId: string;
    qualityRating: number;
    qualityNotes: string;
    isRemake: boolean;
    remakeReason?: string;
    remakeStaffId?: string;
    resetToDesigning?: boolean;
    deductionTransaction?: Omit<StaffTransaction, 'id'>;
  }) => {
    setCases(
      cases.map((c) => {
        if (c.id !== params.caseId) return c;
        const nextRemakeCount = params.isRemake
          ? Math.max(1, (c.remakeCount || 0) + (c.isRemake ? 0 : 1))
          : 0;
        const nextStatus: CaseStatus = params.resetToDesigning ? 'Designing' : c.status;
        return {
          ...c,
          status: nextStatus,
          qualityRating: params.qualityRating,
          qualityNotes: params.qualityNotes || undefined,
          isRemake: params.isRemake,
          remakeCount: nextRemakeCount,
          remakeReason: params.remakeReason,
          remakeStaffId: params.remakeStaffId,
        };
      })
    );

    if (params.deductionTransaction) {
      const tx: StaffTransaction = {
        ...params.deductionTransaction,
        id: `STX-${Date.now().toString().slice(-4)}`,
      };
      setStaffTransactions([tx, ...staffTransactions]);
    }

    setQualityModalCase(null);
    showToast(`تم اعتماد تقييم الجودة (${params.qualityRating}/5) للحالة #${params.caseId}`);
  };

  // Inventory CRUD
  const handleAddInventoryItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newItem: InventoryItem = {
      id: `INV-${Date.now().toString().slice(-4)}`,
      name: (fd.get('name') as string).trim(),
      category: (fd.get('category') as InventoryItem['category']) || 'Blocks',
      quantity: Number(fd.get('quantity') || 0),
      minThreshold: Number(fd.get('minThreshold') || 3),
      unit: ((fd.get('unit') as string) || 'قطعة').trim(),
    };
    setInventory([newItem, ...inventory]);
    e.currentTarget.reset();
    showToast('تمت إضافة الصنف الجديد إلى مخزون الفرع');
  };

  const updateInventoryQuantity = (id: string, delta: number) => {
    setInventory(
      inventory.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
      )
    );
  };

  // Service CRUD
  const handleAddService = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newService: Service = {
      id: `SRV-${Date.now().toString().slice(-4)}`,
      name: (fd.get('name') as string).trim(),
      defaultPrice: Number(fd.get('defaultPrice') || 0),
      estimatedDays: Number(fd.get('estimatedDays') || 3),
    };
    setServices([...services, newService]);
    e.currentTarget.reset();
    showToast('تمت إضافة الخدمة إلى قائمة الأسعار');
  };

  // Branch CRUD
  const handleSaveBranch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get('name') as string).trim();
    const location = (fd.get('location') as string).trim();
    const phone = ((fd.get('phone') as string) || '').trim();

    if (editingBranch) {
      setBranches(
        branches.map((b) =>
          b.id === editingBranch.id ? { ...b, name, location, phone } : b
        )
      );
      setEditingBranch(null);
      showToast('تم تحديث بيانات الفرع');
    } else {
      const newBranch: Branch = {
        id: `B-${Date.now().toString().slice(-4)}`,
        name,
        location,
        phone,
      };
      setBranches([...branches, newBranch]);
      showToast(`تم إنشاء ${newBranch.name} بقاعدة بيانات مستقلة`);
    }
    e.currentTarget.reset();
  };

  const handleDeleteBranch = (id: string) => {
    if (branches.length <= 1) {
      showToast('لا يمكن حذف الفرع الوحيد في النظام');
      return;
    }
    const remaining = branches.filter((b) => b.id !== id);
    setBranches(remaining);
    if (selectedBranch?.id === id) {
      setAuthSession(null);
    }
    showToast('تم حذف الفرع بنجاح');
  };

  // Full LocalStorage JSON Backup & Restore
  const handleExportBackup = () => {
    const dump: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('vital_')) {
        try {
          dump[k] = JSON.parse(localStorage.getItem(k) || 'null');
        } catch {
          dump[k] = localStorage.getItem(k);
        }
      }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vital-dental-lab-backup-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تحميل ملف النسخة الاحتياطية الكاملة بنجاح');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        Object.entries(parsed).forEach(([k, val]) => {
          if (k.startsWith('vital_')) {
            localStorage.setItem(k, JSON.stringify(val));
          }
        });
        window.location.reload();
      } catch {
        showToast('ملف النسخة الاحتياطية غير صالح');
      }
    };
    reader.readAsText(file);
  };

  const getWhatsAppHref = (phone: string, message: string) => {
    const cleanPhone = (phone || labSettings.whatsappPhone).replace(/[^\d]/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const getDoctorPortalUrl = (branchId: string) => {
    return `${window.location.origin}${window.location.pathname}?portal=doctor&branch=${encodeURIComponent(branchId)}`;
  };

  const copyDoctorPortalLink = (branchId: string) => {
    const url = getDoctorPortalUrl(branchId);
    navigator.clipboard?.writeText(url);
    showToast('تم نسخ الرابط المباشر المعزول لبوابة الأطباء');
  };

  // 1. Render Isolated Portal Entry Gate if not authenticated
  if (!authSession || !selectedBranch) {
    return (
      <DualEntryGate
        branches={branches}
        initialPortalMode={portalEntryMode}
        initialBranchId={urlPortalConfig.branchParam}
        isDoctorPortalLocked={urlPortalConfig.isDoctorLocked}
        onSwitchPortalMode={(mode) => setPortalEntryMode(mode)}
        onAuthenticated={(session) => {
          setAuthSession(session);
          setActiveTab('dashboard');
        }}
      />
    );
  }

  // 2. Render Dedicated Doctor Portal if authenticated as Clinic/Doctor
  if (authSession.mode === 'doctor') {
    const activeDoctorClinic =
      clinics.find((c) => c.id === authSession.clinicId) || clinics[0];
    if (!activeDoctorClinic) {
      return (
        <DualEntryGate
          branches={branches}
          initialPortalMode="doctor"
          initialBranchId={urlPortalConfig.branchParam}
          isDoctorPortalLocked={urlPortalConfig.isDoctorLocked}
          onSwitchPortalMode={(mode) => setPortalEntryMode(mode)}
          onAuthenticated={(session) => setAuthSession(session)}
        />
      );
    }

    return (
      <DoctorPortalView
        branch={selectedBranch}
        clinic={activeDoctorClinic}
        cases={cases}
        receipts={receipts}
        services={services}
        staff={staff}
        clinics={clinics}
        labSettings={labSettings}
        onSubmitNewCase={(order) => {
          const created: DentalCase = {
            ...order,
            id: `V-${Date.now().toString().slice(-4)}`,
          };
          setCases([created, ...cases]);
        }}
        onLogout={handleLogout}
      />
    );
  }

  // Navigation Items Filtered by Current User Role Permissions
  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<any>; show: boolean }[] = [
    { id: 'dashboard', label: 'لوحة القيادة', icon: LayoutDashboard, show: hasPermission('dashboard.view') },
    { id: 'cases', label: 'إدارة الحالات والإنتاج', icon: ClipboardList, show: hasPermission('cases.view') },
    { id: 'new-case', label: editingCaseId ? 'تعديل حالة' : 'تسجيل حالة (مخطط FDI)', icon: PlusCircle, show: hasPermission('cases.create') },
    { id: 'billing', label: 'المالية وسندات القبض', icon: Wallet, show: hasPermission('billing.view') },
    { id: 'clinics', label: 'العيادات والأطباء', icon: Store, show: hasPermission('clinics.view') },
    { id: 'inventory', label: 'المخزون والخامات', icon: Package, show: hasPermission('inventory.view') },
    { id: 'staff', label: 'الطاقم والأداء والرواتب', icon: Users, show: hasPermission('staff.view') },
    { id: 'reports', label: 'التقارير والتنبيهات', icon: BarChart3, show: hasPermission('reports.view') || hasPermission('inventory.view') },
    { id: 'settings', label: 'الإعدادات والفروع', icon: Settings, show: hasPermission('settings.manage') },
  ];

  const currency = labSettings.currency || 'ر.س';

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden" dir="rtl">
      {/* Official Print Document Modal */}
      <PrintModals
        payload={printPayload}
        onClose={() => setPrintPayload(null)}
        branch={selectedBranch}
        labSettings={labSettings}
        cases={cases}
        receipts={receipts}
        staff={staff}
        clinics={clinics}
      />

      {/* Case Withdrawal & Technician Reassignment Modal */}
      <CaseTransferModal
        dentalCase={transferModalCase}
        staff={staff}
        allCases={cases}
        currentUserName={currentUser?.name || 'المشرف'}
        currency={currency}
        canViewFinancials={canViewFinancials}
        onClose={() => setTransferModalCase(null)}
        onConfirmTransfer={handleConfirmCaseTransfer}
      />

      {/* Case Quality Control & Remake Evaluation Modal */}
      <CaseQualityModal
        dentalCase={qualityModalCase}
        staff={staff}
        currentUserName={currentUser?.name || 'المشرف'}
        currency={currency}
        canManageDeductions={hasPermission('billing.manage') || hasPermission('staff.manage')}
        onClose={() => setQualityModalCase(null)}
        onSaveQualityEvaluation={handleSaveQualityEvaluation}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 left-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 border border-slate-700 no-print">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Sidebar (264px Desktop SaaS Layout) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 border-l border-slate-800 no-print">
        <div className="p-5 border-b border-slate-800">
          <div className="text-lg font-extrabold tracking-tight text-white">
            {labSettings.labName}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>{selectedBranch.name}</span>
            <span className="text-blue-400 font-semibold">
              {currentUser ? ROLE_LABELS[currentUser.userRole] : ''}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'new-case' && activeTab !== 'new-case') {
                      resetCaseForm();
                    }
                    setActiveTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={17} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'reports' && alertsSummary.total > 0 && (
                    <span
                      className={`font-mono tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {alertsSummary.total}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3 text-xs">
          <div className="text-slate-400">
            <div className="font-bold text-slate-200 truncate">{currentUser?.name}</div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">{currentUser?.role}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2 px-3 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-300 border border-slate-700 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>تبديل الحساب / البوابة</span>
          </button>
          <div className="text-[10px] text-slate-500 text-center pt-1">
            تطوير دكتور عقلان الكامل
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Clean Contextual SaaS Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
            <span className="text-slate-300">/</span>
            {/* Fast Branch Switcher */}
            <select
              value={selectedBranch.id}
              onChange={(e) => handleSwitchBranchQuick(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
              title="التبديل السريع بين الفروع"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.location})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Live Case Search */}
            <div className="relative hidden sm:block">
              <Search size={15} className="text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (activeTab !== 'cases') setActiveTab('cases');
                }}
                placeholder="ابحث بالمريض، الطبيب، الفني، اللون، أو رقم السن..."
                className="bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-1.5 text-xs w-72 lg:w-80 outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>

            {/* Smart Alerts Shortcut Button */}
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
              title="تنبيهات التسليم والمخزون"
            >
              <Bell size={15} className={alertsSummary.total > 0 ? 'text-amber-600' : 'text-slate-400'} />
              <span className="font-mono tabular-nums font-bold">{alertsSummary.total}</span>
              <span className="hidden md:inline">تنبيهات</span>
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Viewport */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* ================= DASHBOARD ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Alert Banner if Overdue or Low Stock */}
              {alertsSummary.total > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs text-slate-800">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold">ملخص التنبيهات التشغيلية اليوم: </span>
                      <span>
                        {alertsSummary.overdue} حالات متأخرة · {alertsSummary.dueToday} تسليمات مستحقة اليوم ·{' '}
                        {alertsSummary.lowStock} أصناف مخزون تحت الحد الأدنى
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reports')}
                    className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg text-xs font-bold text-amber-900 whitespace-nowrap cursor-pointer"
                  >
                    معالجة التنبيهات
                  </button>
                </div>
              )}

              {/* KPI Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {canViewFinancials ? (
                  <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>إجمالي مبيعات الفرع</span>
                      <TrendingUp size={16} className="text-blue-600" />
                    </div>
                    <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
                      {stats.totalRevenue.toLocaleString()}{' '}
                      <span className="text-xs font-sans font-semibold text-slate-500">{currency}</span>
                    </div>
                    <div className="text-xs text-emerald-700 mt-1 font-mono tabular-nums">
                      محصل منها: {stats.totalCollected.toLocaleString()} {currency}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-5 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>مهامي المسندة حالياً</span>
                      <ClipboardList size={16} className="text-blue-600" />
                    </div>
                    <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
                      {cases.filter((c) => c.staffId === currentUser?.id && c.status !== 'Delivered').length}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">حالات نشطة تحت مسؤوليتك</div>
                  </div>
                )}

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>حالات قيد التصنيع</span>
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
                    {stats.activeCases}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">في خطوط التصميم والخرط والخزف</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>جاهز للتسليم للعيادات</span>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-emerald-700 mt-2">
                    {stats.readyCases}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">اجتازت فحص الجودة النهائي</div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>إجمالي الوحدات المنتجة</span>
                    <FileText size={16} className="text-violet-600" />
                  </div>
                  <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 mt-2">
                    {stats.totalUnits}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">تيجان وعدسات وجسور مسجلة</div>
                </div>
              </div>

              {/* Recent Cases + Production Pipeline */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">أحدث الحالات في قسم الإنتاج</h3>
                    <div className="flex items-center gap-3">
                      {hasPermission('cases.create') && (
                        <button
                          type="button"
                          onClick={() => {
                            resetCaseForm();
                            setActiveTab('new-case');
                          }}
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          + تسجيل حالة جديدة
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveTab('cases')}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        عرض الكل ←
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                          <th className="py-3 px-4">الحالة / المريض</th>
                          <th className="py-3 px-4">العيادة</th>
                          <th className="py-3 px-4">التركيبة والأسنان</th>
                          <th className="py-3 px-4">المرحلة</th>
                          <th className="py-3 px-4">التسليم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {cases.slice(0, 6).map((c) => {
                          const isOverdue =
                            c.status !== 'Delivered' && c.status !== 'Ready' && c.dueDate < todayStr;
                          return (
                            <tr key={c.id} className="hover:bg-slate-50/80">
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">
                                  <span className="font-mono tabular-nums text-blue-700 ml-1.5">
                                    #{c.id}
                                  </span>
                                  {c.patientName}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {c.source === 'doctor-portal' ? 'وارد من بوابة الطبيب' : 'إدخال المعمل'}
                                  {c.priority === 'urgent' ? ' · مستعجل' : ''}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-700">{c.clinicId}</td>
                              <td className="py-3.5 px-4 text-slate-600">
                                <div className="font-semibold text-slate-800">{c.serviceType}</div>
                                <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                                  {c.units} وحدات · {c.shade}
                                  {c.selectedTeeth?.length ? ` · [${c.selectedTeeth.join(',')}]` : ''}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-semibold text-slate-800">
                                {STATUS_LABELS[c.status]}
                              </td>
                              <td
                                className={`py-3.5 px-4 font-mono tabular-nums font-semibold ${
                                  isOverdue ? 'text-red-600' : 'text-slate-600'
                                }`}
                              >
                                {c.dueDate}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Stage Distribution */}
                <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">توزيع مراحل خط الإنتاج</h3>
                    <p className="text-xs text-slate-500 mt-0.5">عدد الحالات في كل قسم تشغيلي الآن</p>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(STATUS_LABELS).map(([key, label]) => {
                      const count = cases.filter((c) => c.status === key).length;
                      const pct = cases.length > 0 ? (count / cases.length) * 100 : 0;
                      return (
                        <div key={key} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-700">{label}</span>
                            <span className="font-mono tabular-nums font-bold text-slate-900">
                              {count}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-200"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= CASES MANAGEMENT ================= */}
          {activeTab === 'cases' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto">
                  {(
                    [
                      { id: 'ALL', label: `الكل (${cases.length})` },
                      { id: 'ACTIVE', label: 'قيد التصنيع' },
                      { id: 'OVERDUE', label: `متأخرة (${alertsSummary.overdue})` },
                      { id: 'READY', label: 'جاهز للتسليم' },
                      { id: 'DELIVERED', label: 'تم التسليم' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        statusFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {hasPermission('cases.create') && (
                  <button
                    type="button"
                    onClick={() => {
                      resetCaseForm();
                      setActiveTab('new-case');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <PlusCircle size={15} />
                    <span>تسجيل حالة جديدة</span>
                  </button>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <span>
                    النتائج المعروضة:{' '}
                    <strong className="font-mono tabular-nums text-slate-900">
                      {filteredCases.length}
                    </strong>{' '}
                    حالة
                  </span>
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="text-blue-600 hover:underline font-semibold cursor-pointer"
                    >
                      مسح كلمة البحث "{searchTerm}"
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="py-3 px-4">رقم الحالة</th>
                        <th className="py-3 px-4">المريض والعيادة</th>
                        <th className="py-3 px-4">التركيبة والأسنان (FDI)</th>
                        <th className="py-3 px-4">الفني المسؤول</th>
                        <th className="py-3 px-4">المرحلة الإنتاجية</th>
                        <th className="py-3 px-4">موعد التسليم</th>
                        {canViewFinancials && <th className="py-3 px-4 text-left">الصافي</th>}
                        <th className="py-3 px-4 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCases.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400">
                            لا توجد حالات مطابقة لمعايير البحث أو التصفية الحالية
                          </td>
                        </tr>
                      ) : (
                        filteredCases.map((c) => {
                          const tech = staff.find((s) => s.id === c.staffId);
                          const clinicObj = clinics.find(
                            (cl) => cl.id === c.clinicRefId || cl.name === c.clinicId
                          );
                          const isOverdue =
                            c.status !== 'Delivered' &&
                            c.status !== 'Ready' &&
                            c.dueDate < todayStr;

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/70">
                              <td className="py-3.5 px-4 font-mono tabular-nums font-bold text-blue-700 whitespace-nowrap">
                                #{c.id}
                                {c.priority === 'urgent' && (
                                  <div className="text-[10px] font-sans text-red-600 font-bold">
                                    مستعجل
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900">{c.patientName}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {c.clinicId}
                                  {clinicObj?.doctorName ? ` · د. ${clinicObj.doctorName}` : ''}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-900">{c.serviceType}</div>
                                <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                                  اللون {c.shade} · {c.units} وحدات
                                  {c.selectedTeeth?.length
                                    ? ` · أسنان [${c.selectedTeeth.join(
                                        c.connectionType === 'bridge' ? '-' : ','
                                      )}]`
                                    : ''}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="text-slate-900 font-semibold">
                                  {tech?.name || 'غير معين'}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                                  {c.commissionSplits && c.commissionSplits.length > 1 && (
                                    <span className="text-amber-700 font-semibold">
                                      مشترك ({c.commissionSplits.length})
                                    </span>
                                  )}
                                  {c.qualityRating && (
                                    <span className="font-mono tabular-nums text-emerald-700 font-semibold">
                                      جودة {c.qualityRating}/5
                                    </span>
                                  )}
                                  {c.isRemake && (
                                    <span className="text-red-600 font-bold">إعادة</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <select
                                  value={c.status}
                                  onChange={(e) =>
                                    updateCaseStatus(c.id, e.target.value as CaseStatus)
                                  }
                                  disabled={!hasPermission('cases.edit')}
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                                >
                                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td
                                className={`py-3.5 px-4 font-mono tabular-nums font-semibold whitespace-nowrap ${
                                  isOverdue ? 'text-red-600' : 'text-slate-600'
                                }`}
                              >
                                {c.dueDate}
                                {isOverdue && <div className="text-[10px] font-sans">متأخر</div>}
                              </td>
                              {canViewFinancials && (() => {
                                const paidForCase = receipts
                                  .filter((r) => r.caseId === c.id)
                                  .reduce((s, r) => s + (Number(r.amount) || 0), 0);
                                const payLabel =
                                  paidForCase >= c.price && c.price > 0
                                    ? 'مسدد'
                                    : paidForCase > 0
                                    ? 'سداد جزئي'
                                    : 'مقيد بالحساب';
                                const payColor =
                                  paidForCase >= c.price && c.price > 0
                                    ? 'text-emerald-700'
                                    : paidForCase > 0
                                    ? 'text-amber-700'
                                    : 'text-slate-400';
                                return (
                                  <td className="py-3.5 px-4 text-left whitespace-nowrap">
                                    <div className="font-mono tabular-nums font-bold text-slate-900">
                                      {c.price.toLocaleString()} {currency}
                                    </div>
                                    <div className={`text-[10px] font-semibold ${payColor}`}>
                                      {payLabel}
                                    </div>
                                  </td>
                                );
                              })()}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center justify-center gap-1">
                                  {hasPermission('cases.edit') && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setTransferModalCase(c)}
                                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                        title="سحب الحالة وتحويلها لفني آخر مع تقاسم أو نقل العمولة"
                                      >
                                        <ArrowLeftRight size={15} />
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setQualityModalCase(c)}
                                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                                        title="تقييم الجودة الفنية أو تسجيل إعادة عمل (Remake)"
                                      >
                                        <Star size={15} />
                                      </button>
                                    </>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPrintPayload({ type: 'job-card', dentalCase: c })
                                    }
                                    className="p-1.5 text-slate-500 hover:text-violet-700 hover:bg-violet-50 rounded-md transition-colors cursor-pointer"
                                    title="طباعة بطاقة عمل فنية (Job Card)"
                                  >
                                    <FileCheck2 size={15} />
                                  </button>

                                  {canViewFinancials && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPrintPayload({ type: 'invoice', dentalCase: c })
                                      }
                                      className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                                      title="طباعة فاتورة مالية"
                                    >
                                      <Printer size={15} />
                                    </button>
                                  )}

                                  <a
                                    href={getWhatsAppHref(
                                      clinicObj?.phone || labSettings.whatsappPhone,
                                      `مرحباً د. ${
                                        clinicObj?.doctorName || c.clinicId
                                      }، تحديث من ${labSettings.labName} (${
                                        selectedBranch.name
                                      }): حالة المريض (${c.patientName}) رقم #${
                                        c.id
                                      } أصبحت الآن في مرحلة: ${STATUS_LABELS[c.status]}.`
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                                    title="إشعار الطبيب عبر واتساب"
                                  >
                                    <MessageSquare size={15} />
                                  </a>

                                  {hasPermission('cases.create') && (
                                    <button
                                      type="button"
                                      onClick={() => openEditCase(c)}
                                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                      title="تعديل الحالة ومخطط الأسنان"
                                    >
                                      <Edit3 size={15} />
                                    </button>
                                  )}

                                  {hasPermission('cases.delete') &&
                                    (confirmDeleteKey === `case-${c.id}` ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCases(cases.filter((item) => item.id !== c.id));
                                          setConfirmDeleteKey(null);
                                          showToast('تم حذف الحالة');
                                        }}
                                        className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-bold cursor-pointer"
                                      >
                                        تأكيد
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteKey(`case-${c.id}`)}
                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                                        title="حذف الحالة"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    ))}
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
            </div>
          )}

          {/* ================= NEW / EDIT CASE WITH FDI DENTAL CHART ================= */}
          {activeTab === 'new-case' && (
            <div className="max-w-5xl mx-auto bg-white rounded-xl border border-slate-200 p-6 lg:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingCaseId
                      ? `تعديل بيانات الحالة #${editingCaseId}`
                      : 'تسجيل أمر عمل جديد في المختبر'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    اختر العيادة، حدد أرقام الأسنان من مخطط FDI التفاعلي، واختر درجة اللون والفني المسؤول
                  </p>
                </div>
                {editingCaseId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetCaseForm();
                      setActiveTab('cases');
                    }}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveCase} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">العيادة / الطبيب المتعاقد</label>
                    <select
                      value={caseClinicRefId}
                      onChange={(e) => setCaseClinicRefId(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
                    >
                      {clinics.map((cl) => (
                        <option key={cl.id} value={cl.id}>
                          {cl.name} (د. {cl.doctorName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">اسم المريض</label>
                    <input
                      type="text"
                      required
                      value={casePatientName}
                      onChange={(e) => setCasePatientName(e.target.value)}
                      placeholder="الاسم الثلاثي للمريض..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">نوع الخدمة / التركيبة</label>
                    <select
                      value={caseServiceType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCaseServiceType(val);
                        const srv = services.find((s) => s.name === val);
                        if (srv) setCaseUnitPrice(srv.defaultPrice);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-600 focus:bg-white"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} ({s.defaultPrice} {currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Interactive FDI Dental Chart */}
                <DentalChartSelector
                  selectedTeeth={caseSelectedTeeth}
                  onChange={setCaseSelectedTeeth}
                  connectionType={caseConnectionType}
                  onConnectionTypeChange={setCaseConnectionType}
                />

                {/* VITA Shade Selector */}
                <VitaShadeSelector value={caseShade} onChange={setCaseShade} />

                {/* Assignment, Schedule & Pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">عدد الوحدات</label>
                    <input
                      type="number"
                      min="1"
                      value={effectiveCaseUnits}
                      readOnly={caseSelectedTeeth.length > 0}
                      onChange={(e) => setCaseManualUnits(Number(e.target.value) || 1)}
                      className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono tabular-nums font-bold ${
                        caseSelectedTeeth.length > 0
                          ? 'bg-blue-50/50 text-blue-700'
                          : 'bg-slate-50 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      سعر الوحدة ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={caseUnitPrice}
                      onChange={(e) => setCaseUnitPrice(Number(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono tabular-nums font-bold outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      الخصم ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={caseDiscount}
                      onChange={(e) => setCaseDiscount(Number(e.target.value) || 0)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono tabular-nums outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">الفني المسؤول</label>
                    <select
                      value={caseStaffId}
                      onChange={(e) => setCaseStaffId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-600 focus:bg-white"
                    >
                      {staff
                        .filter((s) => s.userRole === 'technician' || s.userRole === 'supervisor')
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">تاريخ التسليم</label>
                    <input
                      type="date"
                      required
                      value={caseDueDate}
                      onChange={(e) => setCaseDueDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Live Technician Workload Strip for Fair Distribution */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      مؤشر ضغط العمل الحالي للفنيين (لتوزيع الأعمال بعدالة)
                    </span>
                    <span className="text-slate-500">اضغط على الفني لإسناد الحالة له مباشرة</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {staff
                      .filter((s) => s.userRole === 'technician' || s.userRole === 'supervisor')
                      .map((tech) => {
                        const wl = computeStaffWorkload(tech, cases, todayStr);
                        const isChosen = caseStaffId === tech.id;
                        const barColor =
                          wl.loadStatus === 'overloaded'
                            ? 'bg-red-600'
                            : wl.loadStatus === 'busy'
                            ? 'bg-amber-500'
                            : 'bg-emerald-600';
                        return (
                          <button
                            key={tech.id}
                            type="button"
                            onClick={() => setCaseStaffId(tech.id)}
                            className={`p-3 rounded-lg border text-right text-xs transition-colors cursor-pointer ${
                              isChosen
                                ? 'border-blue-600 bg-white font-bold'
                                : 'border-slate-200 bg-white/70 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-900 font-bold truncate">{tech.name}</span>
                              <span className="font-mono tabular-nums text-[11px] text-slate-600">
                                {wl.activeUnits}/{wl.maxUnits} وحدة
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${Math.min(100, wl.loadPercent)}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 flex justify-between">
                              <span>{wl.loadLabel}</span>
                              <span>{wl.activeCasesCount} حالات نشطة</span>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">أولوية التنفيذ</label>
                    <select
                      value={casePriority}
                      onChange={(e) => setCasePriority(e.target.value as CasePriority)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-600 focus:bg-white"
                    >
                      <option value="normal">اعتيادي</option>
                      <option value="urgent">مستعجل (أولوية قصوى)</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">
                      الملاحظات الفنية والسريرية
                    </label>
                    <input
                      type="text"
                      value={caseNotes}
                      onChange={(e) => setCaseNotes(e.target.value)}
                      placeholder="تفاصيل خط الإنهاء، الإطباق، أو تعليمات التلوين..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 block">الصافي المستحق تقييده على حساب العيادة</span>
                    <span className="text-2xl font-extrabold font-mono tabular-nums text-blue-400">
                      {computedNetPrice.toLocaleString()} {currency}
                    </span>
                  </div>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <PlusCircle size={17} />
                    <span>{editingCaseId ? 'حفظ التعديلات' : 'اعتماد الحالة في خط الإنتاج'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= BILLING & STATEMENTS ================= */}
          {activeTab === 'billing' && hasPermission('billing.view') && (
            <BillingAndStatements
              clinics={clinics}
              cases={cases}
              receipts={receipts}
              canManageBilling={hasPermission('billing.manage')}
              currentUserName={currentUser?.name || 'المحاسب'}
              currency={currency}
              onAddReceipt={handleAddReceipt}
              onDeleteReceipt={handleDeleteReceipt}
              onOpenPrint={setPrintPayload}
            />
          )}

          {/* ================= CLINICS & DOCTORS ================= */}
          {activeTab === 'clinics' && hasPermission('clinics.view') && (
            <div className="space-y-6">
              {/* Direct Isolated Doctor Portal Share Banner */}
              <div className="bg-violet-50/70 border border-violet-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-600 text-white flex items-center justify-center shrink-0">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      رابط بوابة الأطباء المعزولة ({selectedBranch.name})
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      شارك هذا الرابط مع الأطباء المتعاقدين؛ يفتح شاشة دخول الأطباء فقط دون إظهار بوابة الإدارة أو أسماء العيادات الأخرى.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copyDoctorPortalLink(selectedBranch.id)}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Copy size={14} />
                  <span>نسخ الرابط المباشر للأطباء</span>
                </button>
              </div>

              {hasPermission('clinics.manage') && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {editingClinic ? `تعديل بيانات: ${editingClinic.name}` : 'تسجيل عيادة / طبيب متعاقد جديد'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        يدخل الطبيب لبوابته الخاصة باستخدام رقم جواله المسجل والرمز السري للعيادة
                      </p>
                    </div>
                    {editingClinic && (
                      <button
                        type="button"
                        onClick={() => setEditingClinic(null)}
                        className="text-xs text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
                      >
                        إلغاء التعديل
                      </button>
                    )}
                  </div>

                  <form
                    key={editingClinic?.id || 'new-clinic'}
                    onSubmit={handleSaveClinic}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3"
                  >
                    <input
                      name="name"
                      defaultValue={editingClinic?.name || ''}
                      placeholder="اسم العيادة / المركز"
                      required
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white"
                    />
                    <input
                      name="doctorName"
                      defaultValue={editingClinic?.doctorName || ''}
                      placeholder="اسم الطبيب المسؤول"
                      required
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white"
                    />
                    <input
                      name="phone"
                      defaultValue={editingClinic?.phone || ''}
                      placeholder="رقم الجوال للدخول (967...)"
                      required
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:border-blue-600 focus:bg-white"
                    />
                    <input
                      name="portalPin"
                      defaultValue={editingClinic?.portalPin || ''}
                      placeholder="الرمز السري للبوابة (مثلاً 4567)"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:border-blue-600 focus:bg-white"
                    />
                    <input
                      name="openingBalance"
                      type="number"
                      defaultValue={editingClinic?.openingBalance || 0}
                      placeholder="رصيد افتتاحي سابق"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:border-blue-600 focus:bg-white"
                    />
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-blue-600 text-white rounded-lg px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {editingClinic ? 'حفظ التعديل' : 'إضافة العيادة'}
                    </button>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {clinics.map((c) => {
                  const fin = computeClinicFinancials(c, cases, receipts);
                  const portalUrl = getDoctorPortalUrl(selectedBranch.id);
                  return (
                    <div
                      key={c.id}
                      className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-bold text-slate-900">{c.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            د. {c.doctorName}
                          </p>
                          <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums">
                            جوال الدخول: <strong className="text-slate-800">{c.phone}</strong> · الرمز:{' '}
                            <strong className="text-violet-700">{c.portalPin}</strong>
                          </div>
                        </div>
                        {hasPermission('clinics.manage') && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditingClinic(c)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md cursor-pointer"
                              title="تعديل"
                            >
                              <Edit3 size={14} />
                            </button>
                            {confirmDeleteKey === `clinic-${c.id}` ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setClinics(clinics.filter((item) => item.id !== c.id));
                                  setConfirmDeleteKey(null);
                                  showToast('تم حذف العيادة');
                                }}
                                className="px-2 py-0.5 bg-red-600 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                تأكيد
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteKey(`clinic-${c.id}`)}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {canViewFinancials && (
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-center text-xs">
                          <div>
                            <span className="text-[11px] text-slate-400 block">الحالات</span>
                            <strong className="font-mono tabular-nums text-slate-900">
                              {fin.casesCount}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">المسدد</span>
                            <strong className="font-mono tabular-nums text-emerald-700">
                              {fin.totalPaid.toLocaleString()}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">الرصيد المتبقي</span>
                            <strong className="font-mono tabular-nums text-amber-700">
                              {fin.netBalance.toLocaleString()}
                            </strong>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={getWhatsAppHref(
                            c.phone,
                            `مرحباً د. ${c.doctorName}، بيانات الدخول الخاصة بعيادتكم (${c.name}) في بوابة أطباء ${labSettings.labName} (${selectedBranch.name}):\nالرابط المباشر: ${portalUrl}\nرقم الجوال: ${c.phone}\nالرمز السري: ${c.portalPin}`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          title="إرسال الرابط المباشر ورمز البوابة للطبيب عبر واتساب"
                        >
                          <Link2 size={14} />
                          <span>إرسال البوابة واتساب</span>
                        </a>
                        {canViewFinancials && (
                          <button
                            type="button"
                            onClick={() => setPrintPayload({ type: 'statement', clinic: c })}
                            className="py-2 px-2.5 bg-slate-100 hover:bg-slate-900 text-slate-700 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Printer size={14} />
                            <span>كشف حساب</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= INVENTORY ================= */}
          {activeTab === 'inventory' && hasPermission('inventory.view') && (
            <div className="space-y-6">
              {hasPermission('inventory.manage') && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="text-base font-bold text-slate-900 mb-4">
                    إضافة صنف خامات أو بلوكات جديد للمخزون
                  </h3>
                  <form
                    onSubmit={handleAddInventoryItem}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
                  >
                    <input
                      name="name"
                      required
                      placeholder="اسم الصنف (مثلاً: بلوك زيركون A2 16mm)"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white lg:col-span-2"
                    />
                    <select
                      name="category"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white"
                    >
                      <option value="Blocks">الأقراص والبلوكات (Blocks)</option>
                      <option value="Powder">بودرة الخزف (Powder)</option>
                      <option value="Liquids">السوائل والتلوين (Liquids)</option>
                      <option value="Tools">أدوات وسنابل الخرط (Tools)</option>
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        name="quantity"
                        type="number"
                        min="0"
                        required
                        placeholder="الكمية"
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:border-blue-600"
                      />
                      <input
                        name="minThreshold"
                        type="number"
                        min="1"
                        defaultValue={5}
                        placeholder="حد التنبيه"
                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-mono outline-none focus:border-blue-600"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-slate-900 hover:bg-blue-600 text-white rounded-lg px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer"
                    >
                      إضافة للمخزون
                    </button>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(
                  [
                    { key: 'Blocks', title: 'أقراص الزيركون وقوالب الإيماكس' },
                    { key: 'Powder', title: 'بودرة الخزف والتكسية' },
                    { key: 'Liquids', title: 'سوائل التلوين والتزجيج' },
                    { key: 'Tools', title: 'سنابل الخرط والأدوات الدقيقة' },
                  ] as const
                ).map((cat) => {
                  const catItems = inventory.filter((i) => i.category === cat.key);
                  return (
                    <div key={cat.key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">{cat.title}</h4>
                        <span className="text-xs font-mono tabular-nums text-slate-500">
                          {catItems.length} صنف
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {catItems.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400">
                            لا توجد أصناف مسجلة في هذه الفئة
                          </div>
                        ) : (
                          catItems.map((item) => {
                            const isLow = item.quantity <= item.minThreshold;
                            return (
                              <div
                                key={item.id}
                                className="p-4 flex items-center justify-between gap-4"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                    <span>{item.name}</span>
                                    {isLow && (
                                      <span className="text-[11px] font-bold text-red-600">
                                        · نقص حرج
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                                    حد التنبيه الأدنى: {item.minThreshold} {item.unit}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => updateInventoryQuantity(item.id, -1)}
                                    className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span
                                    className={`w-10 text-center font-mono tabular-nums text-sm font-extrabold ${
                                      isLow ? 'text-red-600' : 'text-slate-900'
                                    }`}
                                  >
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateInventoryQuantity(item.id, 1)}
                                    className="w-7 h-7 rounded-md border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                                  >
                                    +
                                  </button>
                                  {hasPermission('inventory.manage') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInventory(inventory.filter((x) => x.id !== item.id));
                                        showToast('تم حذف صنف المخزون');
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                                      title="حذف الصنف"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STAFF, WORKLOAD, KPIS & PAYROLL HUB ================= */}
          {activeTab === 'staff' && hasPermission('staff.view') && (
            <StaffPerformanceHub
              staff={staff}
              cases={cases}
              staffTransactions={staffTransactions}
              currentUser={currentUser}
              currency={currency}
              canManageStaff={hasPermission('staff.manage')}
              canManagePayroll={hasPermission('billing.manage') || hasPermission('staff.manage')}
              canEditCases={hasPermission('cases.edit')}
              onUpdateStaffList={setStaff}
              onAddStaffMember={handleAddStaffMember}
              onDeleteStaffMember={handleDeleteStaffMember}
              onAddStaffTransaction={handleAddStaffTransaction}
              onDeleteStaffTransaction={handleDeleteStaffTransaction}
              onOpenTransferModal={(c) => setTransferModalCase(c)}
              onOpenQualityModal={(c) => setQualityModalCase(c)}
              onOpenPrint={setPrintPayload}
            />
          )}

          {/* ================= REPORTS & ALERTS ================= */}
          {activeTab === 'reports' && (
            <ReportsAndAlerts
              cases={cases}
              clinics={clinics}
              staff={staff}
              inventory={inventory}
              receipts={receipts}
              currency={currency}
              canViewFinancials={canViewFinancials}
              onUpdateCaseStatus={updateCaseStatus}
              onRestockItem={updateInventoryQuantity}
            />
          )}

          {/* ================= SETTINGS, BRANCHES & BACKUP ================= */}
          {activeTab === 'settings' && hasPermission('settings.manage') && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Lab Official Identity */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">بيانات الهوية الرسمية وترويسة الفواتير</h3>
                  <p className="text-xs text-slate-500">تظهر هذه البيانات في الفواتير وسندات القبض وكشوفات الحساب</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">اسم المعمل الرسمي</label>
                    <input
                      type="text"
                      value={labSettings.labName}
                      onChange={(e) => setLabSettings({ ...labSettings, labName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">العملة المعتمدة</label>
                    <input
                      type="text"
                      value={labSettings.currency}
                      onChange={(e) => setLabSettings({ ...labSettings, currency: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">الرقم الضريبي / الترخيص</label>
                    <input
                      type="text"
                      value={labSettings.taxNumber}
                      onChange={(e) => setLabSettings({ ...labSettings, taxNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">رقم واتساب الرسمي</label>
                    <input
                      type="text"
                      value={labSettings.whatsappPhone}
                      onChange={(e) =>
                        setLabSettings({ ...labSettings, whatsappPhone: e.target.value })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-slate-700 block">العنوان العام</label>
                    <input
                      type="text"
                      value={labSettings.address}
                      onChange={(e) => setLabSettings({ ...labSettings, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Services Price List */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">قائمة الخدمات والأسعار الافتراضية</h3>
                <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input
                    name="name"
                    required
                    placeholder="اسم الخدمة / التركيبة"
                    className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                  />
                  <input
                    name="defaultPrice"
                    type="number"
                    min="1"
                    required
                    placeholder={`السعر (${currency})`}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    إضافة خدمة
                  </button>
                </form>

                <div className="divide-y divide-slate-100">
                  {services.map((s) => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={s.defaultPrice}
                          onChange={(e) =>
                            setServices(
                              services.map((item) =>
                                item.id === s.id
                                  ? { ...item, defaultPrice: Number(e.target.value) || 0 }
                                  : item
                              )
                            )
                          }
                          className="w-24 bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono tabular-nums font-bold text-left"
                        />
                        <span className="text-slate-500">{currency}</span>
                        {services.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setServices(services.filter((item) => item.id !== s.id))}
                            className="text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Multi-Branch Management (Create, View, Edit, Delete) */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">إدارة فروع المختبر المستقلة</h3>
                    <p className="text-xs text-slate-500">إضافة أو تعديل أو حذف الفروع الجغرافية</p>
                  </div>
                  {editingBranch && (
                    <button
                      type="button"
                      onClick={() => setEditingBranch(null)}
                      className="text-xs text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
                    >
                      إلغاء تعديل الفرع
                    </button>
                  )}
                </div>

                <form
                  key={editingBranch?.id || 'new-branch'}
                  onSubmit={handleSaveBranch}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-3"
                >
                  <input
                    name="name"
                    required
                    defaultValue={editingBranch?.name || ''}
                    placeholder="اسم الفرع (مثلاً: فرع صنعاء)"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                  />
                  <input
                    name="location"
                    required
                    defaultValue={editingBranch?.location || ''}
                    placeholder="العنوان / الموقع"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                  />
                  <input
                    name="phone"
                    defaultValue={editingBranch?.phone || ''}
                    placeholder="هاتف الفرع"
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-blue-600 text-white rounded-lg px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    {editingBranch ? 'حفظ تعديل الفرع' : 'إنشاء فرع جديد'}
                  </button>
                </form>

                <div className="divide-y divide-slate-100">
                  {branches.map((b) => (
                    <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Building2 size={18} className="text-blue-600" />
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {b.name}
                            {b.id === selectedBranch.id && (
                              <span className="text-xs text-blue-600 mr-2">· الفرع المفتوح حالياً</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {b.location} {b.phone ? `· ${b.phone}` : ''}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {b.id !== selectedBranch.id && (
                          <button
                            type="button"
                            onClick={() => handleSwitchBranchQuick(b.id)}
                            className="px-2.5 py-1 border border-slate-200 hover:border-blue-500 rounded-md text-xs font-semibold text-blue-700 cursor-pointer"
                          >
                            انتقال للفرع
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingBranch(b)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                          title="تعديل الفرع"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBranch(b.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                          title="حذف الفرع"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LocalStorage Backup & Restore */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    النسخ الاحتياطي المحلي واستعادة البيانات (JSON)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    تصدير واستيراد كافة بيانات الفروع والحالات والسندات المالية المحفوظة على هذا المتصفح
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>تصدير نسخة احتياطية</span>
                  </button>

                  <label className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                    <Upload size={14} />
                    <span>استعادة من ملف</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
