import { useEffect, useState } from 'react';
import './toast.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastMessage = {
    id: number;
    message: string;
    duration: number;
    type: ToastType;
};

type ToastListener = (toast: ToastMessage) => void;
type ToastOptions = {
    duration?: number;
    type?: ToastType;
};

const listeners = new Set<ToastListener>();
const pendingToasts: ToastMessage[] = [];
let nextToastId = 1;
const toastIcons: Record<ToastType, string> = {
    success: '\u2713',
    error: '\u00d7',
    warning: '!',
    info: 'i',
};

function normalizarTexto(message: unknown) {
    return String(message).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function inferToastType(message: unknown): ToastType {
    const texto = normalizarTexto(message);

    if (texto.includes('sucesso') || texto.includes('criado') || texto.includes('guardad') || texto.includes('atualizad') || texto.includes('registad')) {
        return 'success';
    }

    if (texto.includes('erro') || texto.includes('falha') || texto.includes('impossivel') || texto.includes('nao foi possivel')) {
        return 'error';
    }

    if (texto.includes('atencao') || texto.includes('aviso') || texto.includes('por favor') || texto.includes('selecione') || texto.includes('preenche')) {
        return 'warning';
    }

    return 'info';
}

export function showToast(message: unknown, options: ToastOptions | number = 4500) {
    const toastOptions = typeof options === 'number' ? { duration: options } : options;
    const toast = {
        id: nextToastId,
        message: String(message),
        duration: toastOptions.duration ?? 4500,
        type: toastOptions.type ?? inferToastType(message),
    };

    nextToastId += 1;

    if (listeners.size === 0) {
        pendingToasts.push(toast);
        return;
    }

    listeners.forEach((listener) => listener(toast));
}

showToast.success = (message: unknown, duration = 4500) => showToast(message, { duration, type: 'success' });
showToast.error = (message: unknown, duration = 4500) => showToast(message, { duration, type: 'error' });
showToast.warning = (message: unknown, duration = 4500) => showToast(message, { duration, type: 'warning' });
showToast.info = (message: unknown, duration = 4500) => showToast(message, { duration, type: 'info' });

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
                <div className={`toast-message toast-message--${toast.type}`} key={toast.id}>
                    <span className="toast-icon" aria-hidden="true">
                        {toastIcons[toast.type]}
                    </span>
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
