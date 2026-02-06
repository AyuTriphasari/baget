"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";

type ToastType = "error" | "success" | "info";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => { } });

export function useToast() {
    return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: ToastType = "error") => {
        const id = ++nextId;
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            {/* Toast container */}
            <div className="fixed top-16 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const [visible, setVisible] = useState(false);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        // Animate in
        requestAnimationFrame(() => setVisible(true));

        // Auto dismiss
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(onDismiss, 300);
        }, 3500);

        return () => clearTimeout(timer);
    }, [onDismiss]);

    const bgColor =
        toast.type === "success"
            ? "bg-green-500/15 border-green-500/30"
            : toast.type === "info"
                ? "bg-blue-500/15 border-blue-500/30"
                : "bg-red-500/15 border-red-500/30";

    const textColor =
        toast.type === "success"
            ? "text-green-300"
            : toast.type === "info"
                ? "text-blue-300"
                : "text-red-300";

    const icon =
        toast.type === "success" ? "✓" : toast.type === "info" ? "ℹ" : "✕";

    return (
        <div
            onClick={() => {
                setExiting(true);
                setTimeout(onDismiss, 300);
            }}
            className={`
        pointer-events-auto w-full max-w-sm border rounded-xl px-4 py-3 backdrop-blur-xl
        flex items-start gap-3 cursor-pointer transition-all duration-300
        ${bgColor}
        ${visible && !exiting ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}
      `}
        >
            <span className={`text-sm font-bold flex-shrink-0 mt-0.5 ${textColor}`}>{icon}</span>
            <p className={`text-sm leading-snug ${textColor}`}>{toast.message}</p>
        </div>
    );
}
