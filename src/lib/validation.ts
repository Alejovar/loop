import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255, "Máximo 255 caracteres"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const registerSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255, "Máximo 255 caracteres"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(72, "Máximo 72 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número")
    .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial"),
});

export const profileSchema = z.object({
  name: z.string().trim().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
  username: z
    .string()
    .trim()
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]*$/, "Solo letras, números y guión bajo")
    .optional()
    .or(z.literal("")),
  gender: z.string().optional(),
  birthDate: z.date().optional(),
});

export const createUserSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72, "Máximo 72 caracteres"),
  name: z.string().trim().max(100).optional(),
  role: z.enum(["admin", "user"]).default("user"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
