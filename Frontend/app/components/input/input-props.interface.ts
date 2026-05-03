/**
 * Propriedades aceites pelo input partilhado.
 */
export interface InputComponentProps {
  id: string;
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
