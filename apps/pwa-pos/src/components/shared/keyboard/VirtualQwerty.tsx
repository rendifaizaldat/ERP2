import React, { useState } from "react";
import { Delete, ArrowUpCircle, CornerDownLeft, Globe } from "lucide-react";

interface VirtualQwertyProps {
  onKeyPress: (key: string) => void;
  onEnter?: () => void;
}

export const VirtualQwerty: React.FC<VirtualQwertyProps> = ({
  onKeyPress,
  onEnter,
}) => {
  const [isShift, setIsShift] = useState(false);
  const [isSymbols, setIsSymbols] = useState(false); // mode simbol

  // Layout huruf (lowercase)
  const letterRows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["SHIFT", "z", "x", "c", "v", "b", "n", "m", "BACKSPACE"],
  ];

  // Layout simbol
  const symbolRows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["@", "#", "$", "%", "&", "*", "-", "+", "="],
    ["(", ")", "/", "?", "!", "'", '"', ":", ";", ","],
  ];

  const handleKeyClick = (key: string) => {
    if (key === "SHIFT") {
      setIsShift(!isShift);
      return;
    }
    if (key === "BACKSPACE") {
      onKeyPress("BACKSPACE");
      return;
    }
    if (key === "CLEAR") {
      onKeyPress("CLEAR");
      return;
    }
    if (key === "SPACE") {
      onKeyPress(" ");
      return;
    }
    if (key === "ENTER") {
      if (onEnter) onEnter();
      else onKeyPress("ENTER");
      return;
    }
    if (key === "TOGGLE") {
      setIsSymbols(!isSymbols);
      setIsShift(false); // reset shift saat pindah mode
      return;
    }

    // Huruf atau simbol
    let char = key;
    if (!isSymbols && key.length === 1) {
      char = isShift ? key.toUpperCase() : key;
      setIsShift(false); // auto-reset shift setelah mengetik huruf
    }
    onKeyPress(char);
  };

  // Baris ke-4 (kontrol bawah) selalu sama
  const bottomRow = [
    "CLEAR",
    isSymbols ? "ABC" : "?123", // tombol toggle
    "SPACE",
    "ENTER",
  ];

  // Jika mode simbol, gunakan symbolRows
  const activeRows = isSymbols ? symbolRows : letterRows;

  return (
    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 select-none shadow-inner flex flex-col gap-2">
      {/* Baris huruf/simbol */}
      {activeRows.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className={`flex justify-center gap-1.5 ${
            rowIndex === 1 ? "px-2" : ""
          }`}
        >
          {row.map((key) => {
            let widthClass = "flex-1";
            let bgClass =
              "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200";

            if (key === "SHIFT") {
              bgClass = isShift
                ? "bg-orange-500 text-white border-orange-600"
                : "bg-slate-300 text-slate-700 hover:bg-slate-400 border-transparent";
            } else if (key === "BACKSPACE") {
              bgClass =
                "bg-slate-300 text-slate-700 hover:bg-slate-400 border-transparent";
            }

            return (
              <button
                key={key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault();
                  handleKeyClick(key);
                }}
                className={`${widthClass} ${bgClass} h-12 min-w-[2.5rem] rounded-lg font-black text-lg transition-all active:scale-95 shadow-sm flex items-center justify-center cursor-pointer`}
              >
                {key === "BACKSPACE" ? (
                  <Delete size={20} />
                ) : key === "SHIFT" ? (
                  <ArrowUpCircle size={20} />
                ) : key === "SPACE" ? (
                  <span className="text-xs tracking-widest text-slate-400">
                    SPACE
                  </span>
                ) : key === "CLEAR" ? (
                  <span className="text-xs tracking-wider">CLR</span>
                ) : key === "ENTER" ? (
                  <CornerDownLeft size={20} />
                ) : key === "TOGGLE" ? (
                  <Globe size={18} />
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}

      {/* Baris kontrol bawah (CLEAR, TOGGLE, SPACE, ENTER) */}
      <div className="flex justify-center gap-1.5">
        {bottomRow.map((key) => {
          let widthClass = "flex-1";
          let bgClass =
            "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200";

          if (key === "CLEAR") {
            bgClass =
              "bg-red-100 text-red-600 hover:bg-red-200 border-transparent";
            widthClass = "flex-1";
          } else if (key === "ABC" || key === "?123") {
            bgClass =
              "bg-slate-300 text-slate-700 hover:bg-slate-400 border-transparent";
            widthClass = "flex-1";
          } else if (key === "SPACE") {
            widthClass = "flex-[3]";
            bgClass =
              "bg-white text-slate-900 hover:bg-slate-50 border border-slate-200";
          } else if (key === "ENTER") {
            bgClass =
              "bg-emerald-600 text-white hover:bg-emerald-700 border-transparent";
            widthClass = "flex-1";
          }

          return (
            <button
              key={key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault();
                if (key === "ABC" || key === "?123") handleKeyClick("TOGGLE");
                else if (key === "ENTER") handleKeyClick("ENTER");
                else handleKeyClick(key);
              }}
              className={`${widthClass} ${bgClass} h-12 rounded-lg font-black text-sm transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1 cursor-pointer`}
            >
              {key === "CLEAR" ? (
                "CLR"
              ) : key === "ABC" ? (
                <>
                  <Globe size={16} /> ABC
                </>
              ) : key === "?123" ? (
                <>
                  <Globe size={16} /> ?123
                </>
              ) : key === "SPACE" ? (
                <span className="text-xs tracking-widest">SPACE</span>
              ) : key === "ENTER" ? (
                <CornerDownLeft size={18} />
              ) : (
                key
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
