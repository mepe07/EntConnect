import './selectbox.component.scss';
import React from 'react';

interface SelectBoxComponentProps {
  id: string;
  options: { value: string; label: string }[];
  selectedOption?: string;
  label?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function SelectBoxComponent({ id, options, selectedOption, label, onChange }: SelectBoxComponentProps) {
  return (
    <>
      <div className="selectbox-container">
        {label && <label htmlFor={id}>{label}</label>}
        <select id={id} value={selectedOption} onChange={onChange}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
