document.getElementById("guardar").addEventListener("click", async () => {
  const archivo = document.getElementById("archivoSeleccionado").value;
  const fileId = document.getElementById("archivoSeleccionado").dataset.fileId || "";
  const proyecto = document.getElementById("proyecto").value; // Antes "Asunto"
  const categoria = document.getElementById("categoria").value;
  const emisor = document.getElementById("emisor").value || "Desconocido";
  const receptor = document.getElementById("receptor").value || "";
  const propiedad = document.getElementById("propiedad").value || "Interno";
  const comentario = document.getElementById("comentarios").value;
  const fechaDocumentoInput = document.getElementById("fechaDocumento").value;

  if (!archivo || !proyecto) {
    alert("Seleccioná un archivo y completá el proyecto.");
    return;
  }

  // Generar ID único
  const idRegistro = Date.now(); // timestamp como ID único

  // Fecha del documento
  const fechaDocumento = fechaDocumentoInput || new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  // Nombre normalizado
  const nombreNormalizado = `${proyecto}_${fechaDocumento.replace(/-/g,"_")}_${emisor}_${categoria}`;

  const valores = [
    idRegistro,
    new Date().toISOString(), // FechaRegistro
    fechaDocumento,
    archivo,                  // NombreOriginal
    nombreNormalizado,
    proyecto,
    categoria,
    emisor,
    receptor,
    propiedad,
    comentario,
    fileId,
    "Activo"                  // Estado por defecto
  ];

  // Guardar en Sheets
  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "A:M",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    resource: { values: [valores] }
  });

  // Obtener o crear carpeta de proyecto
  const carpetaDestinoId = await obtenerOCrearCarpetaProyecto(proyecto);

  // Mover archivo
  await moverArchivoA(fileId, carpetaDestinoId);

  alert("Registro guardado y archivo movido a carpeta de proyecto.");

  // Limpiar formulario
  document.getElementById("archivoSeleccionado").value = "";
  document.getElementById("proyecto").value = "";
  document.getElementById("categoria").value = "";
  document.getElementById("emisor").value = "";
  document.getElementById("receptor").value = "";
  document.getElementById("propiedad").value = "";
  document.getElementById("comentarios").value = "";
  document.getElementById("fechaDocumento").value = "";
  document.getElementById("visor").src = "";
});

// Función para crear carpeta de proyecto en Drive si no existe
async function obtenerOCrearCarpetaProyecto(nombreProyecto) {
  const res = await gapi.client.drive.files.list({
    q: `'${PROYECTOS_ID}' in parents and mimeType='application/vnd.google-apps.folder' and name='${nombreProyecto}' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 1
  });

  if (res.result.files && res.result.files.length > 0) {
    return res.result.files[0].id; // Ya existe
  }

  // Crear nueva carpeta
  const nuevaCarpeta = await gapi.client.drive.files.create({
    resource: {
      name: nombreProyecto,
      mimeType: "application/vnd.google-apps.folder",
      parents: [PROYECTOS_ID]
    },
    fields: "id"
  });

  return nuevaCarpeta.result.id;
}

// Función para mover archivo a la carpeta
async function moverArchivoA(fileId, destinoId) {
  const file = await gapi.client.drive.files.get({
    fileId: fileId,
    fields: "parents"
  });

  const padresActuales = file.result.parents;

  await gapi.client.drive.files.update({
    fileId: fileId,
    addParents: destinoId,
    removeParents: padresActuales.join(","),
    fields: "id, parents"
  });
}
