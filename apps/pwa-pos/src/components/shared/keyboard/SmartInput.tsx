import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { VirtualNumpad } from "./VirtualNumpad";
import { VirtualQwerty } from "./VirtualQwerty";
import {
  Keyboard,
  Hash,
  Eye,
  EyeOff,
  Copy,
  ClipboardPaste,
} from "lucide-react";

// MENGHUBUNGKAN DENGAN GLOBAL SETTINGS
import { usePos } from "../../../core/PosProvider";

interface SmartInputProps {
  value: string;
  onChange: (val: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  className?: string;
  maxLength?: number;
  onEnter?: () => void;
  masked?: boolean;
  allowKeyboardToggle?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}

export const SmartInput: React.FC<SmartInputProps> = ({
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
  maxLength,
  onEnter,
  masked = false,
  allowKeyboardToggle = false,
  required = false,
  disabled = false,
  readOnly = false,
}) => {
  const { state } = usePos();

  // MEMBACA KONFIGURASI DARI SETTINGS I/O
  // Jika di settings dimatikan, maka isVirtualEnabled = false
  const isVirtualEnabled = state?.settings?.io?.useSmartInput ?? true;

  const [isFocused, setIsFocused] = useState(false);
  const [keyboardMode, setKeyboardMode] = useState<"qwerty" | "numpad">(
    type === "number" ? "numpad" : "qwerty",
  );
  const [showPassword, setShowPassword] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  const [keyboardPosition, setKeyboardPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [keyboardHeight, setKeyboardHeight] = useState<number | null>(null);
  const defaultKeyboardHeight = keyboardMode === "numpad" ? 250 : 300;

  const toggleKeyboardMode = () => {
    setKeyboardMode((prev) => (prev === "qwerty" ? "numpad" : "qwerty"));
  };

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        let newValue = text;
        if (type === "number") {
          newValue = text.replace(/\D/g, "");
        }
        if (maxLength && newValue.length > maxLength) {
          newValue = newValue.slice(0, maxLength);
        }
        onChange(newValue);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    } catch (err) {
      console.error("Paste failed:", err);
    }
  };

  const updateKeyboardPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const currentKeyboardHeight = keyboardHeight || defaultKeyboardHeight;

    let keyboardWidth = rect.width;
    if (keyboardMode === "qwerty") {
      keyboardWidth = Math.min(Math.max(rect.width, 380), 500);
    } else {
      keyboardWidth = Math.max(rect.width, 280);
    }

    let left = rect.left;
    if (left + keyboardWidth > window.innerWidth) {
      left = window.innerWidth - keyboardWidth;
    }
    if (left < 0) left = 0;

    let top: number;
    const spaceBelow = viewportHeight - rect.bottom;
    if (spaceBelow >= currentKeyboardHeight) {
      top = rect.bottom;
    } else {
      top = rect.top - currentKeyboardHeight;
      if (top < 0) top = 0;
    }

    setKeyboardPosition({ top, left, width: keyboardWidth });
  };

  useEffect(() => {
    if (isFocused && keyboardRef.current && isVirtualEnabled) {
      const height = keyboardRef.current.clientHeight;
      if (height > 0 && height !== keyboardHeight) {
        setKeyboardHeight(height);
      }
    }
  }, [isFocused, keyboardHeight, isVirtualEnabled]);

  useEffect(() => {
    if (isFocused && keyboardHeight !== null && isVirtualEnabled) {
      updateKeyboardPosition();
    }
  }, [isFocused, keyboardHeight, keyboardMode, isVirtualEnabled]);

  useEffect(() => {
    if (!isFocused || !isVirtualEnabled) return;
    updateKeyboardPosition();
    const handleWindowChange = () => updateKeyboardPosition();
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange);
    window.addEventListener("orientationchange", handleWindowChange);
    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange);
      window.removeEventListener("orientationchange", handleWindowChange);
    };
  }, [isFocused, isVirtualEnabled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideInput = containerRef.current?.contains(target);
      const isInsideKeyboard = keyboardRef.current?.contains(target);
      if (!isInsideInput && !isInsideKeyboard) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleVirtualKeyPress = (key: string) => {
    if (key === "CLEAR") {
      onChange("");
      return;
    }
    if (key === "BACKSPACE") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "SPACE") {
      if (!maxLength || value.length < maxLength) onChange(value + " ");
      return;
    }
    if (!maxLength || value.length < maxLength) {
      onChange(value + key);
    }
  };

  const handlePhysicalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && onEnter) {
      e.preventDefault();
      onEnter();
      setIsFocused(false);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      e.preventDefault();
      handlePaste();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      e.preventDefault();
      handleCopy();
    }
  };

  const inputType = masked ? (showPassword ? "text" : "password") : "text";

  // LOGIKA SMART INPUT MODE
  // Jika Virtual Keyboard PWA menyala -> Blokir OS Keyboard (inputMode="none")
  // Jika Virtual Keyboard PWA mati -> Izinkan OS Keyboard muncul (inputMode="text" atau "numeric")
  const activeInputMode = isVirtualEnabled
    ? "none"
    : type === "number"
      ? "numeric"
      : "text";

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type={inputType}
          inputMode={activeInputMode}
          value={value}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handlePhysicalKeyDown}
          onChange={(e) => {
            const val = e.target.value;
            if (type === "number" && !/^\d*$/.test(val)) return;
            onChange(val);
          }}
          required={required}
          disabled={disabled}
          readOnly={readOnly}
          maxLength={maxLength}
          className={`w-full ${className} ${isFocused && isVirtualEnabled ? "ring-2 ring-orange-500 border-orange-500" : ""} ${masked ? "pr-10" : ""}`}
        />
        {masked && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPassword(!showPassword);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {isFocused &&
        !disabled &&
        !readOnly &&
        isVirtualEnabled &&
        createPortal(
          <div
            ref={keyboardRef}
            style={{
              position: "fixed",
              top: keyboardPosition.top,
              left: keyboardPosition.left,
              width: keyboardPosition.width,
              zIndex: 9999,
            }}
            className="drop-shadow-2xl animate-fade-in"
          >
            <div className="flex justify-end gap-2 mb-1">
              {allowKeyboardToggle && type === "text" && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={toggleKeyboardMode}
                  className="bg-slate-200 hover:bg-slate-300 p-1.5 rounded-full transition-colors shadow-sm"
                  title={
                    keyboardMode === "qwerty"
                      ? "Beralih ke Numpad"
                      : "Beralih ke QWERTY"
                  }
                >
                  {keyboardMode === "qwerty" ? (
                    <Hash size={18} />
                  ) : (
                    <Keyboard size={18} />
                  )}
                </button>
              )}
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCopy}
                className="bg-slate-200 hover:bg-slate-300 p-1.5 rounded-full transition-colors shadow-sm"
                title="Salin teks"
              >
                <Copy size={18} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handlePaste}
                className="bg-slate-200 hover:bg-slate-300 p-1.5 rounded-full transition-colors shadow-sm"
                title="Tempel teks"
              >
                <ClipboardPaste size={18} />
              </button>
            </div>
            {keyboardMode === "numpad" ? (
              <VirtualNumpad
                onKeyPress={handleVirtualKeyPress}
                onEnter={() => {
                  if (onEnter) onEnter();
                  setIsFocused(false);
                }}
              />
            ) : (
              <VirtualQwerty
                onKeyPress={handleVirtualKeyPress}
                onEnter={() => {
                  if (onEnter) onEnter();
                  setIsFocused(false);
                }}
              />
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};
