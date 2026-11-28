# Base de datos VIDALID (Supabase)

Las migraciones están en `migrations/` y se aplican **en orden** (por la fecha del nombre):

| Archivo | Contenido |
|---|---|
| `20261126130000_core_schema.sql` | Tipos, tablas, restricciones e índices |
| `20261126130100_auth_roles.sql` | Perfiles automáticos, `is_admin()`, protección del último admin |
| `20261126130200_inventory_functions.sql` | Entradas, salidas y ajustes de stock con lotes (FEFO) |
| `20261126130300_sales_functions.sql` | `register_sale` y `void_sale` |
| `20261126130400_security_rls.sql` | Privilegios, políticas RLS, vista `catalog_products` y bucket de imágenes |
| `20261127090000_product_stock_status.sql` | Columnas calculadas `available_stock` y `stock_status` |
| `20261127100000_product_delete.sql` | Eliminar productos sin historial |
| `20261127110000_inventory_summary.sql` | Resumen de inventario |
| `20261127120000_crm.sql` | Seguimientos de clientes y vista `customer_summaries` |
| `20261127130000_sales_summary.sql` | Resumen de ventas por periodo |
| `20261127140000_dashboard.sql` | Ventas por día y productos más vendidos |
| `20261127150000_ai_analytics.sql` | Baja rotación, clientes frecuentes y sugerencias de reposición |
| `20261127160000_orders.sql` | Pedidos, reservas de stock e historial de estados |
| `20261128090000_customer_accounts.sql` | Cuentas de clientes desde el portal |
| `20261128100000_store_ai.sql` | Límite de uso del chat de la tienda (`consume_ai_quota`) |

## Reglas de negocio

- Roles: `admin` (personal de VIDALID) y `customer` (minorista con cuenta en el portal).
- Todo usuario nuevo empieza como `customer`. Solo un admin puede cambiar roles.
- El stock **solo** cambia con las funciones `register_stock_entry`, `register_stock_exit`,
  `adjust_stock`, `register_sale` y `void_sale`. Cada cambio queda en `inventory_movements`.
- `products.stock` = suma de `batches.quantity`. Las salidas usan FEFO (primero vence, primero sale);
  las ventas ignoran lotes vencidos.
- Disponible = `stock - reserved_stock` (la reserva la usarán los pedidos).
- Pagos: solo `cash` (efectivo) y `qr`. La suma de los pagos debe ser igual al total.
- Las ventas no se borran: se anulan con motivo y el stock vuelve a sus lotes.

## Escalabilidad: cómo crecer sin rehacer

El esquema está pensado para ampliarse con **migraciones nuevas**, sin modificar las ya aplicadas:

| Necesidad futura | Cómo se agrega |
|---|---|
| Nuevos roles (vendedor, almacén, repartidor) | `alter type public.user_role add value '...'` y una función `has_role()` junto a `is_admin()`; las políticas existentes siguen funcionando. |
| Nuevos métodos de pago (transferencia, tarjeta) | `alter type public.payment_method add value '...'`. |
| Pedidos y reservas | Las tablas `orders` / `order_items` usan `products.reserved_stock`, que ya existe. |
| Distribución / repartidores | Tabla `deliveries` enlazada a `orders`, sin tocar ventas ni inventario. |
| Más de un almacén o sucursal | Agregar `warehouse_id` a `batches`: el stock ya se calcula por lotes. |
| Compras e importaciones | `suppliers` / `purchases` que llaman a `register_stock_entry`. |
| Precio por mayor y por menor | Columna o tabla de precios; `register_sale` es el único lugar que lee el precio. |
| Muchos datos | Claves UUID, índices por fecha y producto, historial solo de inserción; paginación en el frontend. |

Regla: **nunca editar una migración ya aplicada**; cada cambio va en un archivo nuevo con fecha posterior.

## Cómo aplicar las migraciones (SQL Editor)

1. Abre tu proyecto en <https://supabase.com/dashboard> → **SQL Editor** → **New query**.
2. Copia y pega el contenido del primer archivo y pulsa **Run**.
3. Repite con los demás archivos, **uno por uno y en orden**.
4. Si alguno falla, no sigas con el siguiente: copia el error completo.

## Crear el primer administrador

1. **Authentication → Users → Add user → Create new user**: escribe tu correo y contraseña
   y marca *Auto Confirm User*.
2. En el **SQL Editor** ejecuta (cambia el correo):

```sql
update public.profiles
set role = 'admin', full_name = 'Administrador VIDALID'
where email = 'tu-correo@ejemplo.com';
```

## Catálogo inicial (`seed/`)

Datos del *Catálogo de productos · edición 2026* (4 líneas y 72 productos con códigos T-, P-, C-, J-).
No son migraciones: se ejecutan una vez en el SQL Editor (se pueden repetir sin duplicar).

