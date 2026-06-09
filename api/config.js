const {
  dbGet,
  dbSet,
  sanitizeText,
  validateEtapa,
  applySecurityHeaders,
  isRateLimited,
  requireDirigenteAccess,
  requireConfigUpdateAccess,
} = require('./_firebase');

function badRequest(res, message) {
  res.status(400).json({ error: message });
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

async function getConfig(req, res) {
  const etapa = validateEtapa(req.query.etapa || 1);
  const cfg = (await dbGet('config')) || {};
  res.status(200).json({
    etapa,
    data: buildConfigPayload(cfg, etapa),
  });
}

async function updateConfig(req, res) {
  if (!requireConfigUpdateAccess(req, req.body)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (isRateLimited(req, 'config:update', 20, 60_000)) {
    return res.status(429).json({ error: 'rate_limit_exceeded' });
  }

  const etapa = validateEtapa(req.body?.etapa || 1);
  const cfg = (await dbGet('config')) || {};

  if (Array.isArray(req.body?.itens)) {
    cfg.itens = req.body.itens
      .map((item) => ({
        nome: sanitizeText(item?.nome, 80),
        unidade: sanitizeText(item?.unidade, 10),
        visivel: item?.visivel !== false,
        meta: Math.max(0, Math.min(99999, Number(item?.meta || 0))),
        cat: sanitizeText(item?.cat, 40),
      }))
      .filter((item) => item.nome && item.unidade);
  }

  if (Array.isArray(req.body?.cats)) {
    cfg.cats = req.body.cats
      .map((cat) => ({
        id: sanitizeText(cat?.id, 40),
        nome: sanitizeText(cat?.nome, 80),
      }))
      .filter((cat) => cat.id && cat.nome);
  }

  if (Array.isArray(req.body?.equipes)) {
    cfg[`equipes${etapa}`] = req.body.equipes.map((value) => sanitizeText(value, 60)).filter(Boolean);
  }

  if (typeof req.body?.recado === 'string') {
    cfg[`recado${etapa}`] = sanitizeText(req.body.recado, 400);
  }

  if (typeof req.body?.nome_evento === 'string') {
    cfg.nome_evento = sanitizeText(req.body.nome_evento, 80);
  }
  if (typeof req.body?.versiculo === 'string') {
    cfg.versiculo = sanitizeText(req.body.versiculo, 400);
  }
  if (typeof req.body?.versiculo_ref === 'string') {
    cfg.versiculo_ref = sanitizeText(req.body.versiculo_ref, 80);
  }
  if (typeof req.body?.pix_chave === 'string') {
    cfg.pix_chave = sanitizeText(req.body.pix_chave, 120);
  }
  if (typeof req.body?.pix_qr === 'string') {
    cfg.pix_qr = String(req.body.pix_qr).slice(0, 500000);
  }
  if (typeof req.body?.logo === 'string') {
    cfg.logo = String(req.body.logo).slice(0, 500000);
  }
  if (req.body?.etapa_locked != null) {
    const lock = Number(req.body.etapa_locked);
    if (lock === 0 || lock === 1 || lock === 2) cfg.etapa_locked = lock;
  }

  await dbSet('config', cfg);
  res.status(200).json({ etapa, data: buildConfigPayload(cfg, etapa) });
}

module.exports = async function handler(req, res) {
  try {
    applySecurityHeaders(res);

    if (req.method === 'GET') return await getConfig(req, res);
    if (req.method === 'PUT') return await updateConfig(req, res);

    res.setHeader('Allow', 'GET,PUT');
    return res.status(405).json({ error: 'method_not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'internal_error', detail: err.message });
  }
};
