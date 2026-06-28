import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "primary";
  size?: "default" | "sm" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "default", ...props }, ref) => {
    let baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
    
    let variantStyles = "";
    switch (variant) {
      case "primary":
      case "default":
        variantStyles = "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm";
        break;
      case "destructive":
        variantStyles = "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm";
        break;
      case "outline":
        variantStyles = "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground";
        break;
      case "secondary":
        variantStyles = "bg-secondary text-secondary-foreground hover:bg-secondary/80";
        break;
      case "ghost":
        variantStyles = "hover:bg-accent hover:text-accent-foreground";
        break;
      case "link":
        variantStyles = "underline-offset-4 hover:underline text-primary";
        break;
    }

    let sizeStyles = "";
    switch (size) {
      case "default":
        sizeStyles = "h-10 py-2 px-4";
        break;
      case "sm":
        sizeStyles = "h-9 px-3 rounded-md text-xs";
        break;
      case "lg":
        sizeStyles = "h-11 px-8 rounded-md text-base";
        break;
      case "icon":
        sizeStyles = "h-10 w-10 p-0";
        break;
    }

    return (
      <button
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
