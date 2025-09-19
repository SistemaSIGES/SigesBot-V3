import { addKeyword } from "@builderbot/bot";
import {
  addAudio,
  addImage,
  sendProblemTicket,
  clearMailAttachments,
  buildTicketSummaryMessage,
} from "../../../api/apiTickets.js";
import { respuesta } from "../../../api/apiMensajes.js";

const flujoServidor = addKeyword("__flujoServidor__", { sensitive: true })
  .addAnswer(
    "Describa el problema por escrito o adjunte un AUDIO",
    { capture: true, idle: 500000 },
    async (ctx, { state, fallBack, provider, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      let descriptionText = "";
      const isAudioByCtxType = ctx.hasMedia && ctx.type === "audio";
      const isAudioByBodyPattern =
        typeof ctx.body === "string" && ctx.body.startsWith("_event_voice_note_");

      if (isAudioByCtxType || isAudioByBodyPattern) {
        await addAudio(state, ctx.from, ctx, provider);
        descriptionText = "Descripción proporcionada en audio.";
      } else if (ctx.body && ctx.body.trim() !== "") {
        descriptionText = ctx.body.trim();
      } else {
        await respuesta(
          ctx.from,
          provider,
          "Tipo de entrada no válido. Por favor, escriba una descripción o envíe un audio."
        );
        return fallBack();
      }

      await state.update({ [ctx.from]: { description: descriptionText, phone: ctx.from } });
      const tv = await state.get("tv");
      if (tv === "Especificado en el cuerpo del Ticket") {
        await respuesta(
          ctx.from,
          provider,
          `Si es posible, en esta sección adjunte una foto con la ID y contraseña de Team Viewer`
        );
      }
    await respuesta(ctx.from, provider, "Si desea adjuntar *IMAGENES* puede enviarlas ahora de una por vez o precionar *0* para continuar.")
    })

    .addAction({ capture: true, idle: 200000 }, async (ctx, { provider, state, fallBack, gotoFlow }) => {
        if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
        const input = ctx.body.toLowerCase().trim();
        const isImageByCtxType = ctx.hasMedia && ctx.type === 'image';
        const isImageByBodyPattern = typeof ctx.body === 'string' && ctx.body.startsWith('_event_media_');

        if (isImageByCtxType || isImageByBodyPattern) {
            await addImage(state, ctx.from, ctx, provider);
            await respuesta(ctx.from, provider, "Imagen adjuntada correctamente. Puede enviar otra o escribir *0* para continuar.");
            return fallBack();
        } else if (input === '0') {
            await respuesta(ctx.from, provider, "Procesando ticket...");
        } else {
            await respuesta(ctx.from, provider, "Entrada inválida, por favor envíe una imagen o *0* para continuar");
            return fallBack();
        }
    })


  .addAnswer(
    "¿Qué nivel de urgencia le daría a este ticket?\n1. Bajo\n2. Medio\n3. Alto",
    { capture: true, idle: 100000 },
    async (ctx, { provider, state, fallBack, endFlow, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      switch (ctx.body) {
        case "1":
          await state.update({ priority: "1" });
          break;
        case "2":
          await state.update({ priority: "2" });
          break;
        case "3":
          await state.update({ priority: "3" });
          break;
        default:
          await respuesta(ctx.from, provider, "Opción inválida, seleccione una opción válida.");
          return fallBack();
      }
      const selectedUser = await state.get("selectedUser"); // Obtener selectedUser del estado
      if (selectedUser && selectedUser.testing === true) {
        const ticketSummary = await buildTicketSummaryMessage(state, ctx.from);
        await respuesta(ctx.from, provider, ticketSummary); // Envía el resumen al usuario
        await respuesta(ctx.from, provider, "Escriba *sigesbot* para volver a comenzar");
        return endFlow();
      }
    }
  )

  .addAnswer(
    "Elija la opción deseada\n1. Enviar ticket\n2. Cancelar ticket",
    { capture: true, idle: 100000 },
    async (ctx, { provider, state, endFlow, fallBack, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      if (ctx.body === "1") {
        try {
          const ticketId = await sendProblemTicket(state, ctx.from);
          if (ticketId) {
            await respuesta(
              ctx.from,
              provider,
              `Tu ticket fue generado exitosamente. ID: ${ticketId}`
            );
          } else {
            await respuesta(ctx.from, provider, "Hubo un error desconocido al generar el ticket.");
          }
        } catch (error) {
          await respuesta(
            ctx.from,
            provider,
            "Hubo un error al generar el ticket. Por favor, intenta de nuevo o contacta a soporte."
          );
        }
        await respuesta(ctx.from, provider, "Escriba *sigesbot* para volver a comenzar");
        return endFlow();
      } else if (ctx.body === "2") {
        await respuesta(ctx.from, provider, "Ticket cancelado");
        await clearMailAttachments(state);
        await state.update({ period: undefined });
        await respuesta(ctx.from, provider, "Escriba *sigesbot* para volver a comenzar");
        return endFlow();
      } else {
        await respuesta(ctx.from, provider, "Opción inválida, seleccione una opción válida.");
        return fallBack();
      }
    }
  );

export default flujoServidor;
