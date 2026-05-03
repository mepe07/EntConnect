import { TableColumnTypesEnum } from '~/components/table/models/enums/table-column-types.enum';
import './table.component.scss';
import { useState } from 'react';
import { InputComponent } from '../input/input.component';
import { SelectBoxComponent } from '../selectbox/selectbox.component';
import { ButtonComponent } from '../button/button.component';
import type { TableComponentProps } from './table-props.interface';

export function TableComponent(options: TableComponentProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterValue, setFilterValue] = useState({} as { [key: string]: string });

    // Applies search and filters to the data
    const filteredData = options.data.filter((row) => {
        // Check if row matches search term
        const searchCols = options.config?.searchSettings?.columns || Object.keys(row);
        const matchesSearch = searchTerm === "" || searchCols.some((col) =>
            String(row[col]).toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        // Check if row matches all active filters
        const matchesFilters = options.config.filters?.every((filter) =>
            !filterValue?.[filter.key] || row[filter.key] === filterValue[filter.key] || row[filter.key]?.value === filterValue[filter.key]
        ) ?? true;

        return matchesSearch && matchesFilters;
    });
    
    // 2. Matemática da Paginação
    // const indiceUltimoItem = paginaAtual * itensPorPagina;
    // const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
    // const devedoresPaginaAtual = devedoresFiltrados.slice(indicePrimeiroItem, indiceUltimoItem);
    // const totalPaginas = Math.ceil(devedoresFiltrados.length / itensPorPagina);

    // 3. Matemática dos KPIs (Ideia 7)
    // const valorTotalDivida = devedores.reduce((total, ee) => total + ee.Total_Em_Divida, 0);

    return (
        <>
        <div className="toolbar">
            <InputComponent 
                id="table-search" 
                placeholder={options.config?.searchSettings?.placeholder || "Pesquisar..."} 
                label={options.config?.searchSettings?.label} 
                value={searchTerm || options.config?.searchSettings?.value || ""} 
                onChange={(e) => setSearchTerm(e.target.value)} 
            />
            <div className="filters-toolbar">
                {options.config.filters?.map((filter) => (
                    <SelectBoxComponent
                        key={filter.key}
                        label={filter.label}
                        id={filter.key}
                        selectedOption={filterValue[filter.key] || ""}
                        onChange={(e) => {
                            setFilterValue({
                                ...filterValue,
                                [filter.key]: e.target.value
                            });
                        }}
                        options={filter.options}
                    />
                ))}
            </div>
        </div>

        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        {options.config.columns.map((column) => (
                            <th key={column.key}>
                                {column.value}
                            </th>
                        ))}
                        {options.config.actions && <th className="actions-header">Ações</th>}
                    </tr>
                </thead>
                <tbody>
                    { filteredData.map((row, index) => (
                        <tr key={index}>
                            {options.config.columns.map((column) => (
                                <td key={column.key} className={row[column.key]?.infoType}>
                                    { column.type === TableColumnTypesEnum.ChipMoney ? 
                                        <div className="chip money">{Number(row[column.key]?.value || row[column.key]).toFixed(2)} €</div>
                                    : column.type === TableColumnTypesEnum.Chip ? 
                                        <div className="chip">{row[column.key]?.value || row[column.key]}</div>
                                    : 
                                        (row[column.key]?.value || row[column.key])
                                    }
                                </td>   
                            ))}
                            {
                                (() => {
                                    const visibleActions = options.config.actions?.filter((action) =>
                                        action.show ? action.show(row) : true
                                    ) ?? [];

                                    return visibleActions.length > 0 ? (
                                        <td className='row-actions'>
                                            <div className="row-actions-content">
                                                {visibleActions.map((action, actionIndex) => (
                                                    <ButtonComponent
                                                        key={actionIndex}
                                                        label={action.label}
                                                        tooltip={action.tooltip}
                                                        icon={action.icon}
                                                        config={action.config}
                                                        onClick={() => action.onClick(row)}
                                                    />
                                                ))}
                                            </div>
                                        </td>
                                    ) : null;
                                })()
                            }
                        </tr>
                    )) }
                </tbody>
            </table>
        </div>
        </>
    );
}
