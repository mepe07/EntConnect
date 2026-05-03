import type { SelectBoxComponentProps } from './selectbox-props.interface';
import './selectbox.component.scss';

/**
 * Select partilhado para listas de opções simples.
 *
 * @param options - Propriedades e opções do select.
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
