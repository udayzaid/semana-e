# Base de datos VIDALID (Supabase)

Las migraciones están en `migrations/` y se aplican **en orden** (por la fecha del nombre):

| Archivo | Contenido |
|---|---|
| `20261126130000_core_schema.sql` | Tipos, tablas, restricciones e índices |
| `20261126130100_auth_roles.sql` | Perfiles automáticos, `is_admin()`, protección del último admin |
| `20261126130200_inventory_functions.sql` | Entradas, salidas y ajustes de stock con lotes (FEFO) |
| `20261126130300_sales_functions.sql` | `register_sale` y `void_sale` |
| `20261126130400_security_rls.sql` | Privilegios, políticas RLS, vista `catalog_products` y bucket de imágenes |

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

## Llamar a las funciones desde el frontend

```ts
const { data: saleId, error } = await supabase.rpc('register_sale', {
  p_items: [{ product_id: '...', quantity: 2 }],
  p_payments: [{ method: 'cash', amount: 170 }],
  p_customer_id: null,
  p_discount: 0,
})
```
