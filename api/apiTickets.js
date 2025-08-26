import axios from "axios";
import FormData from "form-data";

const isValidPeriodFormat = (periodString) => {
  const parts = periodString.split(" - ");
  if (parts.length !== 2) {
    return false;
  }
  const [startDate, endDate] = parts;
  return isValidDate(startDate) && isValidDate(endDate);
};

const isValidDate = (dateString) => {
  // Expresión regular para el formato DD/MM/AA
  const regex = /^\d{2}\/\d{2}\/\d{2}$/;
  if (!regex.test(dateString)) return false;

  const [day, month, year] = dateString.split("/").map(Number);
  const date = new Date(2000 + year, month - 1, day); // Asumimos años del 2000 en adelante

  // Comprobamos si la fecha es válida y si los componentes coinciden
  return (
    date.getFullYear() === 2000 + year && date.getMonth() === month - 1 && date.getDate() === day
  );
};

// computerInfo: Adaptada para usar state.get y state.update
const computerInfo = async (state, option) => {
  const computers = await state.get("computers");
  if (computers && Array.isArray(computers) && computers[option - 1] && option !== "0") {
    const selected = computers[option - 1];
    const banderaShort =
      selected.bandera.length > 3 ? selected.bandera.substring(0, 3) : selected.bandera;
    await state.update({
      pf: selected.alias,
      tv: selected.teamviewer_id,
      tvalias: `${selected.razonSocial}|${banderaShort}|${selected.identificador}|${selected.ciudad}|${selected.area}|${selected.prefijo}|${selected.extras}`,
    });
  }
};

// addAudio: Adaptada para usar state.get y state.update con provider.saveFile
const addAudio = async (state, from, ctx, provider) => {
  try {
    console.log(`[addAudio] Iniciando descarga de audio para ${from}`);

    // Usar provider.saveFile para guardar el archivo de audio
    const localPath = await provider.saveFile(ctx, { path: "./temp" });

    if (!localPath) {
      console.warn(`[addAudio] No se pudo guardar el archivo de audio para ${from}.`);
      return;
    }

    // Leer el archivo guardado como buffer
    const fs = await import("fs");
    const buffer = fs.readFileSync(localPath);

    // Captura el mimetype del mensaje de audio, si no, usa un valor por defecto
    const mimeType = ctx.message.audioMessage?.mimetype || "audio/ogg";
    // Genera un nombre de archivo genérico con timestamp y extensión basada en el mimetype
    const fileExtension = mimeType.split("/")[1] || "ogg";
    const filename = `audio_${Date.now()}.${fileExtension}`;

    const attachment = {
      content: buffer,
      filename: filename,
      contentType: mimeType,
    };

    let mailAttachments = (await state.get("mailAttachments")) || [];
    mailAttachments.push(attachment);
    await state.update({ mailAttachments: mailAttachments });

    console.log(
      `[addAudio] Audio adjuntado: ${filename}, Tipo: ${mimeType}, Tamaño: ${buffer.length} bytes.`
    );
    console.log(
      `[addAudio] mailAttachments en estado después de añadir audio:`,
      await state.get("mailAttachments")
    );

    // Limpiar el archivo temporal
    try {
      fs.unlinkSync(localPath);
    } catch (cleanupError) {
      console.warn(`[addAudio] No se pudo eliminar el archivo temporal: ${localPath}`);
    }
  } catch (error) {
    console.error(`[addAudio] Error al procesar audio para ${from}:`, error);
  }
};

// Función para añadir adjuntos de imagen al estado con provider.saveFile
const addImage = async (state, from, ctx, provider) => {
  try {
    console.log(`[addImage] Iniciando descarga de imagen para ${from}`);

    // Usar provider.saveFile para guardar el archivo de imagen
    const localPath = await provider.saveFile(ctx, { path: "./temp" });

    if (!localPath) {
      console.warn(`[addImage] No se pudo guardar el archivo de imagen para ${from}.`);
      return;
    }

    // Leer el archivo guardado como buffer
    const fs = await import("fs");
    const buffer = fs.readFileSync(localPath);

    const mimeType = ctx.message.imageMessage?.mimetype || "image/jpeg";
    const filename = `image_${Date.now()}.jpeg`;

    const attachment = {
      content: buffer,
      filename: filename,
      contentType: mimeType,
    };

    let mailAttachments = (await state.get("mailAttachments")) || [];
    mailAttachments.push(attachment);
    await state.update({ mailAttachments: mailAttachments });

    console.log(`[addImage] Imagen adjuntada: ${filename}, Tamaño: ${buffer.length} bytes.`);
    console.log(
      `[addImage] mailAttachments en estado después de añadir imagen:`,
      await state.get("mailAttachments")
    );

    // Limpiar el archivo temporal
    try {
      fs.unlinkSync(localPath);
    } catch (cleanupError) {
      console.warn(`[addImage] No se pudo eliminar el archivo temporal: ${localPath}`);
    }
  } catch (error) {
    console.error(`[addImage] Error al procesar imagen para ${from}:`, error);
  }
};
const clearMailAttachments = async (state) => {
  await state.update({ mailAttachments: [] });
  console.log("[clearMailAttachments] Adjuntos de correo limpiados del estado.");
};

