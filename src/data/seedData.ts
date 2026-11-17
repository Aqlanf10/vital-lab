import {
  Branch,
  CaseStatus,
  Clinic,
  CompensationType,
  CourierDirection,
  CourierOrder,
  CourierStatus,
  DentalCase,
  ExpenseCategory,
  InventoryItem,
  LabExpense,
  LabSettings,
  PaymentMethod,
  PaymentReceipt,
  Permission,
  Service,
  Staff,
  StaffTransaction,
  StaffTransactionType,
  Supplier,
  UserRole,
} from '../types';

export const INITIAL_BRANCHES: Branch[] = [
  { id: 'taiz', name: 'فرع تعز', location: 'شارع جمال - جولة القصر', phone: '967770001122', managerName: 'د. عقلان الكامل' },
  { id: 'aden', name: 'فرع عدن', location: 'الشيخ عثمان - خط المملاح', phone: '967770003344', managerName: 'م. ياسر القحطاني' },
];

export const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'زيركون متعدد الطبقات (Multilayer Zirconia)', defaultPrice: 300, estimatedDays: 3, warrantyYears: 5 },
  { id: '2', name: 'عدسات إيماكس تجميلية (E-max Veneers)', defaultPrice: 500, estimatedDays: 4, warrantyYears: 5 },
  { id: '3', name: 'جسر زيركون كامل (Full Contour Bridge)', defaultPrice: 280, estimatedDays: 4, warrantyYears: 5 },
  { id: '4', name: 'تاج فوق زرعة (Implant Zirconia Crown)', defaultPrice: 550, estimatedDays: 5, warrantyYears: 7 },
  { id: '5', name: 'تاج مؤقت رقمي (PMMA Provisional)', defaultPrice: 100, estimatedDays: 1, warrantyYears: 0 },
  { id: '6', name: 'خزف على معدن (PFM Crown)', defaultPrice: 180, estimatedDays: 3, warrantyYears: 3 },
];

export const DEFAULT_LAB_SETTINGS: LabSettings = {
  labName: 'Vital Dental Lab',
  taxNumber: '310489200100003',
  address: 'الإدارة العامة - المختبر الرقمي المتخصص (CAD/CAM)',
  whatsappPhone: '967770001122',
  currency: 'ر.س',
  secondaryCurrency: '$',
  exchangeRate: 3.75,
  warrantyYears: 5,
  autoDeductInventory: true,
};

export const STATUS_ORDER: CaseStatus[] = [
  'Pending',
  'Scanning',
  'Designing',
  'TryIn_Out',
  'TryIn_Returned',
  'Milling',
  'Sintering',
  'Finishing',
  'Ready',
  'Delivered',
];

export const STATUS_LABELS: Record<CaseStatus, string> = {
  Pending: 'بانتظار البدء',
  Scanning: 'مسح ضوئي',
  Designing: 'تصميم CAD',
  TryIn_Out: 'بالتجربة السريرية (Try-In)',
  TryIn_Returned: 'عاد من التجربة للتشطيب',
  Milling: 'خرط Milling',
  Sintering: 'تلبيد Sintering',
  Finishing: 'تلوين وتشطيب',
  Ready: 'جاهز للتسليم',
  Delivered: 'تم التسليم',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  materials: 'خامات وبلوكات زيركون وإيماكس',
  maintenance: 'صيانة أفران ومخارط CAD/CAM',
  rent_utilities: 'إيجارات وكهرباء وإنترنت',
  logistics: 'مواصلات وعهدة المناديب',
  admin: 'مصاريف إدارية وتشغيلية عامة',
};

export const COURIER_DIRECTION_LABELS: Record<CourierDirection, string> = {
  pickup_impression: 'استلام طبعة / قالب من العيادة',
  try_in_dispatch: 'إرسال تجربة سريرية (Try-In) للعيادة',
  final_delivery: 'توصيل تركيبة نهائية جاهزة للعيادة',
};

export const COURIER_STATUS_LABELS: Record<CourierStatus, string> = {
  requested: 'طلب جديد بانتظار المندوب',
  assigned: 'تم تكليف المندوب',
  in_transit: 'المندوب في الطريق',
  arrived_lab: 'وصل للمعمل وتم الاستلام',
  delivered: 'تم التسليم للعيادة',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'مدير عام النظام',
  supervisor: 'مشرف الإنتاج',
  technician: 'فني معمل',
  accountant: 'محاسب مالي',
};

export const COMPENSATION_TYPE_LABELS: Record<CompensationType, string> = {
  fixed_salary: 'راتب شهري ثابت',
  per_unit: 'عمولة بالوحدة المنجزة',
  percentage: 'نسبة مئوية من الحالة',
  hybrid: 'مختلط (راتب + عمولة)',
};

export const STAFF_TRANSACTION_LABELS: Record<StaffTransactionType, string> = {
  advance: 'سلفة مالية',
  bonus: 'مكافأة تشجيعية',
  deduction: 'خصم إداري / إعادة عمل',
  payout: 'صرف راتب / مستحقات',
};

export const TRANSFER_REASONS: string[] = [
  'موازنة ضغط العمل وتوزيع المهام بعدالة',
  'انتقال لمرحلة تخصصية (تكسية خزف / تلوين E-max)',
  'تأخر عن موعد التسليم المحدد للعيادة',
  'إعادة عمل أو تعديل جودة (Remake / Adjustment)',
  'إجازة أو غياب الفني المسؤول',
  'توجيه إداري من مشرف المختبر',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'dashboard.view',
    'cases.view',
    'cases.create',
    'cases.edit',
    'cases.delete',
    'courier.view',
    'courier.manage',
    'billing.view',
    'billing.manage',
    'clinics.view',
    'clinics.manage',
    'inventory.view',
    'inventory.manage',
    'staff.view',
    'staff.manage',
    'reports.view',
    'settings.manage',
  ],
  supervisor: [
    'dashboard.view',
    'cases.view',
    'cases.create',
    'cases.edit',
    'courier.view',
    'courier.manage',
    'clinics.view',
    'clinics.manage',
    'inventory.view',
    'inventory.manage',
    'staff.view',
    'reports.view',
  ],
  technician: [
    'dashboard.view',
    'cases.view',
    'cases.edit',
    'courier.view',
    'inventory.view',
    'staff.view',
  ],
  accountant: [
    'dashboard.view',
    'cases.view',
    'courier.view',
    'billing.view',
    'billing.manage',
    'clinics.view',
    'clinics.manage',
    'staff.view',
    'reports.view',
  ],
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'نقداً (صندوق الفرع)',
  bank_transfer: 'تحويل بنكي',
  wallet: 'محفظة إلكترونية',
  check: 'شيك مصرفي',
};

