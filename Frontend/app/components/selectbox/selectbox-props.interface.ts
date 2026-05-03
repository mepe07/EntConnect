/**
 * Propriedades aceites pelo select partilhado.
 */
export interface SelectBoxComponentProps {
  id: string;
  options: { value: string; label: string }[];
  selectedOption?: string;
  label?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}
