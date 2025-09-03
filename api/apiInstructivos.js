import axios from "axios";

// Obtener categorías (carpetas) del Drive
const obtenerCategorias = async () => {
  try {
    const res = await axios.get(`${process.env.SERVER_URL}/upload/folders`);
    let carpetas = res.data;

    // Validamos que 'carpetas' sea un array antes de intentar ordenarlo
    if (!Array.isArray(carpetas)) {
      console.error("La respuesta de /upload/folders no es un array:", carpetas);
      return []; // Retorna un array vacío para evitar errores
    }

    // Ordenar las carpetas de forma numérica
    // Extraemos el número del inicio del nombre y lo usamos para ordenar
    carpetas.sort((a, b) => {
      // Usamos parseInt para obtener el número al inicio de la cadena.
      // Si no encuentra un número, parseInt devuelve NaN.
      const numA = parseInt(a.name);
      const numB = parseInt(b.name);

      // Comprobamos si ambos nombres tienen un número al inicio
      if (!isNaN(numA) && !isNaN(numB)) {
        // Si ambos son números, los ordenamos numéricamente
        return numA - numB;
      } else if (!isNaN(numA)) {
        // Si solo 'a' tiene número, 'a' va primero
        return -1;
      } else if (!isNaN(numB)) {
        // Si solo 'b' tiene número, 'b' va primero
        return 1;
      } else {
        // Si ninguno tiene un número, ordenamos alfabéticamente como fallback
        return a.name.localeCompare(b.name);
      }
    });

    return carpetas;
  } catch (error) {
    console.error("Error al obtener o ordenar las categorías:", error);
    return [];
  }
};

// Obtener archivos dentro de una categoría
const obtenerArchivosDeCategoria = async (folderId) => {
  try {
    const res = await axios.get(`${process.env.SERVER_URL}/upload/files/${folderId}`);

    // Verificamos que la respuesta contenga datos y sea un array.
    if (res.data && Array.isArray(res.data)) {
      let archivos = res.data;

      // Paso 1: Ordenamos los archivos de forma numérica, usando el mismo método que las categorías.
      archivos.sort((a, b) => {
        const numA = parseInt(a.name);
        const numB = parseInt(b.name);

        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        } else if (!isNaN(numA)) {
          return -1;
        } else if (!isNaN(numB)) {
          return 1;
        } else {
          return a.name.localeCompare(b.name);
        }
      });

      // Paso 2: Creamos un nuevo array con los nombres de archivo limpios.
      const archivosLimpios = archivos.map((archivo) => {
        const archivoCopia = { ...archivo };

        // Eliminamos el prefijo numérico del nombre (ej: "1. Mi Archivo.pdf" -> "Mi Archivo.pdf").
        archivoCopia.name = archivoCopia.name.replace(/^\d+\.\s*/, "");
        archivoCopia.name = archivoCopia.name.replace(/\.[^/.]+$/, "");

        return archivoCopia;
      });

      return archivosLimpios; // Retornamos el array de archivos ordenados y con nombres limpios.
    }

    // Si la respuesta no es un array, devolvemos un array vacío.
    return [];
  } catch (error) {
    console.error(`Error al obtener o ordenar los archivos de la categoría ${folderId}:`, error);
    return [];
  }
};

// Enviar archivo por WhatsApp
const enviarArchivo = async (from, url, filename, provider) => {
  const prov = provider.getInstance();

  await prov.sendMessage(`${from}@s.whatsapp.net`, {
    document: { url },
    fileName: filename,
  });
};

export { obtenerCategorias, obtenerArchivosDeCategoria, enviarArchivo };
