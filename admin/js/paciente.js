import { supabase } from "./supabase-client.js";
import { requireAuth, wireLogout } from "./auth-guard.js";

const auth = await requireAuth();
if (!auth) throw new Error("no autenticado");

document.getElementById("staffName").textContent = auth.staff.nombre;
wireLogout(document.getElementById("logoutBtn"));

const params = new URLSearchParams(window.location.search);
const patientId = params.get("id");
const pageMsg = document.getElementById("pageMsg");

if (!patientId) {
  pageMsg.innerHTML = `<div class="msg msg--error">Falta el id del paciente en la URL.</div>`;
  throw new Error("sin id");
}

const money = (n) => `$${Number(n ?? 0).toLocaleString("es-CO", { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es-CO") : "—");

let patient = null;
let entries = [];
let photosByEntry = {};
let paymentsByEntry = {};
let allPayments = [];

async function loadAll() {
  const { data: p, error: pErr } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", patientId)
    .maybeSingle();

  if (pErr || !p) {
    pageMsg.innerHTML = `<div class="msg msg--error">No se encontró el paciente.</div>`;
    return;
  }
  patient = p;

  const [{ data: entriesData, error: eErr }, { data: photosData }, { data: paymentsData }] = await Promise.all([
    supabase.from("historia_entradas").select("*").eq("paciente_id", patientId).order("fecha", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("entrada_fotos").select("*").eq("paciente_id", patientId).order("created_at"),
    supabase.from("pagos").select("*").eq("paciente_id", patientId).order("fecha", { ascending: false }),
  ]);

  if (eErr) {
    pageMsg.innerHTML = `<div class="msg msg--error">Error cargando historia clínica: ${eErr.message}</div>`;
    return;
  }

  entries = entriesData ?? [];
  allPayments = paymentsData ?? [];

  photosByEntry = {};
  for (const f of photosData ?? []) {
    (photosByEntry[f.entrada_id] ??= []).push(f);
  }

  paymentsByEntry = {};
  for (const pay of allPayments) {
    const key = pay.entrada_id ?? "sin_entrada";
    (paymentsByEntry[key] ??= []).push(pay);
  }

  renderHeader();
  renderPatientForm();
  renderTotales();
  await renderEntries();

  document.getElementById("patientArea").classList.remove("hidden");
}

function renderHeader() {
  document.getElementById("patientName").textContent = patient.nombre_completo;
  document.getElementById("patientSub").textContent = `Cédula: ${patient.cedula}${patient.telefono ? " · Tel: " + patient.telefono : ""}`;
}

function renderPatientForm() {
  const f = (id, val) => (document.getElementById(id).value = val ?? "");
  f("p_cedula", patient.cedula);
  f("p_nombre", patient.nombre_completo);
  f("p_nacimiento", patient.fecha_nacimiento);
  f("p_genero", patient.genero);
  f("p_telefono", patient.telefono);
  f("p_email", patient.email);
  f("p_direccion", patient.direccion);
  f("p_emerg_nombre", patient.contacto_emergencia_nombre);
  f("p_emerg_tel", patient.contacto_emergencia_telefono);
  f("p_alergias", patient.alergias);
  f("p_antecedentes", patient.antecedentes_medicos);
  f("p_medicamentos", patient.medicamentos_actuales);
  f("p_notas", patient.notas_generales);
}

function renderTotales() {
  let facturado = 0, abonado = 0;
  for (const pay of allPayments) {
    facturado += Number(pay.precio || 0);
    abonado += Number(pay.abono || 0);
  }
  document.getElementById("totFacturado").textContent = money(facturado);
  document.getElementById("totAbonado").textContent = money(abonado);
  document.getElementById("totSaldo").textContent = money(facturado - abonado);
}

function estadoBadge(pay) {
  const saldo = Number(pay.precio || 0) - Number(pay.abono || 0);
  const estado = saldo <= 0 ? "pagado" : Number(pay.abono || 0) > 0 ? "parcial" : "pendiente";
  return `<span class="badge badge--${estado}">${estado}</span>`;
}

async function signedUrl(path) {
  const { data, error } = await supabase.storage.from("fotos-pacientes").createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

// Reduce el peso de la foto (redimensiona + recomprime a JPEG) antes de subirla.
// Si el navegador no puede decodificar el formato (p. ej. algunos .heic), sube el original.
async function compressImage(file, { maxDim = 1600, quality = 0.8 } = {}) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function subirFoto(entryId, file, etiqueta) {
  const optimizado = await compressImage(file);
  const safeName = optimizado.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `${patientId}/${entryId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from("fotos-pacientes").upload(path, optimizado, { upsert: false });
  if (uploadError) return { error: uploadError };

  const { data: inserted, error: dbError } = await supabase
    .from("entrada_fotos")
    .insert({
      entrada_id: entryId,
      paciente_id: patientId,
      storage_path: path,
      etiqueta,
      created_by: auth.staff.id,
    })
    .select("id")
    .single();

  return { error: dbError, path, id: inserted?.id };
}

