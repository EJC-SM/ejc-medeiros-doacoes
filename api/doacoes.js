const {
  dbGet,
  dbSet,
  sanitizeText,
  validateEtapa,
  applySecurityHeaders,
  isRateLimited,
  requireAdminAccess,
} = require('./_firebase');

function badRequest(res, message) {
  res.status(400).json({ error: message });
}

function validateItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('itens must be a non-empty array');
  }

  return itens.map((item) => {
    const nome = sanitizeText(item?.nome, 80);
    const unidade = sanitizeText(item?.unidade, 10);
    const quantidade = Number(item?.quantidade);

    if (!nome) throw new Error('item nome is required');
    if (!unidade) throw new Error('item unidade is required');
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 9999) {
      throw new Error('item quantidade must be integer between 1 and 9999');
    }

    return { nome, unidade, quantidade };
  });
}

async function listDoacoes(req, res) {
  const etapa = validateEtapa(req.query.etapa || 1);
  const raw = (await dbGet(`doacoes/etapa${etapa}`)) || {};
  const list = Object.values(raw);
  res.status(200).json({ etapa, data: list });
}

async function createDoacao(req, res) {
  if (isRateLimited(req, 'doacoes:create', 20, 60_000)) {
    return res.status(429).json({ error: 'rate_limit_exceeded' });
  }

  const etapa = validateEtapa(req.body?.etapa);
  const nome = sanitizeText(req.body?.nome, 80);
  const equipe = sanitizeText(req.body?.equipe, 60);
  const telefone = sanitizeText(req.body?.telefone, 20);
  const itens = validateItens(req.body?.itens);

  if (!nome) return badRequest(res, 'nome is required');
  if (!equipe) return badRequest(res, 'equipe is required');

  const raw = (await dbGet(`doacoes/etapa${etapa}`)) || {};
  const id = Date.now();
  const doacao = {
    id,
    nome,
    equipe,
    telefone,
    itens,
    data: new Date().toLocaleDateString('pt-BR'),
  };

  raw[String(id)] = doacao;
  await dbSet(`doacoes/etapa${etapa}`, raw);

  res.status(201).json({ etapa, data: doacao });
}

async function updateEntrega(req, res) {
  if (!requireAdminAccess(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (isRateLimited(req, 'doacoes:update', 30, 60_000)) {
    return res.status(429).json({ error: 'rate_limit_exceeded' });
  }

  const etapa = validateEtapa(req.body?.etapa);
  const id = String(Number(req.body?.id || 0));
  if (!id || id === '0' || id === 'NaN') return badRequest(res, 'id is required');

  const raw = (await dbGet(`doacoes/etapa${etapa}`)) || {};
  const found = raw[id];
  if (!found) return res.status(404).json({ error: 'doacao not found' });

  const entregue = req.body?.entregue;
  if (entregue == null) {
    delete found.entregue;
  } else {
    const data = sanitizeText(entregue.data, 10);
    const ocasiao = sanitizeText(entregue.ocasiao, 60);
    if (!data) return badRequest(res, 'entregue.data is required');
    found.entregue = { data, ocasiao };
  }

  raw[id] = found;
  await dbSet(`doacoes/etapa${etapa}`, raw);
  res.status(200).json({ etapa, data: found });
}

module.exports = async function handler(req, res) {
  try {
    applySecurityHeaders(res);

    if (req.method === 'GET') return await listDoacoes(req, res);
    if (req.method === 'POST') return await createDoacao(req, res);
    if (req.method === 'PUT') return await updateEntrega(req, res);

    res.setHeader('Allow', 'GET,POST,PUT');
    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
};