export interface ShadeOption {
  code: string;
  group: 'Bleach' | 'A' | 'B' | 'C' | 'D';
  swatch: string;
  label: string;
}

export const VITA_SHADES: ShadeOption[] = [
  { code: 'BL1', group: 'Bleach', swatch: '#FFFFFF', label: 'تبييض ناصع جداً' },
  { code: 'BL2', group: 'Bleach', swatch: '#FCFDFD', label: 'تبييض ناصع' },
  { code: 'BL3', group: 'Bleach', swatch: '#F8F9F5', label: 'تبييض طبيعي فاتح' },
  { code: 'BL4', group: 'Bleach', swatch: '#F4F4EC', label: 'تبييض هادئ' },
  { code: 'A1', group: 'A', swatch: '#F3EEE2', label: 'أحمر-بني فاتح جداً' },
  { code: 'A2', group: 'A', swatch: '#ECE2CE', label: 'أحمر-بني طبيعي' },
  { code: 'A3', group: 'A', swatch: '#E4D5B7', label: 'أحمر-بني متوسط' },
  { code: 'A3.5', group: 'A', swatch: '#DCC69E', label: 'أحمر-بني دافئ' },
  { code: 'A4', group: 'A', swatch: '#D1B688', label: 'أحمر-بني داكن' },
  { code: 'B1', group: 'B', swatch: '#F4F0E4', label: 'أصفر-محمر فاتح جداً' },
  { code: 'B2', group: 'B', swatch: '#EDE4CC', label: 'أصفر-محمر فاتح' },
  { code: 'B3', group: 'B', swatch: '#E2D2AC', label: 'أصفر-محمر متوسط' },
  { code: 'B4', group: 'B', swatch: '#D8C292', label: 'أصفر-محمر داكن' },
  { code: 'C1', group: 'C', swatch: '#EAE6DA', label: 'رمادي فاتح' },
  { code: 'C2', group: 'C', swatch: '#DFD8C4', label: 'رمادي متوسط' },
  { code: 'C3', group: 'C', swatch: '#D3C9B0', label: 'رمادي دافئ' },
  { code: 'C4', group: 'C', swatch: '#C4B799', label: 'رمادي داكن' },
  { code: 'D2', group: 'D', swatch: '#E7DFD1', label: 'رمادي-محمر فاتح' },
  { code: 'D3', group: 'D', swatch: '#DDD1BD', label: 'رمادي-محمر متوسط' },
  { code: 'D4', group: 'D', swatch: '#CFC0A5', label: 'رمادي-محمر داكن' },
];

