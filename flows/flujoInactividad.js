import { addKeyword } from "@builderbot/bot";
import { respuesta } from "../api/apiMensajes.js";

const flujoInactividad = addKeyword(["__FlujoInactividad__"]).addAnswer(
  "Parece que has estado inactivo por demasiado tiempo. 😴",
  null,
  async (ctx, { provider, endFlow }) => {
    await respuesta(
      ctx.from,
      provider,
      "Gracias por comunicarte con Sistema SIGES. Escribe *sigesbot* para volver a comenzar."
    );
    return endFlow();
  }
);

export default flujoInactividad;
