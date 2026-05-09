import { ButtonComponent } from '~/components/button/button.component';
import React, { useState, useEffect } from 'react';
import { authService } from '~/services/auth.service';
import { RolesService } from '~/services/roles.service';
import { DisponibilidadesService } from '~/services/disponibilidades.service';
import './adicionarDisponibilidade.scss';

import { showToast } from '~/components/toast/toast';
function getDataAtualInput() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    const dia = String(agora.getDate()).padStart(2, '0');

    return `${ano}-${mes}-${dia}`;
}

export default function AdicionarDisponibilidade() {
    const userInfo = authService.getUserInfo();
    const rolesService = new RolesService();
    const disponibilidadesService = new DisponibilidadesService();
    const hoje = getDataAtualInput();


    const [idProfessorAtivo, setIdProfessorAtivo] = useState<number | null>(null);
    const [isCarregando, setIsCarregando] = useState(false);


    const [dataInicio, setDataInicio] = useState('');
    const [hora, setHora] = useState('');
    const [duracao, setDuracao] = useState<number>();
    const [maxAlunos, setMaxAlunos] = useState<number>();
    const [modalidade, setModalidade] = useState('');


    useEffect(() => {
        async function fetchIdProfessor() {
            if (userInfo?.sub) {
                const respostaRoles = await rolesService.getAgendamentosProfessor(userInfo.sub);
                if (respostaRoles?.idProfessor) {
                    setIdProfessorAtivo(respostaRoles.idProfessor);
                }
            }
        }
        fetchIdProfessor();
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (!idProfessorAtivo) {
            showToast("Erro: Não foi possível identificar o teu perfil de professor.");
            return;
        }

        if (dataInicio < hoje) {
            showToast("Nao e possivel criar disponibilidades com data anterior a data atual.");
            return;
        }

        setIsCarregando(true);


        const dataHoraConcatenada = new Date(`${dataInicio}T${hora}:00`);


        const payload = {
            ID_Professor: idProfessorAtivo,
            AlteradoPorUtilizadorID: Number(userInfo?.sub),
            Hora_Inicio: dataHoraConcatenada.toISOString(),
            Duracao: Number(duracao),
            MaxAlunos: Number(maxAlunos),
            Modalidade: modalidade
        };

        try {
            await disponibilidadesService.criarDisponibilidade(payload);
            showToast("Disponibilidade criada com sucesso!");


            setDataInicio('');
            setHora('');
            setModalidade('');
            setDuracao(60);
            setMaxAlunos(4);
        } catch (error) {
            console.error(error);
            showToast("Erro ao criar disponibilidade. Tenta novamente.");
        } finally {
            setIsCarregando(false);
        }
    }


    if (!idProfessorAtivo) {
        return <div className="pagina-adicionar-disponibilidade">A carregar perfil...</div>;
    }

    return (
        <div className="pagina-adicionar-disponibilidade">
            <div className="cabecalho-pagina">
                <h1>Adicionar Disponibilidade</h1>
                <p>Define os horários em que estás disponível para dar sessões de coaching.</p>
            </div>

            <div className="card-formulario">
                <form onSubmit={handleSubmit}>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Data da Sessão</label>
                            <input
                                type="date"
                                required
                                min={hoje}
                                value={dataInicio}
                                onChange={e => setDataInicio(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Hora de Início</label>
                            <input
                                type="time"
                                required
                                value={hora}
                                onChange={e => setHora(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Modalidade</label>
                        <input
                            type="text"
                            placeholder="Ex: Salsa, Kizomba..."
                            required
                            value={modalidade}
                            onChange={e => setModalidade(e.target.value)}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Duração (minutos)</label>
                            <input
                                type="number"
                                min="15"
                                step="15"
                                required
                                value={duracao}
                                onChange={e => setDuracao(Number(e.target.value))}
                            />
                        </div>
                        <div className="form-group">
                            <label>Máximo de Alunos</label>
                            <input
                                type="number"
                                min="1"
                                required
                                value={maxAlunos}
                                onChange={e => setMaxAlunos(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="form-acoes">
                        <ButtonComponent type="submit" className="btn-gravar" disabled={isCarregando}>
                            {isCarregando ? 'A Gravar...' : 'Gravar Disponibilidade'}
                        </ButtonComponent>
                    </div>

                </form>
            </div>
        </div>
    );
}
