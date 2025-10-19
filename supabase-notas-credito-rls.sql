-- ============================================
-- RLS (Row Level Security) para notas_credito
-- ============================================

-- 1. Habilitar RLS en la tabla
ALTER TABLE notas_credito ENABLE ROW LEVEL SECURITY;

-- 2. Política de SELECT - Los usuarios pueden ver sus propias notas de crédito
CREATE POLICY "Los usuarios pueden ver sus propias notas de crédito"
ON notas_credito
FOR SELECT
USING (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- 3. Política de INSERT - Los usuarios pueden crear notas de crédito
CREATE POLICY "Los usuarios pueden crear notas de crédito"
ON notas_credito
FOR INSERT
WITH CHECK (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- 4. Política de UPDATE - Los usuarios pueden actualizar sus notas de crédito
CREATE POLICY "Los usuarios pueden actualizar sus notas de crédito"
ON notas_credito
FOR UPDATE
USING (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- 5. Política de DELETE - Los usuarios pueden eliminar sus notas de crédito
CREATE POLICY "Los usuarios pueden eliminar sus notas de crédito"
ON notas_credito
FOR DELETE
USING (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- Verificación
-- ============================================

-- Ver las políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'notas_credito';

-- Verificar que RLS esté habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'notas_credito';

