declare module 'toastify-js' {
  interface ToastifyOptions {
    text?: string | Node;
    node?: HTMLElement;
    duration?: number;
    selector?: string | Element;
    destination?: string | Element;
    newWindow?: boolean;
    close?: boolean;
    gravity?: 'top' | 'bottom';
    position?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    avatar?: string;
    className?: string;
    stopOnFocus?: boolean;
    callback?: () => void;
    onClick?: (instance: ToastifyElement) => void;
    offset?: { x?: number | string; y?: number | string };
    escapeMarkup?: boolean;
    ariaLive?: 'off' | 'polite' | 'assertive';
    style?: Record<string, string>;
    oldestFirst?: boolean;
  }

  interface ToastifyElement {
    showToast(): ToastifyElement;
    hideToast(): void;
  }

  function Toastify(options: ToastifyOptions): ToastifyElement;

  export default Toastify;
}
