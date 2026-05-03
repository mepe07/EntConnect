/**
 * Propriedades aceites pela textarea partilhada.
 */
export interface TextareaComponentProps {
  id: string;
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  cols?: number;
}
