import React from 'react';

const FormModel = ({ fields, onSubmit, onCancel, submitLabel = 'Guardar', cancelLabel = 'Cancelar', disabled = false }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  const renderField = (field) => {
    const {
      name,
      label,
      type = 'text',
      value,
      onChange,
      placeholder,
      error,
      options = [],
      rows = 3,
      required = false
    } = field;

    const baseClassName = "mt-0.5 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:text-gray-500";
    const errorClassName = error ? "border-red-500 focus:ring-red-400" : "";
    const finalClassName = `${baseClassName} ${errorClassName}`.trim();

    const handleChange = (e) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    let inputElement;

    switch (type) {
      case 'select':
        inputElement = (
          <select
            name={name}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled}
            className={finalClassName}
            required={required}
          >
            {options.map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
        break;

      case 'textarea':
        inputElement = (
          <textarea
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className={finalClassName}
            required={required}
          />
        );
        break;

      case 'number':
        inputElement = (
          <input
            type="number"
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            step="0.01"
            min="0"
            className={finalClassName}
            required={required}
          />
        );
        break;

      default:
        inputElement = (
          <input
            type={type}
            name={name}
            value={value || ''}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            className={finalClassName}
            required={required}
          />
        );
    }

    return (
      <div key={name} className="mb-2">
        <label className="block text-xs text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {inputElement}
        {error && (
          <p className="text-red-500 text-xs mt-1">{error}</p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {fields.map(renderField)}
      
      <div className="flex space-x-2 pt-2">
        <button
          type="submit"
          disabled={disabled}
          className="flex-1 bg-blue-500 text-white px-3 py-1 text-xs rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-500 text-white px-3 py-1 text-xs rounded hover:bg-gray-600"
          >
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
};

export default FormModel;