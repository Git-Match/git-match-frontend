import type { FC, InputHTMLAttributes } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}
export const InputField: FC<InputFieldProps> = ({ label, ...props }) => (
  <div className="group relative z-0 mb-8 w-full">
    <input
      {...props}
      placeholder=" "
      className={`peer block w-full appearance-none border-0 border-b-2 border-gray-300 bg-transparent px-0 py-2.5 text-sm text-white focus:border-purple-500 focus:ring-0 focus:outline-none ${
        props.disabled ? 'cursor-not-allowed' : ''
      }`}
      title={props.disabled ? 'Cannot change this field.' : ''}
    />
    <label
      htmlFor={props.name}
      className="absolute top-3 -z-10 origin-left -translate-y-6 scale-75 transform text-sm text-gray-300 duration-300 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:left-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-purple-400"
    >
      {label}
    </label>
  </div>
);
