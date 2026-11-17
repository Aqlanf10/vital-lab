import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { Cloud, CloudOff, Download, LogOut, RefreshCw, Smartphone, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC<{ variant?: 'light' | 'dark' | 'violet' }> = ({
  variant = 'light',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const baseClass =
    variant === 'dark'
      ? 'bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white border border-slate-700'
      : variant === 'violet'
      ? 'bg-violet-50 hover:bg-violet-600 text-violet-700 hover:text-white border border-violet-200'
      : 'bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200';

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${baseClass}`}
        title="تثبيت النظام كتطبيق مستقل على الجهاز"
      >
        <Download size={14} />
        <span>تثبيت التطبيق</span>
      </button>
    );
  }

  // Fallback button for iOS Safari or preview iframe environments where beforeinstallprompt is suppressed
  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuideModal(true)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${baseClass}`}
        title="طريقة تثبيت التطبيق على الجوال وسطح المكتب"
      >
        <Smartphone size={14} />
        <span>{isIOS ? 'تثبيت على iPhone' : 'تطبيق الجوال PWA'}</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-xl text-right space-y-4"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  تثبيت تطبيق Vital Dental Lab (PWA)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                يعمل النظام كتطبيق ويب تقدمي <strong>(PWA)</strong> قابل للتثبيت على الشاشة الرئيسية للجوال وسطح المكتب مع دعم العمل دون اتصال بالإنترنت:
              </p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900">على أجهزة iPhone و iPad (متصفح Safari):</div>
                <p>1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط المتصفح السفلي.</p>
                <p>2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900">على أجهزة Android والكمبيوتر (Chrome / Edge):</div>
                <p>افتح الرابط في نافذة مستقلة ثم اضغط على أيقونة <strong>تثبيت التطبيق (Install App)</strong> في شريط العنوان العلوي.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 py-2.5 text-xs font-bold text-white cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-lg border border-amber-500 no-print"
      dir="rtl"
    >
      <WifiOff size={14} className="shrink-0" />
      <span>وضع عدم الاتصال — يعمل النظام حالياً من الذاكرة المحلية وسيزامن تلقائياً فور عودة الإنترنت</span>
    </div>
  );
};

interface CloudSyncControlProps {
  cloudUser: User | null;
  isSyncing: boolean;
  onConnectCloud: () => void;
  onPushNow: () => void;
  onDisconnectCloud: () => void;
}

export const CloudSyncControl: React.FC<CloudSyncControlProps> = ({
  cloudUser,
  isSyncing,
  onConnectCloud,
  onPushNow,
  onDisconnectCloud,
}) => {
  if (!cloudUser) {
    return (
      <button
        type="button"
        onClick={onConnectCloud}
        className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-semibold text-slate-700 hover:text-emerald-800 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
        title="تفعيل المزامنة السحابية الفورية عبر Google Firebase"
      >
        <CloudOff size={14} className="text-slate-400" />
        <span className="hidden xl:inline">ربط السحابة</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs">
      <Cloud size={14} className="text-emerald-600 shrink-0" />
      <span className="text-emerald-800 font-bold hidden xl:inline max-w-[120px] truncate">
        {cloudUser.email}
      </span>
      <button
        type="button"
        onClick={onPushNow}
        disabled={isSyncing}
        className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
        title="مزامنة كافة بيانات الفرع الآن إلى السحابة"
      >
        <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
      </button>
      <button
        type="button"
        onClick={onDisconnectCloud}
        className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
        title="إيقاف اتصال حساب السحابة"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
};
