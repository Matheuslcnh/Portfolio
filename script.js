class SenhaSegura {
    constructor() {
        this.personalData = {};
        this.tempoAnalise = 0;
        this.forcaFinal = 0;
        this.init();
    }

    async init() {
        this.initTabs();
        this.initForms();
        this.initPasswordToggle();
        await this.verificarUsuarioExistente();
        this.carregarRankingVisual(); // Carrega ranking inicial
    }

    initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById('personalInfoSection').classList.remove('active');
                document.getElementById('passwordSection').classList.remove('active');
                
                e.target.classList.add('active');
                document.getElementById(tab).classList.add('active');
            });
        });

        document.getElementById('refreshRanking').addEventListener('click', () => {
            this.carregarRankingVisual();
        });
    }

    async verificarUsuarioExistente() {
        const telefone = localStorage.getItem('telefone');
        if (telefone) {
            const existe = await verificarUsuarioExistente(telefone);
            if (existe) {
                // Marca como já testou e desabilita senha
                window.usuarioJaTestou = true;
                const subtitle = document.querySelector('#passwordSection .subtitle');
                if (subtitle) {
                    subtitle.innerHTML = 'Você já testou hoje! <strong>Resultado no ranking ➡️</strong>';
                }
                document.getElementById('senha').disabled = true;
                document.querySelector('#passwordForm button[type="submit"]').disabled = true;
            }
        }
    }

    initForms() {
        document.getElementById('personalForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.collectPersonalData();
        });

        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (window.usuarioJaTestou) {
                alert('Você já testou hoje! Veja seu resultado no ranking.');
                return;
            }
            await this.analisarSenha();
        });
    }

    async collectPersonalData() {
        this.personalData = {
            nome: document.getElementById('nome').value.trim(),
            telefone: document.getElementById('telefone').value.trim()
        };

        // Validação básica
        if (!this.personalData.nome || !this.personalData.telefone) {
            alert('Preencha todos os campos!');
            return;
        }

        localStorage.setItem('telefone', this.personalData.telefone);
        
        // Trocar seção com animação
        document.getElementById('personalInfoSection').classList.remove('active');
        setTimeout(() => {
            document.getElementById('passwordSection').classList.add('active');
        }, 300);
    }

    initPasswordToggle() {
        document.getElementById('showPassword').addEventListener('click', () => {
            const senhaInput = document.getElementById('senha');
            const showBtn = document.getElementById('showPassword');
            
            senhaInput.type = senhaInput.type === 'password' ? 'text' : 'password';
            showBtn.textContent = senhaInput.type === 'password' ? '👁️' : '🙈';
        });
    }

    async analisarSenha() {
        const senha = document.getElementById('senha').value;
        if (!senha) {
            alert('Digite sua senha!');
            return;
        }

        const resultados = document.getElementById('resultados');
        
        // Análise completa
        const analise = this.analisarCaracteristicas(senha);
        const tempoBase = this.calcularTempoBase(senha);
        const tempoEngenhariaSocial = this.aplicarEngenhariaSocial(senha, tempoBase);
        this.forcaFinal = this.calcularForca(analise, tempoEngenhariaSocial);
        this.tempoAnalise = tempoEngenhariaSocial;
        
        // Salvar no Supabase
        const salvo = await salvarNoRanking(
            this.personalData.nome, 
            this.personalData.telefone, 
            this.forcaFinal,
            this.formatarTempo(tempoEngenhariaSocial)
        );

        if (salvo) {
            window.usuarioJaTestou = true;
            this.carregarRankingVisual(); // Atualiza ranking automaticamente
        }

        this.mostrarResultados(analise, tempoEngenhariaSocial);
        resultados.classList.remove('hidden');
        
        // Scroll suave para resultados
        resultados.scrollIntoView({ behavior: 'smooth' });
    }

    analisarCaracteristicas(senha) {
        const analise = {
            comprimento: senha.length,
            maiuscula: /[A-Z]/.test(senha),
            minuscula: /[a-z]/.test(senha),
            numero: /\d/.test(senha),
            simbolo: /[^a-zA-Z0-9]/.test(senha),
            repeticoes: (senha.length - new Set(senha).size),
            palavrasComuns: this.verificarPalavrasComuns(senha),
            infoPessoal: this.verificarInfoPessoal(senha)
        };
        return analise;
    }

    verificarPalavrasComuns(senha) {
        const comuns = ['123456', 'password', '123123', 'qwerty', 'abc123', 'admin', 'senha'];
        return comuns.some(palavra => senha.toLowerCase().includes(palavra));
    }

    verificarInfoPessoal(senha) {
        if (!this.personalData.nome) return false;
        const senhaLower = senha.toLowerCase();
        const nomeLower = this.personalData.nome.toLowerCase().replace(/\s+/g, '');
        return senhaLower.includes(nomeLower.slice(0, 6));
    }

    calcularTempoBase(senha) {
        let possibilidades = 1;
        const charset = { minus: 26, maius: 26, num: 10, sym: 32 };
        
        if (/[a-z]/.test(senha)) possibilidades *= charset.minus;
        if (/[A-Z]/.test(senha)) possibilidades *= charset.maius;
        if (/\d/.test(senha)) possibilidades *= charset.num;
        if (/[^a-zA-Z0-9]/.test(senha)) possibilidades *= charset.sym;

        return Math.pow(possibilidades, senha.length) / 1e11;
    }

    aplicarEngenhariaSocial(senha, tempoBase) {
        let tempo = tempoBase;
        if (this.verificarInfoPessoal(senha)) tempo *= 0.01;
        if (this.verificarPalavrasComuns(senha)) tempo *= 0.1;
        return Math.max(1, tempo);
    }

    calcularForca(analise, tempo) {
        let score = 0;
        score += Math.min(analise.comprimento * 4, 20);
        if (analise.maiuscula) score += 10;
        if (analise.minuscula) score += 10;
        if (analise.numero) score += 15;
        if (analise.simbolo) score += 15;
        if (analise.repeticoes > 0) score -= analise.repeticoes * 5;
        if (analise.palavrasComuns) score -= 20;
        if (analise.infoPessoal) score -= 30;
        return Math.max(0, Math.min(100, score));
    }

    formatarTempo(segundos) {
        if (segundos < 60) return `${Math.round(segundos)}s`;
        if (segundos < 3600) return `${Math.round(segundos/60)}min`;
        if (segundos < 86400) return `${Math.round(segundos/3600)}h`;
        if (segundos < 31536000) return `${Math.round(segundos/86400/365)}anos`;
        return '> 1 século';
    }

    mostrarResultados(analise, tempoSegundos) {
        const forca = this.forcaFinal;
        const tempoFormatado = this.formatarTempo(tempoSegundos);

        // Strength meter
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        
        strengthFill.style.width = `${forca}%`;
        strengthFill.style.background = forca < 40 ? '#ff6b6b' : forca < 70 ? '#ffd93d' : '#51cf66';
        strengthText.textContent = forca < 40 ? '🚨 FRACA' : forca < 70 ? '⚠️ MÉDIA' : '🛡️ FORTE';

        document.getElementById('tempoHacker').textContent = tempoFormatado;
        this.mostrarAnalise(analise);
        this.mostrarSugestoes(analise, forca);
    }

    mostrarAnalise(analise) {
        const lista = document.getElementById('analiseLista');
        lista.innerHTML = '';

        const itens = [
            { check: analise.comprimento >= 12, text: `Comprimento ${analise.comprimento}`, class: analise.comprimento >= 12 ? 'sucesso' : 'erro' },
            { check: analise.maiuscula, text: 'Maiúsculas ✓', class: analise.maiuscula ? 'sucesso' : 'erro' },
            { check: analise.numero, text: 'Números ✓', class: analise.numero ? 'sucesso' : 'erro' },
            { check: analise.simbolo, text: 'Símbolos ✓', class: analise.simbolo ? 'sucesso' : 'erro' },
            { check: !analise.infoPessoal, text: 'Sem dados pessoais', class: analise.infoPessoal ? 'erro' : 'sucesso' }
        ];

        itens.forEach(item => {
            const div = document.createElement('div');
            div.className = `analise-item ${item.class}`;
            div.innerHTML = item.check ? '✅ ' + item.text : '❌ ' + item.text;
            lista.appendChild(div);
        });
    }

    mostrarSugestoes(analise, forca) {
        const lista = document.getElementById('sugestoesLista');
        lista.innerHTML = '';

        const sugestoes = [];
        if (analise.comprimento < 12) sugestoes.push('• 12+ caracteres');
        if (!analise.maiuscula) sugestoes.push('• Letras MAIÚSCULAS');
        if (!analise.simbolo) sugestoes.push('• Símbolos (!@#$%)');
        if (analise.infoPessoal) sugestoes.push('• NUNCA use nome/pet');

        if (sugestoes.length === 0) {
            lista.innerHTML = '<div class="sugestao-item sucesso">🎉 Perfeita! Hacker nunca quebra!</div>';
        } else {
            sugestoes.forEach(s => {
                const div = document.createElement('div');
                div.className = 'sugestao-item';
                div.innerHTML = s;
                lista.appendChild(div);
            });
        }
    }

    async carregarRankingVisual() {
        const lista = document.getElementById('rankingList');
        try {
            const dados = await carregarRanking();

            if (dados.length === 0) {
                lista.innerHTML = `
                    <div class="ranking-empty">
                        <div class="empty-icon">👥</div>
                        <h3>Ainda não há participantes</h3>
                        <p>Faça o teste e seja o primeiro!</p>
                    </div>
                `;
                return;
            }

            lista.innerHTML = '';
            dados.slice(0, 20).forEach((item, index) => {
                const forcaClass = item.forca < 40 ? 'fraca' : item.forca < 70 ? 'media' : 'forte';
                const div = document.createElement('div');
                div.className = 'ranking-item';
                div.innerHTML = `
                    <div class="ranking-pos">${index + 1}º</div>
                    <div class="ranking-nome">${item.nome}</div>
                    <div class="ranking-forca ${forcaClass}">${item.forca}/100</div>
                    <div class="ranking-tempo">${item.tempo_estimado}</div>
                `;
                lista.appendChild(div);
            });
        } catch (error) {
            console.error('Erro ao carregar ranking:', error);
            lista.innerHTML = '<div class="ranking-empty"><p>Erro ao carregar ranking</p></div>';
        }
    }
}

// SUPABASE FUNCTIONS
const SUPABASE_URL = 'https://kpkyykfwtjwtyvhraynt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_AcK1pnSmzSzkf4WhsFCesA_TUb9kUmB';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.usuarioJaTestou = false;

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
        console.log('✅ Salvo no ranking!');
        return true;
    } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('Erro ao salvar no ranking. Tente novamente.');
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
            .limit(50);
        
        if (error) throw error;
        return data || [];
    }  catch (error) {
        console.error('Erro ao carregar ranking:', error);
        throw error;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    new SenhaSegura();
});