| Archivo | Qué hace |
|---|---|
| `seed/01_catalogo_vidalid.sql` | Crea las líneas Tinturas, Polvos, Cápsulas y Jarabes y los 72 productos, **inactivos** y con precio 0 (el catálogo no trae precios) |
| `seed/02_precios_catalogo.sql` | Precio, costo y stock mínimo de cada producto (**precios estimados**, costo = 60%); al ejecutarla se **activan** y aparecen en la tienda. Ajusta los valores y vuelve a ejecutarla cuando tengas los precios reales |

Después, registra el stock de cada producto en **Inventario → Registrar ingreso**.

## VIDALID AI (Edge Function `vidalid-ai`)

Arquitectura: **React → Edge Function → proveedor de IA (Gemini gratis) → funciones SQL autorizadas → respuesta**.

- La clave del proveedor de IA vive **solo** en los secretos de Supabase. Nunca va en `.env` ni en el frontend.
- La función consulta la base de datos con el token del usuario (aplican RLS y el rol admin).
- La IA solo puede usar herramientas de **lectura** (ventas, productos, clientes, inventario,
  reposición). No ejecuta SQL libre ni modifica datos.
- La "Consulta rápida" de productos busca directo en PostgreSQL, sin IA (costo cero).

### Desplegar desde el panel de Supabase (sin instalar nada)

1. Crea una clave **gratuita** de Google Gemini en <https://aistudio.google.com/apikey>
   (solo necesitas una cuenta de Google; no pide tarjeta).
2. Supabase → **Edge Functions → Secrets** → agrega `AI_API_KEY` con esa clave.
   Con Gemini no hace falta nada más (`AI_BASE_URL` y `AI_MODEL` tienen valores por defecto).

   | Proveedor | Costo | `AI_BASE_URL` | `AI_MODEL` |
   |---|---|---|---|
   | Google Gemini (por defecto) | Nivel gratuito | *(no hace falta)* | `gemini-flash-latest` |
   | Groq | Nivel gratuito | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
   | OpenAI | De pago | `https://api.openai.com/v1` | `gpt-4o-mini` |

   Los niveles gratuitos tienen límites de solicitudes por minuto y por día: si se
   superan, el asistente avisa y basta con esperar. Si un modelo deja de existir,
   cambia `AI_MODEL` por el que indique el proveedor.
3. Supabase → **Edge Functions → Deploy a new function → Via Editor**.
   Nombre: `vidalid-ai`. Pega el contenido de `functions/vidalid-ai/index.ts` y pulsa **Deploy**.
   Deja activado **Verify JWT** (solo usuarios con sesión pueden llamarla).
4. Aplica la migración `20261127150000_ai_analytics.sql` en el SQL Editor.

### Desplegar con la CLI (alternativa)

```powershell
npx supabase login
npx supabase link --project-ref yswsfnvvbwvymcgpiydv
npx supabase secrets set AI_API_KEY=tu-clave-de-gemini
npx supabase functions deploy vidalid-ai
```

Para cambiar algo de la IA, edita `functions/vidalid-ai/index.ts` y vuelve a desplegar.

## Chat de la tienda (Edge Function `vidalid-store-ai`)

Asistente para clientes y visitantes del portal (botón **¿Te ayudamos?**). Responde sobre
productos, precios, disponibilidad y cómo comprar; si el cliente inició sesión, también sobre
el estado de **sus** pedidos.

- Solo lee el catálogo público (`catalog_products`: sin costos ni stock interno) y los pedidos
  con el token del propio cliente (RLS).
- Límite de uso: 15 mensajes cada 10 minutos por persona (usuario o IP, guardada como hash) y
  500 mensajes por día en toda la tienda. Se ajusta en las constantes del inicio del archivo.
- Usa los mismos secretos que `vidalid-ai` (`AI_API_KEY`, ya configurado).

Pasos:

1. Aplica la migración `20261128100000_store_ai.sql` en el SQL Editor.
2. **Edge Functions → Deploy a new function → Via Editor**. Nombre: `vidalid-store-ai`.
   Pega el contenido de `functions/vidalid-store-ai/index.ts` y pulsa **Deploy**.
3. En la función, abre **Details** y **desactiva Verify JWT** (*Enforce JWT verification*):
   los visitantes sin cuenta no tienen token. La función se protege con el límite de uso.

Con la CLI: `npx supabase functions deploy vidalid-store-ai --no-verify-jwt`.

## Llamar a las funciones desde el frontend

```ts
const { data: saleId, error } = await supabase.rpc('register_sale', {
  p_items: [{ product_id: '...', quantity: 2 }],
  p_payments: [{ method: 'cash', amount: 170 }],
  p_customer_id: null,
  p_discount: 0,
})
```
