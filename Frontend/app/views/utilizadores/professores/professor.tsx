import React, { useState, useEffect } from 'react';
import { InputComponent } from "~/components/input/input.component";
import './professor.scss'; // Podes copiar o scss das modalidades e mudar o nome!
import { professoresService } from '~/services/professor.service';

// Interface que espelha exatamente o que o NestJS + Prisma nos devolvem
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
}

/**
 * Vista administrativa de gestão de professores.
 */
export function Professores() {
    const [professores, setProfessores] = useState<Professor[]>([]);
    const [termoPesquisa, setTermoPesquisa] = useState('');
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [ultimaPagina, setUltimaPagina] = useState(1);

    // ==========================================
    // ESTADOS DO FORMULÁRIO (DTO)
    // ==========================================
    const [modalAberto, setModalAberto] = useState(false);
    const [professorEmEdicao, setProfessorEmEdicao] = useState<Professor | null>(null);

    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [dataNascimento, setDataNascimento] = useState('');
    const [nif, setNif] = useState('');
    const [contacto, setContacto] = useState('');

    // ==========================================
    // LIGAR OS CABOS
    // ==========================================
    useEffect(() => {
        carregarProfessores();
    }, [paginaAtual]);

    const carregarProfessores = async () => {
        try {
            const resposta = await professoresService.getProfessores(paginaAtual);
            // Agora os professores estão dentro de .data
            setProfessores(resposta.data);
            // Guardamos o limite de páginas que vem do backend meta.lastPage
            setUltimaPagina(resposta.meta.lastPage);
        } catch (erro) {
            alert("Erro ao carregar a lista.");
        }
    };

    // ==========================================
    // LÓGICA DO MODAL (ABRIR PARA CRIAR / EDITAR)
    // ==========================================
    const abrirModalNovo = () => {
        setProfessorEmEdicao(null);
        setNome('');
        setEmail('');
        setDataNascimento('');
        setNif('');
        setContacto('');
        setModalAberto(true);
    };

    const abrirModalEdicao = (prof: Professor) => {
        setProfessorEmEdicao(prof);
        setNome(prof.Pessoa.Nome);
        setEmail(prof.Pessoa.Email);

        // A data vem do backend como ISO (ex: 1990-05-20T00:00:00.000Z).
        // Para colocar no input type="date", precisamos apenas do "YYYY-MM-DD"
        const dataFormatada = prof.Pessoa.Data_Nascimento.split('T')[0];
        setDataNascimento(dataFormatada);

        setNif(prof.Pessoa.NIF);
        setContacto(prof.Pessoa.Contacto);
        setModalAberto(true);
    };

    // ==========================================
    // GUARDAR NA BASE DE DADOS (POST / PATCH)
    // ==========================================
    const handleSalvar = async () => {
        // Validação básica
        // Validação básica
        if (!nome || !email || !nif || !contacto) {
            alert("Por favor, preenche todos os campos obrigatórios (Nome, Email, NIF e Contacto).");
            return;
        }

        // O objeto que vamos enviar para o NestJS (igual ao DTO)
        const payload = {
            Nome: nome,
            Email: email,
            Data_Nascimento: dataNascimento,
            NIF: nif,
            Contacto: contacto
        };

        try {
            if (professorEmEdicao) {
                // EDITAR (PATCH)
                const profAtualizado = await professoresService.updateProfessor(professorEmEdicao.ID_Pessoa, payload);
                setProfessores(professores.map(p => p.ID_Pessoa === professorEmEdicao.ID_Pessoa ? profAtualizado : p));
            } else {
                // CRIAR NOVO (POST)
                const novoProf = await professoresService.createProfessor(payload);
                setProfessores([...professores, novoProf]);
            }

            setModalAberto(false);
        } catch (erro: any) {
            // Apanha a mensagem de conflito do NIF/Email enviada pelo backend
            const mensagemErro = erro.response?.data?.message || "Erro ao guardar o professor.";
            alert(mensagemErro);
        }
    };

    // ==========================================
    // ELIMINAR (DELETE)
    // ==========================================
    const handleApagar = async (id: number) => {
        const confirmacao = window.confirm("Tens a certeza absoluta que queres remover este professor?");
        if (confirmacao) {
            try {
                await professoresService.deleteProfessor(id);
                setProfessores(professores.filter(p => p.ID_Pessoa !== id));
            } catch (erro: any) {
                const mensagemErro = erro.response?.data?.message || "Erro ao apagar o professor.";
                alert(mensagemErro);
            }
        }
    };

    // ==========================================
    // PESQUISA
    // ==========================================
    const professoresFiltrados = professores.filter(prof =>
        prof.Pessoa.Nome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        prof.Pessoa.Email.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        prof.Pessoa.NIF.includes(termoPesquisa)
    );

    return (
        <div className="crud-container">
            <div className="crud-header">
                <div className="textos">
                    <h1>Gestão de Professores</h1>
                    <p>Cria, edita e remove os docentes da escola.</p>
                </div>

                <button className="btn-principal" onClick={abrirModalNovo}>
                    <i className="fa-solid fa-plus"></i> Novo Professor
                </button>
            </div>

            <div className="crud-toolbar">
                <div style={{ width: '350px' }}>
                    <InputComponent
                        id="pesquisa-prof"
                        placeholder="🔍 Procurar por nome, email ou NIF..."
                        value={termoPesquisa}
                        onChange={(e) => setTermoPesquisa(e.target.value)}
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
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {professoresFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="tabela-vazia">Nenhum professor encontrado.</td>
                            </tr>
                        ) : (
                            professoresFiltrados.map((prof) => (
                                <tr key={prof.ID_Pessoa}>
                                    <td className="id-coluna">#{prof.ID_Pessoa}</td>
                                    <td><strong>{prof.Pessoa.Nome}</strong></td>
                                    <td><span className="text-gray">{prof.Pessoa.Email}</span></td>
                                    <td>{prof.Pessoa.NIF}</td>
                                    <td>{prof.Pessoa.Contacto}</td>
                                    <td className="acoes-coluna">
                                        <button className="btn-icone editar" onClick={() => abrirModalEdicao(prof)}>
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                        <button className="btn-icone apagar" onClick={() => handleApagar(prof.ID_Pessoa)}>
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="paginacao-container">
                    <button
                        className="btn-paginacao"
                        disabled={paginaAtual === 1}
                        onClick={() => setPaginaAtual(prev => prev - 1)}
                    >
                        <i className="fa-solid fa-chevron-left"></i> Anterior
                    </button>

                    <span className="info-paginas">
                        Página <strong>{paginaAtual}</strong> de {ultimaPagina}
                    </span>

                    <button
                        className="btn-paginacao"
                        disabled={paginaAtual === ultimaPagina}
                        onClick={() => setPaginaAtual(prev => prev + 1)}
                    >
                        Próximo <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>

            {/* ========================================== */}
            {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
            {/* ========================================== */}
            {modalAberto && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '700px' }}> {/* Um pouco mais largo para caberem 2 colunas bem */}
                        <div className="modal-header">
                            <h2>{professorEmEdicao ? "Editar Professor" : "Adicionar Novo Professor"}</h2>
                            <button className="btn-fechar" onClick={() => setModalAberto(false)}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
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
                                    {/* Usamos input nativo para aproveitar o calendário do browser */}
                                    <input
                                        type="date"
                                        id="prof-data"
                                        className="input-component-style" // Garante que estilizas isto no SCSS parecido ao teu InputComponent
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
                                            // Remove tudo o que não for número antes de guardar no estado
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
                                            // Remove tudo o que não for número (permite formatar livremente)
                                            const apenasNumeros = e.target.value.replace(/\D/g, '');
                                            setContacto(apenasNumeros);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secundario" onClick={() => setModalAberto(false)}>Cancelar</button>
                            <button className="btn-primario" onClick={handleSalvar}>
                                {professorEmEdicao ? "Guardar Alterações" : "Registar Professor"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
