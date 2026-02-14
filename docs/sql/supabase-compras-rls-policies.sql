-- =====================================================
-- RLS Policies para la tabla compras
-- =====================================================

-- Habilitar RLS en la tabla compras
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

-- Política para SELECT: Los usuarios solo pueden ver sus propias compras
CREATE POLICY "Los usuarios pueden ver sus propias compras"
ON compras FOR SELECT
USING (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- Política para INSERT: Los usuarios solo pueden insertar compras para su propio RUC
CREATE POLICY "Los usuarios pueden insertar sus propias compras"
ON compras FOR INSERT
WITH CHECK (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- Política para UPDATE: Los usuarios solo pueden actualizar sus propias compras
CREATE POLICY "Los usuarios pueden actualizar sus propias compras"
ON compras FOR UPDATE
USING (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- Política para DELETE: Los usuarios solo pueden eliminar sus propias compras
CREATE POLICY "Los usuarios pueden eliminar sus propias compras"
ON compras FOR DELETE
USING (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