function offsetDate(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

export function getSeedDataForBranch(branchId: string): {
  staff: Staff[];
  clinics: Clinic[];
  inventory: InventoryItem[];
  cases: DentalCase[];
  receipts: PaymentReceipt[];
  staffTransactions: StaffTransaction[];
  expenses: LabExpense[];
  suppliers: Supplier[];
  courierOrders: CourierOrder[];
} {
  const isAden = branchId === 'aden';
  const currentMonth = new Date().toISOString().slice(0, 7);

  const staff: Staff[] = [
    {
      id: 'S-101',
      name: 'د. عقلان الكامل',
      username: 'admin',
      role: 'المدير العام والمؤسس',
      userRole: 'admin',
      pin: '1234',
      compensationType: 'fixed_salary',
      baseSalary: 0,
      commissionRate: 0,
      percentageRate: 0,
      maxActiveUnits: 20,
      phone: '967770001122',
      active: true,
    },
    {
      id: 'S-102',
      name: isAden ? 'م. رامي باوزير' : 'م. ياسر القحطاني',
      username: 'supervisor',
      role: 'مشرف مختبر رقمي',
      userRole: 'supervisor',
      pin: '1111',
      compensationType: 'hybrid',
      baseSalary: 2500,
      commissionRate: 20,
      percentageRate: 0,
      maxActiveUnits: 16,
      phone: '967771112233',
      active: true,
    },
    {
      id: 'S-103',
      name: isAden ? 'فني عادل الصبيحي' : 'فني سامي المقطري',
      username: 'tech1',
      role: 'مصمم CAD/CAM',
      userRole: 'technician',
      pin: '2222',
      compensationType: 'hybrid',
      baseSalary: 1500,
      commissionRate: 35,
      percentageRate: 0,
      maxActiveUnits: 20,
      phone: '967772223344',
      active: true,
    },
    {
      id: 'S-104',
      name: isAden ? 'فني نبيل اليافعي' : 'فني وليد الحكيمي',
      username: 'tech2',
      role: 'أخصائي خزف وعدسات E-max',
      userRole: 'technician',
      pin: '2233',
      compensationType: 'percentage',
      baseSalary: 0,
      commissionRate: 0,
      percentageRate: 15,
      maxActiveUnits: 15,
      phone: '967773334455',
      active: true,
    },
    {
      id: 'S-105',
      name: isAden ? 'أ. فؤاد بن بريك' : 'أ. مازن العبسي',
      username: 'accountant',
      role: 'مسؤول الحسابات والتحصيل',
      userRole: 'accountant',
      pin: '3333',
      compensationType: 'fixed_salary',
      baseSalary: 2200,
      commissionRate: 0,
      percentageRate: 0,
      maxActiveUnits: 10,
      phone: '967774445566',
      active: true,
    },
  ];

  const clinics: Clinic[] = isAden
    ? [
        {
          id: 'C-201',
          name: 'مركز خليج عدن لطب الأسنان',
          doctorName: 'خالد بن محفوظ',
          phone: '967775102030',
          portalPin: '2030',
          address: 'عدن - المنصورة - شارع التسعين',
          openingBalance: 400,
          isVip: true,
          customPrices: { '1': 270, '2': 450 },
        },
        {
          id: 'C-202',
          name: 'عيادات اللؤلؤة التخصصية',
          doctorName: 'سارة العولقي',
          phone: '967776405060',
          portalPin: '5060',
          address: 'عدن - كريتر - الميدان',
          openingBalance: 0,
        },
      ]
    : [
        {
          id: 'C-101',
          name: 'مركز النخبة لطب الأسنان',
          doctorName: 'محمد الشرعبي',
          phone: '967771234567',
          portalPin: '4567',
          address: 'شارع جمال - عمارة النور',
          openingBalance: 500,
          isVip: true,
          customPrices: { '1': 270, '2': 460 },
        },
        {
          id: 'C-102',
          name: 'عيادات الابتسامة الرقمية',
          doctorName: 'أروى الحمادي',
          phone: '967772345678',
          portalPin: '5678',
          address: 'الحصب - جوار مستشفى الصفوة',
          openingBalance: 0,
        },
        {
          id: 'C-103',
          name: 'مجمع الشفاء التخصصي',
          doctorName: 'طارق العريقي',
          phone: '967773456789',
          portalPin: '6789',
          address: 'جولة القصر - برج الأطباء',
          openingBalance: 250,
        },
      ];

  const inventory: InventoryItem[] = [
    { id: 'INV-1', name: 'بلوك زيركون Multilayer A1 14mm', quantity: 11, unit: 'قرص', minThreshold: 5, category: 'Blocks', shade: 'A1', unitCost: 220 },
    { id: 'INV-2', name: 'بلوك زيركون Multilayer BL2 18mm', quantity: 3, unit: 'قرص', minThreshold: 5, category: 'Blocks', shade: 'BL2', unitCost: 240 },
    { id: 'INV-3', name: 'قوالب إيماكس Press BL1 HT', quantity: 7, unit: 'قطعة', minThreshold: 10, category: 'Blocks', shade: 'BL1', unitCost: 95 },
    { id: 'INV-4', name: 'سائل تلوين وتزجيج Glaze Paste', quantity: 2, unit: 'عبوة', minThreshold: 3, category: 'Liquids', unitCost: 160 },
    { id: 'INV-5', name: 'بودرة خزف IPS e.max Ceram', quantity: 8, unit: 'عبوة', minThreshold: 3, category: 'Powder', unitCost: 190 },
    { id: 'INV-6', name: 'سنابل خرط كربيد Milling Burs 1.0mm', quantity: 6, unit: 'قطعة', minThreshold: 4, category: 'Tools', unitCost: 130 },
  ];

  const c1 = clinics[0];
  const c2 = clinics[1];
  const c3 = clinics[2] || clinics[0];

  const cases: DentalCase[] = [
    {
      id: isAden ? 'V-8101' : 'V-4101',
      clinicId: c2.name,
      clinicRefId: c2.id,
      doctorName: c2.doctorName,
      patientName: 'هدى عبدالكريم المنصوري',
      serviceType: 'عدسات إيماكس تجميلية (E-max Veneers)',
      selectedTeeth: [13, 12, 11, 21, 22, 23],
      connectionType: 'single',
      units: 6,
      shade: 'BL2',
      unitPrice: 500,
      discount: 200,
      price: 2800,
      staffId: 'S-104',
      status: 'Finishing',
      priority: 'urgent',
      receivedDate: offsetDate(-3),
      dueDate: offsetDate(0),
      notes: 'شفافية عالية في الحد القاطع Incisal Halo واضح',
      source: 'doctor-portal',
      scanPlatform: 'Medit',
      scanFileUrl: 'https://www.meditlink.com/shared-case/emax-bl2-sample',
      warrantyYears: 5,
      warrantySerial: isAden ? 'WR-AD-8101' : 'WR-TZ-4101',
      inventoryDeducted: true,
      deductedItemName: 'بلوك زيركون Multilayer BL2 18mm',
      messages: [
        {
          id: 'MSG-1',
          senderRole: 'doctor',
          senderName: `د. ${c2.doctorName}`,
          body: 'يرجى إبراز خطوط Mamelons خفيفة في الثنايا العلوية 11 و 21 مع شفافية طبيعية.',
          timestamp: `${offsetDate(-2)} 10:30`,
        },
        {
          id: 'MSG-2',
          senderRole: 'lab',
          senderName: staff[3].name,
          body: 'تم استلام ملف المسح الضوئي Medit Link وجارٍ تطبيق التدرج اللوني BL2 حسب الطلب.',
          timestamp: `${offsetDate(-2)} 13:15`,
        },
      ],
      commissionSplits: [
        { staffId: 'S-103', staffName: staff[2].name, sharePercent: 35, roleNote: 'مسح ضوئي وتصميم CAD' },
        { staffId: 'S-104', staffName: staff[3].name, sharePercent: 65, roleNote: 'تكسية خزف وتلوين E-max' },
      ],
      transferHistory: [
        {
          id: 'TRF-101',
          fromStaffId: 'S-103',
          fromStaffName: staff[2].name,
          toStaffId: 'S-104',
          toStaffName: staff[3].name,
          reason: 'انتقال لمرحلة تخصصية (تكسية خزف / تلوين E-max)',
          commissionMode: 'split',
          previousSharePercent: 35,
          newSharePercent: 65,
          stageAtTransfer: 'Finishing',
          timestamp: offsetDate(-1),
          transferredBy: staff[1].name,
        },
      ],
    },
    {
      id: isAden ? 'V-8102' : 'V-4102',
      clinicId: c1.name,
      clinicRefId: c1.id,
      doctorName: c1.doctorName,
      patientName: 'عبدالله قائد السامعي',
      serviceType: 'جسر زيركون كامل (Full Contour Bridge)',
      selectedTeeth: [45, 46, 47],
      connectionType: 'bridge',
      units: 3,
      shade: 'A2',
      unitPrice: 280,
      discount: 0,
      price: 840,
      staffId: 'S-103',
      status: 'TryIn_Out',
      priority: 'normal',
      receivedDate: offsetDate(-4),
      dueDate: offsetDate(1),
      notes: 'دمية 46 بتصميم صحي سهل التنظيف والمحافظة على الإطباق',
      source: 'lab',
      warrantyYears: 5,
      warrantySerial: isAden ? 'WR-AD-8102' : 'WR-TZ-4102',
      tryInHistory: [
        {
          id: 'TRY-1',
          sentDate: offsetDate(-1),
          doctorFeedback: 'أُرسل الجسر الأولي PMMA/Bisque للتجربة في فم المريض وفحص نقاط التماس.',
        },
      ],
    },
    {
      id: isAden ? 'V-8103' : 'V-4103',
      clinicId: c1.name,
      clinicRefId: c1.id,
      doctorName: c1.doctorName,
      patientName: 'نبيلة صالح الأغبري',
      serviceType: 'زيركون متعدد الطبقات (Multilayer Zirconia)',
      selectedTeeth: [14, 15],
      connectionType: 'single',
      units: 2,
      shade: 'A1',
      unitPrice: 270,
      discount: 0,
      price: 540,
      staffId: 'S-103',
      status: 'Ready',
      priority: 'normal',
      receivedDate: offsetDate(-5),
      dueDate: offsetDate(1),
      notes: 'جاهزة للفحص النهائي والتوصيل للعيادة (سعر تعاقد VIP)',
      source: 'lab',
      qualityRating: 5,
      qualityNotes: 'انطباق حواف ممتاز وإطباق مثالي من المرة الأولى',
      warrantyYears: 5,
      warrantySerial: isAden ? 'WR-AD-8103' : 'WR-TZ-4103',
      inventoryDeducted: true,
      deductedItemName: 'بلوك زيركون Multilayer A1 14mm',
    },
    {
      id: isAden ? 'V-8104' : 'V-4104',
      clinicId: c3.name,
      clinicRefId: c3.id,
      doctorName: c3.doctorName,
      patientName: 'فيصل منصور الحاج',
      serviceType: 'تاج فوق زرعة (Implant Zirconia Crown)',
      selectedTeeth: [36],
      connectionType: 'single',
      units: 1,
      shade: 'B1',
      unitPrice: 550,
      discount: 50,
      price: 500,
      staffId: 'S-104',
      status: 'Delivered',
      priority: 'normal',
      receivedDate: offsetDate(-8),
      dueDate: offsetDate(-4),
      deliveredDate: offsetDate(-5),
      notes: 'تثبيت ببراغي Screw-retained مع إغلاق ممر البرغي',
      source: 'lab',
      qualityRating: 5,
      qualityNotes: 'دقة عالية في فتحة الدعامة واللون مطابق',
      warrantyYears: 7,
      warrantySerial: isAden ? 'WR-AD-8104' : 'WR-TZ-4104',
    },
  ];

  const receipts: PaymentReceipt[] = [
    {
      id: isAden ? 'RCP-901' : 'RCP-501',
      clinicId: c1.id,
      clinicName: c1.name,
      caseId: cases[2].id,
      amount: 540,
      method: 'cash',
      date: offsetDate(-2),
      receivedBy: staff[4].name,
      notes: 'دفعة نقدية عن حالة المريضة نبيلة الأغبري',
    },
    {
      id: isAden ? 'RCP-902' : 'RCP-502',
      clinicId: c2.id,
      clinicName: c2.name,
      caseId: cases[0].id,
      amount: 1500,
      method: 'bank_transfer',
      date: offsetDate(-1),
      receivedBy: staff[0].name,
      referenceNo: 'TR-884920',
      notes: 'دفعة مقدمة لحالة عدسات الإيماكس',
    },
  ];

  const staffTransactions: StaffTransaction[] = [
    {
      id: isAden ? 'STX-901' : 'STX-301',
      staffId: 'S-103',
      staffName: staff[2].name,
      type: 'advance',
      amount: 300,
      month: currentMonth,
      date: offsetDate(-3),
      notes: 'سلفة نقدية على حساب راتب وعمولات الشهر',
      createdBy: staff[4].name,
    },
    {
      id: isAden ? 'STX-902' : 'STX-302',
      staffId: 'S-104',
      staffName: staff[3].name,
      type: 'bonus',
      amount: 150,
      month: currentMonth,
      date: offsetDate(-2),
      notes: 'مكافأة التميز في دقة عدسات الإيماكس بدون تعديل',
      createdBy: staff[0].name,
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: 'SUP-1',
      name: 'شركة الخليج للتجهيزات السنية (Ivoclar / Amann Girrbach)',
      specialty: 'أقراص زيركون وقوالب إيماكس أصلية',
      phone: '967778800112',
      balance: 0,
    },
    {
      id: 'SUP-2',
      name: 'مؤسسة التقنية الرقمية CAD/CAM',
      specialty: 'سنابل خرط وصيانة أفران التلبيد',
      phone: '967779900223',
      balance: 0,
    },
  ];

  const expenses: LabExpense[] = [
    {
      id: isAden ? 'EXP-801' : 'EXP-401',
      category: 'materials',
      title: 'شراء 5 أقراص زيركون Multilayer وسوائل تلوين',
      supplierName: suppliers[0].name,
      amount: 950,
      method: 'bank_transfer',
      date: offsetDate(-4),
      notes: `${currentMonth} — توريد مخزني للفرع`,
      createdBy: staff[4].name,
    },
    {
      id: isAden ? 'EXP-802' : 'EXP-402',
      category: 'logistics',
      title: 'عهدة وقود ومواصلات مناديب التوصيل للأسبوع',
      amount: 180,
      method: 'cash',
      date: offsetDate(-1),
      createdBy: staff[4].name,
    },
  ];

  const courierOrders: CourierOrder[] = [
    {
      id: isAden ? 'CR-801' : 'CR-401',
      clinicId: c1.id,
      clinicName: c1.name,
      doctorName: c1.doctorName,
      direction: 'try_in_dispatch',
      status: 'in_transit',
      courierName: isAden ? 'سالم باعباد' : 'أكرم الحميري',
      courierPhone: '967775551199',
      caseIds: [cases[1].id],
      requestedAt: offsetDate(-1),
      updatedAt: offsetDate(0),
      notes: 'تسليم جسر الزيركون للتجربة السريرية والانتظار أو العودة مساءً',
      requestedBy: 'lab',
    },
    {
      id: isAden ? 'CR-802' : 'CR-402',
      clinicId: c2.id,
      clinicName: c2.name,
      doctorName: c2.doctorName,
      direction: 'pickup_impression',
      status: 'requested',
      caseIds: [],
      requestedAt: offsetDate(0),
      updatedAt: offsetDate(0),
      notes: 'يوجد طبعتان سيليكون جاهزتان للاستلام في الاستقبال قبل الساعة 2 ظهراً',
      requestedBy: 'doctor',
    },
  ];

  return {
    staff,
    clinics,
    inventory,
    cases,
    receipts,
    staffTransactions,
    expenses,
    suppliers,
    courierOrders,
  };
}

export function normalizeStaffList(raw: any[], branchId: string): Staff[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return getSeedDataForBranch(branchId).staff;
  }
  const hasAdmin = raw.some((s) => s.userRole === 'admin');
  const mapped: Staff[] = raw.map((s, idx) => {
    const resolvedRole: UserRole =
      (s.userRole as UserRole) || (idx === 0 && !hasAdmin ? 'admin' : 'technician');
    const fallbackUsername =
      resolvedRole === 'admin' && idx === 0 ? 'admin' : `user${idx + 1}`;
    const commRate = Number(s.commissionRate) || 0;
    const baseSal = Number(s.baseSalary) || 0;
    const pctRate = Number(s.percentageRate) || 0;

    let resolvedCompType: CompensationType = s.compensationType;
    if (!resolvedCompType) {
      if (resolvedRole === 'admin' || resolvedRole === 'accountant') {
        resolvedCompType = 'fixed_salary';
      } else if (baseSal > 0 && (commRate > 0 || pctRate > 0)) {
        resolvedCompType = 'hybrid';
      } else if (pctRate > 0) {
        resolvedCompType = 'percentage';
      } else {
        resolvedCompType = 'per_unit';
      }
    }

    return {
      id: s.id || `S-${100 + idx}`,
      name: s.name || 'موظف',
      username: s.username || fallbackUsername,
      role: s.role || 'فني معمل',
      userRole: resolvedRole,
      pin: s.pin || (idx === 0 ? '1234' : '2222'),
      compensationType: resolvedCompType,
      baseSalary: baseSal,
      commissionRate: commRate,
      percentageRate: pctRate,
      maxActiveUnits: Number(s.maxActiveUnits) || 18,
      phone: s.phone || (resolvedRole === 'admin' ? '967770001122' : ''),
      active: s.active !== false,
    };
  });
  if (!mapped.some((s) => s.userRole === 'admin')) {
    mapped.unshift({
      id: 'S-ADMIN',
      name: 'د. عقلان الكامل',
      username: 'admin',
      role: 'المدير العام والمؤسس',
      userRole: 'admin',
      pin: '1234',
      phone: '967770001122',
      compensationType: 'fixed_salary',
      baseSalary: 0,
      commissionRate: 0,
      percentageRate: 0,
      maxActiveUnits: 20,
      active: true,
    });
  }
  return mapped;
}

