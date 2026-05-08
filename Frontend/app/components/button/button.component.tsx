import type { ButtonComponentProps } from './button-props.interface';
import './button.component.scss';

/**
 * Botão partilhado da aplicação.
 *
 * @param options - Propriedades visuais e comportamentais do botão.
 * @returns Elemento de botão configurado com classes, ícone e acessibilidade.
 */
export function ButtonComponent({
    label,
    icon,
    children,
    tooltip,
    ariaLabel,
    disabled,
    buttonType = 'button',
    type,
    form,
    className = '',
    style,
    config,
    onClick,
    ...buttonProps
}: ButtonComponentProps) {
    const typeClass = config?.type ?? '';
    const colorClass = config?.color ?? '';
    const sizeClass = config?.size ?? '';
    const classes = ['button-container', typeClass, colorClass, sizeClass, className]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            {...buttonProps}
            type={type ?? buttonType}
            form={form}
            className={classes}
            disabled={disabled}
            onClick={onClick}
            title={tooltip ?? buttonProps.title}
            aria-label={ariaLabel ?? tooltip ?? buttonProps['aria-label']}
            style={style}
        >
            {icon && <i className={icon} aria-hidden="true" />}
            {label && <span>{label}</span>}
            {children}
        </button>
    );
}
