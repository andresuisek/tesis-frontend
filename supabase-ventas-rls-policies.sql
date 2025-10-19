-- ========================================
-- POLÍTICAS RLS PARA TABLA DE VENTAS
-- ========================================

-- 1. Habilitar RLS en la tabla ventas
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICA DE LECTURA (SELECT)
-- Permite que un usuario autenticado vea solo las ventas donde el contribuyente_ruc
-- coincide con el RUC del contribuyente asociado a su cuenta
CREATE POLICY "usuarios_pueden_ver_sus_ventas" ON ventas
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = ventas.contribuyente_ruc
        )
    );

-- 3. POLÍTICA DE INSERCIÓN (INSERT)
-- Permite que un usuario autenticado inserte ventas solo para su propio RUC
CREATE POLICY "usuarios_pueden_insertar_sus_ventas" ON ventas
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = ventas.contribuyente_ruc
        )
    );

-- 4. POLÍTICA DE ACTUALIZACIÓN (UPDATE)
-- Permite que un usuario autenticado actualice solo sus propias ventas
CREATE POLICY "usuarios_pueden_actualizar_sus_ventas" ON ventas
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = ventas.contribuyente_ruc
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = ventas.contribuyente_ruc
        )
    );

-- 5. POLÍTICA DE ELIMINACIÓN (DELETE)
-- Permite que un usuario autenticado elimine solo sus propias ventas
CREATE POLICY "usuarios_pueden_eliminar_sus_ventas" ON ventas
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT auth_user_id 
            FROM contribuyentes 
            WHERE ruc = ventas.contribuyente_ruc
        )
    );

-- ========================================
-- VERIFICAR POLÍTICAS EXISTENTES
-- ========================================

-- Para ver todas las políticas de la tabla ventas:
-- SELECT * FROM pg_policies WHERE tablename = 'ventas';

-- Para ver políticas específicas por operación:
-- SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'ventas';



