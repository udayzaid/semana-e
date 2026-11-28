-- =====================================================================
-- VIDALID · Precios del catálogo y activación
--
-- PRECIOS ESTIMADOS: el catálogo oficial no incluye precios. Estos valores son una
-- referencia de mercado (costo estimado = 60% del precio). Revísalos y ajústalos a los
-- precios reales de VIDALID; puedes volver a ejecutar este archivo cuando los cambies.
--
-- Cómo usarlo:
--   1. Escribe el PRECIO de venta (y si quieres el COSTO) de cada producto, en Bs.
--      Usa punto para decimales: 85.50
--   2. Ejecuta todo el archivo en Supabase → SQL Editor.
--   3. Los productos con precio mayor a 0 quedan ACTIVOS y aparecen en la tienda.
--      Los que dejes en 0 siguen inactivos (puedes completarlos después).
--   4. Para que se puedan vender, registra su stock en Inventario → Registrar ingreso.
--
-- Se puede ejecutar varias veces (por ejemplo, para cambiar precios).
-- Columnas: (código, precio de venta, costo, stock mínimo)
-- =====================================================================

update public.products p
set sale_price = v.precio,
    cost = v.costo,
    min_stock = v.minimo,
    is_active = true
from (values
  -- Tinturas
  ('T-01', 35.00, 21.00, 5), -- Higabil
  ('T-02', 30.00, 18.00, 5), -- Píldora de Ajo
  ('T-03', 35.00, 21.00, 5), -- Píldora de Bacalao
  ('T-04', 25.00, 15.00, 5), -- Tintura de Ajo
  ('T-05', 25.00, 15.00, 5), -- Tintura Pasuchaca
  ('T-06', 25.00, 15.00, 5), -- Tintura Valeriana
  -- Polvos
  ('P-01', 30.00, 18.00, 5), -- Achiote en Polvo
  ('P-02', 35.00, 21.00, 5), -- Alcachofa en Polvo
  ('P-03', 60.00, 36.00, 5), -- Caticolagein
  ('P-04', 30.00, 18.00, 5), -- Chanca Piedra
  ('P-05', 45.00, 27.00, 5), -- Citrato de Magnesio en Polvo
  ('P-06', 45.00, 27.00, 5), -- Citrato de Potasio en Polvo
  ('P-07', 80.00, 48.00, 5), -- Colágeno
  ('P-08', 85.00, 51.00, 5), -- Colágeno Manzana
  ('P-09', 90.00, 54.00, 5), -- Colágeno Vidalid
  ('P-10', 55.00, 33.00, 5), -- Desintrix Plus
  ('P-11', 45.00, 27.00, 5), -- Femenina
  ('P-12', 40.00, 24.00, 5), -- Fibra Fruit
  ('P-13', 40.00, 24.00, 5), -- Gastrisan en Polvo
  ('P-14', 40.00, 24.00, 5), -- Graviola en Polvo
  ('P-15', 20.00, 12.00, 5), -- Jabón de Carbón
  ('P-16', 35.00, 21.00, 5), -- Maca Avena
  ('P-17', 60.00, 36.00, 5), -- Maca Colágeno
  ('P-18', 40.00, 24.00, 5), -- Maca Moringa
  ('P-19', 45.00, 27.00, 5), -- Maca Negra
  ('P-20', 30.00, 18.00, 5), -- Moringa
  ('P-21', 40.00, 24.00, 5), -- Nervio Stress
  ('P-22', 40.00, 24.00, 5), -- Polvo 10 Semillas
  ('P-23', 40.00, 24.00, 5), -- Riñosan en Polvo
  ('P-24', 45.00, 27.00, 5), -- Rompe Quiste
  ('P-25', 45.00, 27.00, 5), -- Super Colon en Polvo
  ('P-26', 50.00, 30.00, 5), -- Salvador Triple
  -- Cápsulas
  ('C-01', 60.00, 36.00, 5), -- Ajo Negro
  ('C-02', 45.00, 27.00, 5), -- Chanca Piedra
  ('C-03', 35.00, 21.00, 5), -- Chupa Panza
  ('C-04', 50.00, 30.00, 5), -- Citrato de Potasio
  ('C-05', 50.00, 30.00, 5), -- Citrato de Magnesio
  ('C-06', 55.00, 33.00, 5), -- Copaibo
  ('C-07', 55.00, 33.00, 5), -- Cúrcuma + Pimienta
  ('C-08', 45.00, 27.00, 5), -- Hercampuri
  ('C-09', 55.00, 33.00, 5), -- Maca Negra
  ('C-10', 45.00, 27.00, 5), -- Moringa
  ('C-11', 70.00, 42.00, 5), -- Prosta Max
  ('C-12', 70.00, 42.00, 5), -- Prosta-Plus 2
  ('C-13', 45.00, 27.00, 5), -- Cápsulas Varias
  ('C-14', 75.00, 45.00, 5), -- Bio Prost G
  ('C-15', 50.00, 30.00, 5), -- Femenina
  ('C-16', 60.00, 36.00, 5), -- Hígado Graso
  ('C-17', 65.00, 39.00, 5), -- Píldora Macho Machote
  ('C-18', 70.00, 42.00, 5), -- Prosta Fort
  ('C-19', 50.00, 30.00, 5), -- Relax Plus
  ('C-20', 80.00, 48.00, 5), -- Resveratrol
  -- Jarabes
  ('J-01', 50.00, 30.00, 5), -- Fito Artrit
  ('J-02', 45.00, 27.00, 5), -- Fito C.3
  ('J-03', 50.00, 30.00, 5), -- Fito Cerebral
  ('J-04', 45.00, 27.00, 5), -- Fito Chanca Piedra
  ('J-05', 40.00, 24.00, 5), -- Fito Clorofila
  ('J-06', 45.00, 27.00, 5), -- Fito Colon
  ('J-07', 50.00, 30.00, 5), -- Fito Control
  ('J-08', 45.00, 27.00, 5), -- Fito Femenina
  ('J-09', 45.00, 27.00, 5), -- Fito Gastrin
  ('J-10', 50.00, 30.00, 5), -- Fito H.M
  ('J-11', 50.00, 30.00, 5), -- Fito Hepat
  ('J-12', 45.00, 27.00, 5), -- Fito Nervio Stress
  ('J-13', 50.00, 30.00, 5), -- Fito Prost
  ('J-14', 45.00, 27.00, 5), -- Fito Renal
  ('J-15', 50.00, 30.00, 5), -- Fito Rompe Cálculo
  ('J-16', 50.00, 30.00, 5), -- Fito Rompe Quiste
  ('J-17', 45.00, 27.00, 5), -- Fito Urisan
  ('J-18', 45.00, 27.00, 5), -- Uña de Gato
  ('J-19', 40.00, 24.00, 5), -- Fito Tos
  ('J-20', 35.00, 21.00, 5)  -- Fito Tos Junior
) as v(sku, precio, costo, minimo)
where upper(trim(p.sku)) = v.sku
  and v.precio > 0;

-- Resumen: productos del catálogo activos (en la tienda) y pendientes de precio
select count(*) filter (where is_active) as activos_en_tienda,
       count(*) filter (where not is_active) as pendientes_de_precio
from public.products
where sku ~ '^[TPCJ]-\d{2}$';
