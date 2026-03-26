import { useState } from 'react';
// Importamos o GPS do React Router para podermos mudar de ecrã
import { useNavigate } from 'react-router';
import styles from './Login.module.css';

export function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    // Novo estado para guardar as mensagens de erro e mostrar no ecrã
    const [mensagemErro, setMensagemErro] = useState('');

    // Instanciamos o nosso GPS
    const navegarPara = useNavigate();

    // A função agora é 'async' porque temos de esperar que o estafeta vá e volte do Backend
    const handleLogin = async (evento: React.FormEvent) => {
        evento.preventDefault();
        // Limpamos erros antigos sempre que o utilizador tenta de novo
        setMensagemErro('');

        try {
            // 1 e 2: O Estafeta arranca com a encomenda
            const resposta = await fetch('http://localhost:3000/auth/login', {
                method: 'POST', // O método que definimos no Controlador do NestJS
                headers: {
                    'Content-Type': 'application/json', // Dizemos que o pacote vai em formato JSON
                },
                body: JSON.stringify({ username, password }), // A nossa encomenda!
            });

            // Lemos o que vem dentro da caixa de resposta
            const dados = await resposta.json();

            // 3. O Detetor de Erros
            // Se a resposta não for OK (ex: erro 401 Unauthorized)
            if (!resposta.ok) {
                // Mostramos o erro que o NestJS enviou ('Credenciais inválidas')
                setMensagemErro(dados.message || 'Erro ao iniciar sessão.');
                return; // Paramos a função aqui, não o deixamos avançar!
            }

            // 4. Sucesso! Guardar o Token e Redirecionar
            // Guardamos a pulseira VIP na carteira do navegador
            localStorage.setItem('entconnect_token', dados.access_token);

            // O famoso Switch/If para cumprir o teu Critério de Aceitação final
            if (dados.role === 'Professor') {
                navegarPara('/dashboard-professor');
            } else if (dados.role === 'Coordenador') {
                navegarPara('/dashboard-coordenador');
            } else if (dados.role === 'Direcao') {
                navegarPara('/dashboard-direcao');
            } else {
                // Se por acaso tiver um perfil desconhecido, vai para um sítio genérico
                navegarPara('/dashboard');
            }

        } catch (erro) {
            // Este catch apanha erros graves, como o Backend estar desligado (porta 3000 fechada)
            setMensagemErro('Não foi possível contactar o servidor. Tente mais tarde.');
        }
    };

    return (
        <div className={styles.loginContainer}>
            <h1 className={styles.brandTitle}>EntConnect</h1>

            <div className={styles.loginCard}>
                <h2 className={styles.cardTitle}>Iniciar Sessão</h2>

                <form onSubmit={handleLogin} className={styles.loginForm}>

                    <div className={styles.inputGroup}>
                        <label htmlFor="emailInput">Email</label>
                        <input
                            id="emailInput"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="passwordInput">Password</label>
                        <input
                            id="passwordInput"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {/* Se houver uma mensagem de erro, mostramos esta caixa vermelha */}
                    {mensagemErro && (
                        <div style={{ color: '#d9534f', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {mensagemErro}
                        </div>
                    )}

                    <a href="#" className={styles.forgotPassword}>Esqueci-me da password</a>

                    <button type="submit" className={styles.submitButton}>
                        Entrar
                    </button>

                </form>
            </div>

            <div className={styles.footerBranding}>
                <p>Powered by developic</p>
                <p className={styles.entartesLogo}>entartes</p>
            </div>

        </div>
    );
}