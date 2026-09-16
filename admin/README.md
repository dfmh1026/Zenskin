# Panel administrativo — Zen Skin Studio

Panel para llevar historia clínica, fotos y pagos de cada paciente, identificado por
cédula y nombre. Es HTML/CSS/JS puro (sin build), consistente con el resto del sitio,
y usa [Supabase](https://supabase.com) como backend (Postgres + Auth + Storage).

## Por qué Supabase y no un backend propio

El sitio se publica en GitHub Pages, que **solo sirve archivos estáticos** (no puede
correr un servidor Node/PHP/etc.). Un BaaS con base de datos relacional + auth +
storage y RLS (seguridad a nivel de fila) resuelve el 100% del caso de uso sin
mantener servidores. La clave pública (`anon key`) queda visible en el navegador por
diseño — la protección real de los datos clínicos es **Row Level Security**, no la
ocultación de esa clave. Ver `sql/schema.sql` para las políticas.

## Puesta en marcha (una sola vez)

Esto lo tienes que hacer tú en supabase.com — no puedo crear la cuenta por ti.

1. Crea un proyecto en https://supabase.com (plan gratuito alcanza para una clínica pequeña).
2. Ve a **SQL Editor → New query**, pega el contenido completo de `sql/schema.sql`
   (en la raíz del repo) y ejecútalo. Esto crea las tablas, las políticas de RLS y el
   bucket privado `fotos-pacientes`.
3. Ve a **Authentication → Users → Add user** y crea una cuenta (correo + contraseña)
   para cada persona del staff que va a usar el panel.
4. Copia el **User UID** de cada cuenta creada y, en el SQL Editor, ejecuta por cada
   una:
   ```sql
   insert into public.staff (id, nombre, rol)
   values ('PEGA-AQUI-EL-UID', 'Nombre Apellido', 'admin');
   ```
   (`rol` puede ser `'admin'` o `'staff'`; ambos tienen hoy el mismo acceso — el campo
   queda listo para diferenciar permisos más adelante si hace falta.)
5. Ve a **Project Settings → API** y copia:
   - **Project URL**
   - **anon public key**
6. Pégalos en `admin/js/config.js`:
   ```js
   export const SUPABASE_URL = "https://tu-proyecto.supabase.co";
   export const SUPABASE_ANON_KEY = "tu-anon-public-key";
   ```
7. Haz commit de ese archivo y publica (GitHub Pages ya sirve `/admin/` con el resto
   del sitio). **No pegues nunca la `service_role key`** en este archivo ni en ningún
   archivo del repo — esa sí es secreta y da acceso total sin RLS.

## Uso diario

- `admin/login.html` — inicio de sesión.
- `admin/index.html` — buscar paciente por cédula/nombre, o crear uno nuevo.
- `admin/paciente.html?id=...` — ficha del paciente: datos, historia clínica por
  visita, fotos antes/después por entrada, y precios/pagos con saldo pendiente
  calculado automáticamente.

## Seguridad — qué protege qué

- **Row Level Security** (`sql/schema.sql`): solo usuarios autenticados que además
  existan en `public.staff` pueden leer o escribir pacientes, historia clínica, fotos
  o pagos. Esto es lo que de verdad protege los datos.
- **`robots.txt`** y `<meta name="robots" content="noindex,nofollow">` en las páginas
  de `/admin/`: evitan que buscadores indexen el panel. Es solo para no aparecer en
  Google — **no es seguridad**, la URL sigue siendo pública y accesible por cualquiera
  que la conozca; quien no tenga cuenta en `staff` simplemente no podrá leer ni
  escribir datos gracias a RLS.
- **Storage privado**: el bucket `fotos-pacientes` no es público; las fotos se sirven
  con URLs firmadas de una hora generadas solo para usuarios autenticados como staff.

## Pendiente / mejoras razonables a futuro

- Diferenciar permisos reales entre `admin` y `staff` (hoy el campo `rol` existe pero
  no se usa para restringir nada todavía).
- Exportar historia clínica de un paciente a PDF.
- Paginación en el listado de pacientes si la base crece mucho (hoy trae hasta 50).
- Auditoría de cambios (quién editó qué y cuándo) si la clínica lo requiere.
