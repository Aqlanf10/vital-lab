import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CaseAttachment,
  CaseMessage,
  CaseStatus,
  DentalCase,
  ScanPlatform,
  TryInCycleEvent,
} from '../types';
import { STATUS_LABELS } from '../data/seedData';
import { PrintModalPayload } from './PrintModals';
import {
  Camera,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Link2,
  MessageSquare,
  Printer,
  QrCode,
  RefreshCcw,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

interface CaseInteractiveDrawerProps {
  dentalCase: DentalCase | null;
  branchId: string;
  viewerRole: 'lab' | 'doctor';
  viewerName: string;
  onClose: () => void;
  onSendMessage: (caseId: string, msg: CaseMessage) => void;
  onUpdateAttachmentsAndScan: (
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
  onOpenPrint: (payload: PrintModalPayload) => void;
}

/** Resize uploaded clinical shade photo on canvas to a lightweight <25KB JPEG thumbnail */
export function compressClinicalImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 320;
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = () => reject(new Error('Invalid image'));
      img.src = String(ev.target?.result || '');
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

export const CaseInteractiveDrawer: React.FC<CaseInteractiveDrawerProps> = ({
  dentalCase,
  branchId,
  viewerRole,
  viewerName,
  onClose,
  onSendMessage,
  onUpdateAttachmentsAndScan,
  onRecordTryInAction,
  onOpenPrint,
}) => {
  const [tab, setTab] = useState<'chat' | 'files' | 'tryin-warranty'>('chat');
  const [messageText, setMessageText] = useState('');
  const [scanUrlInput, setScanUrlInput] = useState('');
  const [scanPlatformInput, setScanPlatformInput] = useState<ScanPlatform>('Medit');
  const [photoLabel, setPhotoLabel] = useState('صورة مطابقة اللون السريرية');
  const [tryInNotes, setTryInNotes] = useState('');
  const [fitOk, setFitOk] = useState(true);
  const [shadeOk, setShadeOk] = useState(true);
  const [occlusionOk, setOcclusionOk] = useState(true);
  const [initializedCaseId, setInitializedCaseId] = useState<string | null>(null);

  if (!dentalCase) return null;

  if (initializedCaseId !== dentalCase.id) {
    setInitializedCaseId(dentalCase.id);
    setScanUrlInput(dentalCase.scanFileUrl || '');
    setScanPlatformInput(dentalCase.scanPlatform || 'Medit');
  }

  const messages = dentalCase.messages || [];
  const attachments = dentalCase.attachments || [];
  const tryInHistory = dentalCase.tryInHistory || [];

  const qrUrl = `${window.location.origin}${window.location.pathname}?case=${encodeURIComponent(
    dentalCase.id
  )}&branch=${encodeURIComponent(branchId)}`;

  const handleSubmitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    const now = new Date();
    const ts = `${now.toISOString().split('T')[0]} ${now.toTimeString().slice(0, 5)}`;
    onSendMessage(dentalCase.id, {
      id: `MSG-${Date.now().toString().slice(-5)}`,
      senderRole: viewerRole,
      senderName: viewerName,
      body: messageText.trim(),
      timestamp: ts,
    });
    setMessageText('');
  };

  const handleSaveScanLink = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAttachmentsAndScan(dentalCase.id, {
      scanFileUrl: scanUrlInput.trim() || undefined,
      scanPlatform: scanPlatformInput,
      attachments,
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressClinicalImage(file);
      const nextAttachment: CaseAttachment = {
        id: `ATT-${Date.now().toString().slice(-4)}`,
        label: photoLabel.trim() || 'مرفق سريري',
        dataUrl: compressed,
        uploadedBy: viewerName,
        uploadedAt: new Date().toISOString().split('T')[0],
      };
      onUpdateAttachmentsAndScan(dentalCase.id, {
        scanFileUrl: dentalCase.scanFileUrl,
        scanPlatform: dentalCase.scanPlatform,
        attachments: [...attachments.slice(-5), nextAttachment],
      });
    } catch {
      // Ignore invalid image
    }
    e.target.value = '';
  };

  const handleDeleteAttachment = (attId: string) => {
    onUpdateAttachmentsAndScan(dentalCase.id, {
      scanFileUrl: dentalCase.scanFileUrl,
      scanPlatform: dentalCase.scanPlatform,
      attachments: attachments.filter((a) => a.id !== attId),
    });
  };

  const handleSendOutForTryIn = () => {
    onRecordTryInAction(dentalCase.id, 'TryIn_Out', {
      id: `TRY-${Date.now().toString().slice(-4)}`,
      sentDate: new Date().toISOString().split('T')[0],
      doctorFeedback: tryInNotes.trim() || 'أُرسلت للعيادة لإجراء التجربة السريرية (Try-In)',
    });
    setTryInNotes('');
  };

  const handleReturnFromTryIn = (nextStage: CaseStatus) => {
    const today = new Date().toISOString().split('T')[0];
    onRecordTryInAction(dentalCase.id, nextStage, {
      id: `TRY-${Date.now().toString().slice(-4)}`,
      sentDate: tryInHistory[tryInHistory.length - 1]?.sentDate || today,
      returnedDate: today,
      doctorFeedback:
        tryInNotes.trim() ||
        'اكتملت التجربة السريرية وعادت للمعمل لإتمام التشطيب والتزجيج النهائي.',
      fitApproved: fitOk,
      shadeApproved: shadeOk,
      occlusionApproved: occlusionOk,
    });
    setTryInNotes('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                #{dentalCase.id}
              </span>
              <h3 className="text-base font-extrabold">{dentalCase.patientName}</h3>
              <span className="text-xs text-slate-300">· {STATUS_LABELS[dentalCase.status]}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {dentalCase.serviceType} · اللون {dentalCase.shade} · {dentalCase.units} وحدات ·{' '}
              {dentalCase.clinicId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'chat' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <MessageSquare size={14} />
            <span>محادثة الحالة المباشرة ({messages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('files')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'files' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <ImageIcon size={14} />
            <span>المرفقات والمسح الرقمي ({attachments.length + (dentalCase.scanFileUrl ? 1 : 0)})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('tryin-warranty')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'tryin-warranty'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <ShieldCheck size={14} />
            <span>التجربة السريرية والضمان والـ QR</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {tab === 'chat' && (
            <div className="flex flex-col h-[390px]">
              <div className="flex-1 overflow-y-auto space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 space-y-1">
                    <MessageSquare size={26} className="text-slate-300" />
                    <p className="font-semibold text-slate-600">لا توجد رسائل مسجلة لهذه الحالة بعد</p>
                    <p>اكتب ملاحظاتك السريرية أو استفسارات اللون والإطباق ليراها الطرف الآخر فوراً</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = m.senderRole === viewerRole;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col max-w-[82%] rounded-xl p-3 text-xs ${
                          isMine
                            ? 'mr-0 ml-auto bg-blue-600 text-white'
                            : 'ml-0 mr-auto bg-white border border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="font-bold">
                            {m.senderName} ({m.senderRole === 'doctor' ? 'العيادة' : 'المعمل'})
                          </span>
                          <span
                            className={`text-[10px] font-mono tabular-nums ${
                              isMine ? 'text-blue-100' : 'text-slate-400'
                            }`}
                          >
                            {m.timestamp}
                          </span>
                        </div>
                        <p className="leading-relaxed">{m.body}</p>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSubmitChat} className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="اكتب ملاحظة سريرية، تعديل درجة لون، أو توجيه للفني..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:border-blue-600 focus:bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  <span>إرسال</span>
                </button>
              </form>
            </div>
          )}

          {tab === 'files' && (
            <div className="space-y-6">
              {/* 3D Intraoral Scan Link */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link2 size={16} className="text-blue-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      رابط ملف المسح الضوئي ثلاثي الأبعاد (STL / 3Shape / Medit)
                    </h4>
                  </div>
                  {dentalCase.scanFileUrl && (
                    <a
                      href={dentalCase.scanFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <span>فتح ملف المسح</span>
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>

                <form onSubmit={handleSaveScanLink} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <select
                    value={scanPlatformInput}
                    onChange={(e) => setScanPlatformInput(e.target.value as ScanPlatform)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold"
                  >
                    <option value="Medit">Medit Link</option>
                    <option value="3Shape">3Shape Communicate</option>
                    <option value="Sirona">Dentsply Sirona</option>
                    <option value="STL_URL">رابط STL / سحابي مباشر</option>
                  </select>
                  <input
                    type="url"
                    value={scanUrlInput}
                    onChange={(e) => setScanUrlInput(e.target.value)}
                    placeholder="https://..."
                    dir="ltr"
                    className="sm:col-span-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-left"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-bold cursor-pointer"
                  >
                    حفظ الرابط
                  </button>
                </form>
              </div>

              {/* Clinical Shade Photos */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      صور مطابقة اللون وأسنان المريض السريرية
                    </h4>
                    <p className="text-xs text-slate-500">
                      يتم ضغط الصورة تلقائياً لحفظها بسرعة فائقة وإظهارها للفني المسؤول
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={photoLabel}
                      onChange={(e) => setPhotoLabel(e.target.value)}
                      placeholder="وصف الصورة..."
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs w-40"
                    />
                    <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <Camera size={14} />
                      <span>إرفاق صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {attachments.length === 0 ? (
                  <div className="p-8 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                    لا توجد صور سريرية مرفقة حالياً — يمكنك إرفاق صورة دليل اللون (Shade Tab) بجانب سن المريض.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {attachments.map((att) => (
                      <div
                        key={att.id}
                        className="rounded-xl border border-slate-200 overflow-hidden bg-white flex flex-col justify-between"
                      >
                        <img
                          src={att.dataUrl}
                          alt={att.label}
                          className="w-full h-32 object-cover bg-slate-100"
                        />
                        <div className="p-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">{att.label}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {att.uploadedBy} · {att.uploadedAt}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="حذف الصورة"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'tryin-warranty' && (
            <div className="space-y-5">
              {/* QR Code & Warranty Certificate Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white border border-slate-200 rounded-xl">
                    <QRCodeSVG value={qrUrl} size={72} level="M" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <QrCode size={15} className="text-blue-600" />
                      <span>الباركود الذكي وشهادة الضمان للمريض</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      رقم الضمان التسلسلي:{' '}
                      <strong className="font-mono text-blue-700">
                        {dentalCase.warrantySerial || `WR-${branchId.toUpperCase()}-${dentalCase.id}`}
                      </strong>
                    </p>
                    {dentalCase.deductedItemName && (
                      <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>تم خصم الخامة آلياً: {dentalCase.deductedItemName}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPrint({ type: 'warranty-card', dentalCase });
                    }}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck size={14} />
                    <span>طباعة شهادة الضمان</span>
                  </button>
                  {viewerRole === 'lab' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenPrint({ type: 'job-card', dentalCase });
                      }}
                      className="px-3 py-2 border border-slate-300 hover:bg-white rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} />
                      <span>بطاقة العمل QR</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Clinical Try-In Workflow */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      دورة التجربة السريرية في العيادة (Clinical Try-In)
                    </h4>
                    <p className="text-xs text-slate-500">
                      إرسال التركيبة الأولية (PMMA / Bisque / Metal) لفم المريض واعتماد الانطباق واللون قبل التشطيب النهائي
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    {STATUS_LABELS[dentalCase.status]}
                  </span>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={tryInNotes}
                    onChange={(e) => setTryInNotes(e.target.value)}
                    placeholder="اكتب ملاحظات التجربة السريرية (انطباق الحواف، نقاط التماس، الإطباق، اللون)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fitOk}
                          onChange={(e) => setFitOk(e.target.checked)}
                        />
                        <span>انطباق الحواف سليم</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shadeOk}
                          onChange={(e) => setShadeOk(e.target.checked)}
                        />
                        <span>اللون مطابق</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={occlusionOk}
                          onChange={(e) => setOcclusionOk(e.target.checked)}
                        />
                        <span>الإطباق متوازن</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      {viewerRole === 'lab' && dentalCase.status !== 'TryIn_Out' && (
                        <button
                          type="button"
                          onClick={handleSendOutForTryIn}
                          className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCcw size={13} />
                          <span>إرسال للعيادة للتجربة (Try-In)</span>
                        </button>
                      )}
                      {dentalCase.status === 'TryIn_Out' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleReturnFromTryIn(
                              viewerRole === 'doctor' ? 'TryIn_Returned' : 'Finishing'
                            )
                          }
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 size={14} />
                          <span>
                            {viewerRole === 'doctor'
                              ? 'اعتماد التجربة وإعادتها للمعمل للتشطيب'
                              : 'تأكيد عودتها من التجربة لقسم التشطيب'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {tryInHistory.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-xs font-bold text-slate-700">سجل جلسات التجربة السابقة:</div>
                    {tryInHistory.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-mono text-slate-500 ml-2">أرسلت: {ev.sentDate}</span>
                          {ev.returnedDate && (
                            <span className="font-mono text-emerald-700 ml-2">
                              · عادت: {ev.returnedDate}
                            </span>
                          )}
                          <span className="text-slate-800 font-semibold">{ev.doctorFeedback}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
