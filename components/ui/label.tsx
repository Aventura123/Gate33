import React from "react";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export const Label = ({ children, className, ...props }: LabelProps) => {
  return (
    <label
      className={`block text-sm font-medium text-gray-300 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
};