// construye una <figure> con la foto y un botón para eliminarla
function renderPhotoFigure(photo, url, grid) {
  const fig = document.createElement("figure");
  fig.innerHTML = `
    <a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${photo.descripcion ?? photo.etiqueta}" loading="lazy" /></a>
    <figcaption>${photo.etiqueta}</figcaption>
    <button type="button" class="photo-delete" title="Eliminar foto" aria-label="Eliminar foto">&times;</button>
  `;
  fig.querySelector(".photo-delete").addEventListener("click", () => deletePhoto(photo, fig));
  grid.appendChild(fig);
}

async function deletePhoto(photo, figEl) {
  if (!confirm("¿Eliminar esta foto? Esta acción no se puede deshacer.")) return;

  const { error: storageError } = await supabase.storage.from("fotos-pacientes").remove([photo.storage_path]);
  if (storageError) {
    alert(`No se pudo eliminar la foto: ${storageError.message}`);
    return;
  }

  const { error: dbError } = await supabase.from("entrada_fotos").delete().eq("id", photo.id);
  if (dbError) {
    alert(`La foto se borró del almacenamiento, pero no se pudo quitar del registro: ${dbError.message}`);
    return;
  }

  figEl.remove();
}

async function renderEntries() {
  const list = document.getElementById("entriesList");
  list.innerHTML = "";

  if (entries.length === 0) {
    list.innerHTML = `<p class="muted">Aún no hay entradas registradas.</p>`;
    return;
  }

  for (const entry of entries) {
    const div = document.createElement("div");
    div.className = "entry";
    div.dataset.entryId = entry.id;

    const pays = paymentsByEntry[entry.id] ?? [];
    const paysHtml = pays.length
      ? pays.map((pay) => `
          <div class="entry__row">
            💳 ${pay.servicio} — ${money(pay.precio)} (abonado ${money(pay.abono)}) ${estadoBadge(pay)}
          </div>`).join("")
      : "";

    div.innerHTML = `
      <div class="entry__meta">
        <span>${fmtDate(entry.fecha)} · ${entry.tipo}${entry.profesional ? " · " + entry.profesional : ""}</span>
        <button class="btn btn--ghost btn--sm" type="button" data-role="print-btn">Imprimir / PDF</button>
      </div>
      ${entry.motivo ? `<div class="entry__row"><strong>Motivo:</strong> ${entry.motivo}</div>` : ""}
      ${entry.diagnostico ? `<div class="entry__row"><strong>Diagnóstico:</strong> ${entry.diagnostico}</div>` : ""}
      ${entry.tratamiento_realizado ? `<div class="entry__row"><strong>Tratamiento:</strong> ${entry.tratamiento_realizado}</div>` : ""}
      ${entry.productos_usados ? `<div class="entry__row"><strong>Productos:</strong> ${entry.productos_usados}</div>` : ""}
      ${entry.observaciones ? `<div class="entry__row"><strong>Observaciones:</strong> ${entry.observaciones}</div>` : ""}
      ${entry.proxima_cita ? `<div class="entry__row"><strong>Próxima cita:</strong> ${fmtDate(entry.proxima_cita)}</div>` : ""}
      ${paysHtml}
      <div class="photo-grid" data-role="photo-grid"></div>
      <div style="margin-top:.6rem; display:flex; gap:.5rem; align-items:center; flex-wrap:wrap">
        <select data-role="etiqueta" class="field" style="padding:.35rem .5rem; width:auto">
          <option value="antes">Antes</option>
          <option value="despues">Después</option>
          <option value="otro">Otro</option>
        </select>
        <input type="file" data-role="file-input" accept="image/*" multiple style="max-width:220px" />
        <button class="btn btn--sm" data-role="upload-btn">Subir fotos</button>
        <span class="muted" data-role="upload-status"></span>
      </div>
    `;

    list.appendChild(div);

    const grid = div.querySelector('[data-role="photo-grid"]');
    for (const photo of photosByEntry[entry.id] ?? []) {
      const url = await signedUrl(photo.storage_path);
      if (!url) continue;
      renderPhotoFigure(photo, url, grid);
    }

    const uploadBtn = div.querySelector('[data-role="upload-btn"]');
    uploadBtn.addEventListener("click", () => uploadPhotos(entry, div));

    const printBtn = div.querySelector('[data-role="print-btn"]');
    printBtn.addEventListener("click", () => printEntry(entry));
  }
}

