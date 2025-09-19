import { respuestaConDelay, respuesta } from "../../api/apiMensajes.js"; // Asegúrate de que esta ruta sea correcta
import { enviarArchivo } from "../../api/apiInstructivos.js"; // Asegúrate de que esta ruta sea correcta
import { addKeyword } from "@builderbot/bot";

const flujoInstructivosArchivos = addKeyword("__FlujoInstructivos__")
  // Este addAnswer se encarga de mostrar la lista de archivos y las opciones
  .addAnswer(
    "Seleccione un archivo para descargar:",
    null,
    async (ctx, { provider, state, gotoFlow }) => {
      const archivos = await state.get("instructivosArchivos");
      // Si no hay archivos o la lista está vacía, redirige a categorías
      if (!archivos || !Array.isArray(archivos) || archivos.length === 0) {
        await respuesta(
          ctx.from,
          provider,
          `Esta carpeta no tiene archivos disponibles. Seleccione otra.`
        );
        const { default: flujoInstructivosCategorias } = await import(
          "./flujoInstructivosCategorias.js"
        );
        return gotoFlow(flujoInstructivosCategorias);
      }
      // Construye la lista de opciones de archivos
      const opcionesArchivos = archivos
        .map((archivo, i) => {
          const nombreLimpio = archivo.name.replace(/^\d+\.\s*/, "");
          return `${i + 1}. ${nombreLimpio}`;
        })
        .join("\n");

      // Construye el menú completo con las nuevas opciones
      const menuCompleto =
        `*0*. Volver a Carpetas\n` + 
        `${opcionesArchivos}\n` +
        `*Salir*. Volver al Menú Principal`;

      await respuesta(ctx.from, provider, menuCompleto);
    }
  )
  .addAction(
    { capture: true, idle: 200000 },
    async (ctx, { provider, state, fallBack, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const userInput = ctx.body.toLowerCase().trim();
      const archivos = await state.get("instructivosArchivos"); // Obtiene los archivos del estado
      const opcionesArchivos = archivos
        .map((archivo, i) => {
          const nombreLimpio = archivo.name.replace(/^\d+\.\s*/, "");
          return `${i + 1}. ${nombreLimpio}`;
        })
        .join("\n");
      const menuCompleto =
        `*0*. Volver a Carpetas\n` + `${opcionesArchivos}\n` + `*Salir*. Volver al Menú Principal`;

      if (userInput === "0") {
        await respuesta(ctx.from, provider, "Volviendo a las carpetas...");
        const { default: flujoInstructivosCategorias } = await import(
          "./flujoInstructivosCategorias.js"
        );
        return gotoFlow(flujoInstructivosCategorias);
      }

      if (userInput === "salir") {
        await respuestaConDelay(ctx.from, provider, "Volviendo al menú principal...");
        const { default: flujoPrincipal } = await import("../flujoPrincipal.js");
        return gotoFlow(flujoPrincipal);
      }

      const index = parseInt(userInput) - 1; // Convierte la entrada a índice

      // Valida si la selección es un número de archivo válido
      if (isNaN(index) || index < 0 || index >= archivos.length) {
        await respuesta(
          ctx.from,
          provider,
          "Opción inválida. Por favor, seleccione un número de archivo válido, *0* para volver a carpetas, o *Salir* para el menú principal."
        );
        await respuesta(ctx.from, provider, menuCompleto);
        return fallBack(); // Vuelve a capturar la entrada y repite el mensaje anterior
      }

      const file = archivos[index]; // Obtiene el archivo seleccionado

      // Envía el archivo
      await respuestaConDelay(ctx.from, provider, `Enviando archivo: ${file.name}`);
      await enviarArchivo(ctx.from, file.webContentLink, file.name, provider);

      // Después de enviar el archivo, vuelve a mostrar la lista de opciones
      // Esto se logra volviendo al paso anterior del flujo (el addAnswer que lista las opciones)
      await respuesta(ctx.from, provider, menuCompleto);
      return fallBack();
    }
  );


export default flujoInstructivosArchivos;
