"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { number, rupiahDigits } from "@/lib/format";

type RupiahInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "name" | "defaultValue" | "value" | "onChange" | "inputMode"
> & {
  name: string;
  defaultValue?: number | string | null;
};

export function RupiahInput({ name, defaultValue, id, className = "input", placeholder = "Rp 0", ...props }: RupiahInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [amount, setAmount] = useState(() => rupiahDigits(defaultValue));
  const displayValue = amount === "" ? "" : `Rp ${number(Number(amount))}`;

  return (
    <>
      <input type="hidden" name={name} value={amount} />
      <input
        {...props}
        id={inputId}
        className={className}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={displayValue}
        placeholder={placeholder}
        onChange={(event) => setAmount(rupiahDigits(event.target.value))}
      />
    </>
  );
}
