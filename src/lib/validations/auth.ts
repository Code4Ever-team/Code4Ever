import { z } from "zod";

export const LoginFormSchema = z.object({
  usernameOrEmail: z
    .string()
    .trim()
    .min(1, "Kullanıcı adı veya email zorunludur.")
    .min(3, "Kullanıcı adı en az 3 karakter olmalıdır.")
    .max(120),
  password: z
    .string()
    .trim()
    .min(1, "Şifre zorunludur.")
    .min(6, "Şifre en az 6 karakter olmalıdır.")
    .max(200),
});

export const RegisterFormSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Kullanıcı adı zorunludur.")
    .min(3, "Kullanıcı adı en az 3 karakter olmalıdır.")
    .max(30),
  email: z
    .string()
    .trim()
    .min(1, "Email zorunludur.")
    .email("Geçerli bir email adresi gir.")
    .max(254),
  password: z
    .string()
    .trim()
    .min(1, "Şifre zorunludur.")
    .min(6, "Şifre en az 6 karakter olmalıdır.")
    .max(200),
});

export type LoginFormValues = z.infer<typeof LoginFormSchema>;
export type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

