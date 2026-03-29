import './input.component.scss';


import React from 'react';

interface InputComponentProps {
  id: string;
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function InputComponent({ id, label, placeholder, value, onChange }: InputComponentProps) {
  return (
    <>
      <div className="input-container">
        {label && <label htmlFor={id}>{label}</label>}
        <input
          id={id}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      </div>
    </>
  );
}
