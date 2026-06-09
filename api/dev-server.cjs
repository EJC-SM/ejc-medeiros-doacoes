const crypto = require('node:crypto');
const { parse: parseUrl } = require('node:url');
const { dbGet, dbSet, getClientFirebaseConfig, hasFirebaseConfig } = require('./firebase-rest.cjs');

const DEFAULT_SENHA_COORD = 'ejcdoacoes2025';
const DEFAULT_SENHA_DIR = 'Senh@ejc123!*';

const CATS_DEFAULT = [
  { id: 'secos', nome: '🌾 Alimentos Secos' },
  { id: 'condimentos', nome: '🫙 Óleos & Condimentos' },
  { id: 'frescos', nome: '🥚 Frescos & Frios' },
  { id: 'bebidas', nome: '🥤 Bebidas' },
  { id: 'higiene', nome: '🧴 Higiene & Limpeza' },
  { id: 'outros', nome: '📦 Outros' },
];

const ITENS_DEFAULT = [
  { nome: 'Arroz', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Feijão', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Macarrão', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Açúcar', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Óleo', unidade: 'L', meta: 0, cat: 'condimentos', visivel: true },
  { nome: 'Sal', unidade: 'kg', meta: 0, cat: 'condimentos', visivel: true },
  { nome: 'Café', unidade: 'g', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Farinha de trigo', unidade: 'kg', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Biscoito', unidade: 'pct', meta: 0, cat: 'secos', visivel: true },
  { nome: 'Leite', unidade: 'L', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Ovos', unidade: 'dz', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Frango', unidade: 'kg', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Carne bovina', unidade: 'kg', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Pão', unidade: 'un', meta: 0, cat: 'frescos', visivel: true },
  { nome: 'Refrigerante 2L', unidade: 'un', meta: 0, cat: 'bebidas', visivel: true },
  { nome: 'Suco', unidade: 'L', meta: 0, cat: 'bebidas', visivel: true },
  { nome: 'Água mineral', unidade: 'L', meta: 0, cat: 'bebidas', visivel: true },
  { nome: 'Papel higiênico', unidade: 'pct', meta: 0, cat: 'higiene', visivel: true },
  { nome: 'Sabão em pó', unidade: 'kg', meta: 0, cat: 'higiene', visivel: true },
  { nome: 'Detergente', unidade: 'un', meta: 0, cat: 'higiene', visivel: true },
];

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      if (chunks.length === 0) return resolve(null);
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        resolve(null);
      }
    });
  });
}

