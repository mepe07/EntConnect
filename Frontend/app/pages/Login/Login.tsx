import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import styles from './Login.module.css';

const CITACOES = [
    "«O EntConnect reduziu a nossa burocracia em 60%.» - Diretor Rui",
    "«A gestão das turmas nunca foi tão fácil.» - Prof. Sara",
    "«Uma obra de arte na gestão escolar.» - Coord. Ana"
];

const SUBTITULO_COMPLETO = "A plataforma inteligente para a gestão escolar do futuro.";

export function Login() {
    // ESTADOS BASE DO LOGIN
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mensagemErro, setMensagemErro] = useState('');

    // INTERRUPTORES DOS EFEITOS ESPECIAIS
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [temaEscuro, setTemaEscuro] = useState(true); // Fica true por defeito para SaaS Premium
    const [lembrarMe, setLembrarMe] = useState(false);
    const [capsLockAtivo, setCapsLockAtivo] = useState(false);
    
    // ESTADOS DAS ANIMAÇÕES DE TEXTO
    const [textoDigitado, setTextoDigitado] = useState('');
    const [indiceCitacao, setIndiceCitacao] = useState(0);

    const navegarPara = useNavigate();

    // MOTOR DE ANIMAÇÕES: Controla a Máquina de Escrever e as Citações Rotativas
    useEffect(() => {
        // Efeito Máquina de Escrever (adiciona uma letra a cada 40ms)
        let i = 0;
        const typingTimer = setInterval(() => {
            setTextoDigitado(SUBTITULO_COMPLETO.slice(0, i));
            i++;
            if (i > SUBTITULO_COMPLETO.length) clearInterval(typingTimer);
        }, 40);

        // Efeito Rotação de Citações (muda a cada 5 segundos)
        const quoteTimer = setInterval(() => {
            setIndiceCitacao((prev) => (prev + 1) % CITACOES.length);
        }, 5000);

        // Limpeza de memória quando o utilizador sai deste ecrã
        return () => {
            clearInterval(typingTimer);
            clearInterval(quoteTimer);
        };
    }, []);

    // DETETOR DE CAPS LOCK: Pergunta ao teclado se a luz está acesa
    const verificarTeclas = (evento: React.KeyboardEvent<HTMLInputElement>) => {
        if (evento.getModifierState('CapsLock')) {
            setCapsLockAtivo(true);
        } else {
            setCapsLockAtivo(false);
        }
    };

    // VALIDAÇÃO VIVA: É um email válido se tiver '@' e '.'
    const isEmailValido = username.includes('@') && username.includes('.');

    // LÓGICA DE SUBMISSÃO (O nosso Estafeta)
    const handleLogin = async (evento: React.FormEvent) => {
        evento.preventDefault();
        setMensagemErro('');

        try {
            const resposta = await fetch('http://localhost:3000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                setMensagemErro(dados.message || 'Erro ao iniciar sessão.');
                return;
            }

            // GPS das rotas consoante o Cargo
            if (dados.role === 'Professor') navegarPara('dashboard.tsx');
            else if (dados.role === 'Coordenador') navegarPara('/dashboard-coordenador');
            else if (dados.role === 'Direcao') navegarPara('/dashboard-direcao');
            else navegarPara('/dashboard');
            
        } catch (erro) {
            setMensagemErro('Não foi possível contactar o servidor. Tente mais tarde.');
        }
    };

    return (
        <div className={`${styles.loginContainer} ${temaEscuro ? styles.dark : ''}`}>

            {/* O INTERRUPTOR DO SOL E DA LUA (Canto superior direito) */}
            <button
                className={styles.themeToggle}
                onClick={() => setTemaEscuro(!temaEscuro)}
                title="Alternar Modo Escuro"
            >
                {temaEscuro ? '☀️' : '🌙'}
            </button>

            {/* LADO ESQUERDO: A Montra (Agora 70% do ecrã) */}
            <div className={styles.brandPanel}>
                
                {/* Título e subtítulo no canto superior esquerdo */}
                <div className={styles.brandContent}>
                    <h1 className={styles.brandTitle}>EntConnect</h1>
                    <p className={styles.brandSubtitle}>
                        {textoDigitado}<span className={styles.cursorBlink}>|</span>
                    </p>
                </div>

                {/* Citação rotativa e logotipos no canto inferior esquerdo */}
                <div className={styles.footerBranding}>
                    <p className={styles.citacao}>{CITACOES[indiceCitacao]}</p>
                    <p className={styles.poweredBy}>Powered by developic</p>
                    <p className={styles.entartesLogo}>
                        {/* Ícone profissional minimalista */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
                            <path d="M12 2L2 22h20L12 2zm0 3.8l7.2 14.2H4.8L12 5.8z" />
                        </svg>
                        Ent’Artes
                    </p>
                </div>
            </div>

            {/* LADO DIREITO: O Formulário (Agora 30% do ecrã, com fundo preto) */}
            <div className={styles.formPanel}>
                <div className={styles.loginCard}>
                    <h2 className={styles.cardTitle}>Bem-vindo de volta!</h2>
                    <p className={styles.cardSubtitle}>Inicie sessão para aceder à sua conta.</p>

                    <form onSubmit={handleLogin} className={styles.loginForm}>

                        {/* CAMPO DO USERNAME COM ÍCONE */}
                        <div className={styles.inputGroup}>
                            <div className={styles.inputIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                    <polyline points="22,6 12,13 2,6"></polyline>
                                </svg>
                            </div>
                            <input
                                id="emailInput"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder=" "
                                required
                            />
                            <label htmlFor="emailInput">Username ou Email</label>
                            
                            {/* O Visto Verde da Validação Viva */}
                            {isEmailValido && <span className={styles.vistoVerde}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ea071" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </span>}
                        </div>

                        {/* CAMPO DA PASSWORD COM ÍCONE */}
                        <div className={styles.inputGroup}>
                            <div className={styles.inputIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                </svg>
                            </div>
                            <input
                                id="passwordInput"
                                type={mostrarPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyUp={verificarTeclas} 
                                placeholder=" "
                                required
                            />
                            <label htmlFor="passwordInput">Password</label>

                            {/* Olho Mágico para mostrar password */}
                            <button
                                type="button"
                                className={styles.eyeButton}
                                onClick={() => setMostrarPassword(!mostrarPassword)}
                            >
                                {mostrarPassword ? 
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                    : 
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                }
                            </button>

                            {/* O Aviso de Caps Lock */}
                            {capsLockAtivo && <span className={styles.capsWarning}>Caps Lock!</span>}
                        </div>

                        {/* MENSAGEM DE ERRO (Do Servidor) */}
                        {mensagemErro && (
                            <div className={styles.errorMessage}>
                                {mensagemErro}
                            </div>
                        )}

                        {/* RODAPÉ DO FORMULÁRIO (Checkbox customizada e Link) */}
                        <div className={styles.formActions}>
                            <label className={styles.rememberCheckbox}>
                                <input type="checkbox" checked={lembrarMe} onChange={(e) => setLembrarMe(e.target.checked)} />
                                <span className={styles.customCheck}></span>
                                Lembrar-me
                            </label>

                            <Link to="/recuperar-password" className={styles.forgotPassword}>
                                Esqueci-me da password.
                            </Link>
                        </div>

                        {/* BOTÃO DE SUBMETER VERDE TÁTIL */}
                        <button type="submit" className={styles.submitButton}>
                            Entrar na Plataforma
                        </button>
                    </form>
                </div>
            </div>

        </div>
    );
} 