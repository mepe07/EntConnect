import type { ButtonColorEnum } from "./models/enums/button-color.enum";
import type { ButtonTypeEnum } from "./models/enums/button-type.enum";
import type { SizeEnum } from "../models/enums/size.enum";
import type { CSSProperties, MouseEventHandler } from "react";

export interface ButtonComponentProps {
  label?: string;
  icon?: string;
  tooltip?: string;
  ariaLabel?: string;
  disabled?: boolean;
  buttonType?: "button" | "submit" | "reset";
  form?: string;
  className?: string;
  style?: CSSProperties;
  config?: {
    type?: ButtonTypeEnum;
    color?: ButtonColorEnum;
    size?: SizeEnum;
  };
  onClick?: MouseEventHandler<HTMLButtonElement>;
}
