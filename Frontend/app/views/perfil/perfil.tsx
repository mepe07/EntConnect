import React, { useState, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { authService } from '~/services/auth.service';
import { API_BASE_URL } from '~/config/api.config';
import './perfil.scss';
import { getCroppedImg } from '../utils/cropImage';

type AbaTipo = 'dados_pessoais' | 'minhas_aulas';

export function Perfil() {
    const [abaAtiva, setAbaAtiva] = useState<AbaTipo>('dados_pessoais');
    const [minhasAulas, setMinhasAulas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [fotoUrl, setFotoUrl] = useState<string | null>(null);
    const [loadingFoto, setLoadingFoto] = useState(false);
    const [modalCorteAberto, setModalCorteAberto] = useState(false);
    const [imagemOriginal, setImagemOriginal] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [nif, setNif] = useState('');
    const [contacto, setContacto] = useState('');
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [ativo, setAtivo] = useState(true);
    const [cargo, setCargo] = useState('Utilizador Registado');
    const [editando, setEditando] = useState(false);
    const [guardando, setGuardando] = useState(false);

    const [modalPasswordAberto, setModalPasswordAberto] = useState(false);
    const [passAtual, setPassAtual] = useState('');
    const [passNova, setPassNova] = useState('');
    const [passConfirma, setPassConfirma] = useState('');

    const userInfo = authService.getUserInfo() as any;
    const currentUserId = userInfo?.sub || userInfo?.idUtilizador;

    useEffect(() => {
        carregarDados();
    }, [abaAtiva]);

    useEffect(() => {
        if (currentUserId) {
            buscarFotoAtual();
        }
    }, [currentUserId]);

    const buscarFotoAtual = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/utilizador/${currentUserId}/foto`);
            if (response.ok) {
                const data = await response.json();
                if (data.url) {
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
        setLoading(true);
        try {
            const token = localStorage.getItem('entconnect_token') || authService.getToken();
            const headers = { 'Authorization': `Bearer ${token}` };

            const resUser = await fetch(`${API_BASE_URL}/utilizador/${currentUserId}`, { headers });
            if (resUser.ok) {
                const dadosUser = await resUser.json();
                setAtivo(dadosUser.Ativo === 1 || dadosUser.Ativo === true);

                const p = dadosUser.Pessoa;
                let cargoDetectado = 'Utilizador Registado';
                if (p) {
                    const funcoes = [];
                    if (p.Direcao) funcoes.push('Direção');
                    if (p.Professor) funcoes.push('Professor');
                    if (p.Enc_Educacao) funcoes.push('Enc. Educação');
                    if (funcoes.length > 0) cargoDetectado = funcoes.join(' / ');
                }
                setCargo(cargoDetectado);
                setNome(p?.Nome || '');
                setNif(p?.NIF || '');
                setContacto(p?.Contacto || '');
                setEmail(p?.Email || '');
            }

            if (abaAtiva === 'minhas_aulas') {
                const resAulas = await fetch(`${API_BASE_URL}/utilizador/${currentUserId}/aulas`, { headers });
                if (resAulas.ok) {
                    const dadosAulas = await resAulas.json();
                    setMinhasAulas(dadosAulas);
                }
            }
        } catch (error: any) {
            console.error("Erro ao carregar dados:", error);
        } finally {
            setLoading(false);
        }
    };

    const lidarComSelecaoFicheiro = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setImagemOriginal(reader.result as string);
            setModalCorteAberto(true);
        };
    };

    const aoCortarCompletado = (_: any, pixels: any) => {
        setCroppedAreaPixels(pixels);
    };

    const finalizarCorte = async () => {
        try {
            const blobFinal = await getCroppedImg(imagemOriginal!, croppedAreaPixels);
            executarUpload(blobFinal);
        } catch (e) {
            console.error("Erro ao processar imagem:", e);
        }
    };

    const executarUpload = async (blobFinal: Blob) => {
        setLoadingFoto(true);
        const formData = new FormData();
        formData.append("file", blobFinal, "perfil.jpg");
        try {
            const token = localStorage.getItem('entconnect_token') || authService.getToken();
            const response = await fetch(`${API_BASE_URL}/utilizador/${currentUserId}/uploadphoto`, {
                method: "PUT",
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (response.ok) {
                alert("Foto atualizada com sucesso!");
                buscarFotoAtual();
                window.dispatchEvent(new Event('fotoPerfilAtualizada'));
                setModalCorteAberto(false);
            }
        } catch (error) {
            console.error("Erro no upload:", error);
        } finally {
            setLoadingFoto(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };


    const removerFoto = async () => {
        const confirmacao = window.confirm("Tens a certeza que queres remover a tua foto de perfil?");
        if (!confirmacao) return;

        setLoadingFoto(true);
        try {
            const token = localStorage.getItem('entconnect_token') || authService.getToken();
            const response = await fetch(`${API_BASE_URL}/utilizador/${currentUserId}/removephoto`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setFotoUrl(null);
                window.dispatchEvent(new Event('fotoPerfilAtualizada'));
                alert("Foto removida com sucesso!");
            } else {
                alert("Erro ao remover a foto.");
            }
        } catch (error) {
            alert("Erro de ligação ao servidor.");
        } finally {
            setLoadingFoto(false);
        }
    };

    const guardarAlteracoes = async () => {
        setGuardando(true);
        try {
            const token = localStorage.getItem('entconnect_token') || authService.getToken();
            const response = await fetch(`${API_BASE_URL}/utilizador/${currentUserId}/update-pessoal`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nome, nif, contacto })
            });
            if (response.ok) {
                alert("Dados atualizados com sucesso!");
                setEditando(false);
            }
        } catch (error) {
            alert("Erro de ligação.");
        } finally {
            setGuardando(false);
        }
    };

    const lidarComMudarPassword = async () => {
        if (passNova !== passConfirma) {
            alert("A nova password e a confirmação não coincidem.");
            return;
        }
        try {
            const token = authService.getToken();
            const response = await fetch(`${API_BASE_URL}/utilizador/${currentUserId}/change-password`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ passAtual, passNova })
            });
            const resultado = await response.json();
            if (response.ok) {
                alert("Password alterada com sucesso!");
                fecharModalPassword();
            } else {
                alert(resultado.message || "Erro ao mudar password.");
            }
        } catch (e) {
            alert("Erro de ligação ao servidor.");
        }
    };

    const abrirModalPassword = () => {
        setPassAtual(''); setPassNova(''); setPassConfirma('');
        setModalPasswordAberto(true);
    };

    const fecharModalPassword = () => {
        setPassAtual(''); setPassNova(''); setPassConfirma('');
        setModalPasswordAberto(false);
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
                    <div className="mensagem-centro">A carregar informações...</div>
                ) : (
                    <div className="cartao-branco">
                        {abaAtiva === 'dados_pessoais' && (
                            <section className="seccao-perfil">
                                <div className="perfil-header-topo">
                                    <h3>O Meu Perfil</h3>
                                    <button
                                        className="btn-editar"
                                        onClick={() => editando ? guardarAlteracoes() : setEditando(true)}
                                        disabled={guardando}
                                    >
                                        {guardando ? 'A guardar...' : editando ? '✅ Guardar' : '✏️ Editar Dados'}
                                    </button>
                                </div>

                                <div className="perfil-info-principal">
                                    <div className="foto-moldura">
                                        {loadingFoto ? (
                                            <span className="carregando-texto">...</span>
                                        ) : fotoUrl ? (
                                            <img src={fotoUrl} alt="Perfil" />
                                        ) : (
                                            <i className="fa fa-user"></i>
                                        )}
                                    </div>

                                    <div className="info-texto">
                                        <h4 className="nome-principal">{nome || 'Utilizador'}</h4>
                                        <p className="nome-meta">@{userInfo?.username || 'utilizador'}</p>
                                        <p className="email-utilizador">{email || 'Sem email registado'}</p>

                                        <p className="aviso-tamanho">
                                            <i className="fa fa-info-circle"></i> Tamanho máximo: 10MB
                                        </p>

                                        <input type="file" accept="image/*" ref={fileInputRef} className="input-file-escondido" onChange={lidarComSelecaoFicheiro} />


                                        <div className="botoes-foto-wrapper">
                                            <button className="btn-link-foto" onClick={() => fileInputRef.current?.click()} disabled={loadingFoto}>
                                                <i className="fa fa-camera"></i>
                                                {fotoUrl ? 'Alterar Foto' : 'Carregar Foto'}
                                            </button>

                                            {fotoUrl && (
                                                <button className="btn-link-foto btn-remover" onClick={removerFoto} disabled={loadingFoto}>
                                                    <i className="fa fa-trash"></i> Remover
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <hr className="divisor-perfil" />

                                <div className="perfil-grid-layout">
                                    <div className="coluna-formulario">
                                        <div className="cartao-edicao">
                                            <h4>Editar Dados Pessoais</h4>
                                            <div className="form-pessoal">
                                                <div className="campo">
                                                    <label>Nome Completo</label>
                                                    <input type="text" value={nome} disabled={!editando} onChange={(e) => setNome(e.target.value)} />
                                                </div>
                                                <div className="campo">
                                                    <label>NIF (Número de Contribuinte)</label>
                                                    <input type="text" value={nif} disabled={!editando} onChange={(e) => setNif(e.target.value)} />
                                                </div>
                                                <div className="campo">
                                                    <label>Contacto Telefónico</label>
                                                    <input type="text" value={contacto} disabled={!editando} onChange={(e) => setContacto(e.target.value)} />
                                                </div>
                                                {editando && (
                                                    <button className="btn-cancelar" onClick={() => { setEditando(false); carregarDados(); }}>Cancelar</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="coluna-detalhes">
                                        <div className="cartao-info-extra">
                                            <h4>Informações de Conta</h4>
                                            <div className="item-info">
                                                <span className="label">Estado da Conta:</span>
                                                <span className={`etiqueta ${ativo ? 'verde' : 'vermelha'}`}>
                                                    {ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </div>


                                            <div className="item-info cargo-info">
                                                <span className="label">Cargo / Função:</span>
                                                <div className="cargo-badge">
                                                    <i className="fa-solid fa-user-tie"></i>
                                                    <span>{cargo}</span>
                                                </div>
                                            </div>

                                            <hr />
                                            <h4>Segurança</h4>
                                            <p className="texto-seguranca">Protege a tua conta alterando a palavra-passe regularmente.</p>
                                            <button className="btn-secundario" onClick={abrirModalPassword}>
                                                <i className="fa fa-lock" style={{marginRight: '8px'}}></i>
                                                Alterar Palavra-passe
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        {abaAtiva === 'minhas_aulas' && (
                            <section className="seccao-aulas">
                                <h3>As Minhas Aulas / Horário</h3>
                                {minhasAulas.length === 0 ? (
                                    <div className="mensagem-vazia">
                                        <i className="fa fa-calendar-times-o"></i>
                                        <p>Ainda não tens aulas agendadas no sistema.</p>
                                    </div>
                                ) : (
                                    <div className="tabela-container">
                                        <table className="tabela-custom">
                                            <thead>
                                                <tr>
                                                    <th>Foco / Coreografia</th>
                                                    <th>{userInfo?.role === 'Professor' ? 'Cliente' : 'Professor(a)'}</th>
                                                    <th>Data</th>
                                                    <th>Horário</th>
                                                    <th>Local / Formato</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {minhasAulas.map((aula, index) => (
                                                    <tr key={index}>
                                                        <td><strong>{aula.sessao || aula.Sessao}</strong></td>
                                                        <td>{aula.coach || aula.cliente || 'N/A'}</td>
                                                        <td>{aula.data || aula.Data}</td>
                                                        <td>{aula.horario || aula.Horario}</td>
                                                        <td>
                                                            <span className={`etiqueta ${String(aula.formato || '').toLowerCase().includes('online') ? 'verde' : 'amarela'}`}>
                                                                {aula.formato || 'Presencial'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                )}


                {modalCorteAberto && (
                    <div className="modal-corte-overlay">
                        <div className="modal-corte-container">
                            <div className="modal-header">
                                <h3>Ajustar Foto de Perfil</h3>
                                <p>Arrasta e ajusta o zoom para enquadrar a foto</p>
                            </div>
                            <div className="cropper-wrapper">
                                <Cropper
                                    image={imagemOriginal!}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={true}
                                    onCropChange={setCrop}
                                    onZoomChange={setZoom}
                                    onCropComplete={aoCortarCompletado}
                                />
                            </div>
                            <div className="controles-corte">
                                <div className="zoom-slider">
                                    <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
                                </div>
                                <div className="botoes-modal">
                                    <button className="btn-modal-cancelar" onClick={() => setModalCorteAberto(false)}>Cancelar</button>
                                    <button className="btn-modal-confirmar" onClick={finalizarCorte}>Confirmar e Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {modalPasswordAberto && (
                    <div className="modal-corte-overlay">
                        <div className="modal-corte-container" style={{ maxWidth: '400px' }}>
                            <div className="modal-header">
                                <h3>Segurança da Conta</h3>
                                <p>Atualiza a tua password de acesso.</p>
                            </div>

                            <div className="form-pessoal">
                                <div className="campo">
                                    <label>Password Atual</label>
                                    <input
                                        type="password"
                                        value={passAtual}
                                        onChange={(e) => setPassAtual(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                </div>

                                <div className="campo">
                                    <label>Nova Password</label>
                                    <input
                                        type="password"
                                        value={passNova}
                                        onChange={(e) => setPassNova(e.target.value)}
                                        autoComplete="new-password"
                                    />
                                </div>

                                <div className="campo">
                                    <label>Confirmar Nova Password</label>
                                    <input
                                        type="password"
                                        value={passConfirma}
                                        onChange={(e) => setPassConfirma(e.target.value)}
                                        autoComplete="new-password"
                                        className={passConfirma && passNova !== passConfirma ? 'input-erro' : ''}
                                    />
                                    {passConfirma && passNova !== passConfirma && (
                                        <span className="legenda-erro">As passwords não coincidem</span>
                                    )}
                                </div>

                                <div className="botoes-modal" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                    <button className="btn-modal-cancelar" style={{ flex: 1 }} onClick={fecharModalPassword}>Cancelar</button>
                                    <button
                                        className="btn-modal-confirmar"
                                        style={{ flex: 1 }}
                                        onClick={lidarComMudarPassword}
                                        disabled={!passAtual || !passNova || passNova !== passConfirma}
                                    >
                                        Atualizar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}