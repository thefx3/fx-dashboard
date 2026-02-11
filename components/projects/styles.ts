export const textMuted = "text-xs text-muted-foreground";

export const inputBase = "rounded-md border border-input bg-background text-sm";
export const inputField = `${inputBase} h-9 px-3`;
export const inputFocus = "focus:outline-none focus:ring-1 focus:ring-primary/90";
export const inputFieldFocus = `${inputField} ${inputFocus}`;
export const textareaBase = `${inputBase} p-3 ${inputFocus}`;

export const buttonBase = "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm transition";
export const buttonOutline =
  `${buttonBase} border border-border transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent`;
export const buttonDangerSmall =
  "inline-flex h-8 w-full items-center justify-center rounded-md border border-destructive/50 px-3 text-xs text-destructive transition hover:bg-destructive/15 sm:w-auto";

export const iconOptionBase =
  "flex items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary";
