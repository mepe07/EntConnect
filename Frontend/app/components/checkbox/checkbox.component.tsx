import './checkbox.component.scss';
import React, { useState } from 'react';

interface CheckboxComponentProps {
  id: string;
  selected?: boolean;
  label?: string;
}

export function CheckboxComponent({ id, selected = false, label }: CheckboxComponentProps) {
  const [isChecked, setIsChecked] = useState(selected);

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
        {label && <label htmlFor={id}>{label}</label>}
        <input
          type="checkbox"
          id={id}
          checked={isChecked}
          onChange={handleCheckboxChange}
        />
      </div>
    </>
  );
}
