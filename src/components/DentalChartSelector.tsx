import React, { useState } from 'react';
import { RestorationConnection } from '../types';
import { VITA_SHADES } from '../data/seedData';
import { Link2, RotateCcw, Sparkles } from 'lucide-react';

// FDI Adult Dentition Quadrants (Patient Right -> Left in clinical chart view)
const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41];
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38];

const TOOTH_NAMES_AR: Record<number, string> = {
  1: 'ثنية وسطى',
  2: 'رباعية جانبية',
  3: 'ناب',
  4: 'ضاحك أول',
  5: 'ضاحك ثانٍ',
  6: 'رحى أولى',
  7: 'رحى ثانية',
  8: 'ضرس العقل',
};

function getToothCategory(fdi: number): 'incisor' | 'canine' | 'premolar' | 'molar' {
  const pos = fdi % 10;
  if (pos === 1 || pos === 2) return 'incisor';
  if (pos === 3) return 'canine';
  if (pos === 4 || pos === 5) return 'premolar';
  return 'molar';
}

export function getToothArabicLabel(fdi: number): string {
  const quad = Math.floor(fdi / 10);
  const pos = fdi % 10;
  const arch = quad === 1 || quad === 2 ? 'علوي' : 'سفلي';
  const side = quad === 1 || quad === 4 ? 'أيمن' : 'أيسر';
  return `${TOOTH_NAMES_AR[pos] || 'سن'} ${arch} ${side} (${fdi})`;
}

interface DentalChartSelectorProps {
  selectedTeeth: number[];
  onChange: (teeth: number[]) => void;
  connectionType: RestorationConnection;
  onConnectionTypeChange: (type: RestorationConnection) => void;
}

