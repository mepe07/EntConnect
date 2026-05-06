

import React, { useState, useEffect, useRef } from 'react';
import { InputComponent } from '~/components/input/input.component';
import { ButtonComponent } from '~/components/button/button.component';
import { useSearchParams } from "react-router";
import { ConfirmacaoRemocaoAssociacoesEncarregadoError, UtilizadorService } from '~/services/users.service';
import { authService } from '~/services/auth.service';
import { API_BASE_URL } from '~/config/api.config';
import type { Educando } from '~/services/users.service';
import './utilizadores.scss';

const utilizadorService = new UtilizadorService();


interface Utilizador {
    idUtilizador: number;
    idPessoa: number;
    username: string;
    ativo: boolean;
    nome: string;
    email: string;
    contacto: string;
    nif: string;
    cargo: string;
    cargos?: string[];
}


const cargoLabel: Record<string, string> = {
    'Encarregado de Educação': 'Enc. Educação',
};

const CARGOS_DISPONIVEIS = [
    'Professor',
    'Coordenador',
    'Encarregado de Educação',
];

const obterCargosUtilizador = (utilizador?: Pick<Utilizador, 'cargo' | 'cargos'> | null) => {
    if (utilizador?.cargos?.length) return utilizador.cargos;
    return utilizador?.cargo ? [utilizador.cargo] : [];
};

const formatarCargos = (cargos: string[]) => cargos
    .map(cargo => cargoLabel[cargo] ?? cargo)
    .join(', ');

const cargosIguais = (a: string[], b: string[]) =>
    a.length === b.length && a.every(cargo => b.includes(cargo));

interface NovoUtilizadorForm {
    nome: string;
    username: string;
    email: string;
    contacto: string;
    nif: string;
    dataNascimento: string;
    cargos: string[];
    password: string;
    confirmarPassword: string;
}

type NovoUtilizadorErros = Partial<Record<keyof NovoUtilizadorForm, string>>;

interface EducandoForm {
    idAluno?: number;
    nome: string;
    dataNascimento: string;
    nif: string;
    mail: string;
    contato: string;
}

const FORM_VAZIO: NovoUtilizadorForm = {
    nome: '',
    username: '',
    email: '',
    contacto: '',
    nif: '',
    dataNascimento: '',
    cargos: [],
    password: '',
    confirmarPassword: '',
};

const EDUCANDO_FORM_VAZIO: EducandoForm = {
    nome: '',
    dataNascimento: '',
    nif: '',
    mail: '',
    contato: '',
};

