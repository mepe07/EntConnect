import type { InputComponentProps } from './input-props.interface';
import './input.component.scss';

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