// ---- Exportar / imprimir resumen de una entrada (hoja carta) ----
function buildPrintableHtml(entry) {
  const pays = paymentsByEntry[entry.id] ?? [];
  const paysRows = pays.map((pay) => `
    <tr>
      <td>${pay.servicio}</td>
      <td>${money(pay.precio)}</td>
      <td>${money(pay.abono)}</td>
      <td>${money(Number(pay.precio || 0) - Number(pay.abono || 0))}</td>
      <td>${pay.metodo_pago ?? "—"}</td>
    </tr>`).join("");

  const row = (label, value) => value
    ? `<div><div class="label">${label}</div><div class="value">${value}</div></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Resumen de atención — ${patient.nombre_completo}</title>
<style>
  @page { size: letter; margin: 1.8cm 1.6cm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #23301F; margin: 0; }
  .doc-header {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 2px solid #C9A24B; padding-bottom: .5rem; margin-bottom: 1.2rem;
  }
  .doc-header h1 { font-size: 1.4rem; margin: 0; color: #07231A; }
  .doc-header span { font-size: .8rem; color: #806224; }
  h2 {
    font-size: 1rem; color: #806224; text-transform: uppercase; letter-spacing: .04em;
    margin: 1.2rem 0 .5rem; border-bottom: 1px solid #d9d2c2; padding-bottom: .2rem;
  }
  .row { display: flex; flex-wrap: wrap; gap: .3rem 2rem; margin-bottom: .3rem; }
  .row > div { min-width: 220px; }
  .row--full > div { min-width: 100%; }
  .label { font-weight: 700; font-size: .78rem; color: #7a7566; text-transform: uppercase; }
  .value { font-size: .95rem; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin-top: .4rem; font-size: .88rem; }
  th, td { text-align: left; padding: .4rem .3rem; border-bottom: 1px solid #eee5d3; }
  .footer { margin-top: 2rem; font-size: .72rem; color: #7a7566; text-align: center; }
</style>
</head>
<body>
  <div class="doc-header">
    <h1>Zen Skin Studio</h1>
    <span>Generado el ${new Date().toLocaleDateString("es-CO")}</span>
  </div>

  <h2>Datos del paciente</h2>
  <div class="row">
    ${row("Nombre", patient.nombre_completo)}
    ${row("Cédula", patient.cedula)}
  </div>
  <div class="row">
    ${row("Fecha de nacimiento", fmtDate(patient.fecha_nacimiento))}
    ${row("Género", patient.genero)}
  </div>
  <div class="row">
    ${row("Teléfono", patient.telefono)}
    ${row("Correo", patient.email)}
  </div>

  <h2>Atención del ${fmtDate(entry.fecha)}</h2>
  <div class="row">
    ${row("Tipo", entry.tipo)}
    ${row("Profesional", entry.profesional)}
  </div>
  <div class="row row--full">${row("Motivo", entry.motivo)}</div>
  <div class="row row--full">${row("Diagnóstico", entry.diagnostico)}</div>
  <div class="row row--full">${row("Tratamiento realizado", entry.tratamiento_realizado)}</div>
  <div class="row row--full">${row("Productos usados", entry.productos_usados)}</div>
  <div class="row row--full">${row("Observaciones", entry.observaciones)}</div>
  <div class="row">${row("Próxima cita", entry.proxima_cita ? fmtDate(entry.proxima_cita) : "")}</div>

  ${pays.length ? `
  <h2>Cobro asociado</h2>
  <table>
    <thead><tr><th>Servicio</th><th>Precio</th><th>Abono</th><th>Saldo</th><th>Método</th></tr></thead>
    <tbody>${paysRows}</tbody>
  </table>` : ""}

  <div class="footer">Documento generado desde el panel administrativo de Zen Skin Studio.</div>
</body>
</html>`;
}

