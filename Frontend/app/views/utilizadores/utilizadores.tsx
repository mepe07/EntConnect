import './utilizadores.scss';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { ButtonComponent } from '~/components/button/button.component';
import { UsersService } from './users.service';
import { useEffect, useState } from 'react';

export function Utilizadores() {
    const usersService = new UsersService();

    const [users, setUsers] = useState([]);
    
    // Transform users data to fit the table component
    const usersData: Record<string, any>[] = users.map((user: any) => ({
        user: user.Utilizador,
        id_utilizador: user.ID_Utilizador,
        ativo: user.Ativo ? "Sim" : "Não"
    }));

    // #region API Calls
        async function fetchUsersData() {
            const usersData = await usersService.getUsers();
            setUsers(usersData);
        }

        function blockUnlockUser(userId: number, action: 'block' | 'unlock') {
            if (action === 'block') {
                usersService.blockUser(userId).then(response => {
                    fetchUsersData();
                });
            } else {
                usersService.unlockUser(userId).then(response => {
                    fetchUsersData();
                });
            }
        }

    // #endregion

    // Get the data from the API on component mount
    useEffect(() => {
        fetchUsersData();
    }, []);

    return (
        <>
            <h1>Utilizadores</h1>

            <ButtonComponent
                label="Bloquear Utilizador"
                icon="fa-lock"
                config={{ type: ButtonTypeEnum.Primary, color: ButtonColorEnum.Error }}
                onClick={() => usersService.blockUser(1)}
            />
            <ButtonComponent
                label="Desbloquear Utilizador"
                icon="fa-lock"
                config={{ type: ButtonTypeEnum.Primary, color: ButtonColorEnum.Theme }}
                onClick={() => usersService.unlockUser(1)}
            />

            <TableComponent
                config={{
                    columns: [
                        { key: "user", value: "Nome", type: TableColumnTypesEnum.Default },
                        { key: "id_utilizador", value: "ID Utilizador", type: TableColumnTypesEnum.Default },
                        { key: "ativo", value: "Ativo", type: TableColumnTypesEnum.Default }
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
                            tooltip: "Ver Utilizador",
                            config: { type: ButtonTypeEnum.Tertiary },
                            onClick: (row) => alert(`Queres ver o utilizador ${row.User}?`)
                        },
                        {
                            icon: "fa-lock",
                            tooltip: "Bloquear Utilizador",
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error },
                            onClick: (row) => blockUnlockUser(row.id_utilizador, 'block')
                        },
                        {
                            icon: "fa-lock",
                            tooltip: "Desbloquear Utilizador",
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Theme },
                            onClick: (row) => blockUnlockUser(row.id_utilizador, 'unlock')
                        }
                    ]
                }}
                data={usersData}
            />
        </>
    );
} 