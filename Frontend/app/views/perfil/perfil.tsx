import React, { useState, useEffect, useRef } from 'react';
import { marketplaceService } from '../../services/artigo.service';
import { authService } from '~/services/auth.service'; // Ajusta o caminho se necessário
import './perfil.scss';

// 1. Atualizado para incluir 'minhas_aulas'
type AbaTipo = 'dados_pessoais' | 'minhas_aulas' | 'favoritos' | 'pedidos' | 'anuncios';

export function Perfil() {
    // Definimos a aba 'dados_pessoais' como a inicial por defeito
    const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('dados_pessoais');
    
    // Estados dos Dados
    const [meusPedidos, setMeusPedidos] = useState<any[]>([]);
    const [meusAnuncios, setMeusAnuncios] = useState<any[]>([]);
    const [minhasAulas, setMinhasAulas] = useState<any[]>([]); // Novo estado para as aulas
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
        if (abaAtiva === 'favoritos' || abaAtiva === 'dados_pessoais') return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token') || authService.getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            if (abaAtiva === 'pedidos') {
                const dados = await marketplaceService.listarMeusPedidos();
                setMeusPedidos(dados);
            } else if (abaAtiva === 'anuncios') {
                const dados = await marketplaceService.listarMeusAnuncios();
                setMeusAnuncios(dados);
            } else if (abaAtiva === 'minhas_aulas') {
                // Chamada para o teu endpoint de aulas
                const response = await fetch(`http://localhost:3000/utilizador/${currentUserId}/aulas`, { headers });
                if (response.ok) {
                    const dados = await response.json();
                    setMinhasAulas(dados);
                }
            }
        } catch (error: any) {
            console.error("Erro ao carregar dados do perfil:", error);
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

    const renderEtiquetaEstado = (estado: string) => {
        const classe = estado.toLowerCase() === 'aprovado' ? 'verde' : 
            estado.toLowerCase() === 'rejeitado' ? 'vermelha' : 'amarela';
        return <span className={`etiqueta ${classe}`}>{estado}</span>;
    };

    return (
        <div className="perfil-container">
            <aside className="perfil-sidebar">
                <h2>A Minha Conta</h2>
                <nav>
                    <button className={abaAtiva === 'dados_pessoais' ? 'ativo' : ''} onClick={() => setAbaAtiva('dados_pessoais')}>
                        👤 O Meu Perfil
                    </button>
                    {/* Novo botão na navegação lateral */}
                    <button className={abaAtiva === 'minhas_aulas' ? 'ativo' : ''} onClick={() => setAbaAtiva('minhas_aulas')}>
                        🎓 As Minhas Aulas
                    </button>
                    <button className={abaAtiva === 'favoritos' ? 'ativo' : ''} onClick={() => setAbaAtiva('favoritos')}>
                        ❤️ Favoritos
                    </button>
                    <button className={abaAtiva === 'pedidos' ? 'ativo' : ''} onClick={() => setAbaAtiva('pedidos')}>
                        📋 Os Meus Pedidos
                    </button>
                    <button className={abaAtiva === 'anuncios' ? 'ativo' : ''} onClick={() => setAbaAtiva('anuncios')}>
                        🏪 Os Meus Anúncios
                    </button>
                </nav>
            </aside>

            <main className="perfil-conteudo">
                {loading ? (
                    <div className="mensagem-centro">A organizar os teus pertences...</div>
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
                                <h3>O Meu Horário de Aulas</h3>
                                {minhasAulas.length === 0 ? (
                                    <p className="texto-vazio">Ainda não tens aulas privadas ou ensaios agendados.</p>
                                ) : (
                                    <table className="tabela-custom">
                                        <thead>
                                            <tr>
                                                <th>Foco / Coreografia</th>
                                                {/* Se vier um 'coach' do backend, sabemos que quem vê é o Aluno. Logo a coluna mostra Professor(a) */}
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

                        {abaAtiva === 'favoritos' && (
                            <section>
                                <h3>Os Teus Favoritos</h3>
                                <p className="texto-vazio">Ainda estamos a ligar os cabos aos favoritos. Brevemente aqui! 🚧</p>
                            </section>
                        )}

                        {abaAtiva === 'pedidos' && (
                            <section>
                                <h3>Pedidos de Interesse</h3>
                                {meusPedidos.length === 0 ? (
                                    <p className="texto-vazio">Ainda não demonstraste interesse em nada. Explora o Marketplace!</p>
                                ) : (
                                    <table className="tabela-custom">
                                        <thead>
                                            <tr>
                                                <th>Artigo</th>
                                                <th>Data</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {meusPedidos.map(p => (
                                                <tr key={p.ID_Interesse}>
                                                    <td>{p.Stock_Armazem?.Artigo?.Nome}</td>
                                                    <td>{new Date(p.Data_Registo).toLocaleDateString('pt-PT')}</td>
                                                    <td>{renderEtiquetaEstado(p.Estado)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </section>
                        )}

                        {abaAtiva === 'anuncios' && (
                            <section>
                                <div className="titulo-com-acao">
                                    <h3>O Que Tenho à Venda</h3>
                                    <button className="btn-primario">➕ Novo Anúncio</button>
                                </div>
                                {meusAnuncios.length === 0 ? (
                                    <p className="texto-vazio">Não tens nada à venda. Que tal começares hoje?</p>
                                ) : (
                                    <div className="lista-anuncios-perfil">
                                        {meusAnuncios.map(a => (
                                            <div key={a.ID_Artigo} className="item-anuncio">
                                                <div className="info">
                                                    <strong>{a.Nome}</strong>
                                                    <span>Stock: {a.Stock_Armazem?.[0]?.Quantidade_Venda || 0} unidades</span>
                                                </div>
                                                <button className="btn-secundario">Gerir Interessados</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}