-- ============================================
-- RLS (Row Level Security) para retenciones
-- ============================================

-- 1. Habilitar RLS en la tabla
ALTER TABLE retenciones ENABLE ROW LEVEL SECURITY;

-- 2. Política de SELECT - Los usuarios pueden ver sus propias retenciones
CREATE POLICY "Los usuarios pueden ver sus propias retenciones"
ON retenciones
FOR SELECT
USING (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- 3. Política de INSERT - Los usuarios pueden crear retenciones
CREATE POLICY "Los usuarios pueden crear retenciones"
ON retenciones
FOR INSERT
WITH CHECK (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- 4. Política de UPDATE - Los usuarios pueden actualizar sus retenciones
CREATE POLICY "Los usuarios pueden actualizar sus retenciones"
ON retenciones
FOR UPDATE
USING (
  contribuyente_ruc IN (
    SELECT ruc 
    FROM contribuyentes 
    WHERE user_id = auth.uid()
  )
);

-- 5. Política de DELETE - Los usuarios pueden eliminar sus retenciones
CREATE POLICY "Los usuarios pueden eliminar sus retenciones"
ON retenciones
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
WHERE tablename = 'retenciones';

-- Verificar que RLS esté habilitado
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'retenciones';

