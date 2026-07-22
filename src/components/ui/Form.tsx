import type { FormHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

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