function normalizePhoneDigits(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length > 9) return digits.slice(-9);
  return digits;
}

export function matchStaffCredentials(
  staffList: Staff[],
  identifierInput: string,
  passwordInput: string
): Staff | null {
  const cleanId = identifierInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();
  if (!cleanId || !cleanPass) return null;

  const inputPhone = normalizePhoneDigits(identifierInput);

  return (
    staffList.find((u) => {
      if (u.active === false) return false;
      if (u.pin !== cleanPass) return false;

      const byUsername = (u.username || '').trim().toLowerCase() === cleanId;
      const byName = u.name.trim().toLowerCase() === cleanId;
      const userPhone = normalizePhoneDigits(u.phone || '');
      const byPhone = inputPhone.length >= 7 && userPhone.length >= 7 && inputPhone === userPhone;

      return byUsername || byName || byPhone;
    }) || null
  );
}

export function matchClinicCredentials(
  clinicsList: Clinic[],
  phoneInput: string,
  secretPinInput: string
): Clinic | null {
  const cleanPin = secretPinInput.trim();
  const inputDigits = normalizePhoneDigits(phoneInput);
  const rawInputDigits = String(phoneInput || '').replace(/\D/g, '');

  if (!rawInputDigits || !cleanPin) return null;

  return (
    clinicsList.find((c) => {
      const clinicNorm = normalizePhoneDigits(c.phone || '');
      const clinicRaw = String(c.phone || '').replace(/\D/g, '');
      const phoneMatches =
        (inputDigits.length >= 7 && clinicNorm === inputDigits) ||
        (rawInputDigits.length >= 7 && clinicRaw === rawInputDigits);

      if (!phoneMatches) return false;
      return c.portalPin.trim() === cleanPin;
    }) || null
  );
}

