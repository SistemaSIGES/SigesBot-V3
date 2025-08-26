import { addKeyword } from "@builderbot/bot";

// Importar funciones adaptadas para usar 'state'
import { getUsers } from "../../api/apiTickets.js"; // getInstructivo, getBandera, etc.
import { buildNewUserInfoSummary } from "../../api/apiUsuarios.js";
import { respuesta, respuestaConDelay } from "../../api/apiMensajes.js";

// Importa el flujo principal para regresar a él (asegúrate de que este path sea correcto)
const flujoAltaBotuser = addKeyword("__AltaBotUser__")
  .addAnswer(
    "Ingrese el nombre de la persona que va a ser dada de alta para usar el chatbot",
    { capture: true, idle: 200000 },
    async (ctx, { state, fallBack, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const userName = ctx.body;
      if (!userName || userName.trim() === "") {
        return fallBack("Por favor, ingrese un nombre válido.");
      }
      // Inicializa el objeto newBotuser y guarda el nombre
      await state.update({
        newBotuser: {
          name: userName.trim(),
          createdBy: ctx.from, // Asume que ctx.from es el ID de quien lo crea
        },
      });
    }
  )
  .addAnswer(
    "Ingrese el numero de telefono sin 0 y sin 15\nEjemplo: 3512042023",
    { capture: true, idle: 200000 },
    async (ctx, { provider, state, fallBack, endFlow, gotoFlow }) => {
      if (ctx?.idleFallBack) {
        const { default: flujoInactividad } = await import("../flujoInactividad.js");
        return gotoFlow(flujoInactividad);
      }
      const telefono = ctx.body;
      // Valida que el teléfono tenga 10 dígitos (sin 0 y sin 15)
      if (!/^\d{10}$/.test(telefono)) {
        await respuesta(ctx.from, provider, "Número de teléfono inválido.");
        return fallBack();
      }

      const telefonoConPrefijo = "549" + telefono; // Agrega el prefijo internacional

      // Actualiza el teléfono en newBotuser
      const currentNewBotuser = await state.get("newBotuser");
      await state.update({
        newBotuser: {
          ...currentNewBotuser,
          phone: telefonoConPrefijo,
        },
      });

      // Lógica para obtener clientes del usuario que genera el alta utilizando getUsers de apiTickets
      const clientSelectionResult = await getUsers(state, ctx.from); // getUsers ahora siempre devuelve una cadena o mensaje
      const clientesDisponibles = await state.get("altaBotuserClientsOptions");
      if (clientSelectionResult === "No se encontraron clientes asociados.") {
        await respuesta(
          ctx.from,
          provider,
          clientSelectionResult + " Por favor, contacte a soporte."
        );
        return endFlow("Gracias por comuncarte con siges"); // Termina el flujo si no hay clientes
      } else if (clientesDisponibles.length === 1) {
        const selectedClient = clientesDisponibles[0];
        const currentNewBotuser = await state.get("newBotuser");
        await state.update({
          newBotuser: {
            ...currentNewBotuser,
            clientId: selectedClient.id,
          },
          altaBotuserClientsOptions: null,
        });
        await respuestaConDelay(
          ctx.from,
          provider,
          `Usuario asociado automáticamente a: ${selectedClient.info} , presione *0* para continuar`
        );
      } else {
        // Siempre que haya resultados, se muestra el menú de opciones
        await respuestaConDelay(
          ctx.from,
          provider,
          `Indique para qué estación quiere dar de alta este usuario (elija un número):\n${clientSelectionResult}`
        );
        // El flujo automáticamente pasará al siguiente addAnswer para capturar la selección.
      }
    }
  )
  .addAnswer(
    // Este addAnswer captura la selección del cliente (siempre será este paso ahora)
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
        const currentNewBotuser = await state.get("newBotuser");
        await state.update({
          newBotuser: {
            ...currentNewBotuser,
            clientId: selectedClient.id,
          },
        });
        await respuesta(ctx.from, provider, `Usuario asociado a: ${selectedClient.info}`);
        await state.update({ altaBotuserClientsOptions: null });
      }
    }
  )
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

export default flujoAltaBotuser;
