import type { ButtonComponentProps } from './button-props.interface';
import './button.component.scss';

export function ButtonComponent(options: ButtonComponentProps) {
    const typeClass = options.config?.type ? `${options.config.type}` : '';
    const colorClass = options.config?.color ? `${options.config.color}` : '';
    const sizeClass = options.config?.size ? `${options.config.size}` : '';

    return (
        <>
        <div className={`button-container ${typeClass} ${colorClass} ${sizeClass}`} onClick={options.onClick} title={options.tooltip}>
            {options.icon && <i className={`fa ${options.icon}`} />}
            {options.label && <span>{options.label}</span>}
        </div>
        </>
    );
}