export function Utilizadores() {
    const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);
    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [loading, setLoading] = useState(true);

    const [searchParams, setSearchParams] = useSearchParams();
    
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [itensPorPagina, setItensPorPagina] = useState(10);


    const [modalAberto, setModalAberto] = useState(false);
    const [utilizadorSelecionado, setUtilizadorSelecionado] = useState<Utilizador | null>(null);
    const [educandos, setEducandos] = useState<Educando[]>([]);
    const [alunosSemEncarregado, setAlunosSemEncarregado] = useState<Educando[]>([]);
    const [alunoParaAssociar, setAlunoParaAssociar] = useState('');
    const [educandoForm, setEducandoForm] = useState<EducandoForm>(EDUCANDO_FORM_VAZIO);
    const [erroEducandos, setErroEducandos] = useState('');
    const [loadingEducandos, setLoadingEducandos] = useState(false);
    const [loadingSaveEducando, setLoadingSaveEducando] = useState(false);
    const [loadingAssociarEducando, setLoadingAssociarEducando] = useState(false);


    const [editNome, setEditNome] = useState('');
    const [editContacto, setEditContacto] = useState('');
    const [editNif, setEditNif] = useState('');
    const [editCargos, setEditCargos] = useState<string[]>([]);
    const [erroDados, setErroDados] = useState('');
    const [loadingSaveDados, setLoadingSaveDados] = useState(false);


    const [novaPassword, setNovaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [erroPassword, setErroPassword] = useState('');


    const [fotoAtual, setFotoAtual] = useState<string | null>(null);
    const [fotoPreview, setFotoPreview] = useState<string | null>(null);
    const [ficheiroFoto, setFicheiroFoto] = useState<File | null>(null);
    const [loadingFoto, setLoadingFoto] = useState(false);
    const [erroFoto, setErroFoto] = useState('');
    const inputFotoRef = useRef<HTMLInputElement>(null);


    const [modalImportOpen, setModalImportOpen] = useState(false);
    const [loadingImport, setLoadingImport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const [modalCriarAberto, setModalCriarAberto] = useState(false);
    const [formNovo, setFormNovo] = useState<NovoUtilizadorForm>(FORM_VAZIO);
    const [mostrarPasswordNovo, setMostrarPasswordNovo] = useState(false);
    const [errosCriar, setErrosCriar] = useState<NovoUtilizadorErros>({});
    const [loadingCriar, setLoadingCriar] = useState(false);


    useEffect(() => {
        carregarUtilizadores();
    }, []);

    const carregarUtilizadores = async () => {
        setLoading(true);
        try {
            const dados = await utilizadorService.getUsers();
            setUtilizadores(dados);

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

    const isEncarregadoEducacao = (utilizador?: Utilizador | null) =>
        obterCargosUtilizador(utilizador)
            .some(cargo => cargo.toLowerCase().includes('encarregado'));

    const formatarDataInput = (data?: string | Date | null) => {
        if (!data) return '';
        return new Date(data).toISOString().split('T')[0];
    };

    const carregarEducandos = async (idEncEducacao: number) => {
        setLoadingEducandos(true);
        setErroEducandos('');
        try {
            const [dados, alunosLivres] = await Promise.all([
                utilizadorService.getEducandos(idEncEducacao),
                utilizadorService.getAlunosSemEncarregado(),
            ]);
            setEducandos(dados);
            setAlunosSemEncarregado(alunosLivres);
        } catch (error: any) {
            setEducandos([]);
            setAlunosSemEncarregado([]);
            setErroEducandos(error?.message || 'Erro ao carregar os educandos.');
        } finally {
            setLoadingEducandos(false);
        }
    };


    const abrirModal = async (utilizador: Utilizador) => {
        setUtilizadorSelecionado(utilizador);
        setEditNome(utilizador.nome || '');
        setEditContacto(utilizador.contacto || '');
        setEditNif(utilizador.nif || '');
        setEditCargos(obterCargosUtilizador(utilizador));
        setErroDados('');
        setNovaPassword('');
        setConfirmarPassword('');
        setMostrarPassword(false);
        setErroPassword('');
        setFotoPreview(null);
        setFicheiroFoto(null);
        setErroFoto('');
        setEducandos([]);
        setAlunosSemEncarregado([]);
        setAlunoParaAssociar('');
        setEducandoForm(EDUCANDO_FORM_VAZIO);
        setErroEducandos('');
        setModalAberto(true);

        try {
            const resultado = await utilizadorService.getFoto(utilizador.idUtilizador);
            setFotoAtual(resultado.url ?? null);
        } catch {
            setFotoAtual(null);
        }

        if (isEncarregadoEducacao(utilizador) && utilizador.idPessoa) {
            await carregarEducandos(utilizador.idPessoa);
        }
    };

    const fecharModal = () => {
        setModalAberto(false);
        setUtilizadorSelecionado(null);
        setEditNome('');
        setEditContacto('');
        setEditNif('');
        setEditCargos([]);
        setErroDados('');
        setFotoAtual(null);
        setFotoPreview(null);
        setFicheiroFoto(null);
        setEducandos([]);
        setAlunosSemEncarregado([]);
        setAlunoParaAssociar('');
        setEducandoForm(EDUCANDO_FORM_VAZIO);
        setErroEducandos('');
    };

    useEffect(() => {
        if (!loading && searchParams.get('novo') === 'true') {
            abrirModalCriar();
            
            // O parametro e consumido para evitar reabrir o modal ao navegar para tras.
            searchParams.delete('novo');
            setSearchParams(searchParams, { replace: true });
        }
    }, [loading, searchParams, setSearchParams]);

    const abrirModalCriar = () => {
        setFormNovo(FORM_VAZIO);
        setErrosCriar({});
        setMostrarPasswordNovo(false);
        setModalCriarAberto(true);
    };

    const fecharModalCriar = () => {
        setModalCriarAberto(false);
    };

    const handleFormNovo = (campo: keyof NovoUtilizadorForm, valor: string | string[]) => {
        setFormNovo(prev => ({ ...prev, [campo]: valor }));

        if (errosCriar[campo]) {
            setErrosCriar(prev => ({ ...prev, [campo]: '' }));
        }
    };

    const toggleCargoNovo = (cargo: string) => {
        const cargos = formNovo.cargos.includes(cargo)
            ? formNovo.cargos.filter(cargoAtual => cargoAtual !== cargo)
            : [...formNovo.cargos, cargo];

        handleFormNovo('cargos', cargos);
    };

    const toggleEditCargo = (cargo: string) => {
        setEditCargos(prev => prev.includes(cargo)
            ? prev.filter(cargoAtual => cargoAtual !== cargo)
            : [...prev, cargo]
        );
        setErroDados('');
    };
    
    const validarFormNovo = (): boolean => {
    const erros: NovoUtilizadorErros = {};

        if (!formNovo.nome.trim()) erros.nome = 'O nome é obrigatório.';
        if (!formNovo.username.trim()) erros.username = 'O username é obrigatório.';
        if (!formNovo.email.trim()) {
            erros.email = 'O email é obrigatório.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formNovo.email)) {
            erros.email = 'Introduz um email válido.';
        }
        if (formNovo.cargos.length === 0) erros.cargos = 'Seleciona pelo menos um cargo.';
        if (!formNovo.dataNascimento) erros.dataNascimento = 'A data de nascimento é obrigatória.';
        if (!formNovo.password) {
            erros.password = 'A password é obrigatória.';
        } else if (formNovo.password.length < 6) {
            erros.password = 'A password deve ter pelo menos 6 caracteres.';
        }
        if (!formNovo.confirmarPassword) {
            erros.confirmarPassword = 'Confirma a password.';
        } else if (formNovo.password !== formNovo.confirmarPassword) {
            erros.confirmarPassword = 'As passwords não coincidem.';
        }

        setErrosCriar(erros);
        return Object.keys(erros).length === 0;
    };

    const handleCriarUtilizador = async () => {
        if (!validarFormNovo()) return;

        setLoadingCriar(true);
        try {
            await utilizadorService.createUser({
                nome: formNovo.nome.trim(),
                username: formNovo.username.trim(),
                email: formNovo.email.trim(),
                contacto: formNovo.contacto.trim() || undefined,
                nif: formNovo.nif.trim() || undefined,
                dataNascimento: formNovo.dataNascimento,
                cargos: formNovo.cargos,
                password: formNovo.password,
            });
            alert('Utilizador criado com sucesso!');
            fecharModalCriar();
            carregarUtilizadores();
        } catch (error: any) {
            alert(error?.message || 'Erro ao criar o utilizador. Tenta novamente.');
        } finally {
            setLoadingCriar(false);
        }
    };


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

        const reader = new FileReader();
        reader.onload = (ev) => setFotoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleUploadFoto = async () => {
        if (!ficheiroFoto || !utilizadorSelecionado) {
            setErroFoto('Seleciona uma foto primeiro.');
            return;
        }

        setLoadingFoto(true);
        setErroFoto('');

        try {
            const resultado = await utilizadorService.uploadFoto(
                utilizadorSelecionado.idUtilizador,
                ficheiroFoto
            );

            const novaUrl = `${resultado.url}?t=${new Date().getTime()}`;
            setFotoAtual(novaUrl);
            setFotoPreview(null);
            setFicheiroFoto(null);

            setFotosUtilizadores(prev => ({
                ...prev,
                [utilizadorSelecionado.idUtilizador]: novaUrl
            }));

            alert('Foto de perfil atualizada com sucesso!');
        } catch (error: any) {
            console.error('Erro no upload:', error);
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


    const handleGuardarTudo = async () => {
        setErroDados('');
        setErroPassword('');


        if (!editNome.trim() || editNome.trim().length < 3) {
            setErroDados('O nome deve ter pelo menos 3 caracteres.');
            return;
        }
        if (editNif && !/^\d{9}$/.test(editNif)) {
            setErroDados('O NIF deve ter exatamente 9 dígitos numéricos.');
            return;
        }
        if (editContacto && !/^\d{9}$/.test(editContacto)) {
            setErroDados('O contacto deve ter exatamente 9 dígitos numéricos.');
            return;
        }


        if (editCargos.length === 0) {
            setErroDados('Seleciona pelo menos um cargo.');
            return;
        }

        const passwordPreenchida = novaPassword || confirmarPassword;
        if (passwordPreenchida) {
            if (novaPassword.length < 6) {
                setErroPassword('A password deve ter pelo menos 6 caracteres.');
                return;
            }
            if (novaPassword !== confirmarPassword) {
                setErroPassword('As passwords não coincidem.');
                return;
            }
        }

        setLoadingSaveDados(true);
        try {

            const cargosAtuais = obterCargosUtilizador(utilizadorSelecionado);

            if (!cargosIguais(editCargos, cargosAtuais)) {
                try {
                    await utilizadorService.updateCargo(utilizadorSelecionado!.idUtilizador, editCargos);
                } catch (error: any) {
                    if (error instanceof ConfirmacaoRemocaoAssociacoesEncarregadoError) {
                        const { alunosAssociados, inscricoesCoachingAssociadas } = error.impacto;
                        const confirmar = window.confirm(
                            `Este utilizador vai deixar de ser Encarregado de Educação.\n\n` +
                            `Ao confirmar, serão removidas as associações com:\n` +
                            `- ${alunosAssociados} aluno(s)\n` +
                            `- ${inscricoesCoachingAssociadas} inscrição(ões) de coaching\n\n` +
                            `Queres continuar?`
                        );

                        if (!confirmar) {
                            return;
                        }

                        await utilizadorService.updateCargo(utilizadorSelecionado!.idUtilizador, editCargos, true);
                    } else {
                        throw error;
                    }
                }
            }


            await utilizadorService.updatePessoal(utilizadorSelecionado!.idUtilizador, {
                nome: editNome.trim(),
                contacto: editContacto.trim() || undefined,
                nif: editNif.trim() || undefined,
            });

            const updated = {
                ...utilizadorSelecionado!,
                nome: editNome.trim(),
                contacto: editContacto.trim(),
                nif: editNif.trim(),
                cargo: editCargos[0] ?? 'Sem Cargo',
                cargos: editCargos,
            };
            setUtilizadorSelecionado(updated);
            setUtilizadores(prev =>
                prev.map(u => u.idUtilizador === updated.idUtilizador ? updated : u)
            );


            if (passwordPreenchida) {
                await utilizadorService.updatePassword(utilizadorSelecionado!.idUtilizador, novaPassword);
                setNovaPassword('');
                setConfirmarPassword('');
            }

            alert('Alterações guardadas com sucesso!');
        } catch (error: any) {
            setErroDados(error?.message || 'Erro ao guardar as alterações. Tenta novamente.');
        } finally {
            setLoadingSaveDados(false);
        }
    };

    const handleEducandoForm = (campo: keyof EducandoForm, valor: string) => {
        setEducandoForm(prev => ({ ...prev, [campo]: valor }));
        setErroEducandos('');
    };

    const handleEditarEducando = (educando: Educando) => {
        setEducandoForm({
            idAluno: educando.ID_aluno,
            nome: educando.Nome || '',
            dataNascimento: formatarDataInput(educando.Data_Nascimento),
            nif: educando.NIF || '',
            mail: educando.Mail || '',
            contato: educando.Contato || '',
        });
        setErroEducandos('');
    };

    const handleCancelarEducando = () => {
        setEducandoForm(EDUCANDO_FORM_VAZIO);
        setErroEducandos('');
    };

    const handleAssociarEducando = async () => {
        if (!utilizadorSelecionado?.idPessoa || !alunoParaAssociar) {
            setErroEducandos('Seleciona um aluno para associar.');
            return;
        }

        setLoadingAssociarEducando(true);
        setErroEducandos('');
        try {
            await utilizadorService.associateEducando(
                utilizadorSelecionado.idPessoa,
                Number(alunoParaAssociar)
            );
            setAlunoParaAssociar('');
            await carregarEducandos(utilizadorSelecionado.idPessoa);
        } catch (error: any) {
            setErroEducandos(error?.message || 'Erro ao associar o educando.');
        } finally {
            setLoadingAssociarEducando(false);
        }
    };

    const validarEducando = () => {
        if (!educandoForm.nome.trim() || educandoForm.nome.trim().length < 3) {
            return 'O nome do educando deve ter pelo menos 3 caracteres.';
        }
        if (!educandoForm.dataNascimento) {
            return 'A data de nascimento do educando e obrigatoria.';
        }
        if (!educandoForm.nif.trim()) {
            return 'O NIF do educando e obrigatorio.';
        }
        if (educandoForm.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(educandoForm.mail)) {
            return 'Introduz um email valido para o educando.';
        }
        return '';
    };

    const handleGuardarEducando = async () => {
        if (!utilizadorSelecionado?.idPessoa) return;

        const erro = validarEducando();
        if (erro) {
            setErroEducandos(erro);
            return;
        }

        setLoadingSaveEducando(true);
        setErroEducandos('');
        try {
            const payload = {
                nome: educandoForm.nome.trim(),
                dataNascimento: educandoForm.dataNascimento,
                nif: educandoForm.nif.trim(),
                mail: educandoForm.mail.trim() || undefined,
                contato: educandoForm.contato.trim() || undefined,
            };

            if (educandoForm.idAluno) {
                await utilizadorService.updateEducando(
                    utilizadorSelecionado.idPessoa,
                    educandoForm.idAluno,
                    payload
                );
            } else {
                await utilizadorService.createEducando(utilizadorSelecionado.idPessoa, payload);
            }

            setEducandoForm(EDUCANDO_FORM_VAZIO);
            await carregarEducandos(utilizadorSelecionado.idPessoa);
        } catch (error: any) {
            setErroEducandos(error?.message || 'Erro ao guardar o educando.');
        } finally {
            setLoadingSaveEducando(false);
        }
    };

    const handleRemoverEducando = async (educando: Educando) => {
        if (!utilizadorSelecionado?.idPessoa) return;

        const confirmacao = window.confirm(
            `Tens a certeza que queres remover "${educando.Nome}" da lista de educandos deste encarregado?`
        );
        if (!confirmacao) return;

        setLoadingEducandos(true);
        setErroEducandos('');
        try {
            await utilizadorService.removeEducando(utilizadorSelecionado.idPessoa, educando.ID_aluno);
            if (educandoForm.idAluno === educando.ID_aluno) {
                setEducandoForm(EDUCANDO_FORM_VAZIO);
            }
            await carregarEducandos(utilizadorSelecionado.idPessoa);
        } catch (error: any) {
            setErroEducandos(error?.message || 'Erro ao remover o educando.');
        } finally {
            setLoadingEducandos(false);
        }
    };


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


    const handleEliminarUtilizador = async (utilizador: Utilizador) => {
        const confirmacao = window.confirm(
            `Tens a certeza que queres eliminar o utilizador "${utilizador.nome}"?\nEsta ação é irreversível.`
        );
        if (!confirmacao) return;

        try {
            await utilizadorService.deleteUser(utilizador.idUtilizador);
            setUtilizadores(prev => prev.filter(u => u.idUtilizador !== utilizador.idUtilizador));
        } catch (error: any) {
            alert(error?.message || 'Erro ao eliminar o utilizador.');
        }
    };


    const lidarComUploadDireto = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoadingImport(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('entconnect_token') || authService.getToken();
            const response = await fetch(`${API_BASE_URL}/utilizador/importusersblob`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.mensagem || 'Utilizadores importados com sucesso!');
                setModalImportOpen(false);
                carregarUtilizadores();
            } else {
                const err = await response.json().catch(() => ({}));
                alert(err?.message || 'Erro ao processar a importação.');
            }
        } catch (error) {
            console.error('Erro na importação:', error);
            alert('Erro ao fazer upload. Tenta novamente.');
        } finally {
            setLoadingImport(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };


    const utilizadoresFiltrados = utilizadores.filter(u =>
        u.nome?.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        u.username?.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        u.email?.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        obterCargosUtilizador(u).some(cargo =>
            cargo.toLowerCase().includes(termoPesquisa.toLowerCase())
        )
    );

    const totalPaginas = Math.ceil(utilizadoresFiltrados.length / itensPorPagina);
    const indiceInicio = (paginaAtual - 1) * itensPorPagina;
    const utilizadoresPagina = utilizadoresFiltrados.slice(indiceInicio, indiceInicio + itensPorPagina);

    const irParaPagina = (pagina: number) => {
        if (pagina >= 1 && pagina <= totalPaginas) setPaginaAtual(pagina);
    };

    const handleItensPorPagina = (valor: number) => {
        setItensPorPagina(valor);
        setPaginaAtual(1);
    };

    const fotoModalSrc = fotoPreview ?? fotoAtual;


    const handleDownloadModelo = async () => {
        try {
            const token = localStorage.getItem('entconnect_token') || authService.getToken();


            const response = await fetch(`${API_BASE_URL}/utilizador/download-template`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error('Erro ao obter o ficheiro modelo do servidor.');
            }


            const blob = await response.blob();


            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'modelo_utilizadores.csv';


            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Erro no download:', error);
            alert('Não foi possível transferir o ficheiro modelo. Tenta novamente.');
        }
    };


    return (
        <div className="crud-container">


            <div className="crud-header">
                <div className="textos">
                    <h1>Gestão de Utilizadores</h1>
                    <p>Consulta, edita e gere o acesso dos utilizadores ao sistema.</p>
                </div>
                <div className="header-acoes">
                    <ButtonComponent
                        label="Criar Utilizador"
                        icon="fa-solid fa-user-plus"
                        onClick={abrirModalCriar}
                    />
                    <ButtonComponent
                        label="Importar Utilizadores"
                        icon="fa-solid fa-upload"
                        onClick={() => setModalImportOpen(true)}
                    />
                </div>
            </div>


            <div className="crud-toolbar">
                <div style={{ width: '320px' }}>
                    <InputComponent
                        id="pesquisa-utilizador"
                        placeholder="🔍 Pesquisar por nome, email ou cargo..."
                        value={termoPesquisa}
                        onChange={(e) => { setTermoPesquisa(e.target.value); setPaginaAtual(1); }}
                    />
                </div>
            </div>


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
                            utilizadoresPagina.map((u) => (
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
                                            {formatarCargos(obterCargosUtilizador(u))}
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
                                        <button
                                            className="btn-icone eliminar"
                                            title="Eliminar utilizador"
                                            onClick={() => handleEliminarUtilizador(u)}
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>


            {!loading && utilizadoresFiltrados.length > 0 && (
                <div className="paginacao">
                    <div className="paginacao-info">
                        <span>Mostrar</span>
                        <select
                            className="paginacao-select"
                            value={itensPorPagina}
                            onChange={(e) => handleItensPorPagina(Number(e.target.value))}
                        >
                            {[5, 10, 25, 50].map(n => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span>por página &mdash; {utilizadoresFiltrados.length} resultado{utilizadoresFiltrados.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="paginacao-controlos">
                        <button
                            className="btn-pagina"
                            onClick={() => irParaPagina(1)}
                            disabled={paginaAtual === 1}
                            title="Primeira página"
                        >
                            <i className="fa-solid fa-angles-left"></i>
                        </button>
                        <button
                            className="btn-pagina"
                            onClick={() => irParaPagina(paginaAtual - 1)}
                            disabled={paginaAtual === 1}
                            title="Página anterior"
                        >
                            <i className="fa-solid fa-angle-left"></i>
                        </button>
                        <span className="paginacao-paginas">
                            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaAtual) <= 1)
                                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, idx) =>
                                    p === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="paginacao-ellipsis">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            className={`btn-pagina ${paginaAtual === p ? 'ativo' : ''}`}
                                            onClick={() => irParaPagina(p as number)}
                                        >
                                            {p}
                                        </button>
                                    )
                                )
                            }
                        </span>
                        <button
                            className="btn-pagina"
                            onClick={() => irParaPagina(paginaAtual + 1)}
                            disabled={paginaAtual === totalPaginas}
                            title="Próxima página"
                        >
                            <i className="fa-solid fa-angle-right"></i>
                        </button>
                        <button
                            className="btn-pagina"
                            onClick={() => irParaPagina(totalPaginas)}
                            disabled={paginaAtual === totalPaginas}
                            title="Última página"
                        >
                            <i className="fa-solid fa-angles-right"></i>
                        </button>
                    </div>
                </div>
            )}


            {modalAberto && utilizadorSelecionado && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}>
                    <div className="modal-content">

                        <div className="modal-header">
                            <div className="modal-header-info">


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


                            <div className="secao-titulo">
                                <i className="fa-solid fa-circle-info"></i> Dados do Utilizador
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nome Completo</label>
                                    <input
                                        type="text"
                                        className="input-campo"
                                        value={editNome}
                                        onChange={(e) => { setEditNome(e.target.value); setErroDados(''); }}
                                        placeholder="Nome completo"
                                    />
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
                                <div className="form-group">
                                    <label>Contacto</label>
                                    <input
                                        type="text"
                                        className="input-campo"
                                        value={editContacto}
                                        onChange={(e) => { setEditContacto(e.target.value); setErroDados(''); }}
                                        placeholder="Ex: 912345678"
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>NIF</label>
                                    <input
                                        type="text"
                                        className="input-campo"
                                        value={editNif}
                                        onChange={(e) => { setEditNif(e.target.value); setErroDados(''); }}
                                        placeholder="Ex: 123456789"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Cargos</label>
                                    <div className="checkbox-list">
                                        {CARGOS_DISPONIVEIS.map(c => (
                                            <label key={c} className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={editCargos.includes(c)}
                                                    onChange={() => toggleEditCargo(c)}
                                                />
                                                <span>{c}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {erroDados && (
                                <div className="mensagem-erro">
                                    <i className="fa-solid fa-triangle-exclamation"></i> {erroDados}
                                </div>
                            )}

                            {isEncarregadoEducacao(utilizadorSelecionado) && (
                                <>
                                    <div className="separador"></div>

                                    <div className="secao-titulo">
                                        <i className="fa-solid fa-user-graduate"></i> Educandos
                                    </div>

                                    <div className="educandos-grid">
                                        <div className="educandos-lista">
                                            {loadingEducandos ? (
                                                <div className="educandos-vazio">
                                                    <i className="fa-solid fa-spinner fa-spin"></i> A carregar educandos...
                                                </div>
                                            ) : educandos.length === 0 ? (
                                                <div className="educandos-vazio">Sem educandos associados.</div>
                                            ) : (
                                                educandos.map((educando) => (
                                                    <div className="educando-item" key={educando.ID_aluno}>
                                                        <div>
                                                            <strong>{educando.Nome}</strong>
                                                                <span>
                                                                    NIF {educando.NIF}
                                                                {educando.Menor_Idade ? ' - Menor' : ''}
                                                                </span>
                                                        </div>
                                                        <div className="educando-acoes">
                                                            <button
                                                                type="button"
                                                                className="btn-educando"
                                                                title="Editar educando"
                                                                onClick={() => handleEditarEducando(educando)}
                                                            >
                                                                <i className="fa-solid fa-pen"></i>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn-educando remover"
                                                                title="Remover educando"
                                                                onClick={() => handleRemoverEducando(educando)}
                                                            >
                                                                <i className="fa-solid fa-trash"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="educando-form">
                                            <div className="associar-educando">
                                                <div className="educando-form-header">
                                                    <strong>Associar aluno existente</strong>
                                                </div>
                                                <div className="associar-educando-linha">
                                                    <select
                                                        className="input-campo"
                                                        value={alunoParaAssociar}
                                                        onChange={(e) => { setAlunoParaAssociar(e.target.value); setErroEducandos(''); }}
                                                        disabled={loadingEducandos || alunosSemEncarregado.length === 0}
                                                    >
                                                        <option value="">
                                                            {alunosSemEncarregado.length === 0
                                                                ? 'Sem alunos por associar'
                                                                : 'Seleciona um aluno...'}
                                                        </option>
                                                        {alunosSemEncarregado.map((aluno) => (
                                                            <option key={aluno.ID_aluno} value={aluno.ID_aluno}>
                                                                {aluno.Nome} - NIF {aluno.NIF}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        className="btn-guardar-educando"
                                                        onClick={handleAssociarEducando}
                                                        disabled={loadingAssociarEducando || !alunoParaAssociar}
                                                    >
                                                        {loadingAssociarEducando
                                                            ? <><i className="fa-solid fa-spinner fa-spin"></i> A associar...</>
                                                            : <><i className="fa-solid fa-link"></i> Associar</>
                                                        }
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="separador"></div>

                                            <div className="educando-form-header">
                                                <strong>{educandoForm.idAluno ? 'Editar educando' : 'Adicionar educando'}</strong>
                                                {educandoForm.idAluno && (
                                                    <button type="button" onClick={handleCancelarEducando}>
                                                        Cancelar
                                                    </button>
                                                )}
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>Nome *</label>
                                                    <input
                                                        type="text"
                                                        className="input-campo"
                                                        value={educandoForm.nome}
                                                        onChange={(e) => handleEducandoForm('nome', e.target.value)}
                                                        placeholder="Nome completo"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Data Nasc. *</label>
                                                    <input
                                                        type="date"
                                                        className="input-campo"
                                                        value={educandoForm.dataNascimento}
                                                        onChange={(e) => handleEducandoForm('dataNascimento', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row">
                                                <div className="form-group">
                                                    <label>NIF *</label>
                                                    <input
                                                        type="text"
                                                        className="input-campo"
                                                        value={educandoForm.nif}
                                                        onChange={(e) => handleEducandoForm('nif', e.target.value)}
                                                        placeholder="Ex: 123456789"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label>Contacto</label>
                                                    <input
                                                        type="text"
                                                        className="input-campo"
                                                        value={educandoForm.contato}
                                                        onChange={(e) => handleEducandoForm('contato', e.target.value)}
                                                        placeholder="Ex: 912345678"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label>Email</label>
                                                <input
                                                    type="email"
                                                    className="input-campo"
                                                    value={educandoForm.mail}
                                                    onChange={(e) => handleEducandoForm('mail', e.target.value)}
                                                    placeholder="email@exemplo.pt"
                                                />
                                            </div>

                                            {erroEducandos && (
                                                <div className="mensagem-erro">
                                                    <i className="fa-solid fa-triangle-exclamation"></i> {erroEducandos}
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className="btn-guardar-educando"
                                                onClick={handleGuardarEducando}
                                                disabled={loadingSaveEducando}
                                            >
                                                {loadingSaveEducando
                                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> A guardar...</>
                                                    : <><i className="fa-solid fa-floppy-disk"></i> {educandoForm.idAluno ? 'Guardar educando' : 'Adicionar educando'}</>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="separador"></div>


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
                                onClick={handleGuardarTudo}
                                disabled={loadingSaveDados}
                            >
                                {loadingSaveDados
                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> A guardar...</>
                                    : <><i className="fa-solid fa-floppy-disk"></i> Guardar Alterações</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {modalCriarAberto && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) fecharModalCriar(); }}>
                    <div className="modal-content">

                        <div className="modal-header">
                            <div className="modal-header-info">
                                <div className="modal-avatar" style={{ cursor: 'default' }}>
                                    <i className="fa-solid fa-user-plus" style={{ fontSize: '22px' }}></i>
                                </div>
                                <div>
                                    <h2>Novo Utilizador</h2>
                                    <span className="tag-estado small aviso">A criar</span>
                                </div>
                            </div>
                            <button className="btn-fechar" onClick={fecharModalCriar}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="modal-body">


                            <div className="secao-titulo">
                                <i className="fa-solid fa-circle-info"></i> Dados do Utilizador
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Nome Completo *</label>
                                    <input
                                        type="text"
                                        className={`input-campo ${errosCriar.nome ? 'input-erro' : ''}`}
                                        placeholder="Ex: João Silva"
                                        value={formNovo.nome}
                                        onChange={(e) => handleFormNovo('nome', e.target.value)}
                                    />
                                    {errosCriar.nome && (
                                        <span className="campo-erro">{errosCriar.nome}</span>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Username *</label>
                                    <input
                                        type="text"
                                        className={`input-campo ${errosCriar.username ? 'input-erro' : ''}`}
                                        placeholder="Ex: joao.silva"
                                        value={formNovo.username}
                                        onChange={(e) => handleFormNovo('username', e.target.value)}
                                    />
                                    {errosCriar.username && (
                                        <span className="campo-erro">{errosCriar.username}</span>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input
                                        type="email"
                                        className={`input-campo ${errosCriar.email ? 'input-erro' : ''}`}
                                        placeholder="Ex: joao@exemplo.com"
                                        value={formNovo.email}
                                        onChange={(e) => handleFormNovo('email', e.target.value)}
                                    />
                                    {errosCriar.email && (
                                        <span className="campo-erro">{errosCriar.email}</span>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label>Contacto</label>
                                    <input
                                        type="text"
                                        className="input-campo"
                                        placeholder="Ex: 912345678"
                                        value={formNovo.contacto}
                                        onChange={(e) => handleFormNovo('contacto', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>NIF</label>
                                    <input
                                        type="text"
                                        className="input-campo"
                                        placeholder="Ex: 123456789"
                                        value={formNovo.nif}
                                        onChange={(e) => handleFormNovo('nif', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Data de Nascimento *</label>
                                    <input
                                        type="date"
                                        className={`input-campo ${errosCriar.dataNascimento ? 'input-erro' : ''}`}
                                        value={formNovo.dataNascimento}
                                        onChange={(e) => handleFormNovo('dataNascimento', e.target.value)}
                                    />
                                    {errosCriar.dataNascimento && (
                                        <span className="campo-erro">{errosCriar.dataNascimento}</span>
                                    )}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cargos *</label>
                                    <div className={`checkbox-list ${errosCriar.cargos ? 'input-erro' : ''}`}>
                                        {CARGOS_DISPONIVEIS.map(c => (
                                            <label key={c} className="checkbox-option">
                                                <input
                                                    type="checkbox"
                                                    checked={formNovo.cargos.includes(c)}
                                                    onChange={() => toggleCargoNovo(c)}
                                                />
                                                <span>{c}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errosCriar.cargos && (
                                        <span className="campo-erro">{errosCriar.cargos}</span>
                                    )}
                                </div>
                            </div>

                            <div className="separador"></div>


                            <div className="secao-titulo">
                                <i className="fa-solid fa-key"></i> Definir Password
                            </div>

                            <div className="form-group password-group">
                                <label>Password *</label>
                                <div className="password-wrapper">
                                    <input
                                        type={mostrarPasswordNovo ? 'text' : 'password'}
                                        className={`${errosCriar.password ? 'input-erro' : ''}`}
                                        placeholder="Mínimo 6 caracteres"
                                        value={formNovo.password}
                                        onChange={(e) => handleFormNovo('password', e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn-toggle-password"
                                        onClick={() => setMostrarPasswordNovo(!mostrarPasswordNovo)}
                                        title={mostrarPasswordNovo ? 'Ocultar password' : 'Mostrar password'}
                                    >
                                        <i className={`fa-solid ${mostrarPasswordNovo ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    </button>
                                </div>
                                {errosCriar.password && (
                                    <span className="campo-erro">{errosCriar.password}</span>
                                )}
                            </div>

                            <div className="form-group password-group">
                                <label>Confirmar Password *</label>
                                <div className="password-wrapper">
                                    <input
                                        type={mostrarPasswordNovo ? 'text' : 'password'}
                                        className={`${errosCriar.confirmarPassword ? 'input-erro' : ''}`}
                                        placeholder="Repete a password"
                                        value={formNovo.confirmarPassword}
                                        onChange={(e) => handleFormNovo('confirmarPassword', e.target.value)}
                                    />
                                </div>
                                {errosCriar.confirmarPassword && (
                                    <span className="campo-erro">{errosCriar.confirmarPassword}</span>
                                )}
                            </div>

                        </div>

                        <div className="modal-footer">
                            <button className="btn-secundario" onClick={fecharModalCriar} disabled={loadingCriar}>
                                Cancelar
                            </button>
                            <button
                                className="btn-primario"
                                onClick={handleCriarUtilizador}
                                disabled={loadingCriar}
                            >
                                {loadingCriar
                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> A criar...</>
                                    : <><i className="fa-solid fa-user-plus"></i> Criar Utilizador</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}


            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={lidarComUploadDireto}
            />


            {modalImportOpen && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !loadingImport) setModalImportOpen(false); }}>
                    <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <div className="modal-header-info">
                                <div>
                                    <h2><i className="fa-solid fa-upload"></i> Importar Utilizadores</h2>
                                </div>
                            </div>
                            <button className="btn-fechar" onClick={() => setModalImportOpen(false)} disabled={loadingImport}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        <div className="modal-body">
                            <p>Seleciona um ficheiro Excel ou CSV com os dados dos utilizadores para importar.</p>


                            <div className="box-modelo-excel">
                                <div className="info-modelo">
                                    <i className="fa-solid fa-file-excel icone-excel"></i>
                                    <div>
                                        <strong>Precisas de um modelo?</strong>
                                        <span>Descarrega o ficheiro base para preencheres os dados corretamente.</span>
                                    </div>
                                </div>


                                <button
                                    type="button"
                                    onClick={handleDownloadModelo}
                                    className="btn-download-modelo"
                                >
                                    <i className="fa-solid fa-download"></i> Descarregar
                                </button>


                            </div>

                            {loadingImport && (
                                <div className="import-loading">
                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                    <span>A importar utilizadores...</span>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secundario" onClick={() => setModalImportOpen(false)} disabled={loadingImport}>
                                Cancelar
                            </button>
                            <button
                                className="btn-primario"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loadingImport}
                            >
                                {loadingImport
                                    ? <><i className="fa-solid fa-spinner fa-spin"></i> A importar...</>
                                    : <><i className="fa-solid fa-folder-open"></i> Selecionar Ficheiro</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
