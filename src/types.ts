export interface Branch {
  id: string;
  name: string;
  location: string;
  phone?: string;
  managerName?: string;
}

export type UserRole = 'admin' | 'supervisor' | 'technician' | 'accountant';

export type Permission =
  | 'dashboard.view'
  | 'cases.view'
  | 'cases.create'
  | 'cases.edit'
  | 'cases.delete'
  | 'courier.view'
  | 'courier.manage'
  | 'billing.view'
  | 'billing.manage'
  | 'clinics.view'
  | 'clinics.manage'
  | 'inventory.view'
  | 'inventory.manage'
  | 'staff.view'
  | 'staff.manage'
  | 'reports.view'
  | 'settings.manage';

export type CaseStatus =
  | 'Pending'
  | 'Scanning'
  | 'Designing'
  | 'TryIn_Out'
  | 'TryIn_Returned'
  | 'Milling'
  | 'Sintering'
  | 'Finishing'
  | 'Ready'
  | 'Delivered';

export type RestorationConnection = 'single' | 'bridge';
export type CasePriority = 'normal' | 'urgent';

export type CompensationType = 'fixed_salary' | 'per_unit' | 'percentage' | 'hybrid';

export interface Staff {
  id: string;
  name: string;
  username?: string;
  role: string;
  userRole: UserRole;
  pin: string;
  compensationType?: CompensationType;
  baseSalary?: number;
  commissionRate: number;
  percentageRate?: number;
  maxActiveUnits?: number;
  phone?: string;
  active?: boolean;
}

export type StaffTransactionType = 'advance' | 'bonus' | 'deduction' | 'payout';

export interface StaffTransaction {
  id: string;
  staffId: string;
  staffName: string;
  type: StaffTransactionType;
  amount: number;
  month: string; // YYYY-MM
  date: string; // YYYY-MM-DD
  notes?: string;
  createdBy: string;
}

export interface Clinic {
  id: string;
  name: string;
  doctorName: string;
  phone: string;
  portalPin: string;
  address?: string;
  openingBalance?: number;
  balance?: number;
  isVip?: boolean;
  /** Custom contract unit price overrides keyed by Service ID or Service Name */
  customPrices?: Record<string, number>;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  category: 'Blocks' | 'Powder' | 'Liquids' | 'Tools';
  shade?: string;
  unitCost?: number;
}

export interface CaseStageEvent {
  status: CaseStatus;
  timestamp: string;
  updatedBy: string;
}

export interface CaseCommissionSplit {
  staffId: string;
  staffName: string;
  sharePercent: number; // 0 - 100
  roleNote?: string;
}

export interface CaseTransferEvent {
  id: string;
  fromStaffId: string;
  fromStaffName: string;
  toStaffId: string;
  toStaffName: string;
  reason: string;
  commissionMode: 'full_transfer' | 'split';
  previousSharePercent: number;
  newSharePercent: number;
  stageAtTransfer: CaseStatus;
  timestamp: string;
  transferredBy: string;
}

export interface CaseAttachment {
  id: string;
  label: string;
  dataUrl: string; // Compressed clinical shade photo (< 25KB)
  uploadedBy: string;
  uploadedAt: string;
}

export interface CaseMessage {
  id: string;
  senderRole: 'doctor' | 'lab';
  senderName: string;
  body: string;
  timestamp: string;
}

export interface TryInCycleEvent {
  id: string;
  sentDate: string;
  returnedDate?: string;
  doctorFeedback?: string;
  fitApproved?: boolean;
  shadeApproved?: boolean;
  occlusionApproved?: boolean;
}

export type ScanPlatform = '3Shape' | 'Medit' | 'Sirona' | 'STL_URL';

export interface DentalCase {
  id: string;
  clinicId: string;
  clinicRefId?: string;
  doctorName?: string;
  patientName: string;
  serviceType: string;
  selectedTeeth?: number[];
  connectionType?: RestorationConnection;
  units: number;
  shade: string;
  unitPrice?: number;
  discount?: number;
  price: number;
  staffId: string;
  status: CaseStatus;
  priority?: CasePriority;
  receivedDate: string;
  dueDate: string;
  deliveredDate?: string;
  notes?: string;
  source?: 'lab' | 'doctor-portal';
  stageHistory?: CaseStageEvent[];
  commissionSplits?: CaseCommissionSplit[];
  transferHistory?: CaseTransferEvent[];
  qualityRating?: number; // 1 - 5
  qualityNotes?: string;
  isRemake?: boolean;
  remakeCount?: number;
  remakeReason?: string;
  remakeStaffId?: string;
  // Package 3: Clinical Attachments, 3D Scan Links & Direct Chat
  scanFileUrl?: string;
  scanPlatform?: ScanPlatform;
  attachments?: CaseAttachment[];
  messages?: CaseMessage[];
  // Package 2: Clinical Try-In Cycles
  tryInHistory?: TryInCycleEvent[];
  // Package 4: Smart Auto-Inventory & Official Warranty
  inventoryDeducted?: boolean;
  deductedItemName?: string;
  materialCostEstimate?: number;
  warrantyYears?: number;
  warrantySerial?: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'wallet' | 'check';

export interface PaymentReceipt {
  id: string;
  clinicId: string;
  clinicName: string;
  caseId?: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  receivedBy: string;
  referenceNo?: string;
  notes?: string;
}

export type ExpenseCategory =
  | 'materials'
  | 'maintenance'
  | 'rent_utilities'
  | 'logistics'
  | 'admin';

export interface LabExpense {
  id: string;
  category: ExpenseCategory;
  title: string;
  supplierName?: string;
  amount: number;
  method: PaymentMethod;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdBy: string;
}

export interface Supplier {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  balance?: number;
}

export type CourierDirection =
  | 'pickup_impression'
  | 'try_in_dispatch'
  | 'final_delivery';

export type CourierStatus =
  | 'requested'
  | 'assigned'
  | 'in_transit'
  | 'arrived_lab'
  | 'delivered';

export interface CourierOrder {
  id: string;
  clinicId: string;
  clinicName: string;
  doctorName?: string;
  direction: CourierDirection;
  status: CourierStatus;
  courierName?: string;
  courierPhone?: string;
  caseIds: string[];
  requestedAt: string;
  updatedAt: string;
  notes?: string;
  requestedBy: 'doctor' | 'lab';
  receiverName?: string;
}

export interface Service {
  id: string;
  name: string;
  defaultPrice: number;
  estimatedDays?: number;
  warrantyYears?: number;
}

export interface LabSettings {
  labName: string;
  taxNumber: string;
  address: string;
  whatsappPhone: string;
  currency: string;
  secondaryCurrency?: string;
  exchangeRate?: number;
  warrantyYears?: number;
  autoDeductInventory?: boolean;
}

export interface AuthSession {
  mode: 'lab' | 'doctor';
  branchId: string;
  userId?: string;
  clinicId?: string;
}