export function normalizeClinicsList(raw: any[], branchId: string): Clinic[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return getSeedDataForBranch(branchId).clinics;
  }
  return raw.map((c, idx) => {
    const cleanDigits = String(c.phone || '').replace(/\D/g, '');
    const fallbackPin = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : String(1000 + idx);
    return {
      id: c.id || `C-${100 + idx}`,
      name: c.name || 'عيادة متعاقدة',
      doctorName: c.doctorName || 'طبيب أسنان',
      phone: c.phone || '',
      portalPin: c.portalPin || fallbackPin,
      address: c.address || '',
      openingBalance: Number(c.openingBalance ?? c.balance ?? 0),
      isVip: Boolean(c.isVip),
      customPrices: c.customPrices && typeof c.customPrices === 'object' ? c.customPrices : undefined,
    };
  });
}

export function resolveClinicServicePrice(clinic: Clinic | null | undefined, service: Service | undefined): {
  price: number;
  isCustomVip: boolean;
} {
  if (!service) return { price: 300, isCustomVip: false };
  if (clinic?.customPrices) {
    const byId = clinic.customPrices[service.id];
    if (typeof byId === 'number' && byId > 0) {
      return { price: byId, isCustomVip: byId !== service.defaultPrice };
    }
    const byName = clinic.customPrices[service.name];
    if (typeof byName === 'number' && byName > 0) {
      return { price: byName, isCustomVip: byName !== service.defaultPrice };
    }
  }
  return { price: service.defaultPrice, isCustomVip: false };
}

