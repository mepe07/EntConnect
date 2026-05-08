import { ButtonComponent } from '~/components/button/button.component';
import { showToast } from '~/components/toast/toast';



import React, { useState, useEffect } from 'react';
import { InputComponent } from "~/components/input/input.component";
import { SelectBoxComponent } from "~/components/selectbox/selectbox.component";

import { salasService } from "~/services/salas.service";
import './salas.scss';


interface Sala {
    ID_Sala: number;
    Nome: string;
    Disponivel: boolean;
    Modalidade: string;
}

export function Salas() {
    const [salas, setSalas] = useState<Sala[]>([]);
    const [termoPesquisa, setTermoPesquisa] = useState('');


    useEffect(() => {
        carregarSalasDoServidor();
    }, []);

    const carregarSalasDoServidor = async () => {
        try {

            const dadosReais = await salasService.getSalas();
            setSalas(dadosReais);
        } catch (erro) {
            showToast("Atenção: Não foi possível ligar ao servidor!");
        }
    };


    const [modalAberto, setModalAberto] = useState(false);
    const [salaEmEdicao, setSalaEmEdicao] = useState<Sala | null>(null);

    const [novoNome, setNovoNome] = useState('');
    const [novaModalidade, setNovaModalidade] = useState('');
    const [novaDisponibilidade, setNovaDisponibilidade] = useState(true);


    const abrirModalNovo = () => {
        setSalaEmEdicao(null);
        setNovoNome('');
        setNovaModalidade('');
        setNovaDisponibilidade(true);
        setModalAberto(true);
    };


    const abrirModalEdicao = (sala: Sala) => {
        setSalaEmEdicao(sala);
        setNovoNome(sala.Nome);
        setNovaModalidade(sala.Modalidade);
        setNovaDisponibilidade(sala.Disponivel);
        setModalAberto(true);
    };


    const handleSalvarSala = async () => {
       if (salaEmEdicao) {

        try {

            const salaAtualizadaDaBD = await salasService.updateSala(salaEmEdicao.ID_Sala, {
                nome: novoNome,
                modalidade: novaModalidade,
                disponivel: novaDisponibilidade
            });


            setSalas(salas.map(sala =>
                sala.ID_Sala === salaEmEdicao.ID_Sala ? salaAtualizadaDaBD : sala
            ));

        } catch (erro) {
            console.error("Erro ao atualizar:", erro);
            showToast("Erro ao tentar atualizar o estúdio na Base de Dados!");
            return;
        }
    } else {

            try {

                const novaSalaDaBD = await salasService.createSala({
                    nome: novoNome,
                    modalidade: novaModalidade,
                    disponivel: novaDisponibilidade
                });


                setSalas([...salas, novaSalaDaBD]);

            } catch (erro) {

                console.error("O estafeta tropeçou! Eis o relatório do acidente:", erro);
                showToast("Erro ao tentar guardar o estúdio na Base de Dados!");


                return;
            }
        }


        setSalaEmEdicao(null);
        setModalAberto(false);
    };


    const handleApagarSala = async (id: number) => {
        const confirmacao = window.confirm("Tens a certeza absoluta que queres apagar esta sala?");

        if (confirmacao) {
            try {
                await salasService.deleteSala(id);
                setSalas(salas.filter(sala => sala.ID_Sala !== id));
                showToast("Sala apagada com sucesso da Base de Dados!");
            } catch (erro: any) {

                showToast(erro.message);
            }
        }
    };


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

                <ButtonComponent className="btn-principal" onClick={abrirModalNovo}>
                    <i className="fa-solid fa-plus"></i> Novo Estúdio
                </ButtonComponent>
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
                                        <ButtonComponent className="btn-icone editar" onClick={() => abrirModalEdicao(sala)}>
                                            <i className="fa-solid fa-pen"></i>
                                        </ButtonComponent>

                                        <ButtonComponent className="btn-icone apagar" onClick={() => handleApagarSala(sala.ID_Sala)}>
                                            <i className="fa-solid fa-trash"></i>
                                        </ButtonComponent>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>


            {modalAberto && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{salaEmEdicao ? "Editar Estúdio" : "Adicionar Novo Estúdio"}</h2>
                            <ButtonComponent className="btn-fechar" onClick={() => { setModalAberto(false); setSalaEmEdicao(null); }}>
                                <i className="fa-solid fa-xmark"></i>
                            </ButtonComponent>
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
                            <ButtonComponent className="btn-secundario" onClick={() => { setModalAberto(false); setSalaEmEdicao(null); }}>Cancelar</ButtonComponent>

                            <ButtonComponent className="btn-primario" onClick={handleSalvarSala}>
                                {salaEmEdicao ? "Guardar Alterações" : "Guardar Estúdio"}
                            </ButtonComponent>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}