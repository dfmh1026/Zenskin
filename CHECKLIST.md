# ✅ Checklist de buenas prácticas — Zen Skin Studio

Guía de pasos para construir y mantener el sitio con orden y calidad.
Leyenda: `[x]` hecho · `[~]` parcial · `[ ]` pendiente

---

## 1. Planeación y contenido
- [x] Definir objetivo del sitio (mostrar servicios + captar citas por WhatsApp)
- [x] Definir secciones (inicio, quiénes somos, servicios, testimonios, contacto)
- [x] Redactar textos reales de cada sección
- [x] Definir paleta de marca (verde + oro) y tipografías
- [ ] Conseguir fotos reales de TODOS los servicios (solo hay de limpieza facial)

## 2. Estructura y HTML semántico
- [x] `<!DOCTYPE html>` y `<html lang="es">`
- [x] Etiquetas semánticas (`header`, `main`, `section`, `article`, `footer`, `nav`)
- [x] Un solo `<h1>` por página y jerarquía de títulos correcta
- [x] Atributos `alt` descriptivos en las imágenes
- [x] Enlaces externos con `rel="noopener"` y `target="_blank"`

## 3. Estilos (CSS)
- [x] Variables CSS para colores, fuentes y sombras (`:root`)
- [x] Tipografías web con `preconnect` a Google Fonts
- [x] Estados `:hover` y transiciones suaves
- [x] Componentes reutilizables (botones, tarjetas, eyebrow)
- [x] Separar CSS responsive en su archivo
- [ ] Minificar CSS para producción

## 4. Responsive (móvil, tablet, escritorio)
- [x] Meta viewport configurado
- [~] Media queries para adaptar el layout (revisar tablet)
- [x] Menú hamburguesa en móvil
- [x] Imágenes que no desbordan (`max-width: 100%`)
- [ ] Probar en pantallas reales (móvil, tablet, escritorio grande)

## 5. Accesibilidad (a11y)
- [x] `aria-label` en botones e íconos sin texto
- [x] `:focus-visible` visible para navegación con teclado
- [x] Respeta `prefers-reduced-motion`
- [ ] Verificar contraste de color (texto sobre fondos)
- [ ] Enlace "saltar al contenido" (skip link)

## 6. Rendimiento
- [x] `loading="lazy"` en imágenes
- [x] Optimizar el logo (1.3 MB → 76 KB, −94%)
- [x] Convertir imágenes a formato moderno (WebP) con `<picture>` + respaldo JPEG
- [x] Script reutilizable `optimizar-imagenes.mjs` para futuras imágenes
- [x] Definir `width`/`height` en las fotos para evitar saltos de layout
- [ ] Revisar puntuación en Lighthouse / PageSpeed

## 7. SEO
- [x] `<title>` único y descriptivo
- [x] `<meta name="description">`
- [ ] Etiquetas Open Graph (para compartir en redes/WhatsApp)
- [ ] Favicon (ícono de la pestaña)
- [ ] `sitemap.xml` y `robots.txt`
- [ ] Datos estructurados de negocio local (schema.org LocalBusiness)

## 8. Formularios e interacción
- [x] Formulario de contacto que abre WhatsApp prellenado
- [x] Validación básica (nombre y teléfono obligatorios)
- [x] Slider de testimonios (autoplay + controles + swipe)
- [x] Carrusel de fotos en el servicio (flechas + dots + swipe)
- [ ] Mensaje de confirmación más visible al enviar

## 9. Legal
- [x] Página de Política de privacidad
- [x] Página de Términos y condiciones
- [x] Enlaces a ambas en el footer
- [ ] Revisar textos legales con datos reales del negocio

## 10. Control de versiones (Git)
- [x] Repositorio en GitHub
- [~] Commits con mensajes claros
- [ ] ⚠️ Subir cambios pendientes (hay archivos sin commitear)
- [ ] Añadir un `.gitignore`

## 11. Despliegue y pruebas
- [x] GitHub Pages configurado
- [ ] Verificar que el sitio publicado carga bien (fotos, enlaces, fuentes)
- [ ] Probar en varios navegadores (Chrome, Safari, Firefox, Edge)
- [ ] Revisar que no haya enlaces rotos (404)

## 12. Mantenimiento
- [ ] Analítica de visitas (Google Analytics o similar)
- [ ] Backup / respaldo del contenido
- [ ] Plan para actualizar fotos y textos periódicamente

---

**Actualizado:** 17 de julio de 2026