export function findMatchingInventoryBlock(
  dentalCase: DentalCase,
  inventory: InventoryItem[]
): InventoryItem | null {
  const blocks = inventory.filter((i) => i.category === 'Blocks' && i.quantity > 0);
  if (blocks.length === 0) return null;

  const isEmax =
    dentalCase.serviceType.toLowerCase().includes('e-max') ||
    dentalCase.serviceType.includes('إيماكس');

  // 1. Match material + exact shade
  const exactMatch = blocks.find((b) => {
    const matMatch = isEmax
      ? b.name.includes('إيماكس') || b.name.toLowerCase().includes('emax')
      : b.name.includes('زيركون') || b.name.toLowerCase().includes('zircon');
    const shadeMatch =
      (b.shade && b.shade.toUpperCase() === dentalCase.shade.toUpperCase()) ||
      b.name.toUpperCase().includes(dentalCase.shade.toUpperCase());
    return matMatch && shadeMatch;
  });
  if (exactMatch) return exactMatch;

  // 2. Match shade only
  const shadeOnly = blocks.find(
    (b) =>
      (b.shade && b.shade.toUpperCase() === dentalCase.shade.toUpperCase()) ||
      b.name.toUpperCase().includes(dentalCase.shade.toUpperCase())
  );
  if (shadeOnly) return shadeOnly;

  // 3. Fallback to material block
  return (
    blocks.find((b) =>
      isEmax
        ? b.name.includes('إيماكس') || b.name.toLowerCase().includes('emax')
        : b.name.includes('زيركون') || b.name.toLowerCase().includes('zircon')
    ) || null
  );
}

export function matchCaseToClinic(dentalCase: DentalCase, clinic: Clinic): boolean {
  if (dentalCase.clinicRefId && dentalCase.clinicRefId === clinic.id) return true;
  if (dentalCase.clinicId === clinic.id || dentalCase.clinicId === clinic.name) return true;
  return false;
}

export function computeClinicFinancials(
  clinic: Clinic,
  cases: DentalCase[],
  receipts: PaymentReceipt[]
) {
  const clinicCases = cases.filter((c) => matchCaseToClinic(c, clinic));
  const clinicReceipts = receipts.filter(
    (r) => r.clinicId === clinic.id || r.clinicName === clinic.name
  );
  const opening = Number(clinic.openingBalance || 0);
  const totalBilled = clinicCases.reduce((sum, c) => sum + (Number(c.price) || 0), 0);
  const totalPaid = clinicReceipts.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const netBalance = opening + totalBilled - totalPaid;

  return {
    opening,
    totalBilled,
    totalPaid,
    netBalance,
    casesCount: clinicCases.length,
    clinicCases,
    clinicReceipts,
  };
}

// ============================================================================
// Technician Compensation, Workload, Split Commission & KPI Engine
// ============================================================================

export function getStaffCompensationSummary(tech: Staff, currency: string): string {
  const compType = tech.compensationType || 'per_unit';
  const sal = Number(tech.baseSalary || 0);
  const unitRate = Number(tech.commissionRate || 0);
  const pct = Number(tech.percentageRate || 0);

  if (compType === 'fixed_salary') {
    return sal > 0 ? `راتب ثابت: ${sal.toLocaleString()} ${currency}` : 'إداري (بدون عمولة)';
  }
  if (compType === 'per_unit') {
    return `${unitRate.toLocaleString()} ${currency} / وحدة`;
  }
  if (compType === 'percentage') {
    return `نسبة ${pct}% من صافي الحالة`;
  }
  const parts: string[] = [];
  if (sal > 0) parts.push(`راتب ${sal.toLocaleString()} ${currency}`);
  if (unitRate > 0) parts.push(`${unitRate} ${currency}/وحدة`);
  if (pct > 0) parts.push(`${pct}% نسبة`);
  return parts.length > 0 ? parts.join(' + ') : 'مختلط';
}

export function getTechSharePercentForCase(dentalCase: DentalCase, staffId: string): number {
  if (dentalCase.commissionSplits && dentalCase.commissionSplits.length > 0) {
    const entry = dentalCase.commissionSplits.find((sp) => sp.staffId === staffId);
    return entry ? Math.max(0, Math.min(100, Number(entry.sharePercent) || 0)) : 0;
  }
  return dentalCase.staffId === staffId ? 100 : 0;
}

export function computeFullCaseBaseCommission(dentalCase: DentalCase, tech: Staff): number {
  const compType = tech.compensationType || 'per_unit';
  const units = Number(dentalCase.units) || 0;
  const price = Number(dentalCase.price) || 0;
  const unitRate = Number(tech.commissionRate) || 0;
  const pctRate = Number(tech.percentageRate) || 0;

  if (compType === 'fixed_salary') return 0;
  if (compType === 'per_unit') return units * unitRate;
  if (compType === 'percentage') return (price * pctRate) / 100;
  return units * unitRate + (price * pctRate) / 100;
}

