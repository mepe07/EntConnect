import './utilizadores.scss';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';
import { UsersService } from '../../services/users.service';
import { useEffect, useState, useRef } from 'react'; 
import type { User } from '~/models/interfaces/user.interface';
import { InfoTypesEnum } from '~/components/models/enums/info-types.enum';
import { SizeEnum } from '~/components/models/enums/size.enum';

export function Utilizadores() {
    const usersService = new UsersService();
    const [users, setUsers] = useState([]);
    const [modalImportOpen, setModalImportOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const usersData: Record<string, any>[] = users.map((user: User) => ({
        ...user,
        ativo: user.ativo ? {value: "Sim", infoType: InfoTypesEnum.Info} : {value: "Não", infoType: InfoTypesEnum.Error},
        cargo: user.role
    }));

    async function fetchUsersData() {
        const data = await usersService.getUsers();
        setUsers(data);
    }

    const cargosUnicos = Array.from(new Set(usersData.map(user => user.cargo).filter(Boolean)));
    const opcoesCargo = [
        { value: "", label: "Todos" },
        ...cargosUnicos.map(cargo => ({ value: cargo, label: cargo }))
    ];

    function blockUnlockUser(userId: number, action: 'block' | 'unlock') {
        const confirmMessage = action === 'block' ? 'Queres bloquear este utilizador?' : 'Queres desbloquear este utilizador?';
        if (!window.confirm(confirmMessage)) return;

        const promise = action === 'block' ? usersService.blockUser(userId) : usersService.unlockUser(userId);
        promise.then(() => fetchUsersData());
    }

    const lidarComUploadDireto = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch("http://localhost:3000/utilizador/importusersblob", {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            
            if (response.ok) {
                const data = await response.json();
                alert(data.mensagem || "Utilizadores importados com sucesso!");
                setModalImportOpen(false);
                fetchUsersData();
            } else {
                alert("Erro ao processar a importação.");
            }
        } catch (error) {
            console.error("Erro na importação:", error);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => { fetchUsersData(); }, []);

    return (
        <div className="utilizadores-page">
            <div className="header-container">
                <h1>Utilizadores</h1>
                <button className="btn-import" onClick={() => setModalImportOpen(true)}>
                    <i className="fa fa-upload"></i> Importar Alunos
                </button>
            </div>
            
            <TableComponent
                config={{
                    columns: [
                        { key: "idUtilizador", value: "ID", type: TableColumnTypesEnum.Default },
                        { key: "nome", value: "Nome", type: TableColumnTypesEnum.Default },
                        { key: "email", value: "Email", type: TableColumnTypesEnum.Default },
                        { key: "cargo", value: "Cargo", type: TableColumnTypesEnum.Default },
                        { key: "ativo", value: "Ativo", type: TableColumnTypesEnum.Chip }
                    ],
                    filters: [
                        { key: "cargo", label: "Cargo", value: "", options: opcoesCargo },
                        { 
                            key: "ativo", 
                            label: "Ativo", 
                            value: "", 
                            options: [{ value: "", label: "Todos" }, { value: "Sim", label: "Sim" }, { value: "Não", label: "Não" }] 
                        }
                    ],
                    searchSettings: { placeholder: "Procurar por nome ou cargos...", label: "Pesquisa", value: "" },
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
                            config: { type: ButtonTypeEnum.Tertiary, color: ButtonColorEnum.Error, size: SizeEnum.Small},
                            onClick: (row: User) => blockUnlockUser(row.idUtilizador, ((row.ativo as any).value === "Sim" ? 'block' : 'unlock'))
                        }
                    ]
                }}
                data={usersData}
            />

            {modalImportOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Importar Ficheiro CSV</h2>
                        <p>Selecione o ficheiro do seu computador. O sistema irá processar os dados e atualizar a tabela.</p>
                        
                        <input type="file" accept=".csv" ref={fileInputRef} style={{ display: 'none' }} onChange={lidarComUploadDireto} />

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setModalImportOpen(false)}>Cancelar</button>
                            <button className="btn-process" onClick={() => fileInputRef.current?.click()}>
                                <i className="fa fa-file-excel"></i> Escolher e Processar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}