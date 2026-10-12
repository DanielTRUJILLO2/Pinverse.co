/* =========================================================
   PINVERSE · Lista de productos desde Google Sheets

   Pega aquí el enlace CSV de tu hoja publicada
   (Archivo → Compartir → Publicar en la web → CSV).
   Si se deja vacío, o la hoja no responde, cada página usa
   la lista de respaldo que tiene guardada.

   Columnas de la hoja (la primera fila son los títulos):
   id · foto · nombre · referencia · precio · estado · categorias · etiqueta
     estado:   disponible | agotado | oculto
     etiqueta: nuevo | mas-vendido | (vacío)
   ========================================================= */
(function () {
  /* En pausa mientras se actualiza la hoja con la nueva numeración */
  const SHEET_CSV_URL = '';
  // const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSWQpLq4mQpiptw5xlwF-YdpQWtkusIBKPgCIUGBsRolL4FAlq4nWsKkXznhU7b0jXfUeNfIgZc870U/pub?gid=0&single=true&output=csv';

  /* Convierte el texto CSV en filas (respeta comillas, comas y saltos de línea dentro de celdas) */
  function parseCSV(texto) {
    const filas = [];
    let fila = [];
    let celda = '';
    let enComillas = false;
    const t = String(texto).replace(/^﻿/, '');

    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (enComillas) {
        if (c === '"' && t[i + 1] === '"') { celda += '"'; i++; }
        else if (c === '"') enComillas = false;
        else celda += c;
      } else if (c === '"') {
        enComillas = true;
      } else if (c === ',') {
        fila.push(celda); celda = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && t[i + 1] === '\n') i++;
        fila.push(celda); celda = '';
        filas.push(fila); fila = [];
      } else {
        celda += c;
      }
    }
    if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
    return filas.filter(f => f.some(v => v.trim() !== ''));
  }

  function clave(texto) {
    return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  const ESTADOS = { disponible:'disponible', agotado:'agotado', oculto:'oculto' };
  const ETIQUETAS = { nuevo:'nuevo', 'mas-vendido':'mas-vendido', 'mas vendido':'mas-vendido', masvendido:'mas-vendido' };

  /* Pasa las filas de la hoja al mismo formato que usa la página */
  function normalizar(filas, carpetaFotos) {
    if (filas.length < 2) return [];
    const titulos = filas[0].map(clave);
    const col = nombre => titulos.indexOf(nombre);
    const i = {
      id:col('id'), foto:col('foto'), nombre:col('nombre'), referencia:col('referencia'),
      precio:col('precio'), estado:col('estado'), categorias:col('categorias'), etiqueta:col('etiqueta')
    };
    if (i.id < 0 || i.nombre < 0) return [];

    const vistos = new Set();
    return filas.slice(1).map(f => {
      const valor = k => (i[k] >= 0 ? String(f[i[k]] || '').trim() : '');
      const id = Number(valor('id'));
      const nombre = valor('nombre');
      if (!Number.isFinite(id) || id <= 0 || !nombre || vistos.has(id)) return null;
      vistos.add(id);

      let foto = valor('foto') || `pin${id}.jpeg`;
      if (!/^(https?:)?\/\//.test(foto) && !foto.startsWith('../') && !foto.startsWith('imagenes/')) {
        foto = carpetaFotos + foto;
      }
      const precio = Number(valor('precio').replace(/[^\d]/g, '')) || 9000;
      const refEscrita = valor('referencia').replace(/^'/, '') || String(id);
      /* Sheets convierte "001" en "1": se rellenan los ceros para mantener el formato */
      const referencia = /^\d+$/.test(refEscrita) ? refEscrita.padStart(3, '0') : refEscrita;

      return {
        id,
        foto,
        nombre,
        referencia,
        precio,
        estado:ESTADOS[clave(valor('estado'))] || 'disponible',
        categorias:clave(valor('categorias')).replace(/\s*,\s*/g, ','),
        etiqueta:ETIQUETAS[clave(valor('etiqueta'))] || ''
      };
    }).filter(Boolean);
  }

  /* Descarga la hoja. Devuelve la lista de productos, o null si no hay hoja o no respondió. */
  async function cargar({ carpetaFotos = '../imagenes/', espera = 6000 } = {}) {
    const url = window.PINVERSE_SHEET_URL || SHEET_CSV_URL;
    if (!url) return null;
    const control = 'AbortController' in window ? new AbortController() : null;
    const temporizador = control ? window.setTimeout(() => control.abort(), espera) : null;
    try {
      const respuesta = await fetch(url, { cache:'no-store', signal:control?.signal });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      const lista = normalizar(parseCSV(await respuesta.text()), carpetaFotos);
      return lista.length ? lista : null;
    } catch (error) {
      console.warn('No se pudo leer la hoja de productos; se usa la lista guardada.', error);
      return null;
    } finally {
      if (temporizador) window.clearTimeout(temporizador);
    }
  }

  window.PinverseProductos = { cargar, parseCSV, normalizar, activa:() => Boolean(window.PINVERSE_SHEET_URL || SHEET_CSV_URL) };
})();