export function computeCaseTechCommission(
  dentalCase: DentalCase,
  tech: Staff
): {
  sharePercent: number;
  effectiveUnits: number;
  potentialCommission: number;
  earnedCommission: number;
  isCompleted: boolean;
} {
  const sharePercent = getTechSharePercentForCase(dentalCase, tech.id);
  const isCompleted = dentalCase.status === 'Ready' || dentalCase.status === 'Delivered';

  if (sharePercent <= 0) {
    return {
      sharePercent: 0,
      effectiveUnits: 0,
      potentialCommission: 0,
      earnedCommission: 0,
      isCompleted,
    };
  }

  const fullCommission = computeFullCaseBaseCommission(dentalCase, tech);
  const potentialCommission = Math.round(((fullCommission * sharePercent) / 100) * 100) / 100;
  const effectiveUnits =
    Math.round((((Number(dentalCase.units) || 0) * sharePercent) / 100) * 10) / 10;

  return {
    sharePercent,
    effectiveUnits,
    potentialCommission,
    earnedCommission: isCompleted ? potentialCommission : 0,
    isCompleted,
  };
}

export function computeStaffWorkload(
  tech: Staff,
  cases: DentalCase[],
  todayStr: string
): {
  activeCases: DentalCase[];
  activeCasesCount: number;
  activeUnits: number;
  maxUnits: number;
  loadPercent: number;
  overdueCount: number;
  urgentCount: number;
  loadStatus: 'comfortable' | 'busy' | 'overloaded';
  loadLabel: string;
} {
  const activeCases = cases.filter(
    (c) => c.staffId === tech.id && c.status !== 'Ready' && c.status !== 'Delivered'
  );
  const activeUnits = activeCases.reduce((sum, c) => sum + (Number(c.units) || 0), 0);
  const maxUnits = Math.max(5, Number(tech.maxActiveUnits) || 18);
  const loadPercent = Math.round((activeUnits / maxUnits) * 100);
  const overdueCount = activeCases.filter((c) => c.dueDate < todayStr).length;
  const urgentCount = activeCases.filter((c) => c.priority === 'urgent').length;

  let loadStatus: 'comfortable' | 'busy' | 'overloaded' = 'comfortable';
  let loadLabel = 'متاح لاستلام أعمال';
  if (loadPercent >= 95 || overdueCount >= 2) {
    loadStatus = 'overloaded';
    loadLabel = 'ضغط مرتفع جداً';
  } else if (loadPercent >= 65) {
    loadStatus = 'busy';
    loadLabel = 'إشغال متوسط / نشط';
  }

  return {
    activeCases,
    activeCasesCount: activeCases.length,
    activeUnits,
    maxUnits,
    loadPercent,
    overdueCount,
    urgentCount,
    loadStatus,
    loadLabel,
  };
}

export function computeStaffKPIs(
  tech: Staff,
  cases: DentalCase[],
  monthFilter?: string
) {
  const scopedCases = monthFilter
    ? cases.filter((c) => {
        const refDate = c.deliveredDate || c.receivedDate || '';
        return refDate.startsWith(monthFilter);
      })
    : cases;

  const participated = scopedCases.filter((c) => getTechSharePercentForCase(c, tech.id) > 0);
  const completed = participated.filter(
    (c) => c.status === 'Ready' || c.status === 'Delivered'
  );

  let totalAssignedUnits = 0;
  let completedEffectiveUnits = 0;
  let totalEarnedCommission = 0;

  participated.forEach((c) => {
    const calc = computeCaseTechCommission(c, tech);
    totalAssignedUnits += calc.effectiveUnits;
    if (calc.isCompleted) {
      completedEffectiveUnits += calc.effectiveUnits;
      totalEarnedCommission += calc.earnedCommission;
    }
  });

  const onTimeCases = completed.filter(
    (c) => !c.deliveredDate || c.deliveredDate <= c.dueDate
  );
  const onTimeRate =
    completed.length > 0 ? Math.round((onTimeCases.length / completed.length) * 100) : 100;

  const turnaroundList: number[] = [];
  completed.forEach((c) => {
    const endStr = c.deliveredDate || c.dueDate;
    if (c.receivedDate && endStr) {
      const startMs = new Date(c.receivedDate).getTime();
      const endMs = new Date(endStr).getTime();
      if (!Number.isNaN(startMs) && !Number.isNaN(endMs)) {
        const diffDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
        turnaroundList.push(diffDays);
      }
    }
  });
  const avgTurnaroundDays =
    turnaroundList.length > 0
      ? Math.round((turnaroundList.reduce((a, b) => a + b, 0) / turnaroundList.length) * 10) / 10
      : 0;

  const ratedCases = participated.filter((c) => Number(c.qualityRating) > 0);
  const avgQualityRating =
    ratedCases.length > 0
      ? Math.round(
          (ratedCases.reduce((sum, c) => sum + (Number(c.qualityRating) || 0), 0) /
            ratedCases.length) *
            10
        ) / 10
      : 5.0;

  const remakeCases = scopedCases.filter((c) => {
    if (!c.isRemake) return false;
    if (c.remakeStaffId) return c.remakeStaffId === tech.id;
    return c.staffId === tech.id;
  });
  const remakeCount = remakeCases.reduce(
    (sum, c) => sum + Math.max(1, Number(c.remakeCount) || 1),
    0
  );
  const denom = Math.max(1, participated.length);
  const remakeRate =
    participated.length > 0 ? Math.round((remakeCases.length / denom) * 100) : 0;

  const qualityPct = (avgQualityRating / 5) * 100;
  const firstTimePassPct = Math.max(0, 100 - remakeRate);
  const efficiencyScore = Math.round(
    onTimeRate * 0.4 + qualityPct * 0.4 + firstTimePassPct * 0.2
  );

  return {
    participatedCasesCount: participated.length,
    completedCasesCount: completed.length,
    totalAssignedUnits: Math.round(totalAssignedUnits * 10) / 10,
    completedEffectiveUnits: Math.round(completedEffectiveUnits * 10) / 10,
    totalEarnedCommission: Math.round(totalEarnedCommission * 100) / 100,
    onTimeRate,
    avgTurnaroundDays,
    ratedCasesCount: ratedCases.length,
    avgQualityRating,
    remakeCount,
    remakeRate,
    efficiencyScore,
  };
}

