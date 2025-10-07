// === CONFIGURACIÓN ===
const SHEET_ID = 'TU_SHEET_ID_AQUI';
const API_KEY = 'TU_API_KEY_AQUI';
const RANGE = 'Documentos!A1:Z';

// === INICIALIZACIÓN ===
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
  }).then(loadSelectOptions);
}

gapi.load('client', initClient);

// === CARGAR VALORES ÚNICOS PARA LOS SELECT ===
async function loadSelectOptions() {
  try {
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

// === CAMBIO ENTRE SECCIONES ===
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

