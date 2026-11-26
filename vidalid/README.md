# VIDALID — Sistema de gestión

MVP web para la gestión de inventario, ventas, clientes, pedidos y distribución de VIDALID.

## Stack

- React + TypeScript + Vite
- Tailwind CSS 4
- Supabase (PostgreSQL, Auth y RLS)
- React Router, TanStack Query y Zustand
- React Hook Form + Zod
- Recharts, Lucide React y Sonner

## Requisitos

- Node.js 22 o superior
- npm

## Desarrollo local

1. Instalar dependencias: `npm install`
2. Copiar `.env.example` a `.env` y completar:

   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<sb_publishable_...>
   ```

3. Iniciar: `npm run dev`

## Seguridad

Las variables `VITE_` se incorporan al bundle del navegador. Solo deben contener datos publicables, como Project URL y publishable key de Supabase. Nunca colocar aquí claves secretas, contraseña de PostgreSQL, `service_role` ni claves de OpenAI. Proteger los datos con RLS y ejecutar operaciones privilegiadas en funciones de servidor.

## Estructura

- `src/app`: rutas y providers.
- `src/components`: componentes compartidos.
- `src/features`: módulos de negocio.
- `src/services`: conexiones externas.
- `src/types`: tipos compartidos.
- `src/hooks`, `src/stores`, `src/lib`: utilidades transversales.
- `supabase/migrations`: migraciones SQL.
- `supabase/functions`: funciones de servidor.

Trabajar mediante ramas de funcionalidad y Pull Requests. No subir archivos `.env`.
