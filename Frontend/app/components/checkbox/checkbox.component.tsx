import type { CheckboxComponentProps } from './checkbox-props.interface';
import './checkbox.component.scss';
import React, { useState } from 'react';

/**
 * Checkbox reutilizável com apresentação personalizada.
 *
 * @param options - Propriedades do checkbox.
 * @returns Checkbox configurado.
 */
export function CheckboxComponent(options: CheckboxComponentProps) {
  const [isChecked, setIsChecked] = useState(options.selected);

  function handleCheckboxChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIsChecked(e.target.checked);
  }

  function handleCustomCheckboxClick() {
    setIsChecked((prev) => {
      const newValue = !prev;
      return newValue;
    });
  }

  return (
    <>
      <div className="checkbox-container">
        <div className={`custom-checkbox ${isChecked ? "checked" : ""}`} onClick={handleCustomCheckboxClick}>
          {isChecked && <i className="fa fa-check"></i>}
        </div>
        {options.label && <label htmlFor={options.id}>{options.label}</label>}
        <input
          type="checkbox"
          id={options.id}
          checked={isChecked}
          onChange={handleCheckboxChange}
        />
      </div>
    </>
  );
}
