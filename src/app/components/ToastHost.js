"use client";

import { useEffect, useState } from "react";

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const { message, type } = e.detail || {};
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 3800);
    }
    window.addEventListener("tivoi-toast", onToast);
    return () => window.removeEventListener("tivoi-toast", onToast);
  }, []);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in glass-panel rounded-lg px-5 py-3 flex items-center gap-2.5"
        >
          {t.type === "success" ? (
            <i className="ph-duotone ph-check-circle text-primary shrink-0" style={{ fontSize: 16 }} />
          ) : t.type === "error" ? (
            <i className="ph-duotone ph-x-circle text-error shrink-0" style={{ fontSize: 16 }} />
          ) : (
            <i className="ph-duotone ph-info text-primary shrink-0" style={{ fontSize: 16 }} />
          )}
          <span className="text-sm text-on-surface">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
