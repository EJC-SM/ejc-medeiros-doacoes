import type { AuthRole } from '../state/types';

interface LoginGateOptions {
  role: AuthRole;
  title: string;
  description: string;
  onSuccess: () => void;
  loginFn?: (password: string) => Promise<{ ok: boolean; message?: string }>;
}

export function renderLoginGate(options: LoginGateOptions): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'login-gate';

  const card = document.createElement('section');
  card.className = 'login-card';
  card.setAttribute('aria-labelledby', `login-title-${options.role}`);

  const title = document.createElement('h3');
  title.id = `login-title-${options.role}`;
  title.textContent = options.title;

  const desc = document.createElement('p');
  desc.textContent = options.description;

  const label = document.createElement('label');
  label.className = 'sr-only';
  label.htmlFor = `login-password-${options.role}`;
  label.textContent = 'Senha';

  const input = document.createElement('input');
  input.type = 'password';
  input.id = `login-password-${options.role}`;
  input.autocomplete = 'current-password';
  input.maxLength = 80;

  const error = document.createElement('p');
  error.className = 'login-error';
  error.setAttribute('role', 'alert');
  error.hidden = true;

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.textContent = 'Entrar';

  const attempt = async (): Promise<void> => {
    error.hidden = true;
    submit.disabled = true;
    const previousLabel = submit.textContent;
    submit.textContent = 'Autenticando...';
    const login =
      options.loginFn ??
      (async (password: string) => {
        const { loginApi } = await import('../utils/auth');
        return loginApi(options.role, password);
      });
    const result = await login(input.value);
    submit.disabled = false;
    submit.textContent = previousLabel || 'Entrar';
    if (!result.ok) {
      error.textContent = result.message || 'Credenciais invalidas.';
      error.hidden = false;
      return;
    }
    options.onSuccess();
  };

  submit.addEventListener('click', () => {
    void attempt();
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void attempt();
    }
  });

  card.appendChild(title);
  card.appendChild(desc);
  card.appendChild(label);
  card.appendChild(input);
  card.appendChild(error);
  card.appendChild(submit);
  wrap.appendChild(card);
  return wrap;
}

export function renderLogoutBar(role: AuthRole, onLogout: () => void): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'panel-toolbar';

  const label = document.createElement('span');
  label.textContent = role === 'coordenador' ? 'Coordenador autenticado' : 'Dirigente autenticado';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Sair';
  btn.addEventListener('click', () => {
    void import('../utils/auth').then(({ logout }) => {
      logout(role);
      onLogout();
    });
  });

  bar.appendChild(label);
  bar.appendChild(btn);
  return bar;
}
