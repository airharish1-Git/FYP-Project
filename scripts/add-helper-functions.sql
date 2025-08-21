-- Create a function to safely get public table names
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(tablename TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::TEXT
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_public_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_tables() TO anon;
