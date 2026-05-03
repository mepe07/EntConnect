import type { CardTypeEnum } from "./models/enums/card-type.enum";

/**
 * Propriedades aceites pelo card partilhado.
 */
export interface CardComponentProps {
  title: string;
  description: string;
  type?: CardTypeEnum;
  onClick?: (e?: any) => void;
}
