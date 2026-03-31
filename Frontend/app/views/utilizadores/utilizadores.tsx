import './utilizadores.scss';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { ButtonComponent } from '~/components/button/button.component';

export function Utilizadores() {
    async function blockUser(userId: number) {
        const confirmed = confirm('Queres bloquear este utilizador?');
        if (!confirmed) return;

        // Aqui irias fazer a chamada à API para bloquear o utilizador
        const response = await fetch(`http://localhost:3000/utilizador/${userId}/block`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
    }
    async function unlockUser(userId: number) {
        const confirmed = confirm('Queres desbloquear este utilizador?');
        if (!confirmed) return;

        // Aqui irias fazer a chamada à API para desbloquear o utilizador
        const response = await fetch(`http://localhost:3000/utilizador/${userId}/unlock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            
        });
        const data = await response.json();
    }

    return (
        <>
            <h1>Utilizadores</h1>

            <ButtonComponent
                label="Bloquear Utilizador"
                icon="fa-lock"
                config={{ type: ButtonTypeEnum.Primary, color: ButtonColorEnum.Error }}
                onClick={() => blockUser(1)}
            />
            <ButtonComponent
                label="Desbloquear Utilizador"
                icon="fa-lock"
                config={{ type: ButtonTypeEnum.Primary, color: ButtonColorEnum.Theme }}
                onClick={() => unlockUser(1)}
            />

            <TableComponent
                config={{
                    columns: [
                        { key: "name", value: "Nome", type: TableColumnTypesEnum.Default },
                        { key: "email", value: "Email", type: TableColumnTypesEnum.Default },
                        { key: "type", value: "Tipo", type: TableColumnTypesEnum.Default }
                    ],
                    filters: [
                        {
                            key: "type",
                            value: "",
                            options: [
                                { value: "", label: "Todos" },
                                { value: "Professor", label: "Professor" },
                                { value: "Aluno", label: "Aluno" },
                                { value: "Funcionário", label: "Funcionário" }
                            ]
                        }
                    ],
                    actions: [
                        {
                            icon: "fa-eye",
                            tooltip: "Ver Devedor",
                            config: { type: ButtonTypeEnum.Tertiary },
                            onClick: (row) => alert(`Queres ver o devedor ${row.name}?`)
                        },
                        {
                            icon: "fa-trash",
                            tooltip: "Eliminar Devedor",
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error },
                            onClick: (row) => alert(`Queres eliminar o devedor ${row.name}?`)
                        }
                    ]
                }}
                data={[
                    { name: "João Gonçalves", email: "joao@example.com", debt: "1000" },
                    { name: "Maria Silva", email: "maria@example.com", debt: "2000" },
                    { name: "Pedro Santos", email: "pedro@example.com", debt: "3000" }
                ]}
            />
        </>
    );
} 