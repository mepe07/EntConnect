import { useEffect, useState } from 'react';
import './toast.css';

type ToastMessage = {
    id: number;
    message: string;
    duration: number;
};

type ToastListener = (toast: ToastMessage) => void;

const listeners = new Set<ToastListener>();
const pendingToasts: ToastMessage[] = [];
let nextToastId = 1;

export function showToast(message: unknown, duration = 4500) {
    const toast = {
        id: nextToastId,
        message: String(message),
        duration,
    };

    nextToastId += 1;

    if (listeners.size === 0) {
        pendingToasts.push(toast);
        return;
    }

    listeners.forEach((listener) => listener(toast));
}

export function ToastProvider() {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    useEffect(() => {
        function addToast(toast: ToastMessage) {
            setToasts((currentToasts) => [...currentToasts, toast]);

            window.setTimeout(() => {
                setToasts((currentToasts) => currentToasts.filter((item) => item.id !== toast.id));
            }, toast.duration);
        }

        listeners.add(addToast);
        pendingToasts.splice(0).forEach(addToast);

        return () => {
            listeners.delete(addToast);
        };
    }, []);

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className="toast-viewport" role="status" aria-live="polite" aria-relevant="additions text">
            {toasts.map((toast) => (
                <div className="toast-message" key={toast.id}>
                    <p className="toast-text">{toast.message}</p>
                    <button
                        type="button"
                        className="toast-close"
                        aria-label="Fechar notificacao"
                        onClick={() => setToasts((currentToasts) => currentToasts.filter((item) => item.id !== toast.id))}
                    >
                        &times;
                    </button>
                </div>
            ))}
        </div>
    );
}
