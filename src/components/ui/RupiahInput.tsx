import React, { useEffect, useState } from "react";

interface RupiahInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  size?: "sm" | "md";
  allowNull?: boolean;
  name?: string;
  id?: string;
}

/**
 * Format raw number to Indonesian Rupiah thousand separator string (e.g. 150000 -> "150.000")
 */
function formatNumberToRupiah(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "";
  return num.toLocaleString("id-ID");
}

export default function RupiahInput({
  value,
  onChange,
  onBlur,
  placeholder = "0",
  disabled = false,
  required = false,
  className = "",
  inputClassName = "",
  size = "md",
  allowNull = false,
  name,
  id,
}: RupiahInputProps) {
  // Local display state (formatted with dots)
  const [displayValue, setDisplayValue] = useState<string>(() =>
    formatNumberToRupiah(value)
  );

  // Sync with external value changes
  useEffect(() => {
    setDisplayValue(formatNumberToRupiah(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, "");

    if (rawDigits === "") {
      setDisplayValue("");
      onChange(allowNull ? null : 0);
      return;
    }

    const numeric = parseInt(rawDigits, 10);
    setDisplayValue(numeric.toLocaleString("id-ID"));
    onChange(numeric);
  };

  const handleBlur = () => {
    if (onBlur) onBlur();
  };

  const isSmall = size === "sm";

  return (
    <div
      className={`flex items-center border border-input rounded-md bg-background overflow-hidden transition-all shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary ${
        disabled ? "opacity-50 cursor-not-allowed bg-muted/20" : ""
      } ${className}`}
    >
      <span
        className={`bg-muted/50 border-r border-border text-muted-foreground font-semibold select-none shrink-0 flex items-center justify-center ${
          isSmall ? "px-2 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
        }`}
      >
        Rp
      </span>
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`w-full bg-transparent text-foreground placeholder:text-muted-foreground/60 focus:outline-none font-medium ${
          isSmall ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm"
        } ${inputClassName}`}
      />
    </div>
  );
}
