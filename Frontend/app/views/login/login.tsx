import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthService } from '../../services/auth.service';
import styles from './login.module.css';

export function Login() {
    const authService = new AuthService();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [darkTheme, setDarkTheme] = useState(false);

    const navigateTo = useNavigate();

    const handleLogin = async (evento: React.FormEvent) => {
        evento.preventDefault();
        setErrorMessage('');

        try {
            const result = await authService.login(username, password);
            if (result) {
                navigateTo('/');
            }
        } catch (erro) {
            setErrorMessage('Não foi possível contactar o servidor. Tente mais tarde.');
        }
    };

    return (
        // Ideia 4 (Dark Mode): Se o tema for escuro, adicionamos a classe 'dark' ao contentor principal
        <div className={`${styles.loginContainer} ${darkTheme ? styles.dark : ''}`}>

            {/* Botão flutuante para mudar o tema (Sol/Lua) */}
            <button
                className={styles.themeToggle}
                onClick={() => setDarkTheme(!darkTheme)}
                title="Alternar Modo Escuro"
            >
                {darkTheme ? '☀️' : '🌙'}
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
                                type={showPassword ? "text" : "password"}
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
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>

                        {errorMessage && (
                            <div className={styles.errorMessage}>
                                ⚠️ {errorMessage}
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