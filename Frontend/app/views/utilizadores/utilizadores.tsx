// Ficheiro: app/views/utilizadores/utilizadores.tsx

import React, { useState, useEffect, useRef } from 'react';
import { InputComponent } from '~/components/input/input.component';
import { UtilizadorService } from '~/services/users.service';
import './utilizadores.scss';

const utilizadorService = new UtilizadorService();

// Interface alinhada com o que o backend realmente devolve em getAllUsers()
interface Utilizador {
    idUtilizador: number;
    username: string;
    ativo: boolean;
    nome: string;
    email: string;
    contacto: string;
    nif: string;
    cargo: string;
}

// Mapeamento de cargos para etiquetas mais curtas se necessário
const cargoLabel: Record<string, string> = {
    'Encarregado de Educação': 'Enc. Educação',
};

export function Utilizadores() {
    const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [loading, setLoading] = useState(true);

    // ==========================================
    // ESTADO DO MODAL
    // ==========================================
    const [modalAberto, setModalAberto] = useState(false);
    const [utilizadorSelecionado, setUtilizadorSelecionado] = useState<Utilizador | null>(null);

    // Password
    const [novaPassword, setNovaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [erroPassword, setErroPassword] = useState('');
    const [loadingSave, setLoadingSave] = useState(false);

    // Foto
    const [fotoAtual, setFotoAtual] = useState<string | null>(null);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);
    const [ficheiroFoto, setFicheiroFoto] = useState<File | null>(null);
    const [loadingFoto, setLoadingFoto] = useState(false);
    const [erroFoto, setErroFoto] = useState('');
    const inputFotoRef = useRef<HTMLInputElement>(null);

    // ==========================================
    // CARREGAR DADOS
    // ==========================================
    useEffect(() => {
        carregarUtilizadores();
    }, []);

    const carregarUtilizadores = async () => {
        setLoading(true);
        try {
            const dados = await utilizadorService.getUsers();
            setUtilizadores(dados);

            // 🔥 carregar fotos
            const fotos: Record<number, string | null> = {};

            await Promise.all(
                dados.map(async (u: Utilizador) => {
                    try {
                        const res = await utilizadorService.getFoto(u.idUtilizador);
                        fotos[u.idUtilizador] = res.url ?? null;
                    } catch {
                        fotos[u.idUtilizador] = null;
                    }
                })
            );

            setFotosUtilizadores(fotos);
        } catch {
            alert('Não foi possível ligar ao servidor!');
        } finally {
            setLoading(false);
        }
    };

    const [fotosUtilizadores, setFotosUtilizadores] =
        useState<Record<number, string | null>>({});

    // ==========================================
    // MODAL
    // ==========================================
    const abrirModal = async (utilizador: Utilizador) => {
        setUtilizadorSelecionado(utilizador);
        setNovaPassword('');
        setConfirmarPassword('');
        setMostrarPassword(false);
        setErroPassword('');
        setFotoPreview(null);
        setFicheiroFoto(null);
        setErroFoto('');
        setModalAberto(true);

        // Carrega a foto atual do utilizador
        try {
            const resultado = await utilizadorService.getFoto(utilizador.idUtilizador);
            setFotoAtual(resultado.url ?? null);
        } catch {
            setFotoAtual(null);
        }
    };

    const fecharModal = () => {
        setModalAberto(false);
        setUtilizadorSelecionado(null);
        setFotoAtual(null);
        setFotoPreview(null);
        setFicheiroFoto(null);
    };

    // ==========================================
    // FOTO
    // ==========================================
    const handleSelecionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setErroFoto('');

        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
        if (!tiposPermitidos.includes(file.type)) {
            setErroFoto('Formato inválido. Usa .jpg, .png ou .webp.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setErroFoto('A foto não pode ultrapassar 10MB.');
            return;
        }

        setFicheiroFoto(file);

        // Preview local antes de fazer upload
        const reader = new FileReader();
        reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleUploadFoto = async () => {
        // 1. Verificações de segurança
        if (!ficheiroFoto || !utilizadorSelecionado) {
            setErroFoto('Seleciona uma foto primeiro.');
            return;
        }

        setLoadingFoto(true);
        setErroFoto('');

        try {
            // 2. Criar o FormData
            const formData = new FormData();
            formData.append('file', ficheiroFoto);

            // 3. Obter o token (importante se o teu service não o fizer automaticamente)
            const token = localStorage.getItem('token');

            // 4. Chamada ao serviço
            // Nota: Se o teu service já define os headers, passamos apenas os dados.
            // Se o erro persistir, garante que o service NÃO define 'Content-Type' para multipart
            const resultado = await utilizadorService.uploadFoto(
                utilizadorSelecionado.idUtilizador, 
                ficheiroFoto
            );

            // 5. Sucesso: Atualizar estados locais
            const novaUrl = `${resultado.url}?t=${new Date().getTime()}`;
            
            setFotoAtual(novaUrl);
            setFotoPreview(null);
            setFicheiroFoto(null);

            // 6. Sincronizar a miniatura na tabela de utilizadores
            setFotosUtilizadores(prev => ({
                ...prev,
                [utilizadorSelecionado.idUtilizador]: novaUrl
            }));

            alert("Foto de perfil atualizada com sucesso!");

        } catch (error: any) {
            console.error("Erro no upload:", error);
            setErroFoto(error.message || 'Erro ao carregar a imagem para o servidor.');
        } finally {
            setLoadingFoto(false);
            if (inputFotoRef.current) inputFotoRef.current.value = '';
        }
    };

    const handleRemoverFoto = async () => {
        if (!utilizadorSelecionado) return;

        const confirmacao = window.confirm('Tens a certeza que queres remover a foto de perfil?');
        if (!confirmacao) return;

        setLoadingFoto(true);
        setErroFoto('');
        try {
            await utilizadorService.removerFoto(utilizadorSelecionado.idUtilizador);
            setFotoAtual(null);
            setFotoPreview(null);
            setFicheiroFoto(null);
        } catch {
            setErroFoto('Erro ao remover a foto. Tenta novamente.');
        } finally {
            setLoadingFoto(false);
        }
    };

    const handleCancelarFoto = () => {
        setFotoPreview(null);
        setFicheiroFoto(null);
        setErroFoto('');
        if (inputFotoRef.current) inputFotoRef.current.value = '';
    };

    // ==========================================
    // PASSWORD
    // ==========================================
    const handleGuardarPassword = async () => {
        setErroPassword('');

        if (!novaPassword) {
            setErroPassword('Por favor, introduz uma nova password.');
            return;
        }
        if (novaPassword.length < 6) {
            setErroPassword('A password deve ter pelo menos 6 caracteres.');
            return;
        }
        if (novaPassword !== confirmarPassword) {
            setErroPassword('As passwords não coincidem.');
            return;
        }

        setLoadingSave(true);
        try {
            await utilizadorService.updatePassword(utilizadorSelecionado!.idUtilizador, novaPassword);
            setNovaPassword('');
            setConfirmarPassword('');
        } catch {
            setErroPassword('Erro ao atualizar a password. Tenta novamente.');
        } finally {
            setLoadingSave(false);
        }
    };

    // ==========================================
    // BLOQUEAR / DESBLOQUEAR
    // ==========================================
    const handleToggleAtivo = async (utilizador: Utilizador) => {
        const acao = utilizador.ativo ? 'bloquear' : 'desbloquear';
        const confirmacao = window.confirm(
            `Tens a certeza que queres ${acao} o utilizador "${utilizador.nome}"?`
        );
        if (!confirmacao) return;

        try {
            if (utilizador.ativo) {
                await utilizadorService.blockUser(utilizador.idUtilizador);
            } else {
                await utilizadorService.unlockUser(utilizador.idUtilizador);
            }
            setUtilizadores(utilizadores.map(u =>
                u.idUtilizador === utilizador.idUtilizador
                    ? { ...u, ativo: !u.ativo }
                    : u
            ));
        } catch {
            alert(`Erro ao ${acao} o utilizador.`);
        }
    };

    // ==========================================
    // FILTRO
    // ==========================================
    const utilizadoresFiltrados = utilizadores.filter(u =>
        u.nome?.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        u.username?.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        u.email?.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        u.cargo?.toLowerCase().includes(termoPesquisa.toLowerCase())
    );

    // Foto a mostrar no modal: preview local tem prioridade sobre a foto guardada
    const fotoModalSrc = fotoPreview ?? fotoAtual;

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <div className="crud-container">

            {/* CABEÇALHO */}
            <div className="crud-header">
                <div className="textos">
                    <h1>Gestão de Utilizadores</h1>
                    <p>Consulta, edita e gere o acesso dos utilizadores ao sistema.</p>
                </div>
            </div>

            {/* BARRA DE PESQUISA */}
            <div className="crud-toolbar">
                <div style={{ width: '320px' }}>
                    <InputComponent
                        id="pesquisa-utilizador"
                        placeholder="🔍 Pesquisar por nome, email ou cargo..."
                        value={termoPesquisa}
                        onChange={(e) => setTermoPesquisa(e.target.value)}
                    />
                </div>
            </div>

            {/* TABELA */}
            <div className="tabela-wrapper">
                <table className="tabela-crud">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nome</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Cargo</th>
                            <th>Estado</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="tabela-loading">
                                    <i className="fa-solid fa-spinner fa-spin"></i> A carregar...
                                </td>
                            </tr>
                        ) : utilizadoresFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="tabela-vazia">Nenhum utilizador encontrado.</td>
                            </tr>
                        ) : (
                            utilizadoresFiltrados.map((u) => (
                                <tr key={u.idUtilizador}>
                                    <td className="id-coluna">#{u.idUtilizador}</td>
                                    <td>
                                        <div className="user-info">
                                            <div className="user-avatar">
                                                {fotosUtilizadores[u.idUtilizador] ? (
                                                    <img
                                                        src={fotosUtilizadores[u.idUtilizador]!}
                                                        alt={u.nome}
                                                    />
                                                ) : (
                                                    <span>
                                                        {u.nome?.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <strong>{u.nome}</strong>
                                        </div>
                                    </td>
                                    <td className="text-secondary">{u.username}</td>
                                    <td className="text-secondary">{u.email}</td>
                                    <td>
                                        <span className="tag-role">
                                            {cargoLabel[u.cargo] ?? u.cargo}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`tag-estado ${u.ativo ? 'sucesso' : 'aviso'}`}>
                                            {u.ativo ? 'Ativo' : 'Bloqueado'}
                                        </span>
                                    </td>
                                    <td className="acoes-coluna">
                                        <button
                                            className="btn-icone editar"
                                            title="Ver detalhes e editar"
                                            onClick={() => abrirModal(u)}
                                        >
                                            <i className="fa-solid fa-eye"></i>
                                        </button>
                                        <button
                                            className={`btn-icone ${u.ativo ? 'bloquear' : 'desbloquear'}`}
                                            title={u.ativo ? 'Bloquear utilizador' : 'Desbloquear utilizador'}
                                            onClick={() => handleToggleAtivo(u)}
                                        >
                                            <i className={`fa-solid ${u.ativo ? 'fa-lock' : 'fa-lock-open'}`}></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ==========================================
                MODAL DE VISUALIZAÇÃO / EDIÇÃO
            ========================================== */}
            {modalAberto && utilizadorSelecionado && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}>
                    <div className="modal-content">

                        <div className="modal-header">
                            <div className="modal-header-info">

                                {/* AVATAR CLICÁVEL */}
                                <div className="modal-avatar-wrapper">
                                    <div
                                        className="modal-avatar"
                                        onClick={() => inputFotoRef.current?.click()}
                                        title="Clica para alterar a foto"
                                    >
                                        {fotoModalSrc ? (
                                            <img src={fotoModalSrc} alt="Foto de perfil" />
                                        ) : (
                                            <span>{utilizadorSelecionado.nome?.charAt(0).toUpperCase()}</span>
                                        )}
                                        <div className="avatar-overlay">
                                            <i className="fa-solid fa-camera"></i>
                                        </div>
                                    </div>
                                    <input
                                        ref={inputFotoRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        style={{ display: 'none' }}
                                        onChange={handleSelecionarFoto}
                                    />
                                </div>

                                <div>
                                    <h2>{utilizadorSelecionado.nome}</h2>
                                    <span className={`tag-estado small ${utilizadorSelecionado.ativo ? 'sucesso' : 'aviso'}`}>
                                        {utilizadorSelecionado.ativo ? 'Ativo' : 'Bloqueado'}
                                    </span>
                                </div>
                            </div>
                            <button className="btn-fechar" onClick={fecharModal}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="modal-body">

                            {/* BARRA DE AÇÕES DA FOTO */}
                            {(ficheiroFoto || fotoAtual) && (
                                <div className="foto-actions">
                                    {ficheiroFoto ? (
                                        <>
                                            <span className="foto-nome">
                                                <i className="fa-solid fa-image"></i> {ficheiroFoto.name}
                                            </span>
                                            <button
                                                className="btn-foto confirmar"
                                                onClick={handleUploadFoto}
                                                disabled={loadingFoto}
                                            >
                                                {loadingFoto
                                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> A enviar...</>
                                                    : <><i className="fa-solid fa-upload"></i> Confirmar</>
                                                }
                                            </button>
                                            <button className="btn-foto cancelar" onClick={handleCancelarFoto}>
                                                Cancelar
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            className="btn-foto remover"
                                            onClick={handleRemoverFoto}
                                            disabled={loadingFoto}
                                        >
                                            {loadingFoto
                                                ? <><i className="fa-solid fa-spinner fa-spin"></i> A remover...</>
                                                : <><i className="fa-solid fa-trash"></i> Remover foto</>
                                            }
                                        </button>
                                    )}
                                </div>
                            )}

                            {erroFoto && (
                                <div className="mensagem-erro">
                                    <i className="fa-solid fa-triangle-exclamation"></i> {erroFoto}
                                </div>
                            )}

                            {/* DADOS DO UTILIZADOR */}
                            <div className="secao-titulo">
                                <i className="fa-solid fa-circle-info"></i> Dados do Utilizador
                            </div>

                            <div className="form-row">
                                <div className="form-group readonly">
                                    <label>Nome Completo</label>
                                    <div className="input-readonly">{utilizadorSelecionado.nome}</div>
                                </div>
                                <div className="form-group readonly">
                                    <label>Username</label>
                                    <div className="input-readonly">{utilizadorSelecionado.username}</div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group readonly">
                                    <label>Email</label>
                                    <div className="input-readonly">{utilizadorSelecionado.email}</div>
                                </div>
                                <div className="form-group readonly">
                                    <label>Contacto</label>
                                    <div className="input-readonly">{utilizadorSelecionado.contacto || '—'}</div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group readonly">
                                    <label>NIF</label>
                                    <div className="input-readonly">{utilizadorSelecionado.nif || '—'}</div>
                                </div>
                                <div className="form-group readonly">
                                    <label>Cargo</label>
                                    <div className="input-readonly">
                                        {cargoLabel[utilizadorSelecionado.cargo] ?? utilizadorSelecionado.cargo}
                                    </div>
                                </div>
                            </div>

                            <div className="separador"></div>

                            {/* PASSWORD */}
                            <div className="secao-titulo">
                                <i className="fa-solid fa-key"></i> Alterar Password
                            </div>

                            <div className="form-group password-group">
                                <label>Nova Password</label>
                                <div className="password-wrapper">
                                    <input
                                        id="nova-password"
                                        type={mostrarPassword ? 'text' : 'password'}
                                        placeholder="Mínimo 6 caracteres"
                                        value={novaPassword}
                                        onChange={(e) => { setNovaPassword(e.target.value); setErroPassword(''); }}
                                        className={erroPassword ? 'input-erro' : ''}
                                    />
                                    <button
                                        type="button"
                                        className="btn-toggle-password"
                                        onClick={() => setMostrarPassword(!mostrarPassword)}
                                        title={mostrarPassword ? 'Ocultar password' : 'Mostrar password'}
                                    >
                                        <i className={`fa-solid ${mostrarPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="form-group password-group">
                                <label>Confirmar Nova Password</label>
                                <div className="password-wrapper">
                                    <input
                                        id="confirmar-password"
                                        type={mostrarPassword ? 'text' : 'password'}
                                        placeholder="Repete a nova password"
                                        value={confirmarPassword}
                                        onChange={(e) => { setConfirmarPassword(e.target.value); setErroPassword(''); }}
                                        className={erroPassword ? 'input-erro' : ''}
                                    />
                                </div>
                            </div>

                            {erroPassword && (
                                <div className="mensagem-erro">
                                    <i className="fa-solid fa-triangle-exclamation"></i> {erroPassword}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secundario" onClick={fecharModal}>
                                Fechar
                            </button>
                            <button
                                className="btn-primario"
                                onClick={handleGuardarPassword}
                                disabled={loadingSave}
                            >
                                {loadingSave
                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> A guardar...</>
                                    : <><i className="fa-solid fa-floppy-disk"></i> Guardar Alterações</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}