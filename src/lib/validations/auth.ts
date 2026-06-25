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

export const ForgotPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email zorunludur.")
    .email("Geçerli bir email adresi gir.")
    .max(254),
});

export const ResetPasswordFormSchema = z
  .object({
    token: z.string().trim().min(1, "Geçersiz bağlantı."),
    password: z
      .string()
      .trim()
      .min(1, "Şifre zorunludur.")
      .min(6, "Şifre en az 6 karakter olmalıdır.")
      .max(200),
    confirmPassword: z.string().trim().min(1, "Şifre tekrarı zorunludur."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirmPassword"],
  });

export type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordFormSchema>;
export type ResetPasswordFormValues = z.infer<typeof ResetPasswordFormSchema>;

