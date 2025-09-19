import { addKeyword } from "@builderbot/bot";
import { buildNewUserInfoSummary } from "../../api/apiUsuarios.js";
import { respuesta } from "../../api/apiMensajes.js";


const flujoAltaBotUserUnaEstacion = addKeyword("__AltaBotUser__")
  .addAnswer(
    "Este usuario podrá dar de alta a nuevos usuarios ?\n1. SI\n2. NO",
    { capture: true, idle: 100000 },
    async (ctx, { state, fallBack, provider, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const input = ctx.body.trim();
      const currentNewBotuser = await state.get("newBotuser");
      if (input === "1") {
        await state.update({ newBotuser: { ...currentNewBotuser, createUser: true } });
      } else if (input === "2") {
        await state.update({ newBotuser: { ...currentNewBotuser, createUser: false } });
      } else {
        await respuesta(
          ctx.from,
          provider,
          "Opción inválida. Por favor, seleccione una opción válida."
        );
        return fallBack();
      }
    }
  )
  .addAnswer(
    "Este usuario podrá ver los instructivos Admin / Contables ?\n1. SI\n2. NO",
    { capture: true, idle: 100000 },
    async (ctx, { state, fallBack, provider, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const input = ctx.body.trim();
      const currentNewBotuser = await state.get("newBotuser");
      if (input === "1") {
        await state.update({ newBotuser: { ...currentNewBotuser, adminPdf: true } });
      } else if (input === "2") {
        await state.update({ newBotuser: { ...currentNewBotuser, adminPdf: false } });
      } else {
        await respuesta(
          ctx.from,
          provider,
          "Opción inválida. Por favor, seleccione una opción válida."
        );
        return fallBack();
      }
    }
  )
  .addAnswer(
    "Este usuario podrá enviar tickets *SOS* ?\n1. SI\n2. NO",
    { capture: true, idle: 100000 },
    async (ctx, { state, fallBack, provider, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const input = ctx.body.trim();
      const currentNewBotuser = await state.get("newBotuser");
      if (input === "1") {
        await state.update({ newBotuser: { ...currentNewBotuser, canSOS: true } });
      } else if (input === "2") {
        await state.update({ newBotuser: { ...currentNewBotuser, canSOS: false } });
      } else {
        await respuesta(
          ctx.from,
          provider,
          "Opción inválida. Por favor, seleccione una opción válida."
        );
        return fallBack();
      }
    }
  )
  .addAnswer(
    "Este usuario es encargado de algún área y recibirá copia de los tickets de dicha área ?\n1. SI\n2. NO",
    { capture: true, idle: 100000 },
    async (ctx, { state, fallBack, gotoFlow, provider }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const input = ctx.body.trim();
      const currentNewBotuser = await state.get("newBotuser");
      if (input === "1") {
        await state.update({ newBotuser: { ...currentNewBotuser, manager: true } });
      } else if (input === "2") {
        await state.update({ newBotuser: { ...currentNewBotuser, manager: false } });
        const newUserFinalInfo = await buildNewUserInfoSummary(state);
        await respuesta(ctx.from, provider, newUserFinalInfo);
        const { default: flujoConfirmacionAlta } = await import("./flujoConfirmacionAlta.js");
        return gotoFlow(flujoConfirmacionAlta);
      } else {
        await respuesta(
          ctx.from,
          provider,
          "Opción inválida. Por favor, seleccione una opción válida."
        );
        return fallBack();
      }
    }
  )
  .addAnswer(
    "Indique el área\n1. Playa/Boxes\n2. Tienda\n3. Administración\n4. Gerente / Dueño",
    { capture: true, idle: 200000 },
    async (ctx, { state, fallBack, provider, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const input = ctx.body.trim();
      let areaCode;
      switch (input) {
        case "1":
          areaCode = "P";
          break;
        case "2":
          areaCode = "T";
          break;
        case "3":
          areaCode = "A";
          break;
        case "4":
          areaCode = "G";
          break;
        default:
          await respuesta(
            ctx.from,
            provider,
            "Opción inválida. Por favor, seleccione una opción válida."
          );
          return fallBack();
      }
      const currentNewBotuser = await state.get("newBotuser");
      await state.update({ newBotuser: { ...currentNewBotuser, area: areaCode } });
    }
  )
  .addAnswer(
    "Ingrese el correo electrónico del encargado",
    { capture: true, idle: 200000 },
    async (ctx, { provider, state, fallBack, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const email = ctx.body.trim();
      // Validar formato de email
      if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email)) {
        await respuesta(
          ctx.from,
          provider,
          "Correo electrónico inválido. Por favor, ingrese un email con formato correcto."
        );
        return fallBack();
      }
      const currentNewBotuser = await state.get("newBotuser");
      await state.update({ newBotuser: { ...currentNewBotuser, email: email } });
    }
  )
  .addAnswer(
    "Verifique que los datos sean correctos",
    {},
    async (ctx, { provider, state, gotoFlow }) => {
      const newUserSummary = await buildNewUserInfoSummary(state);
      await respuesta(ctx.from, provider, newUserSummary);
      const { default: flujoConfirmacionAlta } = await import("./flujoConfirmacionAlta.js");
      return gotoFlow(flujoConfirmacionAlta);
    }
  );

export default flujoAltaBotUserUnaEstacion;
