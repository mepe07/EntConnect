import React, { useState, useEffect } from 'react';
import { coachingService } from '~/services/coaching.service';
import './coaching.scss';

interface MarcacaoCoaching {
    idCoaching: number;
    dataInicio: string;
    duracaoMinutos: number;
    sala: string;
    modalidade: string;
    alunos: string[];
    estado: string;
}

export default function ListagemCoaching() {
    const [marcacoes, setMarcacoes] = useState<MarcacaoCoaching[]>([]);
    const [aCarregar, setACarregar] = useState(true);

    const [dataInicioInput, setDataInicioInput] = useState('');
    const [dataFimInput, setDataFimInput] = useState('');

    const [filtroDataInicio, setFiltroDataInicio] = useState('aguardar');
    const [filtroDataFim, setFiltroDataFim] = useState('aguardar');

    useEffect(() => {
        carregarAgenda();
    }, []);

    const carregarAgenda = async () => {
        setACarregar(true);
        try {
            const dados = await coachingService.getMarcacoes();
            setMarcacoes(dados);
        } catch (erro) {
            console.error("Erro ao carregar marcações", erro);
        } finally {
            setACarregar(false);
        }
    };

    const aplicarFiltro = () => {
        setFiltroDataInicio(dataInicioInput);
        setFiltroDataFim(dataFimInput);
    };


const renderBadgeEstado = (estado: string) => {
    const e = estado?.toUpperCase();
    switch (e) {
        case 'VALIDADO':
        case 'ACEITE':
            return <span className="badge-estado validado">Validado</span>;
        case 'PENDENTE':
            return <span className="badge-estado pendente">Pendente</span>;
        case 'RECUSADO':
            return <span className="badge-estado recusado">Recusado</span>;
        default:
            return <span className="badge-estado">{estado}</span>;
    }
};

    const marcacoesFiltradas = marcacoes.filter(aula => {
        if (filtroDataInicio === 'aguardar' && filtroDataFim === 'aguardar') return false;
        if (filtroDataInicio === '' && filtroDataFim === '') return true;

        const dataAula = new Date(aula.dataInicio).getTime();
        let passaInicio = true;
        let passaFim = true;

        if (filtroDataInicio && filtroDataInicio !== 'aguardar') {
            const dataMinima = new Date(filtroDataInicio);
            dataMinima.setHours(0, 0, 0, 0);
            passaInicio = dataAula >= dataMinima.getTime();
        }

        if (filtroDataFim && filtroDataFim !== 'aguardar') {
            const dataMaxima = new Date(filtroDataFim);
            dataMaxima.setHours(23, 59, 59, 999);
            passaFim = dataAula <= dataMaxima.getTime();
        }

        return passaInicio && passaFim;
    });

    return (
        <div className="coaching-container">
            <div className="cabecalho">
                <h1>A Minha Agenda de Coaching</h1>
                <p>Consulta as tuas próximas aulas, salas e alunos inscritos.</p>
            </div>

            <div className="filtro-datas-card">
                <div className="grupo-input">
                    <label>Data Início</label>
                    <input type="date" value={dataInicioInput} onChange={(e) => setDataInicioInput(e.target.value)} />
                </div>
                <div className="grupo-input">
                    <label>Data Final</label>
                    <input type="date" value={dataFimInput} onChange={(e) => setDataFimInput(e.target.value)} />
                </div>
                <button className="btn-pesquisar" onClick={aplicarFiltro}>
                    <i className="fa-solid fa-magnifying-glass"></i> Pesquisar
                </button>
            </div>

            {filtroDataInicio !== 'aguardar' && (
                <div className="tabela-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Hora</th>
                                <th>Duração</th>
                                <th>Sala</th>
                                <th>Estado</th>
                                <th>Alunos Inscritos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {marcacoesFiltradas.length > 0 ? (
                                marcacoesFiltradas.map((aula) => (
                                    <tr key={aula.idCoaching}>
                                        <td><strong>{new Date(aula.dataInicio).toLocaleDateString('pt-PT')}</strong></td>
                                        <td>{new Date(aula.dataInicio).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td>{aula.duracaoMinutos} min</td>
                                        <td>{aula.sala}</td>
                                        <td>{renderBadgeEstado(aula.estado)}</td>
                                        <td>{aula.alunos.join(', ')}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="sem-dados">
                                        Não foram encontradas marcações para estas datas.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}