export interface PayrollCaseBreakdownItem {
  dentalCase: DentalCase;
  sharePercent: number;
  effectiveUnits: number;
  earnedCommission: number;
}

export function computeStaffMonthlyPayroll(
  tech: Staff,
  cases: DentalCase[],
  transactions: StaffTransaction[],
  month: string
) {
  const compType = tech.compensationType || 'per_unit';
  const baseSalary =
    compType === 'fixed_salary' || compType === 'hybrid'
      ? Number(tech.baseSalary) || 0
      : 0;

  const caseBreakdowns: PayrollCaseBreakdownItem[] = [];
  let earnedCommissions = 0;

  cases.forEach((c) => {
    const isCompleted = c.status === 'Ready' || c.status === 'Delivered';
    if (!isCompleted) return;
    const refDate = c.deliveredDate || c.dueDate || c.receivedDate || '';
    if (month && !refDate.startsWith(month)) return;

    const calc = computeCaseTechCommission(c, tech);
    if (calc.sharePercent > 0) {
      caseBreakdowns.push({
        dentalCase: c,
        sharePercent: calc.sharePercent,
        effectiveUnits: calc.effectiveUnits,
        earnedCommission: calc.earnedCommission,
      });
      earnedCommissions += calc.earnedCommission;
    }
  });

  earnedCommissions = Math.round(earnedCommissions * 100) / 100;

  const monthTx = transactions.filter(
    (tx) => tx.staffId === tech.id && (!month || tx.month === month)
  );

  const bonuses = monthTx
    .filter((tx) => tx.type === 'bonus')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const advances = monthTx
    .filter((tx) => tx.type === 'advance')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const deductions = monthTx
    .filter((tx) => tx.type === 'deduction')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const payouts = monthTx
    .filter((tx) => tx.type === 'payout')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const grossEntitlement = Math.round((baseSalary + earnedCommissions + bonuses) * 100) / 100;
  const totalDeductionsAndAdvances = Math.round((advances + deductions) * 100) / 100;
  const netPayable = Math.round((grossEntitlement - totalDeductionsAndAdvances) * 100) / 100;
  const remainingBalance = Math.round((netPayable - payouts) * 100) / 100;

  return {
    baseSalary,
    earnedCommissions,
    bonuses,
    advances,
    deductions,
    payouts,
    grossEntitlement,
    totalDeductionsAndAdvances,
    netPayable,
    remainingBalance,
    caseBreakdowns,
    monthTransactions: monthTx,
  };
}

// ============================================================================
// Package 1: Automated Monthly Profit & Loss (P&L) Accounting Engine
// ============================================================================

export function computeBranchMonthlyPnL(params: {
  month: string; // YYYY-MM or '' for all time
  cases: DentalCase[];
  receipts: PaymentReceipt[];
  expenses: LabExpense[];
  staff: Staff[];
  staffTransactions: StaffTransaction[];
}) {
  const { month, cases, receipts, expenses, staff, staffTransactions } = params;

  const scopedCases = month
    ? cases.filter((c) => (c.receivedDate || '').startsWith(month))
    : cases;
  const scopedReceipts = month
    ? receipts.filter((r) => (r.date || '').startsWith(month))
    : receipts;
  const scopedExpenses = month
    ? expenses.filter((ex) => (ex.date || '').startsWith(month))
    : expenses;

  const billedRevenue = scopedCases.reduce((s, c) => s + (Number(c.price) || 0), 0);
  const collectedCash = scopedReceipts.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // Total Staff Payroll Cost (Base Salaries + Earned Commissions + Bonuses - Deductions)
  let totalPayrollAccrued = 0;
  let totalBaseSalaries = 0;
  let totalTechCommissions = 0;

  staff.forEach((member) => {
    if (member.active === false) return;
    const pr = computeStaffMonthlyPayroll(member, cases, staffTransactions, month);
    totalBaseSalaries += pr.baseSalary;
    totalTechCommissions += pr.earnedCommissions;
    // Actual lab labor cost = baseSalary + earnedCommissions + bonuses - deductions
    const laborExpense = Math.max(
      0,
      pr.baseSalary + pr.earnedCommissions + pr.bonuses - pr.deductions
    );
    totalPayrollAccrued += laborExpense;
  });

  totalPayrollAccrued = Math.round(totalPayrollAccrued * 100) / 100;

  const categoryTotals: Record<ExpenseCategory, number> = {
    materials: 0,
    maintenance: 0,
    rent_utilities: 0,
    logistics: 0,
    admin: 0,
  };

  let totalOperatingExpenses = 0;
  scopedExpenses.forEach((ex) => {
    const amt = Number(ex.amount) || 0;
    totalOperatingExpenses += amt;
    if (categoryTotals[ex.category] !== undefined) {
      categoryTotals[ex.category] += amt;
    }
  });

  const totalAllCosts = Math.round((totalPayrollAccrued + totalOperatingExpenses) * 100) / 100;
  const netOperatingProfit = Math.round((billedRevenue - totalAllCosts) * 100) / 100;
  const netCashFlow = Math.round((collectedCash - totalAllCosts) * 100) / 100;
  const profitMarginPct =
    billedRevenue > 0 ? Math.round((netOperatingProfit / billedRevenue) * 1000) / 10 : 0;

  return {
    casesCount: scopedCases.length,
    billedRevenue,
    collectedCash,
    totalBaseSalaries: Math.round(totalBaseSalaries * 100) / 100,
    totalTechCommissions: Math.round(totalTechCommissions * 100) / 100,
    totalPayrollAccrued,
    totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
    categoryTotals,
    totalAllCosts,
    netOperatingProfit,
    netCashFlow,
    profitMarginPct,
  };
}