function printEntry(entry) {
  const win = window.open("", "_blank", "width=850,height=1100");
  if (!win) {
    alert("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para este sitio.");
    return;
  }
  win.document.open();
  win.document.write(buildPrintableHtml(entry));
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

async function uploadPhotos(entry, entryEl) {
  const fileInput = entryEl.querySelector('[data-role="file-input"]');
  const etiquetaSel = entryEl.querySelector('[data-role="etiqueta"]');
  const status = entryEl.querySelector('[data-role="upload-status"]');
  const files = Array.from(fileInput.files ?? []);

  if (files.length === 0) {
    status.textContent = "Selecciona al menos una foto.";
    return;
  }

  const etiqueta = etiquetaSel.value;
  const grid = entryEl.querySelector('[data-role="photo-grid"]');

  for (const file of files) {
    status.textContent = `Optimizando y subiendo ${file.name}…`;
    const { error, path, id } = await subirFoto(entry.id, file, etiqueta);
    if (error) {
      status.textContent = `Error subiendo ${file.name}: ${error.message}`;
      continue;
    }

    const url = await signedUrl(path);
    if (url) renderPhotoFigure({ id, storage_path: path, etiqueta }, url, grid);
  }

  status.textContent = "Listo.";
  fileInput.value = "";
}

// ---- Editar datos del paciente ----
const patientFieldset = document.getElementById("patientFieldset");
document.getElementById("toggleEditPatient").addEventListener("click", () => {
  patientFieldset.disabled = !patientFieldset.disabled;
});

document.getElementById("patientForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("patientMsg");
  msg.innerHTML = "";

  const g = (id) => document.getElementById(id).value.trim() || null;
  const payload = {
    cedula: g("p_cedula"),
    nombre_completo: g("p_nombre"),
    fecha_nacimiento: g("p_nacimiento"),
    genero: g("p_genero"),
    telefono: g("p_telefono"),
    email: g("p_email"),
    direccion: g("p_direccion"),
    contacto_emergencia_nombre: g("p_emerg_nombre"),
    contacto_emergencia_telefono: g("p_emerg_tel"),
    alergias: g("p_alergias"),
    antecedentes_medicos: g("p_antecedentes"),
    medicamentos_actuales: g("p_medicamentos"),
    notas_generales: g("p_notas"),
  };

  const { error } = await supabase.from("pacientes").update(payload).eq("id", patientId);

  if (error) {
    msg.innerHTML = `<div class="msg msg--error">No se pudo guardar: ${error.message}</div>`;
    return;
  }

  msg.innerHTML = `<div class="msg msg--ok">Datos actualizados.</div>`;
  patientFieldset.disabled = true;
  await loadAll();
});

// ---- Pestañas superiores: Nueva entrada / Historial (mutuamente excluyentes) ----
const entryForm = document.getElementById("entryForm");
const newEntryCard = document.getElementById("newEntryCard");
const historialPanel = document.getElementById("historialPanel");
const topNewEntryBtn = document.getElementById("topNewEntryBtn");
const topHistorialBtn = document.getElementById("topHistorialBtn");

