import type { InputComponentProps } from './input-props.interface';
import './input.component.scss';

/**
 * Campo de input partilhado com label e configuração visual.
 *
 * @param options - Propriedades do input.
 * @returns Campo de formulário configurado.
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
