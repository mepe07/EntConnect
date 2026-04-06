import React, { useState, useEffect } from 'react'; 
import { InputComponent } from "~/components/input/input.component";
// Importamos o serviço das modalidades (tens de garantir que este ficheiro existe no teu frontend)
import { modalidadesService } from "~/services/modalidades.service";
import './modalidades.scss';

// Interface que espelha o teu DTO do backend
interface Modalidade {
    ID_Modalidade: number;
    Descricao: string;
}

export function Modalidades() {
    const [modalidades, setModalidades] = useState<Modalidade[]>([]); 
    const [termoPesquisa, setTermoPesquisa] = useState(''); 

    // ==========================================
    // LIGAR OS CABOS
    // ==========================================
    useEffect(() => {
        carregarModalidadesDoServidor();
    }, []);

    const carregarModalidadesDoServidor = async () => {
        try {
            const dadosReais = await modalidadesService.getModalidades();
            setModalidades(dadosReais);
        } catch (erro) {
            alert("Atenção: Não foi possível ligar ao servidor!");
        }
    };

    // ==========================================
    // LÓGICA DO MODAL TRANSFORMER (CREATE & UPDATE)
    // ==========================================
    const [modalAberto, setModalAberto] = useState(false);  
    const [modalidadeEmEdicao, setModalidadeEmEdicao] = useState<Modalidade | null>(null); 
    const [novaDescricao, setNovaDescricao] = useState(''); 

    // ABRIR modal de CRIAÇÃO
    const abrirModalNovo = () => {
        setModalidadeEmEdicao(null); 
        setNovaDescricao('');
        setModalAberto(true);
    };

    // ABRIR modal de EDIÇÃO
    const abrirModalEdicao = (modalidade: Modalidade) => {
        setModalidadeEmEdicao(modalidade); 
        setNovaDescricao(modalidade.Descricao); 
        setModalAberto(true);
    };

    const handleSalvarModalidade = async () => {
        // Validação simples para não enviar vazio
        if (!novaDescricao.trim()) {
            alert("O nome da modalidade não pode estar vazio!");
            return;
        }

       if (modalidadeEmEdicao) {
            // UPDATE REAL:
            try {
                const modalidadeAtualizadaDaBD = await modalidadesService.updateModalidade(modalidadeEmEdicao.ID_Modalidade, {
                    Descricao: novaDescricao,
                });
            
                setModalidades(modalidades.map(mod => 
                    mod.ID_Modalidade === modalidadeEmEdicao.ID_Modalidade ? modalidadeAtualizadaDaBD : mod
                ));
            } catch (erro) {
                console.error("Erro ao atualizar:", erro);
                alert("Erro ao tentar atualizar a modalidade na Base de Dados!");
                return; 
            }
        } else {
            // CREATE REAL:
            try {
                const novaModalidadeDaBD = await modalidadesService.createModalidade({
                    Descricao: novaDescricao,
                });
            
                setModalidades([...modalidades, novaModalidadeDaBD]);
            } catch (erro) {
                console.error("Erro ao criar:", erro);
                alert("Erro ao tentar guardar a modalidade na Base de Dados!");
                return; 
            }
        }

        // Sucesso: limpar e fechar
        setModalidadeEmEdicao(null);
        setModalAberto(false); 
    };

    // ==========================================
    // LÓGICA DE ELIMINAÇÃO (DELETE)
    // ==========================================
    const handleApagarModalidade = async (id: number) => {
        const confirmacao = window.confirm("Tens a certeza absoluta que queres apagar esta modalidade?");
        
        if (confirmacao) {
            try {
                await modalidadesService.deleteModalidade(id);
                setModalidades(modalidades.filter(mod => mod.ID_Modalidade !== id));
                alert("Modalidade apagada com sucesso!");
            } catch (erro: any) {
                alert(erro.message || "Erro ao apagar a modalidade.");
            }
        }
    };

    // ==========================================

    // Filtra apenas pelo nome (Descrição)
    const modalidadesFiltradas = modalidades.filter(mod =>
        mod.Descricao.toLowerCase().includes(termoPesquisa.toLowerCase())
    ); 

    return (
        <div className="crud-container">
            <div className="crud-header">
                <div className="textos">
                    <h1>Gestão de Modalidades</h1>
                    <p>Cria, edita e remove os estilos de dança da escola.</p>
                </div>
                
                <button className="btn-principal" onClick={abrirModalNovo}>
                    <i className="fa-solid fa-plus"></i> Nova Modalidade
                </button>
            </div>

            <div className="crud-toolbar">
                <div style={{ width: '300px' }}>
                    <InputComponent
                        id="pesquisa-modalidade"
                        placeholder="🔍 Procurar modalidade..."
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
                            <th>Nome da Modalidade</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {modalidadesFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="tabela-vazia">Nenhuma modalidade encontrada.</td>
                            </tr>
                        ) : (
                            modalidadesFiltradas.map((mod) => (
                                <tr key={mod.ID_Modalidade}>
                                    <td className="id-coluna">#{mod.ID_Modalidade}</td>
                                    <td><strong><i className="fa-solid fa-music text-gray"></i> {mod.Descricao}</strong></td>
                                    <td className="acoes-coluna">
                                        <button className="btn-icone editar" onClick={() => abrirModalEdicao(mod)}>
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                        
                                        <button className="btn-icone apagar" onClick={() => handleApagarModalidade(mod.ID_Modalidade)}>
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ========================================== */}
            {/* MODAL */}
            {/* ========================================== */}
            
            {modalAberto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{modalidadeEmEdicao ? "Editar Modalidade" : "Adicionar Nova Modalidade"}</h2>
                            <button className="btn-fechar" onClick={() => { setModalAberto(false); setModalidadeEmEdicao(null); }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
            
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Nome da Modalidade</label>
                                <InputComponent 
                                    id="nova-descricao" 
                                    placeholder="Ex: Hip-Hop, Ballet Clássico..." 
                                    value={novaDescricao}
                                    onChange={(e) => setNovaDescricao(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secundario" onClick={() => { setModalAberto(false); setModalidadeEmEdicao(null); }}>Cancelar</button>
                            
                            <button className="btn-primario" onClick={handleSalvarModalidade}>
                                {modalidadeEmEdicao ? "Guardar Alterações" : "Guardar Modalidade"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}