function sanitizeText(value, maxLen = 80) {
  return String(value || '')
    .replace(/[<>"']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function validateEtapa(value) {
  const etapa = Number(value);
  if (etapa !== 1 && etapa !== 2) throw new Error('etapa must be 1 or 2');
  return etapa;
}

function parseId(value) {
  const id = Number(value || 0);
  if (!Number.isInteger(id) || id <= 0) throw new Error('id is required');
  return id;
}

function getSessionSecret() {
  return process.env.ADMIN_API_TOKEN || process.env.SESSION_SECRET || 'ejc-dev-session-secret';
}

function ensureMemoryState() {
  const globalAny = globalThis;
  if (!globalAny.__ejcApiState) {
    globalAny.__ejcApiState = {
      config: {
        itens: [...ITENS_DEFAULT],
        cats: [...CATS_DEFAULT],
        equipes1: ['Apoio', 'Cozinha', 'Divulgação', 'Liturgia', 'Ordem', 'Sala', 'Secretaria'],
        equipes2: ['Apoio', 'Cozinha', 'Divulgação', 'Liturgia', 'Ordem', 'Sala', 'Secretaria'],
        recado1: '',
        recado2: '',
        nome_evento: 'EJC Medeiros — Doações',
        versiculo: '',
        versiculo_ref: '',
        pix_chave: 'financasejcmedeiros@gmail.com',
        pix_qr: '',
        logo: '',
        etapa_locked: 0,
        senha_coord: DEFAULT_SENHA_COORD,
        senha_dir: DEFAULT_SENHA_DIR,
      },
      doacoes: { 1: {}, 2: {} },
      sessions: new Map(),
    };
  }
  return globalAny.__ejcApiState;
}

function createSession(role, sessions) {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const payload = `${role}:${expiresAt}:${crypto.randomBytes(12).toString('hex')}`;
  const signature = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
  const token = `${Buffer.from(payload).toString('base64url')}.${signature}`;
  sessions.set(token, { role, expiresAt });
  return { token, expiresAt };
}

function verifySession(req, sessions) {
  const token = String(req.headers['x-admin-session'] || '');
  if (!token) return null;
  const cached = sessions.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const payload = Buffer.from(parts[0], 'base64url').toString('utf8');
  const expected = crypto.createHmac('sha256', getSessionSecret()).update(payload).digest('hex');
  if (expected !== parts[1]) return null;
  const [role, expiresAtRaw] = payload.split(':');
  const expiresAt = Number(expiresAtRaw);
  if (!role || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  const session = { role, expiresAt };
  sessions.set(token, session);
  return session;
}

function buildConfigPayload(cfg, etapa) {
  return {
    itens: cfg.itens || [],
    cats: cfg.cats || [],
    equipes: cfg[`equipes${etapa}`] || [],
    recado: cfg[`recado${etapa}`] || '',
    nome_evento: cfg.nome_evento || 'EJC Medeiros',
    versiculo: cfg.versiculo || '',
    versiculo_ref: cfg.versiculo_ref || '',
    pix_chave: cfg.pix_chave || '',
    pix_qr: cfg.pix_qr || '',
    logo: cfg.logo || '',
    etapa_locked: Number(cfg.etapa_locked || 0),
  };
}

function getConfigMutationFields(body) {
  const fields = [];
  if (Array.isArray(body?.itens)) fields.push('itens');
  if (Array.isArray(body?.cats)) fields.push('cats');
  if (Array.isArray(body?.equipes)) fields.push('equipes');
  if (typeof body?.recado === 'string') fields.push('recado');
  if (typeof body?.nome_evento === 'string') fields.push('nome_evento');
  if (typeof body?.versiculo === 'string') fields.push('versiculo');
  if (typeof body?.versiculo_ref === 'string') fields.push('versiculo_ref');
  if (typeof body?.pix_chave === 'string') fields.push('pix_chave');
  if (typeof body?.pix_qr === 'string') fields.push('pix_qr');
  if (typeof body?.logo === 'string') fields.push('logo');
  if (body?.etapa_locked != null) fields.push('etapa_locked');
  return fields;
}

function isRecadoOnlyConfigUpdate(body) {
  const fields = getConfigMutationFields(body);
  return fields.length === 1 && fields[0] === 'recado';
}

function canUpdateConfig(session, body) {
  if (!session) return false;
  if (isRecadoOnlyConfigUpdate(body)) {
    return session.role === 'coordenador' || session.role === 'dirigente';
  }
  return session.role === 'dirigente';
}

async function loadConfig(remote) {
  if (remote) {
    return (await dbGet('config')) || {};
  }
  return ensureMemoryState().config;
}

async function saveConfig(remote, cfg) {
  if (remote) {
    await dbSet('config', cfg);
    return cfg;
  }
  ensureMemoryState().config = cfg;
  return cfg;
}

async function loadDoacoesMap(remote, etapa) {
  if (remote) {
    return (await dbGet(`doacoes/etapa${etapa}`)) || {};
  }
  return ensureMemoryState().doacoes[etapa];
}

async function saveDoacoesMap(remote, etapa, raw) {
  if (remote) {
    await dbSet(`doacoes/etapa${etapa}`, raw);
    return raw;
  }
  ensureMemoryState().doacoes[etapa] = raw;
  return raw;
}

async function resolvePassword(remote, role, cfg) {
  if (role === 'coordenador') return cfg.senha_coord || DEFAULT_SENHA_COORD;
  if (role === 'dirigente') return cfg.senha_dir || DEFAULT_SENHA_DIR;
  return '';
}

function createDevApiMiddleware() {
  const remote = hasFirebaseConfig();
  const memory = ensureMemoryState();

  if (remote) {
    console.log(
      '[ejc-dev-api] Firebase remoto ativo — alteracoes vao para o banco configurado em FIREBASE_DATABASE_URL',
    );
    if (!process.env.FIREBASE_DATABASE_SECRET) {
      console.warn(
        '[ejc-dev-api] FIREBASE_DATABASE_SECRET ausente — escritas podem falhar se as rules bloquearem o client.',
      );
    }
  } else {
    console.warn(
      '[ejc-dev-api] Modo memoria local — preencha FIREBASE_* no .env para usar o banco de producao.',
    );
  }

  return async function devApiMiddleware(req, res, next) {
    const url = parseUrl(req.url || '', true);
    if (!url.pathname?.startsWith('/api/')) return next();

    try {
      if (url.pathname === '/api/health') {
        return json(res, 200, {
          ok: true,
          service: 'ejc-medeiros-doacoes-dev-api',
          storage: remote ? 'firebase' : 'memory',
          timestamp: new Date().toISOString(),
        });
      }

      if (url.pathname === '/api/runtime-config') {
        const firebase = getClientFirebaseConfig();
        if (!firebase) {
          return json(res, 500, { error: 'missing_firebase_env', local: true });
        }
        return json(res, 200, { firebase, remote: remote });
      }

      if (url.pathname === '/api/auth' && req.method === 'POST') {
        const body = await readBody(req);
        const role = sanitizeText(body?.role, 20);
        const password = String(body?.password || '');
        const cfg = await loadConfig(remote);
        const expected = await resolvePassword(remote, role, cfg);
        if (!expected || password !== expected) {
          return json(res, 401, { error: 'Senha incorreta.' });
        }
        const session = createSession(role, memory.sessions);
        return json(res, 200, { token: session.token, expiresAt: session.expiresAt });
      }

      if (url.pathname === '/api/doacoes' && req.method === 'GET') {
        const etapa = validateEtapa(url.query.etapa || 1);
        const raw = await loadDoacoesMap(remote, etapa);
        return json(res, 200, { etapa, data: Object.values(raw || {}) });
      }

      if (url.pathname === '/api/doacoes' && req.method === 'POST') {
        const body = await readBody(req);
        const etapa = validateEtapa(body?.etapa);
        const nome = sanitizeText(body?.nome, 80);
        const equipe = sanitizeText(body?.equipe, 60);
        const telefone = sanitizeText(body?.telefone, 20);
        const itens = Array.isArray(body?.itens) ? body.itens : [];
        if (!nome || !equipe || itens.length === 0) {
          return json(res, 400, { error: 'invalid payload' });
        }

        const raw = (await loadDoacoesMap(remote, etapa)) || {};
        const id = Date.now();
        const doacao = {
          id,
          nome,
          equipe,
          telefone,
          itens: itens.map((item) => ({
            nome: sanitizeText(item?.nome, 80),
            unidade: sanitizeText(item?.unidade, 10),
            quantidade: Number(item?.quantidade || 0),
          })),
          data: new Date().toLocaleDateString('pt-BR'),
        };
        raw[String(id)] = doacao;
        await saveDoacoesMap(remote, etapa, raw);
        return json(res, 201, { etapa, data: doacao });
      }

      if (url.pathname === '/api/doacoes' && req.method === 'PUT') {
        if (!verifySession(req, memory.sessions)) return json(res, 401, { error: 'unauthorized' });
        const body = await readBody(req);
        const etapa = validateEtapa(body?.etapa);
        const id = String(parseId(body?.id));
        const raw = (await loadDoacoesMap(remote, etapa)) || {};
        const found = raw[id];
        if (!found) return json(res, 404, { error: 'doacao not found' });

        if (body?.entregue == null) {
          delete found.entregue;
        } else {
          found.entregue = {
            data: sanitizeText(body?.entregue?.data, 10),
            ocasiao: sanitizeText(body?.entregue?.ocasiao, 60),
          };
        }
        raw[id] = found;
        await saveDoacoesMap(remote, etapa, raw);
        return json(res, 200, { etapa, data: found });
      }

      if (url.pathname === '/api/config' && req.method === 'GET') {
        const etapa = validateEtapa(url.query.etapa || 1);
        const cfg = await loadConfig(remote);
        return json(res, 200, { etapa, data: buildConfigPayload(cfg, etapa) });
      }

      if (url.pathname === '/api/config' && req.method === 'PUT') {
        const body = await readBody(req);
        const session = verifySession(req, memory.sessions);
        if (!canUpdateConfig(session, body)) return json(res, 401, { error: 'unauthorized' });
        const etapa = validateEtapa(body?.etapa || 1);
        const cfg = await loadConfig(remote);

        if (Array.isArray(body?.itens)) {
          cfg.itens = body.itens
            .map((item) => ({
              nome: sanitizeText(item?.nome, 80),
              unidade: sanitizeText(item?.unidade, 10),
              visivel: item?.visivel !== false,
              meta: Math.max(0, Number(item?.meta || 0)),
              cat: sanitizeText(item?.cat, 40),
            }))
            .filter((item) => item.nome && item.unidade);
        }
        if (Array.isArray(body?.cats)) {
          cfg.cats = body.cats
            .map((cat) => ({
              id: sanitizeText(cat?.id, 40),
              nome: sanitizeText(cat?.nome, 80),
            }))
            .filter((cat) => cat.id && cat.nome);
        }
        if (Array.isArray(body?.equipes)) {
          cfg[`equipes${etapa}`] = body.equipes.map((value) => sanitizeText(value, 60)).filter(Boolean);
        }
        if (typeof body?.recado === 'string') cfg[`recado${etapa}`] = sanitizeText(body.recado, 400);
        if (typeof body?.nome_evento === 'string') cfg.nome_evento = sanitizeText(body.nome_evento, 80);
        if (typeof body?.versiculo === 'string') cfg.versiculo = sanitizeText(body.versiculo, 400);
        if (typeof body?.versiculo_ref === 'string') cfg.versiculo_ref = sanitizeText(body.versiculo_ref, 80);
        if (typeof body?.pix_chave === 'string') cfg.pix_chave = sanitizeText(body.pix_chave, 120);
        if (typeof body?.pix_qr === 'string') cfg.pix_qr = String(body.pix_qr).slice(0, 500000);
        if (typeof body?.logo === 'string') cfg.logo = String(body.logo).slice(0, 500000);
        if (body?.etapa_locked != null) {
          const lock = Number(body.etapa_locked);
          if (lock === 0 || lock === 1 || lock === 2) cfg.etapa_locked = lock;
        }

        await saveConfig(remote, cfg);
        return json(res, 200, { etapa, data: buildConfigPayload(cfg, etapa) });
      }

      if (url.pathname === '/api/admin' && req.method === 'POST') {
        const session = verifySession(req, memory.sessions);
        if (!session || session.role !== 'dirigente') return json(res, 401, { error: 'unauthorized' });
        const body = await readBody(req);
        const etapa = validateEtapa(body?.etapa || 1);
        const action = sanitizeText(body?.action, 40);
        const cfg = await loadConfig(remote);

        if (action === 'reset_doacoes') {
          await saveDoacoesMap(remote, etapa, {});
          return json(res, 200, { ok: true, etapa });
        }
        if (action === 'reset_itens') {
          cfg.itens = [...ITENS_DEFAULT];
          cfg.cats = [...CATS_DEFAULT];
          await saveConfig(remote, cfg);
          return json(res, 200, { ok: true });
        }
        if (action === 'lock_etapa') {
          const lock = Number(body?.lock_etapa || 0);
          if (lock !== 0 && lock !== 1 && lock !== 2) return json(res, 400, { error: 'invalid_lock' });
          cfg.etapa_locked = lock;
          await saveConfig(remote, cfg);
          return json(res, 200, { ok: true, etapa_locked: lock });
        }
        if (action === 'change_password') {
          const role = sanitizeText(body?.password_role, 20);
          const current = String(body?.current_password || '');
          const next = String(body?.new_password || '');
          if (next.length < 4) return json(res, 400, { error: 'invalid_new_password' });
          if (current !== (cfg.senha_dir || DEFAULT_SENHA_DIR)) {
            return json(res, 401, { error: 'Senha do Dirigente incorreta.' });
          }
          if (role === 'coordenador') cfg.senha_coord = next;
          if (role === 'dirigente') cfg.senha_dir = next;
          await saveConfig(remote, cfg);
          return json(res, 200, { ok: true });
        }
        return json(res, 400, { error: 'invalid_action' });
      }

      return json(res, 404, { error: 'not_found' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'internal_error';
      return json(res, 500, { error: 'internal_error', detail: message });
    }
  };
}

module.exports = { createDevApiMiddleware, hasFirebaseConfig };