const sendProblemTicket = async (state, from) => {
  const selectedUser = await state.get("selectedUser");
  const ticketData = (await state.get(from)) || {};
  console.log("Estado completo antes de construir el ticket:", await state.get(from)); // Log para depuración

  if (!selectedUser || !selectedUser.id || !selectedUser.info || !selectedUser.email) {
    console.error("sendProblemTicket: Información del usuario seleccionada incompleta.");
    throw new Error("Información del cliente para el ticket incompleta.");
  }

  // Obtener todos los datos necesarios directamente del estado
  const area = await state.get("area"); // 'P', 'S', 'A'
  const problem = await state.get("generalProblem"); // "Apps de Pagos y Fidelizaciones", "Impresora Fiscal / Comandera", etc.
  const pf = await state.get("pf"); // Punto de facturación / PC (ej. "PC de Mónic - Equipo Principal")
  const tv = await state.get("tv"); // ID de TeamViewer
  const typeProblem = await state.get("typeProblem"); // Origen del problema / Solicitud (ej. "App Propia (YVOS-PRIS-ON-BOX-ETC)")
  const description = (await state.get(from))?.description || "Sin descripción proporcionada"; // Descripción del ticket
  const priority = (await state.get("priority")) || "1"; // Prioridad del ticket
  const period = await state.get("period");

  // Construir el subject del ticket de forma dinámica
  let subjectParts = [];
  let descParts = [];

  // 1. Área
  if (area) {
    let areaName = "";
    switch (area) {
      case "P":
        areaName = "Playa/Boxes";
        break;
      case "S":
        areaName = "Tienda";
        break;
      case "A":
        areaName = "Administración";
        break;
      default:
        areaName = area; // En caso de que 'area' tenga otro valor directo
    }
    subjectParts.push(areaName);
  }

  // 2. Info Cliente (Nombre de la estación)
  if (selectedUser.info) {
    subjectParts.push(selectedUser.info);
  }

  // 5. Problema General (generalProblem)
  if (problem) {
    descParts.push(`El problema que se reporta es con respecto a: ${problem}`);
  }

  // 6. Tipo de Problema Específico (typeProblem)
  if (typeProblem) {
    descParts.push(`En particular referido a: ${typeProblem}`);
  }

  if (period) {
    descParts.push(`El periodo del problema del libro de Iva es: ${period}`);
  }

  if (pf && pf !== "PC no esta en nuestra base de datos") {
    descParts.push(`La PC que presenta el problema es: ${pf}`);
  }

  // 4. ID TeamViewer (tv) - Opcional, si quieres incluirlo en el subject
  if (tv && tv !== "tv") {
    // 'tv' es un placeholder si no se encuentra
    descParts.push(`TeamViewer: ${tv}`);
  }

  if (description) {
    descParts.push(`La descripción dada por el cliente es: ${description}`);
  }

  // Unir las partes del subject, usando un fallback si no hay suficientes datos
  const subject =
    subjectParts.length > 0
      ? subjectParts.join(" - ")
      : `${selectedUser.info || "Cliente Desconocido"} - Problema sin especificar`;
  const descriptionFinal = descParts.join("<br>");
  const form = new FormData();

  form.append("subject", subject);
  form.append("description", descriptionFinal);
  form.append("email", selectedUser.email);
  form.append("priority", priority);
  form.append("status", "2"); // Abierto
  form.append("type", "Incidente"); // Tipo de ticket en Freshdesk
  form.append("custom_fields[cf_recibido_por]", "Bot");

  // Procesar campos personalizados si los hubiera (mantener como está)
  if (ticketData.custom_fields) {
    try {
      const parsedCustomFields =
        typeof ticketData.custom_fields === "string"
          ? JSON.parse(ticketData.custom_fields)
          : ticketData.custom_fields;
      for (const key in parsedCustomFields) {
        if (Object.prototype.hasOwnProperty.call(parsedCustomFields, key)) {
          form.append(`custom_fields[${key}]`, parsedCustomFields[key]);
        }
      }
    } catch (err) {
      console.error("Error al parsear custom_fields para Freshdesk:", err);
    }
  }

  // Adjuntar archivos (audio, imágenes, etc.) (mantener como está)
  const mailAttachments = await state.get("mailAttachments");
  if (mailAttachments && mailAttachments.length > 0) {
    mailAttachments.forEach((attachment, index) => {
      if (attachment.content instanceof Buffer && attachment.filename && attachment.contentType) {
        form.append("uploads", attachment.content, {
          // Asegúrate de que sea 'uploads' sin corchetes
          filename: attachment.filename,
          contentType: attachment.contentType,
          knownLength: attachment.content.length,
        });
      } else {
        console.warn(`[sendProblemTicket] Archivo ${index + 1} inválido, se omite.`);
      }
    });
  }

  // Enviar a backend (mantener como está)
  const staticApiKey = process.env.BACKEND_STATIC_API_KEY;
  if (!staticApiKey) {
    throw new Error("No se encontró BACKEND_STATIC_API_KEY en las variables de entorno.");
  }

  try {
    const response = await axios({
      method: "post",
      url: `${process.env.SERVER_URL}/freshdesk/tickets`,
      headers: {
        ...form.getHeaders(),
        "X-API-Key": staticApiKey,
      },
      data: form,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log("[sendProblemTicket] Ticket creado con éxito:", response.data);
    await clearMailAttachments(state);
    await state.update({ period: undefined });
    return response.data.ticket.id;
  } catch (error) {
    console.error(
      "[sendProblemTicket] Error al crear ticket:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

const sendSosTicket = async (state, from) => {
  const selectedUser = await state.get("selectedUser");
  const ticketData = (await state.get(from)) || {};

  if (!selectedUser || !selectedUser.id || !selectedUser.info || !selectedUser.email) {
    console.error("sendSosTicket: Información del usuario seleccionada incompleta.");
    throw new Error("Información del cliente para SOS ticket incompleta.");
  }

  const form = new FormData();

  form.append("subject", `*TICKET SOS* | ${selectedUser.info}`);
  form.append(
    "description",
    ticketData.description ||
      `El cliente ${selectedUser.info} ha generado un ticket SOS. Teléfono: ${
        ticketData.phone || from
      }`
  );
  form.append("email", selectedUser.email);

  form.append("priority", "4");
  form.append("status", "2");
  form.append("type", "Incidente");
  form.append("custom_fields[cf_recibido_por]", "Bot");

  if (ticketData.custom_fields) {
    try {
      const parsedCustomFields =
        typeof ticketData.custom_fields === "string"
          ? JSON.parse(ticketData.custom_fields)
          : ticketData.custom_fields;
      for (const key in parsedCustomFields) {
        if (Object.prototype.hasOwnProperty.call(parsedCustomFields, key)) {
          form.append(`custom_fields[${key}]`, parsedCustomFields[key]);
        }
      }
    } catch (err) {
      console.error("Error al parsear custom_fields para Freshdesk:", err);
    }
  }

  const mailAttachments = await state.get("mailAttachments");
  console.log(
    `[sendSosTicket] mailAttachments en estado ANTES de adjuntar a FormData:`,
    mailAttachments
  );

  if (mailAttachments && mailAttachments.length > 0) {
    console.log(`[sendSosTicket] Adjuntando ${mailAttachments.length} archivos al FormData.`);
    mailAttachments.forEach((attachment, index) => {
      console.log(
        `  Adjunto ${index + 1}: filename=${attachment.filename}, contentType=${
          attachment.contentType
        }, content.length=${attachment.content ? attachment.content.length : "N/A"}`
      );
      if (attachment.content instanceof Buffer && attachment.filename && attachment.contentType) {
        // *** ¡¡¡ASEGÚRATE DE QUE ESTA LÍNEA NO TENGA LOS CORCHETES [] EN 'uploads'!!! ***
        form.append("uploads", attachment.content, {
          // <--- ¡¡¡CAMBIO CLAVE AQUÍ!!!
          filename: attachment.filename,
          contentType: attachment.contentType,
          knownLength: attachment.content.length,
        });
      } else {
        console.warn(`Adjunto ${index + 1} inválido (no es Buffer o faltan metadatos), omitiendo.`);
      }
    });
  } else {
    console.log("[sendSosTicket] No hay adjuntos en el estado para enviar.");
  }

  const staticApiKey = process.env.BACKEND_STATIC_API_KEY;
  if (!staticApiKey) {
    console.error(
      "sendSosTicket: BACKEND_STATIC_API_KEY no está definido en las variables de entorno del bot."
    );
    throw new Error("API Key estática del backend no configurada en el bot.");
  }

  const config = {
    method: "post",
    url: `${process.env.SERVER_URL}/freshdesk/tickets`,
    headers: {
      ...form.getHeaders(),
      "X-API-Key": staticApiKey,
    },
    data: form,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  };

  try {
    const response = await axios(config);
    console.log("Ticket SOS creado en Freshdesk a través del backend:", response.data);
    await clearMailAttachments(state);
    return response.data.ticket.id;
  } catch (error) {
    console.error(
      "Error al generar ticket SOS en Freshdesk a través del backend:",
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

// getUsers: Adaptada para usar state.get y state.update, y replicar el comportamiento original
const getUsers = async (state) => {
  const users = (await state.get("users")) || [];

  // Siempre guarda las opciones de usuarios en el estado para que el siguiente addAnswer pueda accederlas
  await state.update({ altaBotuserClientsOptions: users });

  // Siempre devuelve la lista formateada, incluso si es solo un usuario
  if (users.length > 0) {
    return users.map((user, index) => `${index + 1}. ${user.info}`).join("\n");
  } else {
    // Si no hay usuarios, puedes devolver un mensaje o manejarlo como un caso de error
    return "No se encontraron clientes asociados."; // O false, si prefieres manejarlo como error en el flujo
  }
};
const buildTicketSummaryMessage = async (state, from) => {
  const selectedUser = await state.get("selectedUser");
  const ticketData = (await state.get(from)) || {}; // Datos específicos del ticket (descripción, prioridad)

  const area = await state.get("area");
  const areaName = await state.get("areaName"); // Asumo que el nombre completo del área se guarda en el estado
  const generalProblem = await state.get("generalProblem");
  const typeProblem = await state.get("typeProblem");
  const pf = await state.get("pf");
  const tv = await state.get("tv");
  const mailAttachments = await state.get("mailAttachments");
  const periodo = await state.get("period");
  const priority = (await state.get("priority")) || "1"; // Prioridad del ticket

  // Mapeo de códigos de área a nombres
  let displayArea = areaName;
  if (!displayArea && area) {
    switch (area) {
      case "P":
        displayArea = "Playa/Boxes";
        break;
      case "S":
        displayArea = "Tienda";
        break;
      case "A":
        displayArea = "Administración";
        break;
      case "G":
        displayArea = "Gerente / Dueño";
        break; // Si 'G' es una opción
      default:
        displayArea = area;
    }
  }

  // Mapeo de prioridad
  let displayPriority = "No especificada";
  switch (priority) {
    case "1":
      displayPriority = "Baja";
      break;
    case "2":
      displayPriority = "Media";
      break;
    case "3":
      displayPriority = "Alta";
      break;
    case "4":
      displayPriority = "Urgencia";
      break;
  }

  let summary = "📋 *Resumen del Ticket:*\n\n";
  summary += `*Estación/Cliente:* ${selectedUser?.info || "N/A"}\n`;
  summary += `*Área:* ${displayArea || "N/A"}\n`;
  summary += `*Puesto/PC:* ${pf || "N/A"}\n`;
  if (tv && tv !== "Especificado en el cuerpo del Ticket") {
    summary += `*ID TeamViewer:* ${tv}\n`;
  } else if (tv === "Especificado en el cuerpo del Ticket") {
    summary += `*ID TeamViewer:* Se especificará en la descripción\n`;
  }
  summary += `*Problema General:* ${generalProblem || "N/A"}\n`;
  summary += `*Tipo de Problema:* ${typeProblem || "N/A"}\n`;
  summary += `*Descripción:* ${ticketData.description || "Sin descripción"}\n`;
  summary += `*Prioridad:* ${displayPriority}\n`;
  if (periodo) {
    summary += `*Periodo:* ${periodo}\n`;
  }
  summary += `*Adjuntos:* ${
    mailAttachments && mailAttachments.length > 0
      ? mailAttachments.length + " archivo(s)"
      : "Ninguno"
  }\n\n`;
  summary += "Estos son los datos del ticket que se enviarían.";
  await clearMailAttachments(state);
  await state.update({ period: undefined });
  return summary;
};

export {
  computerInfo,
  addAudio,
  addImage,
  sendSosTicket,
  getUsers,
  sendProblemTicket,
  isValidDate,
  isValidPeriodFormat,
  clearMailAttachments,
  buildTicketSummaryMessage,
};
