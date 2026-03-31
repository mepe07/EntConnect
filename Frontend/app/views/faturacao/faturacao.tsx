import { CardComponent } from '~/components/card/card.component';
import './faturacao.scss';
import { CardTypeEnum } from '~/components/card/models/enums/card-type.enum';
import { TableComponent } from '~/components/table/table.component';
import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import { ButtonTypeEnum } from '~/components/button/models/enums/button-type.enum';
import { ButtonColorEnum } from '~/components/button/models/enums/button-color.enum';

export function Faturacao() {
    return (
        <>
            <h1>Centro de Faturação</h1>

            <div className="cards-wrapper">
                <CardComponent  
                    title="Valor Total em Dívida" 
                    description="€ 1.234.567,89" 
                    type={CardTypeEnum.Default} 
                    onClick={() => alert('Clicaste no Card!')} />
                <CardComponent  
                    title="Número de Devedores" 
                    description="123" 
                    type={CardTypeEnum.Warning}  />
                <CardComponent  
                    title="Valor Médio por Devedor" 
                    description="€ 10.000,00" 
                    type={CardTypeEnum.Error} 
                    onClick={() => alert('Clicaste no Card!')} />
            </div>

            <TableComponent
                config={{
                    columns: [
                        { key: "name", value: "Nome do Devedor", type: TableColumnTypesEnum.Default },
                        { key: "email", value: "Email", type: TableColumnTypesEnum.Default },
                        { key: "debt", value: "Valor em Dívida", type: TableColumnTypesEnum.ChipMoney }
                    ],
                    filters: [
                        {
                            key: "debt",
                            value: "",
                            options: [
                                { value: "", label: "Todos" },
                                { value: "1000", label: "1000" },
                                { value: "2000", label: "2000" },
                                { value: "3000", label: "3000" }
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