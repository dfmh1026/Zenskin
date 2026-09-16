// Configuración de conexión a Supabase.
// Reemplaza estos dos valores con los de tu proyecto:
// Supabase Dashboard → Project Settings → API
//
// El "anon public key" está PENSADO para exponerse en el navegador:
// la seguridad real la da Row Level Security (ver sql/schema.sql),
// no el hecho de que esta clave esté oculta.
export const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
export const SUPABASE_ANON_KEY = "TU-ANON-PUBLIC-KEY";
