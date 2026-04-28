import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { AuthService } from '../../services/auth.service';
import { EventoLoginToast } from '~/components/eventos/evento-login-toast.component';
import styles from './login.module.css';

const CITACOES = [
    "«O EntConnect reduziu a nossa burocracia em 60%.»",
    "«A gestão das turmas nunca foi tão fácil.»",
    "«Uma obra de arte na gestão escolar.»"
];

const SUBTITULO_COMPLETO = "A plataforma inteligente para a gestão escolar do futuro.";

type ModoFormulario = 'login' | 'forgot' | 'reset';

export function Login() {
    const authService = useMemo(() => new AuthService(), []);
    const [searchParams, setSearchParams] = useSearchParams();
    const resetToken = searchParams.get('resetToken') || '';

    const [modoFormulario, setModoFormulario] = useState<ModoFormulario>(resetToken ? 'reset' : 'login');

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [novaPassword, setNovaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [emailRecuperacao, setEmailRecuperacao] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [devResetLink, setDevResetLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [mostrarNovaPassword, setMostrarNovaPassword] = useState(false);
    const [darkTheme, setDarkTheme] = useState(true);
    const [lembrarMe, setLembrarMe] = useState(false);
    const [capsLockAtivo, setCapsLockAtivo] = useState(false);

    const [textoDigitado, setTextoDigitado] = useState('');
    const [indiceCitacao, setIndiceCitacao] = useState(0);

    const navigateTo = useNavigate();

    useEffect(() => {
        let i = 0;
        const typingTimer = setInterval(() => {
            setTextoDigitado(SUBTITULO_COMPLETO.slice(0, i));
            i++;
            if (i > SUBTITULO_COMPLETO.length) clearInterval(typingTimer);
        }, 40);

        const quoteTimer = setInterval(() => {
            setIndiceCitacao((prev) => (prev + 1) % CITACOES.length);
        }, 5000);

        return () => {
            clearInterval(typingTimer);
            clearInterval(quoteTimer);
        };
    }, []);

    useEffect(() => {
        if (resetToken) {
            setModoFormulario('reset');
            setErrorMessage('');
            setSuccessMessage('');
        }
    }, [resetToken]);

    const verificarTeclas = (evento: KeyboardEvent<HTMLInputElement>) => {
        setCapsLockAtivo(evento.getModifierState('CapsLock'));
    };

    const limparMensagens = () => {
        setErrorMessage('');
        setSuccessMessage('');
        setDevResetLink('');
    };

    const trocarModo = (modo: ModoFormulario) => {
        limparMensagens();
        setModoFormulario(modo);

        if (modo !== 'reset') {
            setSearchParams({});
        }
    };

    const isEmailValido = username.includes('@') && username.includes('.');

    const handleLogin = async (evento: FormEvent) => {
        evento.preventDefault();
        limparMensagens();
        setIsSubmitting(true);

        try {
            const result = await authService.login(username, password);
            if (result) {
                navigateTo('/');
            }
        } catch (erro) {
            if (erro instanceof Error) {
                setErrorMessage(erro.message);
            } else {
                setErrorMessage('Ocorreu um erro ao iniciar sessão.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = async (evento: FormEvent) => {
        evento.preventDefault();
        limparMensagens();
        setIsSubmitting(true);

        try {
            const result = await authService.forgotPassword(emailRecuperacao);
            setSuccessMessage(result.message);

            if (result.resetLink) {
                setDevResetLink(result.resetLink);
            }
        } catch (erro) {
            if (erro instanceof Error) {
                setErrorMessage(erro.message);
            } else {
                setErrorMessage('Ocorreu um erro ao pedir a recuperação da password.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPassword = async (evento: FormEvent) => {
        evento.preventDefault();
        limparMensagens();

        if (novaPassword !== confirmarPassword) {
            setErrorMessage('As passwords não coincidem.');
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await authService.resetPassword(resetToken, novaPassword);
            setSuccessMessage(result.message);
            setNovaPassword('');
            setConfirmarPassword('');
            setSearchParams({});
            setModoFormulario('login');
        } catch (erro) {
            if (erro instanceof Error) {
                setErrorMessage(erro.message);
            } else {
                setErrorMessage('Ocorreu um erro ao alterar a password.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderLoginForm = () => (
        <form onSubmit={handleLogin} className={styles.loginForm}>
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

                {isEmailValido && <span className={styles.vistoVerde}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2ea071" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </span>}
            </div>

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

                {capsLockAtivo && <span className={styles.capsWarning}>Caps Lock!</span>}
            </div>

            {renderMensagens()}

            <div className={styles.formActions}>
                <label className={styles.rememberCheckbox}>
                    <input type="checkbox" checked={lembrarMe} onChange={(e) => setLembrarMe(e.target.checked)} />
                    <span className={styles.customCheck}></span>
                    Lembrar-me
                </label>

                <button type="button" className={styles.forgotPassword} onClick={() => trocarModo('forgot')}>
                    Esqueci-me da password.
                </button>
            </div>

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                {isSubmitting ? 'A entrar...' : 'Entrar na Plataforma'}
            </button>
        </form>
    );

    const renderForgotPasswordForm = () => (
        <form onSubmit={handleForgotPassword} className={styles.loginForm}>
            <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                </div>
                <input
                    id="emailRecuperacaoInput"
                    type="email"
                    value={emailRecuperacao}
                    onChange={(e) => setEmailRecuperacao(e.target.value)}
                    placeholder=" "
                    required
                />
                <label htmlFor="emailRecuperacaoInput">Email da conta</label>
            </div>

            {renderMensagens()}

            {devResetLink && (
                <a className={styles.devResetLink} href={devResetLink}>
                    Abrir link de recuperação gerado
                </a>
            )}

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                {isSubmitting ? 'A enviar...' : 'Enviar instruções'}
            </button>

            <button type="button" className={styles.secondaryButton} onClick={() => trocarModo('login')}>
                Voltar ao login
            </button>
        </form>
    );

    const renderResetPasswordForm = () => (
        <form onSubmit={handleResetPassword} className={styles.loginForm}>
            <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                </div>
                <input
                    id="novaPasswordInput"
                    type={mostrarNovaPassword ? 'text' : 'password'}
                    value={novaPassword}
                    onChange={(e) => setNovaPassword(e.target.value)}
                    placeholder=" "
                    minLength={6}
                    required
                />
                <label htmlFor="novaPasswordInput">Nova password</label>

                <button
                    type="button"
                    className={styles.eyeButton}
                    onClick={() => setMostrarNovaPassword(!mostrarNovaPassword)}
                >
                    {mostrarNovaPassword ? '🙈' : '👁️'}
                </button>
            </div>

            <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <input
                    id="confirmarPasswordInput"
                    type={mostrarNovaPassword ? 'text' : 'password'}
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    placeholder=" "
                    minLength={6}
                    required
                />
                <label htmlFor="confirmarPasswordInput">Confirmar password</label>
            </div>

            {renderMensagens()}

            <button type="submit" className={styles.submitButton} disabled={isSubmitting || !resetToken}>
                {isSubmitting ? 'A guardar...' : 'Guardar nova password'}
            </button>

            <button type="button" className={styles.secondaryButton} onClick={() => trocarModo('login')}>
                Voltar ao login
            </button>
        </form>
    );

    const renderMensagens = () => (
        <>
            {errorMessage && (
                <div className={styles.errorMessage}>⚠️ {errorMessage}</div>
            )}

            {successMessage && (
                <div className={styles.successMessage}>✅ {successMessage}</div>
            )}
        </>
    );

    const tituloFormulario = modoFormulario === 'login'
        ? 'Bem-vindo de volta!'
        : modoFormulario === 'forgot'
            ? 'Recuperar password'
            : 'Definir nova password';

    const subtituloFormulario = modoFormulario === 'login'
        ? 'Inicie sessão para aceder à sua conta.'
        : modoFormulario === 'forgot'
            ? 'Indique o email associado à conta.'
            : 'Escolha uma nova password para a sua conta.';

    return (
        <div className={`${styles.loginContainer} ${darkTheme ? styles.dark : ''}`}>
            <button
                className={styles.themeToggle}
                onClick={() => setDarkTheme(!darkTheme)}
                title="Alternar Modo Escuro"
            >
                {darkTheme ? '☀️' : '🌙'}
            </button>

            <div className={styles.brandPanel}>
                <div className={styles.brandContent}>
                    <h1 className={styles.brandTitle}>EntConnect</h1>
                    <p className={styles.brandSubtitle}>
                        {textoDigitado}<span className={styles.cursorBlink}>|</span>
                    </p>
                </div>

                <EventoLoginToast />

                <div className={styles.footerBranding}>
                    <p className={styles.citacao}>{CITACOES[indiceCitacao]}</p>
                    <p className={styles.poweredBy}>Powered by developic</p>
                    <p className={styles.entartesLogo}>
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            style={{ marginRight: '8px' }}
                        >
                            <path d="M12 2L2 22h20L12 2zm0 3.8l7.2 14.2H4.8L12 5.8z" />
                        </svg>
                        Ent’Artes
                    </p>
                </div>
            </div>

            <div className={styles.formPanel}>
                <div className={styles.loginCard}>
                    <h2 className={styles.cardTitle}>{tituloFormulario}</h2>
                    <p className={styles.cardSubtitle}>{subtituloFormulario}</p>

                    {modoFormulario === 'login' && renderLoginForm()}
                    {modoFormulario === 'forgot' && renderForgotPasswordForm()}
                    {modoFormulario === 'reset' && renderResetPasswordForm()}
                </div>
            </div>
        </div>
    );
}
