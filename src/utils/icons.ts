export type IconVariant = 'outlined' | 'rounded' | 'filled';

const ICON_CLASS: Record<IconVariant, string> = {
  outlined: 'material-symbols-outlined',
  rounded: 'material-symbols-rounded',
  filled: 'material-symbols-filled',
};

export function createIcon(name: string, variant: IconVariant = 'outlined'): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = `icon ${ICON_CLASS[variant]}`;
  span.setAttribute('aria-hidden', 'true');
  span.textContent = name;
  return span;
}

export interface ButtonContentOptions {
  icon?: string | null;
  label: string;
  iconVariant?: IconVariant;
}

export function setButtonContent(btn: HTMLButtonElement, options: ButtonContentOptions): void {
  btn.replaceChildren();
  if (options.icon) {
    btn.appendChild(createIcon(options.icon, options.iconVariant));
  }
  btn.appendChild(document.createTextNode(options.label));
}

export function enhanceButton(
  btn: HTMLButtonElement,
  iconName: string,
  variant: IconVariant = 'outlined',
): void {
  const label = btn.textContent?.trim() ?? '';
  btn.classList.add('btn');
  if (!btn.classList.contains('btn--filled') && !btn.classList.contains('btn--outline')) {
    btn.classList.add('btn--filled');
  }
  setButtonContent(btn, { icon: iconName, label, iconVariant: variant });
}
