import './aprovarDisponibilidade.scss';
import { useEffect, useState } from 'react';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';
import { InfoTypesEnum } from '~/components/models/enums/info-types.enum';
import { DisponibilidadesService } from '../../../services/disponibilidades.service';
import { authService } from '~/services/auth.service';
import type { User } from '../../../models/interfaces/user.interface';

// Criar interface??
export interface Disponibilidade {
    idDisponibilidade: number;
    nomeProfessor: string;
    data: string;
    diaSemana: string;
    horario: string;
    modalidade: string;
    alteradoPor: string;
    estado: string;
}

export default function ApproveAvailability() {
    const disponibilidadesService = new DisponibilidadesService();
    const [disponibilidades, setDisponibilidades] = useState<Disponibilidade[]>([]);

    // Transformar os dados para a tabela pintar os Chips com as cores certas
    const tableData = disponibilidades.map(disp => {
        let infoType = InfoTypesEnum.Info; // verificar o tipo
        if (disp.estado === 'Aprovado') infoType = InfoTypesEnum.Success;
        if (disp.estado === 'Rejeitado') infoType = InfoTypesEnum.Error;
        if (disp.estado === 'Pendente') infoType = InfoTypesEnum.Warning;

        return {
            ...disp,
            // O "||" garante que, se o disp.estado vier undefined da API, ele escreve "Desconhecido" em vez de crashar a aplicação!
            estadoChip: { value: disp.estado || "Desconhecido", infoType: infoType }
        };
    });

    // #region API Calls
    async function fetchDisponibilidades() {
        // Substitui por chamadas reais quando o GET estiver pronto
        const data = await disponibilidadesService.getAvailability();
        setDisponibilidades(data);
    }

    async function handleAtualizarEstado(row: any, novoEstado: number) {

        const userInfo = authService.getUserInfo() as User;
        const alteradoPor = userInfo.idUtilizador; // ID do utilizador autentiticado
        
        // 1. Separar as horas e as datas
        const [horaInicioStr, horaFimStr] = row.horario.split(' - '); // ["14:00", "15:30"]
        const [dia, mes, ano] = row.data.split('/'); // ["06", "04", "2026"]

        // 2. Criar objetos Date verdadeiros (Formato: YYYY-MM-DDTHH:MM:00)
        const dataInicio = new Date(`${ano}-${mes}-${dia}T${horaInicioStr}:00`);
        const dataFim = new Date(`${ano}-${mes}-${dia}T${horaFimStr}:00`);

        // 3. Obter a duração em minutos 
        // (O getTime() devolve milissegundos, por isso dividimos por 60000 para ter minutos)
        const duracaoMinutos = (dataFim.getTime() - dataInicio.getTime()) / 60000;

        // 4. Formatar a hora de início para o padrão que o Backend (Swagger) exige
        const horaInicioIso = dataInicio.toISOString(); 

        const confirmMessage = `Tem a certeza que deseja atualizar este horário?`;
        if (!window.confirm(confirmMessage)) return;

        try {
            // Enviar tudo o teu Service
            await disponibilidadesService.atualizarEstado(
                row.idDisponibilidade, 
                novoEstado, 
                row.diaSemana,
                horaInicioIso, 
                duracaoMinutos,
                alteradoPor, // Passa o ID do utilizador autenticado
            );
            
            fetchDisponibilidades(); // Recarrega a tabela após sucesso
        } catch (error) {
            alert('Erro ao atualizar a disponibilidade.');
        }
    }

    useEffect(() => {
        fetchDisponibilidades();
    }, []);
    // #endregion

    // Criar filtros dinâmicos de professores (como fizemos para os cargos!)
    const professoresUnicos = Array.from(new Set(tableData.map(d => d.nomeProfessor).filter(Boolean)));
    const opcoesProfessor = [
        { value: "", label: "Todos" },
        ...professoresUnicos.map(nome => ({ value: nome, label: nome }))
    ];

    return (
        <div className="pagina-aprovacoes">
            <h1>Aprovação de Disponibilidades</h1>

            <TableComponent
                config={{
                    columns: [
                        { key: "nomeProfessor", value: "Professor", type: TableColumnTypesEnum.Default },
                        { key: "data", value: "Data", type: TableColumnTypesEnum.Default },
                        { key: "diaSemana", value: "Dia da Semana", type: TableColumnTypesEnum.Default },
                        { key: "horario", value: "Horário", type: TableColumnTypesEnum.Default },
                        { key: "modalidade", value: "Modalidade", type: TableColumnTypesEnum.Default },
                        { key: "alteradoPor", value: "Alterado Por", type: TableColumnTypesEnum.Default },
                        { key: "estadoChip", value: "Estado", type: TableColumnTypesEnum.Chip }
                    ],
                    filters: [
                        {
                            key: "nomeProfessor",
                            label: "Professor",
                            value: "",
                            options: opcoesProfessor
                        },
                        {
                            key: "estadoChip",
                            label: "Estado",
                            value: "Pendente", // Começa a mostrar os pendentes por defeito!
                            options: [
                                { value: "", label: "Todos" },
                                { value: "Pendente", label: "Pendentes" },
                                { value: "Aprovado", label: "Aprovados" },
                                { value: "Rejeitado", label: "Rejeitados" }
                            ]
                        }
                    ],
                    searchSettings: {
                        placeholder: "Procurar por professor ou dia...",
                        label: "Pesquisa",
                        value: ""
                    },
                    actions: [
                        {
                            icon: "fa-solid fa-check",
                            tooltip: "Aprovar Horário",
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Gray, size: SizeEnum.Large },
                            show: (row: any) => row.estado === 'Pendente',
                            onClick: (row: any) => handleAtualizarEstado(row, 1)
                        },
                        {
                            icon: "fa-solid fa-xmark",
                            tooltip: "Rejeitar Horário",
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error, size: SizeEnum.Large },
                            show: (row: any) => row.estado !== 'Rejeitado',
                            onClick: (row: any) => handleAtualizarEstado(row, 3)
                        }
                    ]
                }}
                data={tableData}
            />
        </div>
    );
}