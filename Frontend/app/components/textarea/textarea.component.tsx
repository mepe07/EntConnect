import './textarea.component.scss';
import React from 'react';

interface TextareaComponentProps {
  id: string;
  label?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  cols?: number;
}

export function TextareaComponent({
  id,
  label,
  value,
  onChange,
  placeholder = "Enter text...",
  rows = 5,
  cols,
}: TextareaComponentProps) {
  return (
    <>
      <div className="textarea-container">
        {label && <label htmlFor={id}>{label}</label>}
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          cols={cols}
        />
      </div>
    </>
  );
}
