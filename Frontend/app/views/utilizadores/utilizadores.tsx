import './utilizadores.scss';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { UsersService } from '../../services/users.service';
import { useEffect, useState } from 'react';
import type { User } from '~/models/interfaces/user.interface';
import { InfoTypesEnum } from '~/components/models/enums/info-types.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';

export function Utilizadores() {
    const usersService = new UsersService();

    const [users, setUsers] = useState([]);
    
    // Transform users data to fit the table component
    const usersData: Record<string, any>[] = users.map((user: User) => ({
        ...user,
        ativo: user.ativo ? {value: "Sim", infoType: InfoTypesEnum.Info} : {value: "Não", infoType: InfoTypesEnum.Error},
        cargos: user.cargos.join(", ")
    }));

    // #region API Calls
        // Function to fetch users data from the API and update the state
        async function fetchUsersData() {
            const usersData = await usersService.getUsers();
            setUsers(usersData);
        }

        /**
         * Function to block or unblock a user based on the action parameter
         * 
         * @param userId: The ID of the user to be blocked or unblocked
         * @param action: A string that indicates whether to block or unblock the user ('block' or 'unlock')
         */
        function blockUnlockUser(userId: number, action: 'block' | 'unlock') {
            // Show confirmation dialog before blocking/unblocking the user
            const confirmMessage = action === 'block' ? 'Queres bloquear este utilizador?' : 'Queres desbloquear este utilizador?';
            if (!window.confirm(confirmMessage)) {
                return;
            }

            // Call the appropriate service method based on the action
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

        // Get the data from the API on component mount
        useEffect(() => {
            fetchUsersData();
        }, []);
    // #endregion

    return (
        <>
            <h1>Utilizadores</h1>

            <TableComponent
                config={{
                    columns: [
                        { key: "idUtilizador", value: "ID", type: TableColumnTypesEnum.Default },
                        { key: "nome", value: "Nome", type: TableColumnTypesEnum.Default },
                        { key: "email", value: "Email", type: TableColumnTypesEnum.Default },
                        { key: "cargos", value: "Cargos", type: TableColumnTypesEnum.Default },
                        { key: "ativo", value: "Ativo", type: TableColumnTypesEnum.Chip }
                    ],
                    filters: [
                        {
                            key: "cargos",
                            label: "Cargo",
                            value: "",
                            options: [
                                { value: "", label: "Todos" },
                                { value: "Professor", label: "Professor" },
                                { value: "Funcionário", label: "Funcionário" },
                                { value: "Coordenador", label: "Coordenador" }
                            ]
                        },
                        {
                            key: "ativo",
                            label: "Ativo",
                            value: "",
                            options: [
                                { value: "", label: "Todos" },
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" }
                            ]
                        }
                    ],
                    searchSettings: {
                        placeholder: "Procurar por nome ou cargos...",
                        label: "Pesquisa",
                        value: ""
                    },
                    actions: [
                        {
                            icon: "fa-eye",
                            tooltip: "Ver Utilizador",
                            config: { type: ButtonTypeEnum.Tertiary, size: SizeEnum.Small },
                            onClick: (row: User) => alert(`Queres ver o utilizador ${row.nome}?`)
                        },
                        {
                            icon: "fa-lock",
                            tooltip: "Bloquear/Desbloquear Utilizador",
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error, size: SizeEnum.Small },
                            onClick: (row: User) => blockUnlockUser(row.idUtilizador, ((row.ativo as unknown as { value: string }).value as string === "Sim" ? 'block' : 'unlock'))
                        }
                    ]
                }}
                data={usersData}
            />
        </>
    );
} 