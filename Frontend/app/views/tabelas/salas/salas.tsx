import React, { useState } from 'react'; // Importação do CSS específico para esta página
import { InputComponent } from "../../../components/input/input.component";
    import { SelectBoxComponent } from "../../../components/selectbox/selectbox.component";
import './salas.scss';


// Interface para representar os dados de uma sala
interface Sala {
    id: number;
    nome: string;
    disponivel: boolean;
    modalidade: string;
}

export function Salas() {
    const [salas, setSalas] = useState<Sala[]>([
        { id: 1, nome: 'Sala Ballet 5', disponivel: true, modalidade: 'Ballet' },
        { id: 2, nome: 'Sala Jazz 2', disponivel: false, modalidade: 'Jazz' },
    ]); 

    const [termoPesquisa, setTermoPesquisa] = useState(''); 

    // ==========================================
    // LÓGICA DO MODAL TRANSFORMER (CREATE & UPDATE)
    // ==========================================
    const [modalAberto, setModalAberto] = useState(false); 
    
    // NOVO: A memória que diz ao Modal se estamos a Editar ou a Criar
    const [salaEmEdicao, setSalaEmEdicao] = useState<Sala | null>(null);

    const [novoNome, setNovoNome] = useState(''); 
    const [novaModalidade, setNovaModalidade] = useState(''); 
    const [novaDisponibilidade, setNovaDisponibilidade] = useState(true); 

    // Função para ABRIR modal de CRIAÇÃO (Tudo limpo)
    const abrirModalNovo = () => {
        setSalaEmEdicao(null); // Dizemos ao modal: "Não há sala antiga, é para criar!"
        setNovoNome('');
        setNovaModalidade('');
        setNovaDisponibilidade(true);
        setModalAberto(true);
    };

    // NOVO: Função para ABRIR modal de EDIÇÃO (Tudo preenchido)
    const abrirModalEdicao = (sala: Sala) => {
        setSalaEmEdicao(sala); // Guardamos a sala que estamos a editar
        setNovoNome(sala.nome); // Injetamos o nome antigo no Input
        setNovaModalidade(sala.modalidade); // Injetamos a modalidade antiga
        setNovaDisponibilidade(sala.disponivel); // Injetamos a disponibilidade
        setModalAberto(true);
    };

    const handleSalvarSala = () => {
        if (!novoNome || !novaModalidade) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        if (salaEmEdicao) {
            // LÓGICA DE UPDATE: Se tínhamos uma sala na memória, vamos atualizá-la!
            // Usamos o .map() para percorrer a lista. Se for o ID que estamos a editar, substituímos os dados.
            setSalas(salas.map(s => 
                s.id === salaEmEdicao.id 
                    ? { ...s, nome: novoNome, disponivel: novaDisponibilidade, modalidade: novaModalidade } 
                    : s
            ));
        } else {
            // LÓGICA DE CREATE: O que tu já tinhas feito tão bem!
            const novaSala: Sala = {
                id: salas.length > 0 ? Math.max(...salas.map(s => s.id)) + 1 : 1,
                nome: novoNome,
                disponivel: novaDisponibilidade,
                modalidade: novaModalidade,
            };
            setSalas([...salas, novaSala]);
        }
        
        // Limpa a memória e fecha a janela
        setSalaEmEdicao(null);
        setModalAberto(false); 
    };

    // ==========================================
    // LÓGICA DE ELIMINAÇÃO (DELETE)
    // ==========================================
    const handleApagarSala = (id: number) => {
        // Validação de segurança para não apagar sem querer
        const confirmacao = window.confirm("Tens a certeza absoluta que queres apagar esta sala?");
        
        if (confirmacao) {
            // O .filter() atua como um atirador furtivo: cria uma nova lista deixando de fora apenas o ID escolhido!
            setSalas(salas.filter(sala => sala.id !== id));
        }
    };

    // ==========================================

    const salasFiltradas = salas.filter(sala =>
        sala.nome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        sala.modalidade.toLowerCase().includes(termoPesquisa.toLowerCase())
    ); 

    return (
        <div className="crud-container">
            <div className="crud-header">
                <div className="textos">
                    <h1>Gestão de Estúdios</h1>
                    <p>Cria, edita e verifica a disponibilidade das salas da escola.</p>
                </div>
                
                <button className="btn-principal" onClick={abrirModalNovo}>
                    <i className="fa-solid fa-plus"></i> Novo Estúdio
                </button>
            </div>

            <div className="crud-toolbar">
                <div style={{ width: '300px' }}>
                    <InputComponent
                        id="pesquisa-estudio"
                        placeholder="🔍 Procurar sala ou modalidade..."
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
                            <th>Nome da Sala</th>
                            <th>Modalidade</th>
                            <th>Estado</th>
                            <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salasFiltradas.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="tabela-vazia">Nenhum estúdio encontrado.</td>
                            </tr>
                        ) : (
                            salasFiltradas.map((sala) => (
                                <tr key={sala.id}>
                                    <td className="id-coluna">#{sala.id}</td>
                                    <td><strong>{sala.nome}</strong></td>
                                    <td><i className="fa-solid fa-music text-gray"></i> {sala.modalidade}</td>
                                    <td>
                                        <span className={`tag-estado ${sala.disponivel ? 'sucesso' : 'aviso'}`}>
                                            {sala.disponivel ? 'Livre' : 'Ocupada'}
                                        </span>
                                    </td>
                                    <td className="acoes-coluna">
                                        {/* LIGAMOS O BOTÃO AO MODAL DE EDIÇÃO PASSANDO A SALA ATUAL */}
                                        <button className="btn-icone editar" onClick={() => abrirModalEdicao(sala)}>
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                        
                                        {/* LIGAMOS O BOTÃO AO NOSSO SNIPER (DELETE) */}
                                        <button className="btn-icone apagar" onClick={() => handleApagarSala(sala.id)}>
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
            {/* O MODAL "TRANSFORMER" */}
            {/* ========================================== */}
            
            {modalAberto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            {/* LÓGICA: O Título muda consoante a memória (Edição vs Criação) */}
                            <h2>{salaEmEdicao ? "Editar Estúdio" : "Adicionar Novo Estúdio"}</h2>
                            <button className="btn-fechar" onClick={() => { setModalAberto(false); setSalaEmEdicao(null); }}>
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>
            
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Nome do Estúdio</label>
                                <InputComponent 
                                    id="novo-nome" 
                                    placeholder="Ex: Sala Mozart" 
                                    value={novoNome}
                                    onChange={(e) => setNovoNome(e.target.value)}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Modalidade Principal</label>
                                    <InputComponent 
                                        id="nova-modalidade" 
                                        placeholder="Ex: Ballet Clássico" 
                                        value={novaModalidade}
                                        onChange={(e) => setNovaModalidade(e.target.value)}
                                    />
                                </div>
                
                                <div className="form-group">
                                    <label>Disponibilidade</label>
                                    <SelectBoxComponent 
                                        id="nova-disponibilidade"
                                        selectedOption={novaDisponibilidade ? 'true' : 'false'}
                                        onChange={(e) => setNovaDisponibilidade(e.target.value === 'true')}
                                        options={[
                                            { value: 'true', label: '🟢 Livre para uso' },
                                            { value: 'false', label: '🔴 Ocupada/Inativa' }
                                        ]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secundario" onClick={() => { setModalAberto(false); setSalaEmEdicao(null); }}>Cancelar</button>
                            
                            {/* LÓGICA: O texto do botão também se adapta! */}
                            <button className="btn-primario" onClick={handleSalvarSala}>
                                {salaEmEdicao ? "Guardar Alterações" : "Guardar Estúdio"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