export const DentalChartSelector: React.FC<DentalChartSelectorProps> = ({
  selectedTeeth,
  onChange,
  connectionType,
  onConnectionTypeChange,
}) => {
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);

  const toggleTooth = (fdi: number) => {
    if (selectedTeeth.includes(fdi)) {
      onChange(selectedTeeth.filter((t) => t !== fdi));
    } else {
      onChange([...selectedTeeth, fdi].sort((a, b) => a - b));
    }
  };

  const applyPreset = (teeth: number[]) => {
    const allIncluded = teeth.every((t) => selectedTeeth.includes(t));
    if (allIncluded) {
      onChange(selectedTeeth.filter((t) => !teeth.includes(t)));
    } else {
      const merged = Array.from(new Set([...selectedTeeth, ...teeth])).sort((a, b) => a - b);
      onChange(merged);
    }
  };

  const renderToothButton = (fdi: number, isUpper: boolean) => {
    const isSelected = selectedTeeth.includes(fdi);
    const cat = getToothCategory(fdi);
    const widthClass =
      cat === 'molar'
        ? 'w-9 sm:w-10'
        : cat === 'premolar'
        ? 'w-7 sm:w-8'
        : cat === 'canine'
        ? 'w-7 sm:w-8'
        : 'w-6 sm:w-7';

    return (
      <button
        key={fdi}
        type="button"
        onClick={() => toggleTooth(fdi)}
        onMouseEnter={() => setHoveredTooth(fdi)}
        onMouseLeave={() => setHoveredTooth(null)}
        title={getToothArabicLabel(fdi)}
        className={`group relative flex flex-col items-center justify-between py-1.5 px-0.5 rounded-lg border transition-all duration-150 cursor-pointer select-none ${widthClass} ${
          isSelected
            ? 'bg-blue-600 border-blue-700 text-white shadow-sm -translate-y-0.5'
            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/40'
        }`}
      >
        {isUpper && (
          <span
            className={`text-[10px] font-mono tabular-nums font-semibold mb-1 ${
              isSelected ? 'text-blue-100' : 'text-slate-500'
            }`}
          >
            {fdi}
          </span>
        )}

        {/* Anatomical Tooth SVG Silhouette */}
        <svg
          viewBox="0 0 32 42"
          className={`w-5 h-7 transition-transform ${isUpper ? '' : 'rotate-180'}`}
          fill="none"
        >
          {cat === 'molar' ? (
            <path
              d="M6 6C6 3 10 2 16 2C22 2 26 3 26 6C28 11 27 19 24 23L22 38C21.5 40 19 39 18.5 36L16 26L13.5 36C13 39 10.5 40 10 38L8 23C5 19 4 11 6 6Z"
              fill={isSelected ? '#FFFFFF' : '#F8FAFC'}
              stroke={isSelected ? '#DBEAFE' : '#64748B'}
              strokeWidth="2"
            />
          ) : cat === 'canine' ? (
            <path
              d="M9 9C9 5 13 2 16 2C19 2 23 5 23 9C24 15 22 21 20 25L17.5 39C17 41 15 41 14.5 39L12 25C10 21 8 15 9 9Z"
              fill={isSelected ? '#FFFFFF' : '#F8FAFC'}
              stroke={isSelected ? '#DBEAFE' : '#64748B'}
              strokeWidth="2"
            />
          ) : (
            <path
              d="M8 7C8 3.5 11.5 2 16 2C20.5 2 24 3.5 24 7C24.5 13 23 20 20.5 24L18 38.5C17.5 40.5 14.5 40.5 14 38.5L11.5 24C9 20 7.5 13 8 7Z"
              fill={isSelected ? '#FFFFFF' : '#F8FAFC'}
              stroke={isSelected ? '#DBEAFE' : '#64748B'}
              strokeWidth="2"
            />
          )}
        </svg>

        {!isUpper && (
          <span
            className={`text-[10px] font-mono tabular-nums font-semibold mt-1 ${
              isSelected ? 'text-blue-100' : 'text-slate-500'
            }`}
          >
            {fdi}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900">مخطط الأسنان التفاعلي (نظام FDI العالمي)</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            انقر على الأسنان المطلوبة لتحديدها وحساب عدد الوحدات والسعر تلقائياً
          </p>
        </div>

        {/* Connection Mode Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => onConnectionTypeChange('single')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              connectionType === 'single'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            تيجان / عدسات منفصلة
          </button>
          <button
            type="button"
            onClick={() => onConnectionTypeChange('bridge')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              connectionType === 'bridge'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 size={13} />
            جسر متصل (Bridge)
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset([13, 12, 11, 21, 22, 23])}
            className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            تجميل أمامي علوي (6 وحدات)
          </button>
          <button
            type="button"
            onClick={() => applyPreset([15, 14, 13, 12, 11, 21, 22, 23, 24, 25])}
            className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            ابتسامة علوية (10 وحدات)
          </button>
          <button
            type="button"
            onClick={() => applyPreset([43, 42, 41, 31, 32, 33])}
            className="px-2.5 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors whitespace-nowrap cursor-pointer"
          >
            أمامي سفلي (6 وحدات)
          </button>
        </div>

        {selectedTeeth.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw size={12} />
            مسح التحديد
          </button>
        )}
      </div>

      {/* Dental Arches */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 overflow-x-auto" dir="ltr">
        <div className="min-w-[560px] space-y-3">
          {/* Upper Arch */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium mb-1.5 px-1">
              <span>Upper Right (Q1)</span>
              <span className="font-sans text-slate-500 font-semibold">الفك العلوي</span>
              <span>Upper Left (Q2)</span>
            </div>
            <div className="flex items-end justify-center gap-1">
              <div className="flex items-end gap-1">{UPPER_RIGHT.map((t) => renderToothButton(t, true))}</div>
              <div className="w-px h-14 bg-blue-200 mx-1.5 shrink-0" />
              <div className="flex items-end gap-1">{UPPER_LEFT.map((t) => renderToothButton(t, true))}</div>
            </div>
          </div>

          {/* Occlusal Midline Divider */}
          <div className="border-t border-dashed border-slate-200 relative">
            <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-2 text-[10px] text-slate-400 font-mono">
              OCCLUSAL PLANE
            </span>
          </div>

          {/* Lower Arch */}
          <div>
            <div className="flex items-start justify-center gap-1 pt-1">
              <div className="flex items-start gap-1">{LOWER_RIGHT.map((t) => renderToothButton(t, false))}</div>
              <div className="w-px h-14 bg-blue-200 mx-1.5 shrink-0" />
              <div className="flex items-start gap-1">{LOWER_LEFT.map((t) => renderToothButton(t, false))}</div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-1.5 px-1">
              <span>Lower Right (Q4)</span>
              <span className="font-sans text-slate-500 font-semibold">الفك السفلي</span>
              <span>Lower Left (Q3)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1">
        <div>
          {selectedTeeth.length > 0 ? (
            <span>
              الأسنان المحددة ({selectedTeeth.length} وحدة):{' '}
              <strong className="font-mono tabular-nums text-blue-700">
                {selectedTeeth.join(connectionType === 'bridge' ? ' - ' : ' , ')}
              </strong>
              {' · '}
              <span>{connectionType === 'bridge' ? 'جسر متصل' : 'وحدات منفصلة'}</span>
            </span>
          ) : (
            <span className="text-slate-400">لم يتم تحديد أسنان من المخطط بعد (يمكنك التحديد أو إدخال عدد الوحدات يدوياً)</span>
          )}
        </div>
        {hoveredTooth && (
          <span className="text-slate-500 font-medium">{getToothArabicLabel(hoveredTooth)}</span>
        )}
      </div>
    </div>
  );
};

interface VitaShadeSelectorProps {
  value: string;
  onChange: (shade: string) => void;
}

export const VitaShadeSelector: React.FC<VitaShadeSelectorProps> = ({ value, onChange }) => {
  const [activeGroup, setActiveGroup] = useState<'ALL' | 'Bleach' | 'A' | 'B' | 'C' | 'D'>('ALL');

  const visibleShades =
    activeGroup === 'ALL' ? VITA_SHADES : VITA_SHADES.filter((s) => s.group === activeGroup);

  const selectedObj = VITA_SHADES.find((s) => s.code === value);

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-blue-600" />
          <span className="text-sm font-bold text-slate-900">دليل ألوان الأسنان (VITA & Bleach Shades)</span>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(['ALL', 'Bleach', 'A', 'B', 'C', 'D'] as const).map((grp) => (
            <button
              key={grp}
              type="button"
              onClick={() => setActiveGroup(grp)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                activeGroup === grp
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {grp === 'ALL' ? 'الكل' : grp}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {visibleShades.map((s) => {
          const isSelected = value === s.code;
          return (
            <button
              key={s.code}
              type="button"
              onClick={() => onChange(s.code)}
              title={`${s.code} - ${s.label}`}
              className={`flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span
                className="w-6 h-7 rounded-t-full rounded-b-md border border-slate-300/80 shadow-inner mb-1.5 block"
                style={{ backgroundColor: s.swatch }}
              />
              <span
                className={`text-xs font-mono tabular-nums font-semibold ${
                  isSelected ? 'text-blue-700' : 'text-slate-700'
                }`}
              >
                {s.code}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
        <span>
          اللون المختار:{' '}
          <strong className="font-mono text-slate-900">{value || 'غير محدد'}</strong>
          {selectedObj ? ` · ${selectedObj.label}` : ''}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="أو اكتب لوناً مخصصاً مثل A2/A3..."
          className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs w-48 outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
};
