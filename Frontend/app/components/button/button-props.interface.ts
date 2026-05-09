import type { ButtonColorEnum } from "./models/enums/button-color.enum";
import type { ButtonTypeEnum } from "./models/enums/button-type.enum";
import type { SizeEnum } from "../models/enums/size.enum";
import type { ButtonHTMLAttributes } from "react";

export interface ButtonComponentProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: string;
  tooltip?: string;
  ariaLabel?: string;
  buttonType?: "button" | "submit" | "reset";
  config?: {
    type?: ButtonTypeEnum;
    color?: ButtonColorEnum;
    size?: SizeEnum;
  };
}
