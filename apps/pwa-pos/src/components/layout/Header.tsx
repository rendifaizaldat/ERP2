import { useState, useEffect, useMemo } from "react";
import {
  Menu,
  Clock,
  Briefcase,
  User,
  BadgeCheck,
  RefreshCw,
} from "lucide-react";
import { usePos } from "../../core/PosProvider";
import { backgroundSync } from "../../core/BackgroundSync";

export const Header = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { currentOperator, state } = usePos();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSyncError, setIsSyncError] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const handleSyncError = () => setIsSyncError(true);
    const handleSyncSuccess = () => setIsSyncError(false);

    window.addEventListener("SYNC_ERROR", handleSyncError);
    window.addEventListener("SYNC_SUCCESS", handleSyncSuccess);

    return () => {
      clearInterval(timer);
      window.removeEventListener("SYNC_ERROR", handleSyncError);
      window.removeEventListener("SYNC_SUCCESS", handleSyncSuccess);
    };
  }, []);

  const shiftDurationMetrics = useMemo(() => {
    if (!currentOperator) {
      return { durationText: "00:00:00", isOvertime: false };
    }

    const startTimeStamp =
      state?.activeShiftStartTime || state?.currentShiftOpenedAt;

    if (!startTimeStamp) {
      return { durationText: "00:00:00", isOvertime: false };
    }

    const start = new Date(startTimeStamp).getTime();
    const now = currentTime.getTime();
    const diffInSeconds = Math.floor(Math.max(0, now - start) / 1000);

    const hours = Math.floor(diffInSeconds / 3600);
    const minutes = Math.floor((diffInSeconds % 3600) / 60);
    const seconds = diffInSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, "0");
    const durationText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    const isOvertime = diffInSeconds >= 28800;

    return { durationText, isOvertime };
  }, [currentOperator, state, currentTime]);

  const getRoleInfo = (role: string) => {
    const roleMap: Record<
      string,
      { label: string; iconName: string; color: string }
    > = {
      ADMIN: {
        label: "ADMINISTRATOR",
        iconName: "BadgeCheck",
        color: "bg-purple-100 text-purple-700 border-purple-200",
      },
      KASIR: {
        label: "KASIR",
        iconName: "User",
        color: "bg-blue-100 text-blue-700 border-blue-200",
      },
      MANAGER: {
        label: "MANAGER",
        iconName: "Briefcase",
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
      },
      STAFF: {
        label: "STAFF",
        iconName: "User",
        color: "bg-slate-100 text-slate-700 border-slate-200",
      },
      SUPERVISOR: {
        label: "SUPERVISOR",
        iconName: "BadgeCheck",
        color: "bg-amber-100 text-amber-700 border-amber-200",
      },
    };

    return (
      roleMap[role] || {
        label: role || "UNKNOWN",
        iconName: "User",
        color: "bg-slate-100 text-slate-700 border-slate-200",
      }
    );
  };

  const employeeName = currentOperator?.name || "GUEST ACCOUNT";
  const employeeRole = currentOperator?.role || "UNKNOWN";
  const roleInfo = getRoleInfo(employeeRole);

  const formattedDate = currentTime.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-40 select-none">
      <div className="flex items-center gap-2">
        <div className="bg-orange-600 text-white w-7 h-7 flex items-center justify-center rounded-lg font-black italic shadow-md shadow-orange-200 text-sm">
          AS
        </div>
        <div className="flex items-baseline gap-1">
          <h2 className="font-black text-base tracking-tighter uppercase leading-none text-slate-900">
            Asstro <span className="text-orange-600">POS</span>
          </h2>
          <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase hidden sm:inline">
            Enterprise
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-medium text-slate-700 overflow-x-auto whitespace-nowrap scrollbar-hide">
        {isSyncError && (
          <button
            onClick={async () => {
              await backgroundSync.forceTrigger();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 border border-red-200 rounded-lg animate-pulse font-black text-[10px] uppercase tracking-wider hover:bg-red-200 transition-all cursor-pointer"
          >
            <RefreshCw size={12} className="animate-spin-slow" />
            Sync Gagal
          </button>
        )}
        <span className="font-black text-slate-900">{employeeName}</span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-700">{roleInfo.label}</span>
        <span className="text-slate-300">|</span>
        <div className="flex items-center gap-1">
          <Clock size={12} className="text-orange-600" />
          <span
            className={`font-mono font-black ${shiftDurationMetrics.isOvertime ? "text-red-600" : "text-slate-900"}`}
          >
            {shiftDurationMetrics.durationText}
          </span>
          {shiftDurationMetrics.isOvertime && (
            <span className="text-[9px] font-black text-red-600 bg-red-50 px-1 py-0.5 rounded-md animate-pulse">
              LEMBUR
            </span>
          )}
        </div>
        <span className="text-slate-300">|</span>
        <span className="text-slate-700 text-xs">{formattedDate}</span>
        <span className="text-slate-300">|</span>
        <span className="font-mono font-black text-orange-600 text-xs">
          {formattedTime}
        </span>

        <button
          onClick={onMenuClick}
          className="ml-2 p-1.5 bg-slate-900 text-white hover:bg-orange-600 rounded-lg transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
};
