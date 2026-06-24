import { useState, useEffect } from "react";
import { useToast } from "../../components/Toast";

export const useScreenScaling = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { showToast } = useToast();

  // =========================================================================
  // 1. ENGINE SKALA DINAMIS (ROOT REM SCALING) - SOLUSI UNTUK TABLET & HP
  // =========================================================================
  useEffect(() => {
    const handleResize = () => {
      const baseWidth = 1280;
      const currentWidth = window.innerWidth;

      if (currentWidth < baseWidth) {
        const scaleRatio = currentWidth / baseWidth;
        document.documentElement.style.fontSize = `${16 * scaleRatio}px`;
      } else {
        document.documentElement.style.fontSize = "16px";
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // =========================================================================
  // 2. ENGINE FULLSCREEN
  // =========================================================================
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        showToast(`Sistem Gagal Masuk Fullscreen: ${err.message}`, "ERROR");
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return {
    isFullscreen,
    toggleFullScreen,
  };
};
