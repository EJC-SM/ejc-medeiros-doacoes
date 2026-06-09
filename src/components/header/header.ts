import template from './header.html?raw';
import './header.css';
import {
  getEtapaAtual,
  getEtapaLocked,
  getEtapaPublica,
  getLogo,
  getNomeEvento,
  isEtapaSelectableForPublic,
  setEtapaAtual,
} from '../../state/store';
import type { Etapa } from '../../state/types';

export type HeaderView = 'publico' | 'coordenador';

type EtapaChangeHandler = (etapa: Etapa) => void;
let onEtapaChange: EtapaChangeHandler | null = null;
let refreshHeaderHandler: (() => void) | null = null;
let headerView: HeaderView = 'publico';

export function onHeaderEtapaChange(handler: EtapaChangeHandler): void {
  onEtapaChange = handler;
}

export function setHeaderViewContext(view: HeaderView): void {
  headerView = view;
  refreshHeader();
}

export function refreshHeader(): void {
  if (refreshHeaderHandler) refreshHeaderHandler();
}

function getDisplayedEtapa(): Etapa {
  return getEtapaPublica();
}

function renderEtapaButtons(root: HTMLElement): void {
  const etapa = getDisplayedEtapa();
  const locked = getEtapaLocked();
  const msg = root.querySelector<HTMLElement>('#etapa-locked-msg');

  root.querySelectorAll<HTMLButtonElement>('.etapa-btn').forEach((btn) => {
    const value = Number(btn.dataset.etapa) as Etapa;
    const active = etapa === value;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    btn.disabled = !isEtapaSelectableForPublic(value);
  });

  if (msg) {
    if (locked > 0) {
      msg.textContent = `Etapa travada: ${locked}a Etapa`;
    } else {
      msg.textContent = '';
    }
  }
}

function renderBranding(root: HTMLElement): void {
  const title = root.querySelector<HTMLElement>('#header-titulo');
  const logo = root.querySelector<HTMLImageElement>('#header-logo');
  if (title) title.textContent = getNomeEvento();

  const logoSrc = getLogo();
  if (logo) {
    if (logoSrc) {
      logo.src = logoSrc;
      logo.hidden = false;
    } else {
      logo.removeAttribute('src');
      logo.hidden = true;
    }
  }
}

export function renderHeader(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = template.trim();
  const root = wrapper.firstElementChild as HTMLElement;

  refreshHeaderHandler = () => {
    renderBranding(root);
    renderEtapaButtons(root);
  };

  root.querySelectorAll<HTMLButtonElement>('.etapa-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const etapa = Number(btn.dataset.etapa) as Etapa;
      if (!isEtapaSelectableForPublic(etapa)) return;
      setEtapaAtual(etapa);
      renderEtapaButtons(root);
      onEtapaChange?.(getEtapaPublica());
    });
  });

  refreshHeaderHandler();
  return root;
}
