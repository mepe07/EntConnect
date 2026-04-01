// Ficheiro: app/views/tabelas/salas/salas.tsx

// LÓGICA: Adicionamos o useEffect aos imports do React!
import React, { useState, useEffect } from 'react'; 
import { InputComponent } from "~/components/input/input.component";
import { SelectBoxComponent } from "~/components/selectbox/selectbox.component";
// LÓGICA: Importamos o nosso Estafeta!
import { salasService } from "~/services/salas.service";
import './salas.scss';

// Interface para representar os dados de uma sala
interface Sala {
    ID_Sala: number;
    Nome: string;
    Disponivel: boolean;
    Modalidade: string;
}

export function Salas() {
    const [salas, setSalas] = useState<Sala[]>([]); 
    const [termoPesquisa, setTermoPesquisa] = useState(''); 

    // ==========================================
    // LIGAR OS CABOS
    // ==========================================

    // O useEffect com um array vazio [] no final significa: "Executa isto APENAS 1 VEZ quando a página abre"
    useEffect(() => {
        carregarSalasDoServidor();
    }, []);

    const carregarSalasDoServidor = async () => {
        try {
            // Mandamos o estafeta ir buscar os dados e ESPERAMOS (await)
            const dadosReais = await salasService.getSalas();
            setSalas(dadosReais);
        } catch (erro) {
            alert("Atenção: Não foi possível ligar ao servidor!");
        }
    };

    // ==========================================
    // LÓGICA DO MODAL TRANSFORMER (CREATE & UPDATE)
    // ==========================================
    const [modalAberto, setModalAberto] = useState(false);  
    const [salaEmEdicao, setSalaEmEdicao] = useState<Sala | null>(null); // A memória que diz ao Modal se estamos a Editar ou a Criar

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
        setNovoNome(sala.Nome); // Injetamos o nome antigo no Input
        setNovaModalidade(sala.Modalidade); // Injetamos a modalidade antiga
        setNovaDisponibilidade(sala.Disponivel); // Injetamos a disponibilidade
        setModalAberto(true);
    };

    // FUNÇÃO CORRIGIDA SEM ZOMBIES!
    const handleSalvarSala = async () => {
        if (salaEmEdicao) {
            // UPDATE: (Ainda não criámos isto no salas.service, por isso deixo só um alerta por agora)
            alert("O Update no Backend vai ser o próximo passo!");
        } else {
            // CREATE REAL:
            try {
                // Mandamos o Estafeta criar a sala e esperamos que o NestJS devolva a sala com o ID verdadeiro!
                const novaSalaDaBD = await salasService.createSala({
                    nome: novoNome,
                    modalidade: novaModalidade,
                    disponivel: novaDisponibilidade
                });
            
                // Adicionamos a sala real que veio do SQL Server à nossa lista visual no ecrã
                setSalas([...salas, novaSalaDaBD]);

            } catch (erro) {
                // Imprimir o erro verdadeiro na consola (F12) para o detetive investigar caso o servidor falhe
                console.error("O estafeta tropeçou! Eis o relatório do acidente:", erro);
                alert("Erro ao tentar guardar o estúdio na Base de Dados!");
                
                // O return é vital: funciona como um travão de mão. Se der erro, ele sai da função aqui 
                // e não chega às linhas de baixo que fecham o modal.
                return; 
            }
        }

        // Se o código chegou até aqui sem bater no 'return' lá de cima, é porque foi tudo um sucesso!
        // Podemos limpar a memória e fechar as portas do modal.
        setSalaEmEdicao(null);
        setModalAberto(false); 
    };

    // ==========================================
    // LÓGICA DE ELIMINAÇÃO (DELETE)
    // ==========================================
    const handleApagarSala = async (id: number) => {
        const confirmacao = window.confirm("Tens a certeza absoluta que queres apagar esta sala?");
        
        if (confirmacao) {
            try {
                await salasService.deleteSala(id);
                setSalas(salas.filter(sala => sala.ID_Sala !== id));
                alert("Sala apagada com sucesso da Base de Dados!");
            } catch (erro: any) {
                // Em vez do texto estático, usamos a mensagem que o Estafeta nos trouxe
                alert(erro.message);
            }
        }
    };

    // ==========================================

    const salasFiltradas = salas.filter(sala =>
        sala.Nome.toLowerCase().includes(termoPesquisa.toLowerCase()) ||
        sala.Modalidade.toLowerCase().includes(termoPesquisa.toLowerCase())
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
                                <tr key={sala.ID_Sala}>
                                    <td className="id-coluna">#{sala.ID_Sala}</td>
                                    <td><strong>{sala.Nome}</strong></td>
                                    <td><i className="fa-solid fa-music text-gray"></i> {sala.Modalidade}</td>
                                    <td>
                                        <span className={`tag-estado ${sala.Disponivel ? 'sucesso' : 'aviso'}`}>
                                            {sala.Disponivel ? 'Livre' : 'Ocupada'}
                                        </span>
                                    </td>
                                    <td className="acoes-coluna">
                                        <button className="btn-icone editar" onClick={() => abrirModalEdicao(sala)}>
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                        
                                        <button className="btn-icone apagar" onClick={() => handleApagarSala(sala.ID_Sala)}>
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