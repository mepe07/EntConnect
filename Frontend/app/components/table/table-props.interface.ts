import type { ButtonComponentProps } from "../button/button-props.interface";
import type { TableColumnTypesEnum } from "./models/enums/table-column-types.enum";

export interface TableAction extends ButtonComponentProps {
  show?: (row: Record<string, any>) => boolean;
}

export interface TableComponentProps {
  config: { 
    columns: { key: string; value: string; type?: TableColumnTypesEnum }[],
    searchSettings?: { columns?: string[], placeholder?: string, label?: string, value?: string },
    filters?: { key: string; label?: string; value: string; options: { value: string; label: string }[] }[],
    actions?: TableAction[]
  };
  data: Record<string, any>[];
}