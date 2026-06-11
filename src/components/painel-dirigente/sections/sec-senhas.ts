import { changePasswordApi, fetchAuthSetupStatus } from '../../../state/api';
import type { AuthRole } from '../../../state/types';
import { getEmbeddedDirigenteAuthHeaders } from '../../../utils/auth';
import { setButtonContent } from '../../../utils/icons';
import { fetchAuthChallenge, hashForStorage, validatePasswordPolicy } from '../../../utils/password-auth';
import { toastError, toastSuccess, toastWarning } from '../../../utils/toast';

function formatUpdatedAt(value: string | null): string {
  if (!value) return 'Ainda nao definida';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return value;
  }
}

function buildPasswordForm(role: AuthRole, label: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'dir-password-form';

  const title = document.createElement('h4');
  title.textContent = label;

  const meta = document.createElement('p');
  meta.className = 'dir-password-meta';
  meta.dataset.roleMeta = role;

  const newLabel = document.createElement('label');
  newLabel.htmlFor = `dir-new-pass-${role}`;
  newLabel.textContent = 'Nova senha';

  const newInput = document.createElement('input');
  newInput.type = 'password';
  newInput.id = `dir-new-pass-${role}`;
  newInput.maxLength = 80;
  newInput.autocomplete = 'new-password';

  const confirmLabel = document.createElement('label');
  confirmLabel.htmlFor = `dir-confirm-pass-${role}`;
  confirmLabel.textContent = 'Confirmar nova senha';

  const confirmInput = document.createElement('input');
  confirmInput.type = 'password';
  confirmInput.id = `dir-confirm-pass-${role}`;
  confirmInput.maxLength = 80;
  confirmInput.autocomplete = 'new-password';

  const error = document.createElement('p');
  error.className = 'dir-err';
  error.hidden = true;
  error.setAttribute('role', 'alert');

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn btn--filled';
  save.disabled = true;
  setButtonContent(save, { icon: 'key', label: 'Salvar nova senha' });

  const syncSaveState = (): void => {
    save.disabled = !newInput.value.trim() || !confirmInput.value.trim();
  };
  newInput.addEventListener('input', syncSaveState);
  confirmInput.addEventListener('input', syncSaveState);

  save.addEventListener('click', () => {
    void (async () => {
      error.hidden = true;
      const next = newInput.value;
      const confirm = confirmInput.value;
      const policyError = validatePasswordPolicy(next);
      if (policyError) {
        error.textContent = policyError;
        error.hidden = false;
        toastWarning(policyError);
        return;
      }
      if (next !== confirm) {
        error.textContent = 'As senhas nao conferem.';
        error.hidden = false;
        toastWarning('As senhas nao conferem.');
        return;
      }

      save.disabled = true;
      setButtonContent(save, { icon: 'hourglass_top', label: 'Gerando hash...' });

      const challenge = await fetchAuthChallenge(role);
      if (!challenge?.salt) {
        error.textContent = 'Nao foi possivel preparar a troca de senha.';
        error.hidden = false;
        toastError('Nao foi possivel preparar a troca de senha.');
        save.disabled = false;
        setButtonContent(save, { icon: 'key', label: 'Salvar nova senha' });
        return;
      }

      const passwordHash = await hashForStorage(next, challenge.salt, challenge.iterations);
      if (!passwordHash) {
        error.textContent = 'Senha invalida.';
        error.hidden = false;
        toastError('Senha invalida.');
        save.disabled = false;
        setButtonContent(save, { icon: 'key', label: 'Salvar nova senha' });
        return;
      }

      const ok = await changePasswordApi(role, passwordHash, getEmbeddedDirigenteAuthHeaders());
      save.disabled = false;
      setButtonContent(save, { icon: 'key', label: 'Salvar nova senha' });

      if (!ok) {
        error.textContent = 'Nao foi possivel alterar a senha.';
        error.hidden = false;
        toastError('Nao foi possivel alterar a senha.');
        return;
      }

      newInput.value = '';
      confirmInput.value = '';
      syncSaveState();
      toastSuccess(`Senha do ${role === 'coordenador' ? 'Coordenador' : 'Dirigente'} atualizada.`);
      const status = await fetchAuthSetupStatus();
      if (status) {
        meta.textContent =
          role === 'coordenador'
            ? `Coord atualizado em ${formatUpdatedAt(status.coordUpdatedAt)}`
            : `Dir atualizado em ${formatUpdatedAt(status.dirUpdatedAt)}`;
      }
    })();
  });

  wrap.appendChild(title);
  wrap.appendChild(meta);
  wrap.appendChild(newLabel);
  wrap.appendChild(newInput);
  wrap.appendChild(confirmLabel);
  wrap.appendChild(confirmInput);
  wrap.appendChild(error);
  wrap.appendChild(save);
  return wrap;
}

export async function mountSecSenhas(host: HTMLElement): Promise<void> {
  host.replaceChildren();

  const intro = document.createElement('p');
  intro.className = 'dir-password-intro';
  intro.textContent =
    'Redefina as senhas quando trocar o casal coordenador ou por rotina de seguranca. Apenas o derivado criptografico e enviado ao servidor.';

  host.appendChild(intro);
  host.appendChild(buildPasswordForm('coordenador', 'Senha do Coordenador'));
  host.appendChild(buildPasswordForm('dirigente', 'Senha do Dirigente'));

  const status = await fetchAuthSetupStatus();
  if (!status) return;

  host.querySelectorAll<HTMLElement>('[data-role-meta]').forEach((el) => {
    const role = el.dataset.roleMeta as AuthRole;
    el.textContent =
      role === 'coordenador'
        ? `Coord atualizado em ${formatUpdatedAt(status.coordUpdatedAt)}`
        : `Dir atualizado em ${formatUpdatedAt(status.dirUpdatedAt)}`;
  });
}
