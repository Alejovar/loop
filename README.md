# Loop

Loop es una mini red social construida con React, TypeScript y Vite. La app está pensada como base para compartir contenido, autenticar usuarios y gestionar flujos de acceso de forma simple.

## Resumen

Loop combina autenticación, publicación social y moderación básica en una experiencia compacta. La interfaz está organizada alrededor de tres áreas principales: feed, búsqueda y perfil.

## Qué incluye

- Registro e inicio de sesión.
- Recuperación de contraseña.
- Verificación de MFA.
- Feed con publicaciones, imágenes y reposts.
- Comentarios, likes y reposts.
- Búsqueda de usuarios y publicaciones.
- Perfil editable con nombre de usuario y biografía.
- Reporte de publicaciones para moderación.
- Integración con Supabase para backend y autenticación.
- Panel de administración para usuarios con permisos de admin.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase

## Rutas principales

- `/login`: acceso a la cuenta.
- `/register`: creación de cuenta.
- `/forgot-password` y `/reset-password`: recuperación de acceso.
- `/mfa-setup` y `/mfa-verify`: configuración y validación de MFA.
- `/dashboard`: experiencia principal de la red social.
- `/admin`: panel de administración.

## Requisitos

- Node.js y npm instalados.

## Desarrollo local

```sh
npm install
npm run dev
```

## Scripts disponibles

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: genera el build de producción.
- `npm run preview`: previsualiza el build generado.
- `npm run lint`: ejecuta ESLint.
- `npm run test`: ejecuta los tests con Vitest.

## Funcionalidades de producto

- Publicar texto e imágenes.
- Crear publicaciones con múltiples imágenes y distintas proporciones.
- Responder con comentarios en cada post.
- Marcar publicaciones con like y hacer repost.
- Ver actividad reciente con fechas relativas.
- Editar nombre, usuario y biografía del perfil.
- Navegar entre feed, búsqueda y perfil desde la barra lateral.
- Acceder al panel de admin si la cuenta tiene ese rol.

## Seguridad y moderación

- CAPTCHA matemático en el login.
- Rate limiting para reducir intentos de acceso fallidos.
- Verificación de email antes de iniciar sesión.
- MFA para cuentas que lo tengan habilitado.
- Registro de acciones en audit logs.
- Reporte de publicaciones para revisión manual.

## Estructura general

- `src/pages`: pantallas principales de la app.
- `src/components`: componentes reutilizables y UI.
- `src/contexts`: contexto de autenticación.
- `src/hooks`: hooks personalizados.
- `supabase`: configuración, funciones y migraciones.

