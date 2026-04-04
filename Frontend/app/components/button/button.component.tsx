// Ficheiro: button.component.tsx
import type { ButtonComponentProps } from './button-props.interface';
import './button.component.scss';

export function ButtonComponent({ 
    label, 
    icon, 
    tooltip, 
    disabled, 
    config, 
    onClick 
}: ButtonComponentProps) {
    // Definimos as classes de forma dinâmica e limpa
    const typeClass = config?.type ?? '';
    const colorClass = config?.color ?? '';
    const sizeClass = config?.size ?? '';
    
    // Unimos todas as classes num único array e filtramos espaços vazios
    const classes = ['button-container', typeClass, colorClass, sizeClass].join(' ').trim();

    return (
        <button 
            type="button" // Evita que o botão submeta formulários por acidente
            className={classes} 
            disabled={disabled} // Agora o 'disabled' funciona mesmo!
            onClick={onClick} 
            title={tooltip}
        >
            {/* Se houver ícone, renderiza. Não forçamos o prefixo 'fa' aqui */}
            {icon && <i className={icon} aria-hidden="true" />}
            
            {/* Se houver label, renderiza dentro de um span para melhor controlo de CSS */}
            {label && <span>{label}</span>}
        </button>
    );
} 