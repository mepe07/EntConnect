import type { TextareaComponentProps } from './textarea-props.interface';
import './textarea.component.scss';

/**
 * Área de texto partilhada com label.
 *
 * @param options - Propriedades da textarea.
 * @returns Campo de texto multilinha configurado.
 */
export function TextareaComponent(options: TextareaComponentProps) {
  return (
    <>
      <div className="textarea-container">
        {options.label && <label htmlFor={options.id}>{options.label}</label>}
        <textarea
          id={options.id}
          value={options.value}
          onChange={options.onChange}
          placeholder={options.placeholder}
          rows={options.rows}
          cols={options.cols}
        />
      </div>
    </>
  );
}
