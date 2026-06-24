import React from "react";
import { Delete, CornerDownLeft, X } from "lucide-react";

interface VirtualNumpadProps {
  onKeyPress: (key: string) => void;
  onEnter?: () => void;
}

export const VirtualNumpad: React.FC<VirtualNumpadProps> = ({
  onKeyPress,
  onEnter,
}) => {
  // Tombol angka 1-9
  const numberKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="bg-slate-100 p-2 rounded-xl border border-slate-200 select-none shadow-inner">
      <div className="grid grid-cols-3 gap-2">
        {/* Baris 1: 1 2 3 */}
        {numberKeys.slice(0, 3).map((key) => (
          <button
            key={key}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              onKeyPress(key);
            }}
            className="flex items-center justify-center h-12 rounded-lg font-black text-lg transition-all active:scale-95 shadow-sm cursor-pointer bg-white text-slate-900 hover:bg-slate-50 border border-slate-200"
          >
            {key}
          </button>
        ))}

        {/* Baris 2: 4 5 6 */}
        {numberKeys.slice(3, 6).map((key) => (
          <button
            key={key}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              onKeyPress(key);
            }}
            className="flex items-center justify-center h-12 rounded-lg font-black text-lg transition-all active:scale-95 shadow-sm cursor-pointer bg-white text-slate-900 hover:bg-slate-50 border border-slate-200"
          >
            {key}
          </button>
        ))}

        {/* Baris 3: 7 8 9 */}
        {numberKeys.slice(6, 9).map((key) => (
          <button
            key={key}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              onKeyPress(key);
            }}
            className="flex items-center justify-center h-12 rounded-lg font-black text-lg transition-all active:scale-95 shadow-sm cursor-pointer bg-white text-slate-900 hover:bg-slate-50 border border-slate-200"
          >
            {key}
          </button>
        ))}

        {/* Baris 4: [Clear + Backspace] | 0 | OK */}
        <div className="flex gap-1">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              onKeyPress("CLEAR");
            }}
            className="flex-1 flex items-center justify-center h-12 rounded-lg font-black text-sm transition-all active:scale-95 shadow-sm cursor-pointer bg-red-100 text-red-600 hover:bg-red-200"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              onKeyPress("BACKSPACE");
            }}
            className="flex-1 flex items-center justify-center h-12 rounded-lg font-black text-sm transition-all active:scale-95 shadow-sm cursor-pointer bg-slate-300 text-slate-700 hover:bg-slate-400"
          >
            <Delete size={18} />
          </button>
        </div>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            onKeyPress("0");
          }}
          className="flex items-center justify-center h-12 rounded-lg font-black text-lg transition-all active:scale-95 shadow-sm cursor-pointer bg-white text-slate-900 hover:bg-slate-50 border border-slate-200"
        >
          0
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            if (onEnter) onEnter();
            else onKeyPress("ENTER");
          }}
          className="flex items-center justify-center h-12 rounded-lg font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-sm cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
        >
          <CornerDownLeft size={16} /> OK
        </button>
      </div>
    </div>
  );
};
