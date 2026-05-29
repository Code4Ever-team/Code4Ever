import type { FormHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Shadcn UI'daki <Form> bileşeninin hafif bir karşılığı.
// Bu projede asıl hedef server action ile çalışan form ergonomisini sağlamak.

export type FormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & {
  action?: unknown;
  className?: string;
};

export function Form({ className, action, ...props }: FormProps) {
  return (
    <form
      action={action as any}
      className={cn("space-y-4", className)}
      {...props}
    />
  );
}

