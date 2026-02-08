"use client";

import { useState } from "react";

type BaseFieldProps = {
  name: string;
  defaultValue?: string;
  className?: string;
};

type TimeFieldProps = BaseFieldProps & {
  step?: number;
};

export function DateField({ name, defaultValue = "", className }: BaseFieldProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <input
      type="date"
      name={name}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={className}
    />
  );
}

export function TimeField({ name, defaultValue = "", className, step }: TimeFieldProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <input
      type="time"
      name={name}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={className}
      step={step}
    />
  );
}