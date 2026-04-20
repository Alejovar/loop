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

export const socialProfileSchema = z.object({
  name: z.string().trim().max(100, "Máximo 100 caracteres").optional().or(z.literal("")),
  username: z
    .string()
    .trim()
    .max(30, "Máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]*$/, "Solo letras, números y guión bajo")
    .optional()
    .or(z.literal("")),
  bio: z.string().trim().max(160, "Máximo 160 caracteres").optional().or(z.literal("")),
});

export const postSchema = z
  .object({
    content: z.string().trim().max(1000, "Máximo 1000 caracteres").optional().or(z.literal("")),
    hasImage: z.boolean().default(false),
  })
  .refine((value) => value.hasImage || !!value.content?.trim(), {
    message: "Escribe algo o sube una imagen",
    path: ["content"],
  });

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Escribe un comentario").max(500, "Máximo 500 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type SocialProfileInput = z.infer<typeof socialProfileSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
