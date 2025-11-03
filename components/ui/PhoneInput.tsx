"use client";

import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneNumberInputProps {
  value?: string;
  onChange: (value?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PhoneNumberInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  disabled = false,
  className = "",
}: PhoneNumberInputProps) {
  return (
    <PhoneInput
      international
      defaultCountry="US"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`phone-input ${className}`}
      numberInputProps={{
        className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500",
      }}
    />
  );
}
