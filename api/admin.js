const crypto = require('node:crypto');
const {
  dbGet,
  dbSet,
  sanitizeText,
  validateEtapa,
  applySecurityHeaders,
  isRateLimited,
  requireDirigenteAccess,
} = require('./_firebase');

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

function safeCompare(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

async function handleAdmin(req, res) {
  if (!requireDirigenteAccess(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (isRateLimited(req, 'admin:action', 15, 60_000)) {
    return res.status(429).json({ error: 'rate_limit_exceeded' });
  }

  const etapa = validateEtapa(req.body?.etapa || 1);
  const action = sanitizeText(req.body?.action, 40);
  const cfg = (await dbGet('config')) || {};

  if (action === 'reset_doacoes') {
    await dbSet(`doacoes/etapa${etapa}`, {});
    return res.status(200).json({ ok: true, etapa });
  }

  if (action === 'reset_itens') {
    cfg.itens = ITENS_DEFAULT;
    cfg.cats = CATS_DEFAULT;
    await dbSet('config', cfg);
    return res.status(200).json({ ok: true });
  }

  if (action === 'lock_etapa') {
    const lock = Number(req.body?.lock_etapa || 0);
    if (lock !== 0 && lock !== 1 && lock !== 2) {
      return res.status(400).json({ error: 'invalid_lock' });
    }
    cfg.etapa_locked = lock;
    await dbSet('config', cfg);
    return res.status(200).json({ ok: true, etapa_locked: lock });
  }

  if (action === 'change_password') {
    const role = sanitizeText(req.body?.password_role, 20);
    const current = String(req.body?.current_password || '');
    const next = String(req.body?.new_password || '');

    if (role !== 'coordenador' && role !== 'dirigente') {
      return res.status(400).json({ error: 'invalid_role' });
    }
    if (next.length < 4 || next.length > 80) {
      return res.status(400).json({ error: 'invalid_new_password' });
    }

    const dirPassword = cfg.senha_dir || DEFAULT_SENHA_DIR;
    if (!safeCompare(current, dirPassword)) {
      return res.status(401).json({ error: 'Senha do Dirigente incorreta.' });
    }

    if (role === 'coordenador') cfg.senha_coord = next;
    if (role === 'dirigente') cfg.senha_dir = next;
    await dbSet('config', cfg);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'invalid_action' });
}

module.exports = async function handler(req, res) {
  try {
    applySecurityHeaders(res);
    if (req.method === 'POST') return await handleAdmin(req, res);
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
};
