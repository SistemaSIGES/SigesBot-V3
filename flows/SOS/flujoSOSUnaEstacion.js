import { addKeyword } from "@builderbot/bot";
import { respuesta, respuestaConDelay } from "../../api/apiMensajes.js";
import {
  getUsers,
  sendSosTicket,
  addAudio,
  addImage,
  buildTicketSummaryMessage,
} from "../../api/apiTickets.js";

const flujoSOSUnaEstacion = addKeyword("__FlujoSOS__")
  .addAnswer(
    "Ahora, por favor, escriba una breve descripción del incidente o envíe un AUDIO explicando el mismo.", // Descripción puede ser texto o audio
    { capture: true, idle: 1000000 },
    async (ctx, { state, fallBack, provider, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      let descriptionText = "";
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
        const selectedUser = await state.get("selectedUser"); // Obtener selectedUser del estado
      if (selectedUser && selectedUser.testing === true) {
        // Verificar si el campo 'testing' es true
        await state.update({ priority: "4" });
        await state.update({ generalProblem: "*Ticket SOS*" });
        const ticketSummary = await buildTicketSummaryMessage(state, ctx.from); // Llama a la nueva función
        await respuesta(ctx.from, provider, ticketSummary); // Envía el resumen al usuario
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

export default flujoSOSUnaEstacion;
