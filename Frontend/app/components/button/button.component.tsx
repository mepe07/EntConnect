import type { ButtonComponentProps } from './button-props.interface';
import './button.component.scss';

export function ButtonComponent({
    label,
    icon,
    tooltip,
    ariaLabel,
    disabled,
    buttonType = 'button',
    form,
    className = '',
    style,
    config,
    onClick
}: ButtonComponentProps) {
    const typeClass = config?.type ?? '';
    const colorClass = config?.color ?? '';
    const sizeClass = config?.size ?? '';
    const classes = ['button-container', typeClass, colorClass, sizeClass, className]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            type={buttonType}
            form={form}
            className={classes}
            disabled={disabled}
            onClick={onClick}
            title={tooltip}
            aria-label={ariaLabel ?? tooltip}
            style={style}
        >
            {icon && <i className={icon} aria-hidden="true" />}
            {label && <span>{label}</span>}
        </button>
    );
}
