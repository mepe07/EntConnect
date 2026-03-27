import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import styles from './Login.module.css';

export function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mensagemErro, setMensagemErro] = useState('');

    // OS NOSSOS NOVOS INTERRUPTORES (Ideia 1 e 4)
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [temaEscuro, setTemaEscuro] = useState(false);

    const navegarPara = useNavigate();

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

            localStorage.setItem('entconnect_token', dados.access_token);

            if (dados.role === 'Professor') {
                navegarPara('/dashboard-professor');
            } else if (dados.role === 'Coordenador') {
                navegarPara('/dashboard-coordenador');
            } else if (dados.role === 'Direcao') {
                navegarPara('/dashboard-direcao');
            } else {
                navegarPara('/dashboard');
            }
        } catch (erro) {
            setMensagemErro('Não foi possível contactar o servidor. Tente mais tarde.');
        }
    };

    return (
        // Ideia 4 (Dark Mode): Se o tema for escuro, adicionamos a classe 'dark' ao contentor principal
        <div className={`${styles.loginContainer} ${temaEscuro ? styles.dark : ''}`}>

            {/* Botão flutuante para mudar o tema (Sol/Lua) */}
            <button
                className={styles.themeToggle}
                onClick={() => setTemaEscuro(!temaEscuro)}
                title="Alternar Modo Escuro"
            >
                {temaEscuro ? '☀️' : '🌙'}
            </button>

            {/* LADO ESQUERDO: A Montra da Marca (Ideia 3 - Split Screen) */}
            <div className={styles.brandPanel}>
                <div className={styles.brandContent}>
                    <h1 className={styles.brandTitle}>EntConnect</h1>
                    <p className={styles.brandSubtitle}>A plataforma inteligente para a gestão escolar do futuro.</p>
                </div>
                <div className={styles.footerBranding}>
                    <p>Powered by developic</p>
                    <p className={styles.entartesLogo}>entartes</p>
                </div>
            </div>

            {/* LADO DIREITO: O Formulário */}
            <div className={styles.formPanel}>
                <div className={styles.loginCard}>
                    <h2 className={styles.cardTitle}>Bem-vindo de volta!</h2>
                    <p className={styles.cardSubtitle}>Inicie sessão para aceder à sua conta.</p>

                    <form onSubmit={handleLogin} className={styles.loginForm}>

                        {/* Ideia 2 (Floating Labels): Repara como o input tem placeholder=" " (espaço) para o CSS funcionar */}
                        <div className={styles.inputGroup}>
                            <input
                                id="emailInput"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder=" "
                                required
                            />
                            <label htmlFor="emailInput">Username ou Email</label>
                        </div>

                        <div className={styles.inputGroup}>
                            {/* Ideia 1 (Olho Mágico): O tipo muda consoante o estado! */}
                            <input
                                id="passwordInput"
                                type={mostrarPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder=" "
                                required
                            />
                            <label htmlFor="passwordInput">Password</label>

                            {/* O botão do olho para alternar o estado */}
                            <button
                                type="button"
                                className={styles.eyeButton}
                                onClick={() => setMostrarPassword(!mostrarPassword)}
                            >
                                {mostrarPassword ? '🙈' : '👁️'}
                            </button>
                        </div>

                        {mensagemErro && (
                            <div className={styles.errorMessage}>
                                ⚠️ {mensagemErro}
                            </div>
                        )}

                        <div className={styles.formActions}>
                            <Link to="/recuperar-password" className={styles.forgotPassword}>
                                Esqueci-me da password
                            </Link>
                        </div>

                        <button type="submit" className={styles.submitButton}>
                            Entrar na Plataforma
                        </button>
                    </form>
                </div>
            </div>

        </div>
    );
}