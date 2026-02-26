const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedSupabaseModule = null;

const loadSupabaseModule = async () => {
    if (cachedSupabaseModule) {
        return cachedSupabaseModule;
    }

    try {
        cachedSupabaseModule = require('@supabase/supabase-js');
        return cachedSupabaseModule;
    } catch (err) {
        if (err && err.code === 'ERR_REQUIRE_ESM') {
            const mod = await import('@supabase/supabase-js');
            cachedSupabaseModule = mod;
            return mod;
        }
        throw err;
    }
};

const getCreateClient = async () => {
    const mod = await loadSupabaseModule();
    const createClient = mod.createClient || (mod.default && mod.default.createClient);
    if (!createClient) {
        throw new Error('createClient nao encontrado no modulo Supabase.');
    }
    return createClient;
};

const createSupabaseClient = async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return null;
    }

    const createClient = await getCreateClient();
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
};

const normalize = (value) => {
    if (typeof value !== 'string') {
        return '';
    }
    return value.trim();
};

const sanitizePhone = (value) => value.replace(/\D/g, '');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    let supabase = null;
    try {
        supabase = await createSupabaseClient();
    } catch (err) {
        console.error('[farm-lead] Falha ao iniciar Supabase', err);
        res.status(500).json({ error: 'Falha ao iniciar o servico.' });
        return;
    }

    if (!supabase) {
        res.status(500).json({ error: 'Supabase nao configurado.' });
        return;
    }

    const body = req.body && typeof req.body === 'object'
        ? req.body
        : (() => {
            try {
                return JSON.parse(req.body || '{}');
            } catch {
                return {};
            }
        })();

    const nome = normalize(body.nome);
    const telefone = normalize(body.telefone);
    const cidade = normalize(body.cidade);
    const estado = normalize(body.estado).toUpperCase();
    const formType = normalize(body.form_type) || 'unknown';

    if (!nome || !telefone || !cidade || !estado) {
        res.status(400).json({ error: 'Preencha todos os campos obrigatorios.' });
        return;
    }

    if (sanitizePhone(telefone).length < 10) {
        res.status(400).json({ error: 'Informe um telefone valido.' });
        return;
    }

    const ipAddress = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    const { error } = await supabase
        .from('farm_page_leads')
        .insert({
            form_type: formType,
            nome,
            telefone,
            cidade,
            estado,
            page: 'farm_page',
            ip_address: ipAddress,
            user_agent: userAgent
        });

    if (error) {
        console.error('[farm-lead] Falha ao salvar lead no Supabase', error);
        res.status(500).json({ error: 'Falha ao salvar os dados.' });
        return;
    }

    res.status(200).json({ ok: true });
};
