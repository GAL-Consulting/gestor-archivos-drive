// =======================
// CONFIGURACIÓN
// =======================
const CLIENT_ID = "935035577743-7ds3utl0nsbat33sbt2ervnckcgeceqr.apps.googleusercontent.com";
const SHEET_ID = "1D8QeHDNR2bp8Ylfft-AyGTjyNbk_LLF8b6_LwvqBMqY";
const FOLDER_ID = "1BwL4cPJzAQMdtHuO5eEQm4Vr47PcRli5";
const ANTECEDENTES_ID = "1K-WgTeSJ4FlVmSlTqvS3ezVXulCkz8sX";
const SCOPES = "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets";

let tokenClient;
let gapiInited = false;
let gisInited = false;

// =======================
// INICIALIZACIÓN DE APIs
// =======================
function gapiLoaded() {
  gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
  await gapi.client.init({
    discoveryDocs: [
      "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
      "https://sheets.googleapis.com/$discovery/rest?version=v4"
    ]
  });
  gapiInited = true;
  maybeEnableButtons();
}

function gisLoaded() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // se define al pedir token
  });
  gisInited = true;
  maybeEnableButtons();
}

function maybeEnableButtons() {
  if (gapiInited && gisInited) {
    const loginBtn = document.getElementById("login");
    if (loginBtn) loginBtn.disabled = false;
  }
}

// =======================
// FUNCIÓN PRINCIPAL AL CARGAR DOM
// =======================
window.addEventListener("DOMContentLoaded", () => {

  console.log("✅ DOM cargado, inicializando eventos...");

  // ---- Inicialización de APIs ----
  gapiLoaded();
  gisLoaded();

  // ---- Botón de login ----
  const loginBtn = document.getElementById("login");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      tokenClient.callback = async (resp) => {
        if (resp.error) {
          console.error(resp);
          return;
        }

        gapi.client.setToken({ access_token: resp.access_token });
        console.log("🔑 Token recibido, acceso autorizado");

        // Mostrar aplicación
        document.getElementById("login").style.display = "none";
        document.getElementById("app").style.display = "";

        // Cargar datos iniciales
        if (typeof loadSelectOptions === "function") loadSelectOptions();
        listarCarpetas();
        listarArchivos(FOLDER_ID);
      };

      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  } else {
    console.error("❌ No se encontró el botón #login en el HTML");
  }

  // ---- Botones de navegación (si existen) ----
  const btnRegistro = document.getElementById("btnRegistro");
  if (btnRegistro) {
    btnRegistro.addEventListener("click", () => {
      document.getElementById("seccionRegistro").style.display = "block";
      document.getElementById("seccionConsultas").style.display = "none";
    });
  }

  const btnConsultas = document.getElementById("btnConsultas");
  if (btnConsultas) {
    btnConsultas.addEventListener("click", () => {
      document.getElementById("seccionRegistro").style.display = "none";
      document.getElementById("seccionConsultas").style.display = "block";
    });
  }

  // ---- Botón Guardar (si existe) ----
  const guardarBtn = document.getElementById("guardar");
  if (guardarBtn) {
    guardarBtn.addEventListener("click", async () => {
      const archivo = document.getElementById("archivoSeleccionado").value;
      const fileId = document.getElementById("archivoSeleccionado").dataset.fileId || "";
      const asunto = document.getElementById("asunto").value;
      const categoria = document.getElementById("categoria").value;
      const comentarios = document.getElementById("comentarios").value;

      if (!archivo || !asunto) {
        alert("Seleccioná un archivo y completá el asunto.");
        return;
      }

      const valores = [
        new Date().toISOString(),
        archivo,
        fileId,
        asunto,
        categoria,
        comentarios,
        asunto
      ];

      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "A:G",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: { values: [valores] }
      });

      const carpetaDestinoId = await obtenerOCrearCarpetaAsunto(asunto);
      await moverArchivoA(fileId, carpetaDestinoId);

      alert("Registro guardado y archivo movido a carpeta de asunto.");

      document.getElementById("archivoSeleccionado").value = "";
      document.getElementById("asunto").value = "";
      document.getElementById("categoria").value = "";
      document.getElementById("comentarios").value = "";
      document.getElementById("visor").src = "";
    });
  }

});

// =======================
// FUNCIONES DRIVE
// =======================
async function listarCarpetas(parentId = FOLDER_ID) {
  const res = await gapi.client.drive.files.list({
    q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 50
  });

  const lista = document.getElementById("listaCarpetas");
  if (!lista) return;

  lista.innerHTML = "";
  const carpetas = res.result.files || [];

  if (parentId !== FOLDER_ID) {
    const volver = document.createElement("li");
    volver.textContent = "⬅️ Volver a raíz";
    volver.style.fontWeight = "bold";
    volver.onclick = () => {
      document.getElementById("carpetaSeleccionada").textContent = "Raíz";
      listarCarpetas(FOLDER_ID);
      listarArchivos(FOLDER_ID);
    };
    lista.appendChild(volver);
  }

  carpetas.forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.name;
    li.onclick = () => {
      document.getElementById("carpetaSeleccionada").textContent = c.name;
      listarCarpetas(c.id);
      listarArchivos(c.id);
    };
    lista.appendChild(li);
  });
}

async function listarArchivos(carpetaId) {
  const res = await gapi.client.drive.files.list({
    q: `'${carpetaId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, webViewLink, webContentLink)",
    pageSize: 50
  });

  const lista = document.getElementById("listaDocs");
  if (!lista) return;

  lista.innerHTML = "";
  const files = res.result.files || [];

  if (files.length === 0) {
    lista.innerHTML = "<li>No hay archivos en esta carpeta.</li>";
    return;
  }

  files.forEach(f => {
    const li = document.createElement("li");
    li.textContent = f.name;
    li.onclick = () => {
      const visor = document.getElementById("visor");
      const tipo = f.mimeType;

      visor.removeAttribute("src");
      visor.removeAttribute("srcdoc");

      document.getElementById("archivoSeleccionado").value = f.name;
      document.getElementById("archivoSeleccionado").dataset.fileId = f.id;

      const tiposVisibles = ["application/pdf", "image/jpeg", "image/png", "image/gif"];
      if (tiposVisibles.includes(tipo)) {
        visor.src = `https://drive.google.com/file/d/${f.id}/preview`;
      } else {
        visor.srcdoc = `
          <div style="text-align:center; padding:20px; font-family:sans-serif;">
            <p><strong>No se puede visualizar este tipo de archivo aquí.</strong></p>
            <p>Tipo: ${tipo}</p>
            <a href="${f.webContentLink}" target="_blank" style="color:#2c3e50; font-weight:bold;">Descargar archivo</a>
          </div>
        `;
      }
    };
    lista.appendChild(li);
  });
}

// =======================
// FUNCIONES AUXILIARES
// =======================
async function obtenerOCrearCarpetaAsunto(nombreAsunto) {
  const res = await gapi.client.drive.files.list({
    q: `'${ANTECEDENTES_ID}' in parents and mimeType='application/vnd.google-apps.folder' and name='${nombreAsunto}' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 1
  });

  if (res.result.files && res.result.files.length > 0) {
    return res.result.files[0].id;
  }

  const nuevaCarpeta = await gapi.client.drive.files.create({
    resource: {
      name: nombreAsunto,
      mimeType: "application/vnd.google-apps.folder",
      parents: [ANTECEDENTES_ID]
    },
    fields: "id"
  });

  return nuevaCarpeta.result.id;
}

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
