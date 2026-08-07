// Configuração do Supabase - SUAS CREDENCIAIS
const SUPABASE_URL = 'https://kpkyykfwtjwtyvhraynt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AcK1pnSmzSzkf4WhsFCesA_TUb9kUmB';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let usuarioJaTestou = false;

async function verificarUsuarioExistente(telefone) {
    const { data, error } = await supabaseClient
        .from('ranking')
        .select('telefone')
        .eq('telefone', telefone)
        .single();
    return data ? true : false;
}

async function salvarNoRanking(nome, telefone, forca, tempo) {
    try {
        const { error } = await supabaseClient
            .from('ranking')
            .upsert({
                nome: nome,
                telefone: telefone,
                forca: forca,
                tempo_estimado: tempo,
                timestamp: new Date().toISOString()
            }, { onConflict: 'telefone' });
        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Erro ao salvar:', error);
        return false;
    }
}

async function carregarRanking() {
    try {
        const { data, error } = await supabaseClient
            .from('ranking')
            .select('*')
            .order('forca', { ascending: false })
            .order('timestamp', { ascending: false })
            .limit(20);
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ranking:', error);
        return [];
    }
}

console.log('🔗 Supabase conectado!');