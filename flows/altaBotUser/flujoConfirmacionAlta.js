import { addKeyword } from "@builderbot/bot";
import { altaBotuser } from "../../api/apiUsuarios.js";
import { respuesta } from "../../api/apiMensajes.js";

const flujoConfirmacionAlta = addKeyword("_confirmaciónUsuario__").addAnswer(
  "Indique la opción deseada\n1. Confirmar y salir\n2. Volver a empezar\n3. Confirmar y dar de alta más usuarios\n4. No confirmar y salir",
  { capture: true, idle: 200000 },
  async (ctx, { provider, state, endFlow, gotoFlow, fallBack }) => {
    if (ctx?.idleFallBack) {
      const { default: flujoInactividad } = await import("../flujoInactividad.js");
      return gotoFlow(flujoInactividad);
    }
    const input = ctx.body.trim();
    switch (input) {
      case "1":
        try {
          await altaBotuser(state); // altaBotuser ahora recibe solo state
          await respuesta(
            ctx.from,
            provider,
            "Usuario creado exitosamente\nEscriba *sigesbot* para volver a comenzar"
          );
          await state.update({ newBotuser: null }); // Limpiar el estado del usuario dado de alta
          return endFlow();
        } catch (error) {
          console.error("Error al dar de alta el usuario:", error);
          await respuesta(
            ctx.from,
            provider,
            "Hubo un error al crear el usuario. Por favor, intente de nuevo o contacte a soporte."
          );
          return endFlow();
        }

      case "2": {
        await state.update({ newBotuser: {} }); // Reinicia el estado de newBotuser
        await respuesta(ctx.from, provider, "Volviendo a empezar la carga del usuario...");
        const { default: flujoAltaBotUser } = await import("./flujoAltaBotUser.js");
        return gotoFlow(flujoAltaBotUser); // Redirige al inicio de este mismo flujo
      }

      case "3": {
        try {
          await altaBotuser(state); // altaBotuser ahora recibe solo state
          await respuesta(
            ctx.from,
            provider,
            "Usuario creado exitosamente\nA continuación daremos de alta a un nuevo usuario"
          );
          await state.update({ newBotuser: {} }); // Limpia el estado para el nuevo usuario
          const { default: flujoAltaBotUser } = await import("./flujoAltaBotUser.js");
          return gotoFlow(flujoAltaBotUser); // Redirige al inicio para crear otro
        } catch (error) {
          console.error("Error al dar de alta el usuario (continuar):", error);
          await respuesta(
            ctx.from,
            provider,
            "Hubo un error al crear el usuario. Por favor, intente de nuevo o contacte a soporte."
          );
          return endFlow();
        }
      }

      case "4": {
        await state.update({ newBotuser: {} }); // Limpia los datos del usuario no confirmado
        await respuesta(
          ctx.from,
          provider,
          "Alta de usuario cancelada. Escriba *sigesbot* para volver a comenzar"
        );
        return endFlow();
      }

      default: {
        await respuesta(
          ctx.from,
          provider,
          "Opción inválida. Por favor, seleccione una opción válida."
        );
        return fallBack(); // Vuelve a pedir la opción de confirmación
      }
    }
  }
);
export default flujoConfirmacionAlta;
