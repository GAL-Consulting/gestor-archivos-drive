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
        document.getElementById("login").disabled = false;
    }
}

// =======================
// LOGIN
// =======================
document.getElementById("login").onclick = () => {
    tokenClient.callback = async (resp) => {
        if (resp.error) { console.error(resp); return; }
        gapi.client.setToken({ access_token: resp.access_token });

        document.getElementById("login").style.display = "none";
        document.getElementById("app").style.display = "";

        // Cargar datos y listar Drive
        loadSelectOptions();
        listarCarpetas();
        listarArchivos(FOLDER_ID);
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
};

// =======================
// CARGAR SELECTS DINÁMICOS
// =======================
async function loadSelectOptions() {
    try {
        const RANGE = 'Documentos!A1:Z';
        const res = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: RANGE
        });

        const rows = res.result.values;
        if (!rows || rows.length < 2) return;

        const headers = rows[0];
        const data = rows.slice(1);

        const idxProyecto = headers.indexOf('Proyecto');
        const idxCategoria = headers.indexOf('Categoria');
        const idxEmisor = headers.indexOf('EmisorReceptor');
        const idxPropiedad = headers.indexOf('Propiedad');

        const proyectos = [...new Set(data.map(r => r[idxProyecto]).filter(Boolean))];
        const categorias = [...new Set(data.map(r => r[idxCategoria]).filter(Boolean))];
        const emisores = [...new Set(data.map(r => r[idxEmisor]).filter(Boolean))];
        const propiedades = [...new Set(data.map(r => r[idxPropiedad]).filter(Boolean))];

        llenarSelect('proyecto', proyectos);
        llenarSelect('categoria', categorias);
        llenarSelect('emisor', emisores);
        llenarSelect('propiedad', propiedades);

    } catch (err) {
        console.error('Error cargando datos:', err);
    }
}

function llenarSelect(id, opciones) {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">-- Seleccionar --</option>';

    opciones.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op;
        opt.textContent = op;
        select.appendChild(opt);
    });

    const nuevo = document.createElement('option');
    nuevo.value = '__nuevo__';
    nuevo.textContent = '➕ Agregar nuevo...';
    select.appendChild(nuevo);

    select.addEventListener('change', () => {
        if (select.value === '__nuevo__') {
            const valor = prompt('Ingrese un nuevo valor para ' + id);
            if (valor) {
                const opt = document.createElement('option');
                opt.value = valor;
                opt.textContent = valor;
                select.insertBefore(opt, nuevo);
                select.value = valor;
            } else {
                select.value = '';
            }
        }
    });
}

// =======================
// SECCIONES
// =======================
const btnRegistro = document.getElementById('btnRegistro');
const btnConsultas = document.getElementById('btnConsultas');
const secRegistro = document.getElementById('registro');
const secConsultas = document.getElementById('consultas');

btnRegistro.onclick = () => cambiarVista('registro');
btnConsultas.onclick = () => cambiarVista('consultas');

function cambiarVista(vista) {
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    if (vista === 'registro') {
        secRegistro.classList.add('active');
        btnRegistro.classList.add('active');
    } else {
        secConsultas.classList.add('active');
        btnConsultas.classList.add('active');
    }
}

// =======================
// DRIVE: CARPETAS Y ARCHIVOS
// =======================
function listarCarpetas(parentId = FOLDER_ID) {
    gapi.client.drive.files.list({
        q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
        pageSize: 50
    }).then(response => {
        const carpetas = response.result.files;
        const lista = document.getElementById("listaCarpetas");
        lista.innerHTML = "";

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
    });
}

function listarArchivos(carpetaId) {
    gapi.client.drive.files.list({
        q: `'${carpetaId}' in parents and trashed=false`,
        fields: "files(id, name, mimeType, webViewLink, webContentLink)",
        pageSize: 50
    }).then(response => {
        const files = response.result.files;
        const lista = document.getElementById("listaDocs");
        lista.innerHTML = "";

        if (files && files.length > 0) {
            files.forEach(f => {
                const li = document.createElement("li");
                li.textContent = f.name;

                li.onclick = () => {
                    const visor = document.getElementById("visor");
                    visor.removeAttribute("src");
                    visor.removeAttribute("srcdoc");

                    document.getElementById("archivoSeleccionado").value = f.name;
                    document.getElementById("archivoSeleccionado").dataset.fileId = f.id;

                    const tiposVisibles = ["application/pdf", "image/jpeg", "image/png", "image/gif"];
                    if (tiposVisibles.includes(f.mimeType)) {
                        visor.src = `https://drive.google.com/file/d/${f.id}/preview`;
                    } else {
                        visor.srcdoc = `
                            <div style="text-align:center; padding:20px; font-family:sans-serif;">
                                <p><strong>No se puede visualizar este tipo de archivo aquí.</strong></p>
                                <p>Tipo: ${f.mimeType}</p>
                                <a href="${f.webContentLink}" target="_blank" style="color:#2c3e50; font-weight:bold;">Descargar archivo</a>
                            </div>
                        `;
                    }
                };

                lista.appendChild(li);
            });
        } else {
            lista.innerHTML = "<li>No hay archivos.</li>";
        }
    });
}

// =======================
// GUARDAR REGISTRO
// =======================
document.getElementById("guardar").addEventListener("click", async () => {
    const archivo = document.getElementById("archivoSeleccionado").value;
    const fileId = document.getElementById("archivoSeleccionado").dataset.fileId || "";
    const proyecto = document.getElementById("proyecto").value;
    const categoria = document.getElementById("categoria").value;
    const comentarios = document.getElementById("comentarios").value;

    if (!archivo || !proyecto) {
        alert("Seleccioná un archivo y completá el proyecto.");
        return;
    }

    const valores = [
        new Date().toISOString(),
        archivo,
        fileId,
        proyecto,
        categoria,
        comentarios,
        proyecto
    ];

    // Guardar en Sheets
    await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "A:G",
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        resource: { values: [valores] }
    });

    // Obtener o crear carpeta de proyecto
    const carpetaDestinoId = await obtenerOCrearCarpetaAsunto(proyecto);

    // Mover archivo
    await moverArchivoA(fileId, carpetaDestinoId);

    alert("Registro guardado y archivo movido a carpeta de proyecto.");

    // Limpiar formulario
    document.getElementById("archivoSeleccionado").value = "";
    document.getElementById("proyecto").value = "";
    document.getElementById("categoria").value = "";
    document.getElementById("comentarios").value = "";
    document.getElementById("visor").src = "";
});

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

// =======================
// INICIALIZACIÓN GLOBAL
// =======================
window.onload = () => {
    gapiLoaded();
    gisLoaded();
};


   
