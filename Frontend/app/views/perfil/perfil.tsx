import React, { useState, useEffect, useRef } from 'react';
import { authService } from '~/services/auth.service'; // Ajusta o caminho se necessário
import './perfil.scss';

// 1. Tipo simplificado apenas com as abas que precisas
type AbaTipo = 'dados_pessoais' | 'minhas_aulas';

export function Perfil() {
    // Aba inicial
    const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('dados_pessoais');
    
    // Estado das Aulas
    const [minhasAulas, setMinhasAulas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Estados para a Foto de Perfil
    const [fotoUrl, setFotoUrl] = useState<string | null>(null);
    const [loadingFoto, setLoadingFoto] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Obter o ID do utilizador atual
    const userInfo = authService.getUserInfo() as any;
    const currentUserId = userInfo?.sub || userInfo?.idUtilizador;

    useEffect(() => {
        carregarDados();
    }, [abaAtiva]);

    // Carregar a foto de perfil logo que o componente monta
    useEffect(() => {
        if (currentUserId) {
            buscarFotoAtual();
        }
    }, [currentUserId]);

    const buscarFotoAtual = async () => {
        try {
            const response = await fetch(`http://localhost:3000/utilizador/${currentUserId}/foto`);
            if (response.ok) {
                const data = await response.json();
                
                if (data.url) {
                    // TRUQUE MÁGICO CONTRA O CACHE
                    const separador = data.url.includes('?') ? '&' : '?';
                    const urlSemCache = `${data.url}${separador}t=${new Date().getTime()}`;
                    
                    setFotoUrl(urlSemCache);
                } else {
                    setFotoUrl(null);
                }
            }
        } catch (error) {
            console.error("Erro ao buscar foto:", error);
        }
    };

    const carregarDados = async () => {
        if (abaAtiva === 'dados_pessoais') return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token') || authService.getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            if (abaAtiva === 'minhas_aulas') {
                // Chamada para o teu endpoint de aulas
                const response = await fetch(`http://localhost:3000/utilizador/${currentUserId}/aulas`, { headers });
                if (response.ok) {
                    const dados = await response.json();
                    setMinhasAulas(dados);
                }
            }
        } catch (error: any) {
            console.error("Erro ao carregar as aulas:", error);
        } finally {
            setLoading(false);
        }
    };

    // A Função Mágica que faz o Upload da nova Foto
    const lidarComUploadFoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !currentUserId) return;

        setLoadingFoto(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem('token') || authService.getToken();
            
            const response = await fetch(`http://localhost:3000/utilizador/${currentUserId}/uploadphoto`, {
                method: "PUT",
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            
            if (response.ok) {
                alert("Foto atualizada com sucesso!");
                buscarFotoAtual(); // Atualiza a foto na página de perfil
                
                // Dispara o evento para o Header atualizar a foto também
                window.dispatchEvent(new Event('fotoPerfilAtualizada')); 
            } else {
                const errorData = await response.json();
                alert(`Erro ao alterar foto: ${errorData.message || 'Verifica o formato e tamanho.'}`);
            }
        } catch (error) {
            console.error("Erro no upload da foto:", error);
            alert("Erro de ligação. Tenta novamente.");
        } finally {
            setLoadingFoto(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Limpa o input
        }
    };

    return (
        <div className="perfil-container">
            <aside className="perfil-sidebar">
                <h2>A Minha Conta</h2>
                <nav>
                    <button className={abaAtiva === 'dados_pessoais' ? 'ativo' : ''} onClick={() => setAbaAtiva('dados_pessoais')}>
                        👤 O Meu Perfil
                    </button>
                    <button className={abaAtiva === 'minhas_aulas' ? 'ativo' : ''} onClick={() => setAbaAtiva('minhas_aulas')}>
                        📅 O Meu Horário
                    </button>
                </nav>
            </aside>

            <main className="perfil-conteudo">
                {loading ? (
                    <div className="mensagem-centro">A organizar as tuas aulas...</div>
                ) : (
                    <div className="cartao-branco">

                        {/* Secção de Dados Pessoais / Foto */}
                        {abaAtiva === 'dados_pessoais' && (
                            <section className="seccao-perfil">
                                <h3>O Meu Perfil</h3>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginTop: '20px' }}>
                                    <div style={{
                                        width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#eee',
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
                                        border: '3px solid #004d40'
                                    }}>
                                        {loadingFoto ? (
                                            <span style={{ color: '#666' }}>A carregar...</span>
                                        ) : fotoUrl ? (
                                            <img src={fotoUrl} alt="A minha foto de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <i className="fa fa-user" style={{ fontSize: '50px', color: '#aaa' }}></i>
                                        )}
                                    </div>

                                    <div>
                                        <h4>{userInfo?.username || 'Utilizador'}</h4>
                                        <p style={{ color: '#666', marginBottom: '15px' }}>Altera a tua foto de perfil (Max 10MB)</p>
                                        
                                        <input 
                                            type="file" 
                                            accept=".png,.jpg,.jpeg,.webp,.jfif" 
                                            ref={fileInputRef} 
                                            style={{ display: 'none' }} 
                                            onChange={lidarComUploadFoto}
                                        />

                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{ padding: '8px 16px', backgroundColor: '#004d40', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            disabled={loadingFoto}
                                        >
                                            <i className="fa fa-camera" style={{ marginRight: '8px' }}></i>
                                            {fotoUrl ? 'Alterar Foto' : 'Carregar Foto'}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Secção de Aulas Privadas / Coaching de Dança */}
                        {abaAtiva === 'minhas_aulas' && (
                            <section>
                                <h3>As Minhas Aulas</h3>
                                {minhasAulas.length === 0 ? (
                                    <p className="texto-vazio">Ainda não tens aulas privadas ou ensaios agendados.</p>
                                ) : (
                                    <table className="tabela-custom">
                                        <thead>
                                            <tr>
                                                <th>Foco / Coreografia</th>
                                                <th>{minhasAulas[0].coach ? 'Professor(a)' : 'Aluno(a)'}</th>
                                                <th>Data</th>
                                                <th>Horário</th>
                                                <th>Local / Estúdio</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {minhasAulas.map((aula, index) => (
                                                <tr key={index}>
                                                    <td><strong>{aula.sessao}</strong></td>
                                                    <td>{aula.coach || aula.cliente}</td>
                                                    <td>{aula.data}</td>
                                                    <td>{aula.horario}</td>
                                                    <td>
                                                        <span className={`etiqueta ${aula.formato.toLowerCase().includes('online') ? 'verde' : 'amarela'}`}>
                                                            {aula.formato}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}