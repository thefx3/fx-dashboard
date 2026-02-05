export const textMuted = "text-xs text-muted-foreground";

export const inputBase = "rounded-md border border-input bg-background text-sm";
export const inputField = `${inputBase} h-9 px-3`;
export const inputFocus = "focus:outline-none focus:ring-1 focus:ring-primary/90";
export const inputFieldFocus = `${inputField} ${inputFocus}`;
export const textareaBase = `${inputBase} p-3 ${inputFocus}`;

export const buttonBase = "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm";
export const buttonOutline = `${buttonBase} border border-border hover:bg-muted`;
export const buttonDangerSmall =
  "inline-flex h-8 w-full items-center justify-center rounded-md border border-destructive/50 px-3 text-xs text-destructive hover:bg-destructive/10 sm:w-auto";

export const iconOptionBase =
  "flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition hover:bg-muted peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary";
