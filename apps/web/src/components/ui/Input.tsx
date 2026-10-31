import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  id,
  style,
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        style={{
          padding: '9px 12px',
          borderRadius: 'var(--radius-sm)',
          border: error ? '1px solid var(--danger)' : '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          outline: 'none',
          transition: 'border-color 0.15s ease',
          ...style,
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>}
      {!error && helperText && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{helperText}</span>
      )}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, id, style, ...props }) => {
  const inputId = id || props.name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        style={{
          padding: '9px 12px',
          borderRadius: 'var(--radius-sm)',
          border: error ? '1px solid var(--danger)' : '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          outline: 'none',
          resize: 'vertical',
          minHeight: '80px',
          ...style,
        }}
        {...props}
      />
      {error && <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
};

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  id,
  style,
  ...props
}) => {
  const selectId = id || props.name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        style={{
          padding: '9px 12px',
          borderRadius: 'var(--radius-sm)',
          border: error ? '1px solid var(--danger)' : '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          outline: 'none',
          ...style,
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>}
    </div>
  );
};
