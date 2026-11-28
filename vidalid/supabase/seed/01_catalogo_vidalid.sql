-- =====================================================================
-- VIDALID · Carga inicial del catálogo (Catálogo de productos, edición 2026)
-- 4 líneas y 72 productos con sus códigos oficiales (T-, P-, C-, J-).
--
-- - El catálogo no incluye precios: los productos se crean INACTIVOS
--   (no aparecen en la tienda) con precio 0.
-- - Para ponerles precio y activarlos usa 02_precios_catalogo.sql,
--   o edítalos uno por uno en el panel (Productos).
-- - Se puede ejecutar más de una vez: no duplica categorías ni productos.
-- - El stock se carga después desde Inventario (Registrar ingreso).
-- =====================================================================

-- Líneas (categorías)
insert into public.categories (name, description) values
  ('Tinturas', 'Extractos líquidos a base de plantas.'),
  ('Polvos', 'Superalimentos y fórmulas naturales en polvo.'),
  ('Cápsulas', 'Fórmulas naturales en cápsulas.'),
  ('Jarabes', 'Línea Verde Amazónico: jarabes a base de plantas.')
on conflict ((lower(trim(name)))) do nothing;

-- Productos
with catalogo (sku, nombre, linea, unidad, descripcion) as (
  values
    -- 01 · Tinturas (6)
    ('T-01', 'Higabil', 'Tinturas', 'frasco', null),
    ('T-02', 'Píldora de Ajo', 'Tinturas', 'frasco', null),
    ('T-03', 'Píldora de Bacalao', 'Tinturas', 'frasco', null),
    ('T-04', 'Tintura de Ajo', 'Tinturas', 'frasco', null),
    ('T-05', 'Tintura Pasuchaca', 'Tinturas', 'frasco', null),
    ('T-06', 'Tintura Valeriana', 'Tinturas', 'frasco', null),
    -- 02 · Polvos (26)
    ('P-01', 'Achiote en Polvo', 'Polvos', 'unidad', null),
    ('P-02', 'Alcachofa en Polvo', 'Polvos', 'unidad', null),
    ('P-03', 'Caticolagein', 'Polvos', 'unidad', null),
    ('P-04', 'Chanca Piedra', 'Polvos', 'unidad', null),
    ('P-05', 'Citrato de Magnesio en Polvo', 'Polvos', 'unidad', null),
    ('P-06', 'Citrato de Potasio en Polvo', 'Polvos', 'unidad', null),
    ('P-07', 'Colágeno', 'Polvos', 'bolsa', 'Presentación en bolsa.'),
    ('P-08', 'Colágeno Manzana', 'Polvos', 'unidad', null),
    ('P-09', 'Colágeno Vidalid', 'Polvos', 'unidad', null),
    ('P-10', 'Desintrix Plus', 'Polvos', 'unidad', null),
    ('P-11', 'Femenina', 'Polvos', 'unidad', null),
    ('P-12', 'Fibra Fruit', 'Polvos', 'unidad', null),
    ('P-13', 'Gastrisan en Polvo', 'Polvos', 'unidad', null),
    ('P-14', 'Graviola en Polvo', 'Polvos', 'unidad', null),
    ('P-15', 'Jabón de Carbón', 'Polvos', 'unidad', null),
    ('P-16', 'Maca Avena', 'Polvos', 'unidad', null),
    ('P-17', 'Maca Colágeno', 'Polvos', 'unidad', null),
    ('P-18', 'Maca Moringa', 'Polvos', 'unidad', null),
    ('P-19', 'Maca Negra', 'Polvos', 'unidad', null),
    ('P-20', 'Moringa', 'Polvos', 'unidad', null),
    ('P-21', 'Nervio Stress', 'Polvos', 'unidad', null),
    ('P-22', 'Polvo 10 Semillas', 'Polvos', 'unidad', null),
    ('P-23', 'Riñosan en Polvo', 'Polvos', 'unidad', null),
    ('P-24', 'Rompe Quiste', 'Polvos', 'unidad', null),
    ('P-25', 'Super Colon en Polvo', 'Polvos', 'unidad', null),
    ('P-26', 'Salvador Triple', 'Polvos', 'unidad', null),
    -- 03 · Cápsulas (20)
    ('C-01', 'Ajo Negro', 'Cápsulas', 'frasco', null),
    ('C-02', 'Chanca Piedra', 'Cápsulas', 'frasco', null),
    ('C-03', 'Chupa Panza', 'Cápsulas', 'paquete x 12', 'Presentación x 12.'),
    ('C-04', 'Citrato de Potasio', 'Cápsulas', 'frasco', null),
    ('C-05', 'Citrato de Magnesio', 'Cápsulas', 'frasco', null),
    ('C-06', 'Copaibo', 'Cápsulas', 'frasco', null),
    ('C-07', 'Cúrcuma + Pimienta', 'Cápsulas', 'frasco', null),
    ('C-08', 'Hercampuri', 'Cápsulas', 'frasco', null),
    ('C-09', 'Maca Negra', 'Cápsulas', 'frasco', null),
    ('C-10', 'Moringa', 'Cápsulas', 'frasco', null),
    ('C-11', 'Prosta Max', 'Cápsulas', 'frasco', null),
    ('C-12', 'Prosta-Plus 2', 'Cápsulas', 'frasco', null),
    ('C-13', 'Cápsulas Varias', 'Cápsulas', 'frasco', null),
    ('C-14', 'Bio Prost G', 'Cápsulas', 'frasco', null),
    ('C-15', 'Femenina', 'Cápsulas', 'frasco', null),
    ('C-16', 'Hígado Graso', 'Cápsulas', 'frasco', null),
    ('C-17', 'Píldora Macho Machote', 'Cápsulas', 'frasco', null),
    ('C-18', 'Prosta Fort', 'Cápsulas', 'frasco', null),
    ('C-19', 'Relax Plus', 'Cápsulas', 'frasco', null),
    ('C-20', 'Resveratrol', 'Cápsulas', 'frasco', null),
    -- 04 · Jarabes · Línea Verde Amazónico (20)
    ('J-01', 'Fito Artrit', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-02', 'Fito C.3', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-03', 'Fito Cerebral', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-04', 'Fito Chanca Piedra', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-05', 'Fito Clorofila', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-06', 'Fito Colon', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-07', 'Fito Control', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-08', 'Fito Femenina', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-09', 'Fito Gastrin', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-10', 'Fito H.M', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-11', 'Fito Hepat', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-12', 'Fito Nervio Stress', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-13', 'Fito Prost', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-14', 'Fito Renal', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-15', 'Fito Rompe Cálculo', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-16', 'Fito Rompe Quiste', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-17', 'Fito Urisan', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-18', 'Uña de Gato', 'Jarabes', 'frasco', 'Línea Verde Amazónico.'),
    ('J-19', 'Fito Tos', 'Jarabes', 'frasco 250 ml', 'Línea Verde Amazónico. Frasco de 250 ml.'),
    ('J-20', 'Fito Tos Junior', 'Jarabes', 'frasco 250 ml', 'Línea Verde Amazónico. Frasco de 250 ml.')
)
insert into public.products (sku, name, description, category_id, unit, cost, sale_price, min_stock, is_active)
select c.sku, c.nombre, c.descripcion, cat.id, c.unidad, 0, 0, 5, false
from catalogo c
join public.categories cat on lower(trim(cat.name)) = lower(c.linea)
on conflict ((upper(trim(sku)))) do nothing;

-- Resumen de la carga
select cat.name as linea, count(p.id) as productos
from public.categories cat
left join public.products p on p.category_id = cat.id and p.sku ~ '^[TPCJ]-\d{2}$'
where cat.name in ('Tinturas', 'Polvos', 'Cápsulas', 'Jarabes')
group by cat.name
order by min(p.sku);
