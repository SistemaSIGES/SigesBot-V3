import { addKeyword } from "@builderbot/bot";
import { respuesta, respuestaConDelay } from "../../api/apiMensajes.js";
import {
  getUsers,
  sendSosTicket,
  addAudio,
  addImage,
  buildTicketSummaryMessage,
} from "../../api/apiTickets.js";

const flujoSOS = addKeyword("__FlujoSOS__")
  .addAnswer(
    "Esta opción está disponible para casos donde más de la mitad de los puntos de venta no pueden facturar. Envíe:\n1. Si esto es así.\n2. De no ser así.",
    { capture: true, idle: 200000 },
    async (ctx, { provider, endFlow, fallBack, state, gotoFlow }) => {
      const input = ctx.body.toLowerCase().trim();
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }

      if (input === "1") {
        const clientSelectionResult = await getUsers(state, ctx.from);
        const clientesDisponibles = await state.get("altaBotuserClientsOptions");
        if (clientSelectionResult === "No se encontraron clientes asociados.") {
          await respuesta(
            ctx.from,
            provider,
            clientSelectionResult + " Por favor, contacte a soporte."
          );
          return endFlow(`Escriba *sigesbot* para volver a comenzar`);
        } else if (clientesDisponibles.length === 1) {
          const selectedClient = clientesDisponibles[0];
          await state.update({ selectedUser: selectedClient });
          await respuesta(
            ctx.from,
            provider,
            `Incidente reportado para: ${selectedClient.info}`
          );
          await state.update({ altaBotuserClientsOptions: null });
          const { default: flujoSOSUnaEstacion } = await import("./flujoSOSUnaEstacion.js");
          return gotoFlow(flujoSOSUnaEstacion)
        } else {
          // Siempre que haya resultados, se muestra el menú de opciones
          await respuestaConDelay(
            ctx.from,
            provider,
            `Indique para qué estación quiere dar de alta este usuario (elija un número):\n${clientSelectionResult}`
          );
          // El flujo automáticamente pasará al siguiente addAnswer para capturar la selección.
        }
      } else if (input === "2") {
        await respuesta(
          ctx.from,
          provider,
          "Envíe *sigesbot* para volver a comenzar y genere un ticket en la opción *2*."
        );
        return endFlow();
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
    "Cargando estaciones...",
    { capture: true, idle: 200000 },
    async (ctx, { provider, state, fallBack, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const clientesDisponibles = await state.get("altaBotuserClientsOptions");
      if (clientesDisponibles !== null) {
        const index = parseInt(ctx.body) - 1;

        if (isNaN(index) || !clientesDisponibles?.[index]) {
          await respuesta(ctx.from, provider, "Opción inválida.");
          const clientSelectionResult = await getUsers(state, ctx.from);
          await respuestaConDelay(
            ctx.from,
            provider,
            `Indique para qué estación quiere dar de alta este usuario (elija un número):\n${clientSelectionResult}`
          );
          return fallBack();
        }

        const selectedClient = clientesDisponibles[index];
        await state.update({ selectedUser: selectedClient });
        await respuesta(ctx.from, provider, `Incidente reportado para: ${selectedClient.info}`);
        await state.update({ altaBotuserClientsOptions: null });
      }
    }
  )
  .addAnswer(
    "Ahora, por favor, escriba una breve descripción del incidente o envíe un AUDIO explicando el mismo.",
    { capture: true, idle: 1000000 },
    async (ctx, { state, fallBack, provider, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      let descriptionText = "";
      // Detectar audio
      const isAudioByCtxType = ctx.hasMedia && ctx.type === "audio";
      const isAudioByBodyPattern =
        typeof ctx.body === "string" && ctx.body.startsWith("_event_voice_note_");

      if (isAudioByCtxType || isAudioByBodyPattern) {
        await addAudio(state, ctx.from, ctx, provider);
        descriptionText = "Descripción proporcionada en audio.";
      } else if (ctx.body && ctx.body.trim() !== "" && !ctx.body.startsWith("_event_media_")) {
        descriptionText = ctx.body.trim();
      } else {
        await respuesta(
          ctx.from,
          provider,
          "Tipo de entrada no válido. Por favor, escriba una descripción o envíe un audio."
        );
        return fallBack();
      }

      if (
        !isAudioByCtxType &&
        !isAudioByBodyPattern &&
        (!descriptionText || descriptionText.trim() === "")
      ) {
        await respuesta(
          ctx.from,
          provider,
          "Por favor, ingrese una descripción válida o un audio."
        );
        return fallBack();
      }
      await state.update({ [ctx.from]: { description: descriptionText, phone: ctx.from } });
      await respuesta(ctx.from, provider, "Si desea adjuntar *IMAGENES* puede enviarlas ahora de una por vez o precionar *0* para continuar.")
    }
  )
  .addAction(
    { capture: true, idle: 200000 },
    async (ctx, { provider, state, endFlow, fallBack, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const input = ctx.body.toLowerCase().trim();
      const isImageByCtxType = ctx.hasMedia && ctx.type === "image";
      const isImageByBodyPattern =
        typeof ctx.body === "string" && ctx.body.startsWith("_event_media_");

      if (isImageByCtxType || isImageByBodyPattern) {
        await addImage(state, ctx.from, ctx, provider);
        await respuesta(ctx.from, provider, "Si desea adjuntar *IMAGENES* puede enviarlas ahora de una por vez o precionar *0* para continuar.");
        return fallBack()
      } else if (input === "0") {
        await respuesta(ctx.from, provider, "Procesando ticket...");
        const selectedUser = await state.get("selectedUser");
      if (selectedUser && selectedUser.testing === true) {
        await state.update({ priority: "4" });
        await state.update({ generalProblem: "*Ticket SOS*" });
        const ticketSummary = await buildTicketSummaryMessage(state, ctx.from); 
        await respuesta(ctx.from, provider, ticketSummary); 
        await respuesta(ctx.from, provider, "Escriba *sigesbot* para volver a comenzar");
        return endFlow();
      }

      try {
        const ticketId = await sendSosTicket(state, ctx.from);
        if (ticketId) {
          await respuesta(
            ctx.from,
            provider,
            `Tu ticket SOS ha sido generado exitosamente. ID: ${ticketId}`
          );
        } else {
          await respuesta(
            ctx.from,
            provider,
            "Hubo un error desconocido al generar tu ticket SOS."
          );
        }
        await respuesta(ctx.from, provider, "Escriba *sigesbot* para volver a comenzar");
        return endFlow();
      } catch (error) {
        console.error("Error en flujoSOS al llamar a sendSosTicket:", error);
        await respuesta(
          ctx.from,
          provider,
          "Hubo un error al generar tu ticket SOS. Por favor, intenta de nuevo o contacta a soporte directo."
        );
        await respuesta(ctx.from, provider, "Escriba *sigesbot* para volver a comenzar");
        return endFlow();
      }
      } else {
        await respuesta(
          ctx.from,
          provider,
          "Entrada inválida. Por favor, envíe una imagen o escriba *0*."
        );
        return fallBack();
      }
    }
  );

export default flujoSOS;
