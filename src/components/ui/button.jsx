import React from "react";

const buttonVariants = {
  variant: {
    default:
      "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 border-0",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl transition-all duration-200 border-0",
    outline:
      "border-2 border-slate-300 bg-white hover:bg-slate-50 hover:text-slate-900 hover:border-blue-500 transition-all duration-200 shadow-md hover:shadow-lg",
    secondary:
      "bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-md hover:shadow-lg transition-all duration-200 border-0",
    ghost:
      "hover:bg-slate-100 hover:text-slate-900 transition-all duration-200 border-0 shadow-none hover:shadow-sm",
    link: "text-blue-600 underline-offset-4 hover:underline transition-all duration-200 border-0 shadow-none",
    gradient:
      "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 border-0",
    glass:
      "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all duration-200 shadow-lg hover:shadow-xl",
  },
  size: {
    default: "h-12 px-6 py-3 text-base font-medium",
    sm: "h-10 px-4 py-2 text-sm font-medium rounded-lg",
    lg: "h-14 px-10 py-4 text-lg font-semibold rounded-xl",
    xl: "h-16 px-12 py-5 text-xl font-semibold rounded-2xl",
    icon: "h-12 w-12 p-0",
    "icon-sm": "h-10 w-10 p-0",
    "icon-lg": "h-16 w-16 p-0",
  },
};

const Button = React.forwardRef(
  (
    {
      className = "",
      variant = "default",
      size = "default",
      asChild = false,
      loading = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? "div" : "button";

    const baseClasses =
      "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]";

    const variantClasses =
      buttonVariants.variant[variant] || buttonVariants.variant.default;
    const sizeClasses =
      buttonVariants.size[size] || buttonVariants.size.default;

    const allClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`.trim();

    return (
      <Comp
        ref={ref}
        className={allClasses}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="mr-2 inline-block animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        )}
        {children}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
