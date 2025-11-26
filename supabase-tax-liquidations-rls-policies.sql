-- ========================================
-- POLÍTICAS RLS PARA TABLA TAX_LIQUIDATIONS
-- ========================================

-- 1. Habilitar RLS en la tabla tax_liquidations
ALTER TABLE tax_liquidations ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICA DE LECTURA (SELECT)
-- Permite que un usuario autenticado vea solo las liquidaciones donde el contribuyente_ruc
-- coincide con el RUC del contribuyente asociado a su cuenta
CREATE POLICY "usuarios_pueden_ver_sus_liquidaciones" ON tax_liquidations
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = tax_liquidations.contribuyente_ruc
        )
    );

-- 3. POLÍTICA DE INSERCIÓN (INSERT)
-- Permite que un usuario autenticado inserte liquidaciones solo para su propio RUC
CREATE POLICY "usuarios_pueden_insertar_sus_liquidaciones" ON tax_liquidations
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = tax_liquidations.contribuyente_ruc
        )
    );

-- 4. POLÍTICA DE ACTUALIZACIÓN (UPDATE)
-- Permite que un usuario autenticado actualice solo sus propias liquidaciones
CREATE POLICY "usuarios_pueden_actualizar_sus_liquidaciones" ON tax_liquidations
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = tax_liquidations.contribuyente_ruc
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = tax_liquidations.contribuyente_ruc
        )
    );

-- 5. POLÍTICA DE ELIMINACIÓN (DELETE)
-- Permite que un usuario autenticado elimine solo sus propias liquidaciones
CREATE POLICY "usuarios_pueden_eliminar_sus_liquidaciones" ON tax_liquidations
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = tax_liquidations.contribuyente_ruc
        )
    );

-- ========================================
-- VERIFICAR POLÍTICAS EXISTENTES
-- ========================================

-- Para ver todas las políticas de la tabla tax_liquidations:
-- SELECT * FROM pg_policies WHERE tablename = 'tax_liquidations';

-- Para ver políticas específicas por operación:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'tax_liquidations';