function showNewEntry() {
  newEntryCard.classList.remove("hidden");
  entryForm.classList.remove("hidden");
  document.getElementById("entryMsg").innerHTML = "";
  historialPanel.classList.add("hidden");
  document.getElementById("e_fecha").value = new Date().toISOString().slice(0, 10);
}
function showHistorial() {
  historialPanel.classList.remove("hidden");
  newEntryCard.classList.add("hidden");
}
function closePanels() {
  newEntryCard.classList.add("hidden");
  historialPanel.classList.add("hidden");
}

topNewEntryBtn.addEventListener("click", () => {
  // si la tarjeta está abierta mostrando el mensaje de "entrada guardada"
  // (formulario oculto), reabre un formulario en blanco en vez de cerrar
  const activo = !newEntryCard.classList.contains("hidden") && !entryForm.classList.contains("hidden");
  activo ? closePanels() : showNewEntry();
});
topHistorialBtn.addEventListener("click", () => {
  historialPanel.classList.contains("hidden") ? showHistorial() : closePanels();
});
document.getElementById("cancelNewEntry").addEventListener("click", () => {
  entryForm.reset();
  closePanels();
});

entryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("entryMsg");
  msg.innerHTML = "";

  const g = (id) => document.getElementById(id).value.trim() || null;

  const entryPayload = {
    paciente_id: patientId,
    fecha: g("e_fecha"),
    tipo: g("e_tipo") || "consulta",
    motivo: g("e_motivo"),
    diagnostico: g("e_diagnostico"),
    tratamiento_realizado: g("e_tratamiento"),
    productos_usados: g("e_productos"),
    observaciones: g("e_observaciones"),
    proxima_cita: g("e_proxima"),
    profesional: g("e_profesional"),
    created_by: auth.staff.id,
  };

  const { data: newEntry, error: entryError } = await supabase
    .from("historia_entradas")
    .insert(entryPayload)
    .select("id")
    .single();

  if (entryError) {
    msg.innerHTML = `<div class="msg msg--error">No se pudo guardar la entrada: ${entryError.message}</div>`;
    return;
  }

  const errores = [];

  const fotoFiles = Array.from(document.getElementById("e_fotos").files ?? []);
  if (fotoFiles.length) {
    const etiquetaFoto = document.getElementById("e_foto_etiqueta").value || "otro";
    for (const file of fotoFiles) {
      const { error: fotoError } = await subirFoto(newEntry.id, file, etiquetaFoto);
      if (fotoError) errores.push(`No se pudo subir ${file.name}: ${fotoError.message}`);
    }
  }

  const servicio = g("e_servicio");
  const precio = document.getElementById("e_precio").value;
  if (servicio || precio) {
    const abono = document.getElementById("e_abono").value || 0;
    const precioNum = Number(precio || 0);
    const abonoNum = Number(abono || 0);
    const { error: payError } = await supabase.from("pagos").insert({
      paciente_id: patientId,
      entrada_id: newEntry.id,
      fecha: entryPayload.fecha,
      servicio: servicio || "Servicio sin nombre",
      precio: precioNum,
      abono: abonoNum,
      metodo_pago: g("e_metodo"),
      estado: abonoNum >= precioNum && precioNum > 0 ? "pagado" : abonoNum > 0 ? "parcial" : "pendiente",
      created_by: auth.staff.id,
    });
    if (payError) errores.push(`El cobro no se pudo registrar: ${payError.message}`);
  }

  entryForm.reset();
  entryForm.classList.add("hidden");
  await loadAll();

  const erroresHtml = errores.map((e) => `<div class="msg msg--error">${e}</div>`).join("");
  msg.innerHTML = `${erroresHtml}<div class="msg msg--ok">
    Entrada guardada.
    <button class="btn btn--sm btn--ghost" type="button" id="printJustSaved">Imprimir / PDF</button>
    <button class="btn btn--sm btn--oro" type="button" id="finishEntry">Finalizar</button>
  </div>`;
  document.getElementById("printJustSaved").addEventListener("click", () => {
    printEntry({ ...entryPayload, id: newEntry.id });
  });
  document.getElementById("finishEntry").addEventListener("click", () => {
    window.location.href = "./index.html";
  });
});

loadAll();
