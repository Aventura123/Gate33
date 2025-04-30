import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, children, ...props }, ref) => {
    const Component = asChild ? "span" : "button";

    return (
      <Component
        ref={ref}
        className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-400 transition-colors"
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Button.displayName = "Button";