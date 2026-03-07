"use client";
import * as RadixSwitch from "@radix-ui/react-switch";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

export function Switch({ checked, onCheckedChange, disabled, label }: SwitchProps) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-fab-gold/50 ${
        checked ? "bg-fab-win" : "bg-fab-border"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <RadixSwitch.Thumb
        className={`block w-5 h-5 rounded-full bg-white transition-transform will-change-transform ${
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        }`}
        style={{ marginTop: "2px" }}
      />
    </RadixSwitch.Root>
  );
}
