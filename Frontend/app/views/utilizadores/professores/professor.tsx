import { ButtonComponent } from '~/components/button/button.component';
import React, { useState, useEffect } from 'react';
import { InputComponent } from "~/components/input/input.component";
import './professor.scss';
import { professoresService } from '~/services/professor.service';
import { modalidadesService } from '~/services/modalidades.service';


import { showToast } from '~/components/toast/toast';
interface Professor {
    ID_Pessoa: number;
    Pessoa: {
        Nome: string;
        Email: string;
        Data_Nascimento: string;
        NIF: string;
        Contacto: string;
        Foto?: string;
    };
    Professor_Modalidade?: {
        ID_Modalidade: number;
        Modalidade: {
            ID_Modalidade: number;
            Descricao: string;
        };
    }[];
}

interface Modalidade {
    ID_Modalidade: number;
    Descricao: string;
}

export function Professores() {
    const [professores, setProfessores] = useState<Professor[]>([]);
    const [modalidades, setModalidades] = useState<Modalidade[]>([]);
    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [ultimaPagina, setUltimaPagina] = useState(1);
    const itensPorPagina = 20;
    const [totalProfessores, setTotalProfessores] = useState(0);


    const [modalAberto, setModalAberto] = useState(false);
    const [professorEmEdicao, setProfessorEmEdicao] = useState<Professor | null>(null);

    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [dataNascimento, setDataNascimento] = useState('');
    const [nif, setNif] = useState('');
    const [contacto, setContacto] = useState('');
    const [modalidadesSelecionadas, setModalidadesSelecionadas] = useState<number[]>([]);


    useEffect(() => {
        carregarProfessores();
        carregarModalidades();
    }, [paginaAtual]);

    const carregarModalidades = async () => {
        try {
            const data = await modalidadesService.getModalidades();
            setModalidades(data);
        } catch (erro) {
            showToast("Erro ao carregar modalidades.");
        }
    };

    const carregarProfessores = async () => {
        try {
            const resposta = await professoresService.getProfessores(paginaAtual);

            setProfessores(resposta.data);

            setTotalProfessores(resposta.meta.total);
            setUltimaPagina(Math.max(resposta.meta.lastPage, 1));
        } catch (erro) {
            showToast("Erro ao carregar a lista.");
        }
    };


    const abrirModalNovo = () => {
        setProfessorEmEdicao(null);
        setNome('');
        setEmail('');
        setDataNascimento('');
        setNif('');
        setContacto('');
        setModalidadesSelecionadas([]);
        setModalAberto(true);
    };

    const abrirModalEdicao = (prof: Professor) => {
        setProfessorEmEdicao(prof);
        setNome(prof.Pessoa.Nome);
        setEmail(prof.Pessoa.Email);


        const dataFormatada = prof.Pessoa.Data_Nascimento.split('T')[0];
        setDataNascimento(dataFormatada);

        setNif(prof.Pessoa.NIF);
        setContacto(prof.Pessoa.Contacto);
        setModalidadesSelecionadas(prof.Professor_Modalidade?.map((item) => item.ID_Modalidade) ?? []);
        setModalAberto(true);
    };


    const handleSalvar = async () => {


        if (!nome || !email || !nif || !contacto) {
            showToast("Por favor, preenche todos os campos obrigatórios (Nome, Email, NIF e Contacto).");
            return;
        }


        const payload = {
            Nome: nome,
            Email: email,
            Data_Nascimento: dataNascimento,
            NIF: nif,
            Contacto: contacto,
            modalidadesIds: modalidadesSelecionadas,
        };

        try {
            if (professorEmEdicao) {

                const profAtualizado = await professoresService.updateProfessor(professorEmEdicao.ID_Pessoa, payload);
                setProfessores(professores.map(p => p.ID_Pessoa === professorEmEdicao.ID_Pessoa ? profAtualizado : p));
            } else {

                const novoProf = await professoresService.createProfessor(payload);
                setProfessores([...professores, novoProf]);
            }

            setModalAberto(false);
        } catch (erro: any) {

            const mensagemErro = erro.response?.data?.message || "Erro ao guardar o professor.";
            showToast(mensagemErro);
        }
    };


    const handleApagar = async (id: number) => {
        const confirmacao = window.confirm("Tens a certeza absoluta que queres remover este professor?");
        if (confirmacao) {
            try {
                await professoresService.deleteProfessor(id);
                setProfessores(professores.filter(p => p.ID_Pessoa !== id));
            } catch (erro: any) {
                const mensagemErro = erro.response?.data?.message || "Erro ao apagar o professor.";
                showToast(mensagemErro);
            }
        }
    };


    const professoresFiltrados = professores.filter(prof =>
        prof.Pessoa.Nome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        prof.Pessoa.Email.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        prof.Pessoa.NIF.includes(termoPesquisa)
    );

    const irParaPagina = (pagina: number) => {
        if (pagina >= 1 && pagina <= ultimaPagina) setPaginaAtual(pagina);
    };

    const toggleModalidade = (idModalidade: number) => {
        setModalidadesSelecionadas((atuais) =>
            atuais.includes(idModalidade)
                ? atuais.filter((id) => id !== idModalidade)
                : [...atuais, idModalidade]
        );
    };

    return (
        <div className="crud-container">
            <div className="crud-header">
                <div className="textos">
                    <h1>Gestão de Professores</h1>
                    <p>Cria, edita e remove os docentes da escola.</p>
                </div>

                <ButtonComponent className="btn-principal" onClick={abrirModalNovo}>
                    <i className="fa-solid fa-plus"></i> Novo Professor
                </ButtonComponent>
            </div>

            <div className="crud-toolbar">
                <div style={{ width: '350px' }}>
                    <InputComponent
                        id="pesquisa-prof"
                        placeholder="🔍 Procurar por nome, email ou NIF..."
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
                            <th>Nome do Professor</th>
                            <th>Email</th>
                            <th>NIF</th>
                            <th>Contacto</th>
                            <th>Modalidades</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {professoresFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="tabela-vazia">Nenhum professor encontrado.</td>
                            </tr>
                        ) : (
                            professoresFiltrados.map((prof) => (
                                <tr key={prof.ID_Pessoa}>
                                    <td className="id-coluna">#{prof.ID_Pessoa}</td>
                                    <td><strong>{prof.Pessoa.Nome}</strong></td>
                                    <td><span className="text-gray">{prof.Pessoa.Email}</span></td>
                                    <td>{prof.Pessoa.NIF}</td>
                                    <td>{prof.Pessoa.Contacto}</td>
                                    <td>{prof.Professor_Modalidade?.map((item) => item.Modalidade.Descricao).join(', ') || 'Sem modalidades'}</td>
                                    <td className="acoes-coluna">
                                        <ButtonComponent className="btn-icone editar" onClick={() => abrirModalEdicao(prof)}>
                                            <i className="fa-solid fa-pen"></i>
                                        </ButtonComponent>
                                        <ButtonComponent className="btn-icone apagar" onClick={() => handleApagar(prof.ID_Pessoa)}>
                                            <i className="fa-solid fa-trash"></i>
                                        </ButtonComponent>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalProfessores > 0 && (
                <div className="paginacao">
                    <div className="paginacao-info">
                        <span>Mostrar</span>
                        <span className="paginacao-select paginacao-select-fixo">{itensPorPagina}</span>
                        <span>por página &mdash; {totalProfessores} resultado{totalProfessores !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="paginacao-controlos">
                        <ButtonComponent
                            className="btn-pagina"
                            onClick={() => irParaPagina(1)}
                            disabled={paginaAtual === 1}
                            title="Primeira página"
                        >
                            <i className="fa-solid fa-angles-left"></i>
                        </ButtonComponent>
                        <ButtonComponent
                            className="btn-pagina"
                            onClick={() => irParaPagina(paginaAtual - 1)}
                            disabled={paginaAtual === 1}
                            title="Página anterior"
                        >
                            <i className="fa-solid fa-angle-left"></i>
                        </ButtonComponent>
                        <span className="paginacao-paginas">
                            {Array.from({ length: ultimaPagina }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === ultimaPagina || Math.abs(p - paginaAtual) <= 1)
                                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, idx) =>
                                    p === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="paginacao-ellipsis">...</span>
                                    ) : (
                                        <ButtonComponent
                                            key={p}
                                            className={`btn-pagina ${paginaAtual === p ? 'ativo' : ''}`}
                                            onClick={() => irParaPagina(p as number)}
                                        >
                                            {p}
                                        </ButtonComponent>
                                    )
                                )
                            }
                        </span>
                        <ButtonComponent
                            className="btn-pagina"
                            onClick={() => irParaPagina(paginaAtual + 1)}
                            disabled={paginaAtual === ultimaPagina}
                            title="Próxima página"
                        >
                            <i className="fa-solid fa-angle-right"></i>
                        </ButtonComponent>
                        <ButtonComponent
                            className="btn-pagina"
                            onClick={() => irParaPagina(ultimaPagina)}
                            disabled={paginaAtual === ultimaPagina}
                            title="Última página"
                        >
                            <i className="fa-solid fa-angles-right"></i>
                        </ButtonComponent>
                    </div>
                </div>
            )}
            {modalAberto && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '700px' }}>
                        <div className="modal-header">
                            <h2>{professorEmEdicao ? "Editar Professor" : "Adicionar Novo Professor"}</h2>
                            <ButtonComponent className="btn-fechar" onClick={() => setModalAberto(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Nome Completo *</label>
                                <InputComponent
                                    id="prof-nome"
                                    placeholder="Ex: Ana Rita Silva"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Email *</label>
                                    <InputComponent
                                        id="prof-email"
                                        placeholder="ana.silva@escola.pt"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Data de Nascimento *</label>

                                    <input
                                        type="date"
                                        id="prof-data"
                                        className="input-component-style"
                                        value={dataNascimento}
                                        onChange={(e) => setDataNascimento(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontFamily: 'inherit' }}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>NIF *</label>
                                    <InputComponent
                                        id="prof-nif"
                                        placeholder="Ex: 123456789"
                                        value={nif}
                                        onChange={(e) => {

                                            const apenasNumeros = e.target.value.replace(/\D/g, '');
                                            setNif(apenasNumeros);
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Contacto Telefónico</label>
                                    <InputComponent
                                        id="prof-contacto"
                                        placeholder="Ex: 912345678"
                                        value={contacto}
                                        onChange={(e) => {

                                            const apenasNumeros = e.target.value.replace(/\D/g, '');
                                            setContacto(apenasNumeros);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Modalidades que pode lecionar</label>
                                <div className="modalidades-checkboxes">
                                    {modalidades.map((modalidade) => (
                                        <label key={modalidade.ID_Modalidade} className="modalidade-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={modalidadesSelecionadas.includes(modalidade.ID_Modalidade)}
                                                onChange={() => toggleModalidade(modalidade.ID_Modalidade)}
                                            />
                                            <span>{modalidade.Descricao}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <ButtonComponent className="btn-secundario" onClick={() => setModalAberto(false)}>Cancelar</ButtonComponent>
                            <ButtonComponent className="btn-primario" onClick={handleSalvar}>
                                {professorEmEdicao ? "Guardar Alterações" : "Registar Professor"}
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
