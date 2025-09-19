import { addKeyword } from "@builderbot/bot";
import { respuesta, respuestaConDelay } from "../../api/apiMensajes.js";
import { computers } from "../../api/apiUsuarios.js";
import { getUsers, computerInfo } from "../../api/apiTickets.js";
import { computerOptions, opMenuProblemas } from "../../api/apiOpciones.js";

const flujoSoporte = addKeyword("__FlujoSoporte__")
  .addAction(async (ctx, { provider, state, endFlow, gotoFlow }) => {
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
      const { default: flujoSoporteUnaEstacion } = await import("./flujoSoporteUnaEstacion.js");
      return gotoFlow(flujoSoporteUnaEstacion)
    } else {
      // Siempre que haya resultados, se muestra el menú de opciones
      await respuestaConDelay(
        ctx.from,
        provider,
        `Indique para qué estación quiere dar de alta este usuario (elija un número):\n${clientSelectionResult}`
      );
      // El flujo automáticamente pasará al siguiente addAnswer para capturar la selección.
    }
  })
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
    "Elija en que area se encuentra el puesto de trabajo donde necesita soporte\n1. Playa/Boxes\n2. Tienda\n3. Administracion",
    { capture: true, idle: 100000 },
    async (ctx, { provider, fallBack, state }) => {
      switch (ctx.body) {
        case "1":
          await state.update({ area: "P" });
          break;
        case "2":
          await state.update({ area: "S" });
          break;
        case "3":
          await state.update({ area: "A" });
          break;
        default:
          respuesta(ctx.from, provider, "Opción invalida");
          return fallBack();
      }
    }
  )
  .addAction(async (ctx, { provider, state }) => {
    await computers(state);
    const pcsMenu = await computerOptions(state);
    respuestaConDelay(ctx.from, provider, pcsMenu);
  })
  .addAnswer(
    "Elija el número del puesto de trabajo...",
    { capture: true, idle: 200000 },
    async (ctx, { state, provider, fallBack, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const pcs = await state.get("computers");
      const opcion = parseInt(ctx.body);

      if (opcion > 0 && opcion <= pcs.length) {
        await computerInfo(state, opcion);
        const menuproblemas = await opMenuProblemas(state).join("\n");
        await respuestaConDelay(ctx.from, provider, menuproblemas);
      } else if (ctx.body === "0") {
        await state.update({
          pf: "PC no esta en nuestra base de datos",
          tv: "Especificado en el cuerpo del Ticket",
        });
        const menuproblemas = await opMenuProblemas(state).join("\n");
        await respuestaConDelay(ctx.from, provider, menuproblemas);
      } else {
        const pcsMenu = await computerOptions(state);
        await respuestaConDelay(ctx.from, provider, pcsMenu);
        return fallBack("Opción inválida");
      }
    }
  )
  .addAnswer(
    "Elija el numero del problema que tiene",
    { capture: true, idle: 100000 },
    async (ctx, { state, provider, fallBack, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const menuproblemas = await opMenuProblemas(state).join("\n");
      const areaSelected = await state.get("area");
      switch (ctx.body) {
        case "1": {
          await state.update({ generalProblem: "Apps de Pagos y Fidelizaciones" });
          const { default: flujoAplicaciones } = await import(
            "./tiposProblemas/flujoAplicaciones.js"
          );
          return gotoFlow(flujoAplicaciones);
        }
        case "2": {
          await state.update({ generalProblem: "Impresora Fiscal / Comandera" });
          const { default: flujoImpresoraFiscal } = await import(
            "./tiposProblemas/flujoImpresoraFiscal.js"
          );
          return gotoFlow(flujoImpresoraFiscal);
        }
        case "3": {
          await state.update({ generalProblem: "Despachos CIO" });
          const { default: flujoDespachosCio } = await import(
            "./tiposProblemas/flujoDespachosCio.js"
          );
          return gotoFlow(flujoDespachosCio);
        }
        case "4": {
          await state.update({ generalProblem: "Sistema SIGES" });
          const { default: flujoSiges } = await import("./tiposProblemas/flujoSiges.js");
          return gotoFlow(flujoSiges);
        }
        case "5": {
          await state.update({ generalProblem: "Impresora Común / Oficina" });
          const { default: flujoImpresoraComun } = await import(
            "./tiposProblemas/flujoImpresoraComun.js"
          );
          return gotoFlow(flujoImpresoraComun);
        }
        case "6": {
          if (areaSelected == "A") {
            const { default: flujoLibroIva } = await import("./tiposProblemas/flujoLibroIva.js");
            return gotoFlow(flujoLibroIva);
          } else {
            respuesta(
              ctx.from,
              provider,
              "Opción inválida, Por favor, seleccione una opción válida."
            );
            await respuestaConDelay(ctx.from, provider, menuproblemas);
            return fallBack();
          }
        }
        case "7": {
          if (areaSelected == "A") {
            const { default: flujoServidor } = await import("./tiposProblemas/flujoServidor.js");
            return gotoFlow(flujoServidor);
          } else {
            respuesta(ctx.from, provider, "Opción inválida, seleccione una opción válida.");
            await respuestaConDelay(ctx.from, provider, menuproblemas);
            return fallBack();
          }
        }
        default: {
          respuesta(ctx.from, provider, "Opción inválida, seleccione una opción válida.");
          await respuestaConDelay(ctx.from, provider, menuproblemas);
          return fallBack();
        }
      }
    }
  );

export default flujoSoporte;
