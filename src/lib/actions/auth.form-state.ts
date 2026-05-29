// Client/Shared: form state helpers for useFormState/useActionState

export interface AuthFormState {
  success: boolean;
  message: string | null;
}

export const initialAuthFormState: AuthFormState = {
  success: false,
  message: null
};

