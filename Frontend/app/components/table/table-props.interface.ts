import type { ButtonComponentProps } from "../button/button-props.interface";
import type { TableColumnTypesEnum } from "./models/enums/table-column-types.enum";

// Usamos Omit para remover o onClick original do botão e substituir pelo nosso que recebe a row
export interface TableAction extends Omit<ButtonComponentProps, 'onClick'> {
  show?: (row: any) => boolean;
  onClick: (row: any) => void | Promise<void>;
}

export interface TableComponentProps {
  config: { 
    columns: { key: string; value: string; type?: TableColumnTypesEnum }[],
    searchSettings?: { columns?: string[], placeholder?: string, label?: string, value?: string },
    filters?: { key: string; label?: string; value: string; options: { value: string; label: string }[] }[],
    actions?: TableAction[]
  };
  data: any[];
}