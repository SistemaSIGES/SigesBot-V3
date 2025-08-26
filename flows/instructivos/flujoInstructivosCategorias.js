import { addKeyword } from "@builderbot/bot";
import { respuestaConDelay, respuesta } from "../../api/apiMensajes.js";
import { obtenerCategorias, obtenerArchivosDeCategoria } from "../../api/apiInstructivos.js";

const flujoInstructivosCategorias = addKeyword("__flujoInstructivosCategorias__", {
  sensitive: true,
})
  .addAnswer("Obteniendo categorías de instructivos...", {}, async (ctx, { provider, state }) => {
    const categorias = await obtenerCategorias();

    // Obtenemos los datos del usuario para verificar permisos
    const creds = (await state.get("creds")) || {};
    const isAdmin = creds.adminPdf;

    // Filtramos las categorías: las que empiezan con '3.' solo se muestran a los admins
    const categoriasFiltradas = categorias.filter((categoria) => {
      const isRestricted = categoria.name.startsWith("3.");
      if (isRestricted) {
        return isAdmin;
      }
      return true;
    });

    if (categoriasFiltradas.length === 0) {
      return respuestaConDelay(ctx.from, provider, "No se encontraron categorías disponibles.");
    }

    // Construimos el menú a partir de las categorías ya filtradas
    const menu = categoriasFiltradas
      .map((cat, i) => {
        const nombreLimpio = cat.name.replace(/^\d+\.\s*/, "");
        return `${i + 1}. ${nombreLimpio}`;
      })
      .join("\n");
    await state.update({ instructivosCategorias: categoriasFiltradas });

    await respuesta(ctx.from, provider, `Seleccione una categoría:\n${menu}`);
  })
  .addAction(
    { capture: true, idle: 100000 },
    async (ctx, { provider, state, gotoFlow, fallBack }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const categorias = await state.get("instructivosCategorias");
      const index = parseInt(ctx.body) - 1;

      if (isNaN(index) || !categorias?.[index]) {
        await respuesta(
          ctx.from,
          provider,
          "Opción inválida. Por favor, seleccione una categoría válida."
        );
        const categorias = await obtenerCategorias();
        const creds = (await state.get("creds")) || {};
        const isAdmin = creds.adminPdf;
        const categoriasFiltradas = categorias.filter((categoria) => {
          const isRestricted = categoria.name.startsWith("3.");
          if (isRestricted) {
            return isAdmin;
          }
          return true;
        });

        if (categoriasFiltradas.length === 0) {
          return respuestaConDelay(ctx.from, provider, "No se encontraron categorías disponibles.");
        }

        // Construimos el menú a partir de las categorías ya filtradas
        const menu = categoriasFiltradas
          .map((cat, i) => {
            const nombreLimpio = cat.name.replace(/^\d+\.\s*/, "");
            return `${i + 1}. ${nombreLimpio}`;
          })
          .join("\n");
        await respuesta(ctx.from, provider, `Seleccione una categoría:\n${menu}`);
        return fallBack();
      }

      const categoriaSeleccionada = categorias[index];
      const archivos = await obtenerArchivosDeCategoria(categoriaSeleccionada.id);

      await state.update({
        instructivosCategoriaSeleccionada: categoriaSeleccionada,
        instructivosArchivos: archivos,
      });

      const { default: flujoInstructivosArchivos } = await import("./flujoInstructivosArchivos.js");
      return gotoFlow(flujoInstructivosArchivos);
    }
  );

export default flujoInstructivosCategorias;
