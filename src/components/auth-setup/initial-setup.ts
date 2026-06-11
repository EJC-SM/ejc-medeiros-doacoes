import type { AuthSetupStatus } from '../../state/api';
import { initialSetupApi } from '../../state/api';
import { setButtonContent } from '../../utils/icons';
import { hashForStorage, validatePasswordPolicy } from '../../utils/password-auth';

function setMessage(el: HTMLElement, text: string, ok: boolean): void {
  el.textContent = text;
  el.className = ok ? 'setup-ok' : 'setup-err';
}

export function mountInitialSetup(
  container: HTMLElement,
  status: AuthSetupStatus,
  onComplete: () => void,
): void {
  container.replaceChildren();

  const card = document.createElement('section');
  card.className = 'setup-card';
  card.setAttribute('aria-labelledby', 'setup-title');

  card.innerHTML = `
    <h1 id="setup-title">Configuracao inicial de senhas</h1>
    <p class="setup-lead">
      Primeiro acesso apos o deploy. Defina as senhas do Coordenador e do Dirigente.
      Somente derivados criptograficos sao enviados — nunca a senha em texto.
    </p>
    <label for="setup-token">Token de setup (AUTH_SETUP_TOKEN)</label>
    <input id="setup-token" type="password" autocomplete="off" maxlength="200" />
    <fieldset class="setup-fieldset">
      <legend>Coordenador</legend>
      <label for="setup-coord-pass">Senha</label>
      <input id="setup-coord-pass" type="password" autocomplete="new-password" maxlength="80" />
      <label for="setup-coord-confirm">Confirmar senha</label>
      <input id="setup-coord-confirm" type="password" autocomplete="new-password" maxlength="80" />
    </fieldset>
    <fieldset class="setup-fieldset">
      <legend>Dirigente</legend>
      <label for="setup-dir-pass">Senha</label>
      <input id="setup-dir-pass" type="password" autocomplete="new-password" maxlength="80" />
      <label for="setup-dir-confirm">Confirmar senha</label>
      <input id="setup-dir-confirm" type="password" autocomplete="new-password" maxlength="80" />
    </fieldset>
    <p id="setup-feedback" role="status" aria-live="polite"></p>
    <button id="setup-submit" type="button" class="btn btn--filled btn--block">
      <span class="icon material-symbols-outlined" aria-hidden="true">done_all</span>
      Concluir setup inicial
    </button>
  `;

  container.appendChild(card);

  const feedback = card.querySelector<HTMLElement>('#setup-feedback')!;
  const submit = card.querySelector<HTMLButtonElement>('#setup-submit')!;

  submit.addEventListener('click', () => {
    void (async () => {
      const token = (card.querySelector('#setup-token') as HTMLInputElement).value.trim();
      const coordPass = (card.querySelector('#setup-coord-pass') as HTMLInputElement).value;
      const coordConfirm = (card.querySelector('#setup-coord-confirm') as HTMLInputElement).value;
      const dirPass = (card.querySelector('#setup-dir-pass') as HTMLInputElement).value;
      const dirConfirm = (card.querySelector('#setup-dir-confirm') as HTMLInputElement).value;

      if (!token) {
        setMessage(feedback, 'Informe o token de setup.', false);
        return;
      }

      for (const [pass, label] of [
        [coordPass, 'Coordenador'],
        [dirPass, 'Dirigente'],
      ] as const) {
        const policyError = validatePasswordPolicy(pass);
        if (policyError) {
          setMessage(feedback, `${label}: ${policyError}`, false);
          return;
        }
      }

      if (coordPass !== coordConfirm) {
        setMessage(feedback, 'Senhas do Coordenador nao conferem.', false);
        return;
      }
      if (dirPass !== dirConfirm) {
        setMessage(feedback, 'Senhas do Dirigente nao conferem.', false);
        return;
      }

      const salts = status.salts;
      if (!salts?.coord || !salts?.dir) {
        setMessage(feedback, 'Salts indisponiveis. Recarregue a pagina.', false);
        return;
      }

      submit.disabled = true;
      setButtonContent(submit, { icon: 'hourglass_top', label: 'Gerando hashes...' });

      const [coordHash, dirHash] = await Promise.all([
        hashForStorage(coordPass, salts.coord, status.iterations),
        hashForStorage(dirPass, salts.dir, status.iterations),
      ]);

      if (!coordHash || !dirHash) {
        setMessage(feedback, 'Nao foi possivel gerar os hashes.', false);
        submit.disabled = false;
        setButtonContent(submit, { icon: 'done_all', label: 'Concluir setup inicial' });
        return;
      }

      const result = await initialSetupApi(coordHash, dirHash, token);
      submit.disabled = false;
      setButtonContent(submit, { icon: 'done_all', label: 'Concluir setup inicial' });

      if (!result.ok) {
        const msg =
          result.error === 'invalid_setup_token'
            ? 'Token de setup invalido.'
            : result.error === 'setup_already_completed'
              ? 'Setup ja foi concluido.'
              : 'Falha no setup inicial.';
        setMessage(feedback, msg, false);
        return;
      }

      setMessage(feedback, 'Setup concluido. Carregando aplicativo...', true);
      onComplete();
    })();
  });
}
