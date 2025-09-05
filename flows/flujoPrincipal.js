import { addKeyword } from "@builderbot/bot";

import { respuestaConDelay, respuesta } from "../api/apiMensajes.js";
import { validateUser } from "../api/apiUsuarios.js";
import { opMenuInicial } from "../api/apiOpciones.js";

const flujoPrincipal = addKeyword("sigesbot", "Sigesbot")
  .addAnswer(
    "Gracias por comunicarte con Sistema SIGES.",
    {},
    async (ctx, { provider, endFlow, state }) => {
      console.log("Entró al flujoPrincipal con:", ctx.body);
      console.log(ctx);
      const user = await validateUser(state, ctx.from);
      if (!user)
        return endFlow(
          "Este numero de telefono no esta dado de alta, solicite que le den el alta para usar el bot"
        );

      const opciones = await opMenuInicial(state);
      await respuestaConDelay(ctx.from, provider, opciones);
    }
  )
  .addAnswer(
    "Elija la opción deseada",
    { capture: true, idle: 300000 },
    async (ctx, { endFlow, provider, state, gotoFlow, fallBack }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("./flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      if (ctx.body === "salir") {
        await respuesta(ctx.from, provider, "Gracias por comunicarte con Sistema SIGES.");
        return endFlow(`Escriba *sigesbot* para volver a comenzar`);
      }

      const creds = state.get("creds") || {};
      const validOptions = {
        1: true,
        2: true,
        3: creds.createUser,
        0: creds.canSOS,
      };

      if (!validOptions[ctx.body]) {
        await respuesta(
          ctx.from,
          provider,
          "Opción inválida. Por favor, seleccione una opción válida."
        );
        const opciones = await opMenuInicial(state);
        await respuesta(ctx.from, provider, opciones);
        return fallBack();
      }

      switch (ctx.body) {
        case "0": {
          const { default: flujoSOS } = await import("./SOS/flujoSOS.js");
          return gotoFlow(flujoSOS);
        }

        case "1": {
          const { default: flujoInstructivosCategorias } = await import(
            "./instructivos/flujoInstructivosCategorias.js"
          );
          return gotoFlow(flujoInstructivosCategorias);
        }

        case "2": {
          const { default: flujoSoporte } = await import("./soporte/flujoSoporte.js");
          return gotoFlow(flujoSoporte);
        }

        case "3": {
          const { default: flujoAltaBotUser } = await import("./altaBotUser/flujoAltaBotUser.js");
          return gotoFlow(flujoAltaBotUser);
        }
      }
    }
  );

export default flujoPrincipal;
