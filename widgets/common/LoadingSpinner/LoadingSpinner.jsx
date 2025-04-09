// widgets/common/LoadingSpinner/LoadingSpinner.jsx
import React, { memo } from "react";

export const LoadingSpinner = memo(({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className={`
          animate-spin 
          rounded-full 
          border-white/20 
          border-t-white 
          ${sizeClasses[size]} 
          ${className}
        `}
        role="status"
        aria-label="Загрузка"
      />
    </div>
  );
});
