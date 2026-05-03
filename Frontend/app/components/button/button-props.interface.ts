import type { ButtonColorEnum } from "./models/enums/button-color.enum";
import type { ButtonTypeEnum } from "./models/enums/button-type.enum";
import type { SizeEnum } from "../models/enums/size.enum";

/**
 * Propriedades aceites pelo botão partilhado.
 */
export interface ButtonComponentProps {
  label?: string;
  icon?: string;
  tooltip?: string;
  disabled?: boolean;
  config?: {
    type?: ButtonTypeEnum;
    color?: ButtonColorEnum;
    size?: SizeEnum;
  };
  onClick: (e?: any) => void;
}
