import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';
import '../styles/toast-overrides.css';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

const ICONS: Record<ToastVariant, string> = {
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toastHtml(message: string, variant: ToastVariant): string {
  return `<span class="toast-inner"><span class="icon material-symbols-outlined toast-icon" aria-hidden="true">${ICONS[variant]}</span><span class="toast-text">${escapeHtml(message)}</span></span>`;
}

export function showToast(message: string, variant: ToastVariant = 'info', duration = 4000): void {
  Toastify({
    text: toastHtml(message, variant),
    duration,
    gravity: 'top',
    position: 'right',
    escapeMarkup: false,
    stopOnFocus: true,
    className: `app-toast toast--${variant}`,
    ariaLive: variant === 'error' ? 'assertive' : 'polite',
  }).showToast();
}

export function toastSuccess(message: string): void {
  showToast(message, 'success');
}

export function toastError(message: string): void {
  showToast(message, 'error', 5500);
}

export function toastWarning(message: string): void {
  showToast(message, 'warning', 4500);
}

export function toastInfo(message: string): void {
  showToast(message, 'info');
}
