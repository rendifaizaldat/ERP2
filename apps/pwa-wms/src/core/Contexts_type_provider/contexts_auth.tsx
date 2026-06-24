import { useState, useCallback, useEffect } from "react";
import { STORAGE_KEYS } from "../constants";

export interface Staff {
  id: string;
  name: string;
  role: string;
  pin: string;
}

export interface WmsState {
  wmsType: string;
  regionId: string;
  branchId: string | null;
  deviceToken: string | null;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  staff?: Staff;
}

export function useAuth() {
  const [wmsState, setWmsState] = useState<WmsState | null>(null);
  const [currentOperator, setCurrentOperator] = useState<Staff | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.DEVICE_TOKEN);
    const type = localStorage.getItem(STORAGE_KEYS.WMS_TYPE);
    const region = localStorage.getItem(STORAGE_KEYS.REGION_ID);
    const branch = localStorage.getItem(STORAGE_KEYS.BRANCH_ID);

    if (token && type && region) {
      setWmsState({
        deviceToken: token,
        wmsType: type,
        regionId: region,
        branchId: branch || null,
      });
      const activeOp = localStorage.getItem(STORAGE_KEYS.ACTIVE_OPERATOR);
      if (activeOp) {
        setCurrentOperator(JSON.parse(activeOp));
        setIsScreenLocked(true);
      }
    }
    setIsInitialized(true);
  }, []);

  const validatePin = useCallback(
    async (inputPin: string): Promise<ValidationResult> => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.MASTER_STAFF);
        if (!raw) return { valid: false, message: "Data staf tidak ada." };
        const staffList: Staff[] = JSON.parse(raw);
        const match = staffList.find((s) => s.pin === inputPin);
        if (!match) return { valid: false, message: "PIN salah." };
        if (
          isScreenLocked &&
          currentOperator &&
          currentOperator.id !== match.id
        ) {
          return {
            valid: false,
            message: `Dikunci oleh ${currentOperator.name}.`,
          };
        }
        return { valid: true, staff: match };
      } catch {
        return { valid: false, message: "Error sistem." };
      }
    },
    [isScreenLocked, currentOperator],
  );

  const loginOperator = useCallback(async (staff: Staff) => {
    setCurrentOperator(staff);
    setIsScreenLocked(false);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_OPERATOR, JSON.stringify(staff));
  }, []);

  const unlockScreen = useCallback(() => setIsScreenLocked(false), []);
  const lockScreen = useCallback(() => setIsScreenLocked(true), []);
  const logoutOperator = useCallback(() => {
    setCurrentOperator(null);
    setIsScreenLocked(false);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_OPERATOR);
  }, []);

  return {
    wmsState,
    currentOperator,
    isScreenLocked,
    isInitialized,
    validatePin,
    loginOperator,
    unlockScreen,
    lockScreen,
    logoutOperator,
  };
}
