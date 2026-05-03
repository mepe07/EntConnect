import type { InputComponentProps } from './input-props.interface';
import './input.component.scss';

/**
 * Input de texto reutilizável da aplicação.
 *
 * @param options - Propriedades de configuração do input.
 * @returns Campo de input configurado.
 */
export function InputComponent(options: InputComponentProps) {
  return (
    <>
      <div className="input-container">
        {options.label && <label htmlFor={options.id}>{options.label}</label>}
        <input
          id={options.id}
          type="text"
          placeholder={options.placeholder}
          value={options.value}
          onChange={options.onChange}
        />
      </div>
    </>
  );
}
