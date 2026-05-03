import type { SelectBoxComponentProps } from './selectbox-props.interface';
import './selectbox.component.scss';

/**
 * Select reutilizável para listas simples de opções.
 *
 * @param options - Propriedades do select.
 * @returns Campo `select` configurado.
 */
export function SelectBoxComponent(options: SelectBoxComponentProps) {
  return (
    <>
      <div className="selectbox-container">
        {options.label && <label htmlFor={options.id}>{options.label}</label>}
        <select id={options.id} value={options.selectedOption} onChange={options.onChange}>
          {options.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
