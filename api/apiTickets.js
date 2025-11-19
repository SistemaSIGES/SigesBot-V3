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

    const fs = await import("fs");
    const path = await import("path");
    const ffmpeg = (await import("fluent-ffmpeg")).default;
    const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");

    // Configurar ffmpeg con el binario instalado
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);

    // Crear la carpeta temp si no existe
    const tempDir = "./temp";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`[addAudio] Carpeta ${tempDir} creada`);
    }

    // Guardar el archivo con provider
    const localPath = await provider.saveFile(ctx, { path: tempDir });

    if (!localPath) {
      console.warn(`[addAudio] No se pudo guardar el archivo de audio para ${from}.`);
      return;
    }

    // Definir ruta de salida en mp3
    const mp3Path = path.resolve(tempDir, `audio_${Date.now()}.mp3`);

    // Convertir con ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(localPath)
        .toFormat("mp3")
        .on("end", resolve)
        .on("error", reject)
        .save(mp3Path);
    });

    // Leer archivo convertido
    const buffer = fs.readFileSync(mp3Path);
    const filename = path.basename(mp3Path);

    const attachment = {
      content: buffer,
      filename: filename,
      contentType: "audio/mpeg",
    };

    let mailAttachments = (await state.get("mailAttachments")) || [];
    mailAttachments.push(attachment);
    await state.update({ mailAttachments: mailAttachments });

    console.log(
      `[addAudio] Audio convertido a MP3: ${filename}, Tamaño: ${buffer.length} bytes.`
    );

    // Limpiar temporales
    try {
      fs.unlinkSync(localPath);
      fs.unlinkSync(mp3Path);
    } catch (cleanupError) {
      console.warn(`[addAudio] No se pudo eliminar archivos temporales:`, cleanupError);
    }
  } catch (error) {
    console.error(`[addAudio] Error al procesar audio para ${from}:`, error);
  }
};

// Función para añadir adjuntos de imagen al estado con provider.saveFile
const addImage = async (state, from, ctx, provider) => {
  try {
    console.log(`[addImage] Iniciando descarga de imagen para ${from}`);

    // Importar módulos necesarios
    const fs = await import("fs");
    const path = await import("path");

    // Crear la carpeta temp si no existe
    const tempDir = "./temp";
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`[addImage] Carpeta ${tempDir} creada`);
    }

    // Usar provider.saveFile para guardar el archivo de imagen
    const localPath = await provider.saveFile(ctx, { path: "./temp" });

    if (!localPath) {
      console.warn(`[addImage] No se pudo guardar el archivo de imagen para ${from}.`);
      return;
    }

    // Leer el archivo guardado como buffer
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
    const selectedUser = await state.get('selectedUser');
    const ticketData = await state.get(from) || {}; 
    console.log("Estado completo antes de construir el ticket:", await state.get(from)); // Log para depuración

    if (!selectedUser || !selectedUser.id || !selectedUser.info || !selectedUser.email) {
        console.error("sendProblemTicket: Información del usuario seleccionada incompleta.");
        throw new Error("Información del cliente para el ticket incompleta.");
    }

    // Obtener todos los datos necesarios directamente del estado
    const area = await state.get('area'); // 'P', 'S', 'A'
    const problem = await state.get('generalProblem'); // "Apps de Pagos y Fidelizaciones", "Impresora Fiscal / Comandera", etc.
    const pf = await state.get('pf'); // Punto de facturación / PC (ej. "PC de Mónic - Equipo Principal")
    const tv = await state.get('tv'); // ID de TeamViewer
    const tvalias = await state.get('tvalias');
    const typeProblem = await state.get('typeProblem'); // Origen del problema / Solicitud (ej. "App Propia (YVOS-PRIS-ON-BOX-ETC)")
    const description = (await state.get(from))?.description || 'Sin descripción proporcionada'; // Descripción del ticket
    const priority = await state.get('priority') || '1'; // Prioridad del ticket
    const period = await state.get('period'); 

    // Construir el subject del ticket de forma dinámica
    let subjectParts = [];
    let descParts = [];

    // 1. Área
    if (area) {
        let areaName = '';
        switch (area) {
            case 'P': areaName = 'Playa/Boxes'; break;
            case 'S': areaName = 'Tienda'; break;
            case 'A': areaName = 'Administración'; break;
            default: areaName = area; // En caso de que 'area' tenga otro valor directo
        }
        subjectParts.push(areaName);
    }
    descParts.push(`Datos del Ticket`);

    
    if (selectedUser.info) {
        subjectParts.push(selectedUser.info);
    }
    

    
    if (problem) {
        descParts.push(`Soporte para: ${problem}`);
    }

    if (period) {
        descParts.push(`El periodo del problema del libro de Iva es: ${period}`);
    }
    if (selectedUser.id) {
        descParts.push(`ID Cliente: ${selectedUser.id}`);
    }
    if (selectedUser.info) {
        descParts.push(`Info del cliente: ${selectedUser.info}`);
    }
    if (from) {
        descParts.push(`Telefono que generó el ticket: ${from}`);
    }

    if (pf && pf !== "PC no esta en nuestra base de datos") {
        descParts.push(`Punto de facturación / PC: ${pf}`);
    }

    
    if (tv && tv !== "tv") {
        descParts.push(`ID TeamViewer: ${tv}`);
    }

    if (tvalias && tvalias !== "tvalias") {
        descParts.push(`Alias de TeamViewer: ${tvalias}`);
    }

    let priorityText = '';
    switch (priority) {
        case '1':
            priorityText = 'Baja';
            break;
        case '2':
            priorityText = 'Media';
            break;
        case '3':
            priorityText = 'Alta';
            break;
        case '4':
            priorityText = 'Urgente';
            break;
        default:
            priorityText = 'No especificada';
            break;
    }

    if (priorityText && priorityText !== "") {
        descParts.push(`Urgencia indicada por el cliente: ${priorityText}`);
    }

    if (description) {
        descParts.push(`La descripción del problema: ${description}`);
    }
   
    if (typeProblem) {
        descParts.push(`Origen del problema: ${typeProblem}`);
    }


    // Unir las partes del subject, usando un fallback si no hay suficientes datos
    const subject = subjectParts.length > 0 ? subjectParts.join(' - ') : `${selectedUser.info || 'Cliente Desconocido'} - Problema sin especificar`;
    const descriptionFinal = descParts.join('<br>');
    const form = new FormData();

    form.append('subject', subject);
    form.append('description', descriptionFinal);
    form.append('email', selectedUser.email);
    form.append('priority', '1');
    form.append('status', '2'); // Abierto
    form.append('type', 'Incidente'); // Tipo de ticket en Freshdesk
    form.append('custom_fields[cf_recibido_por]', 'Bot');

  if (selectedUser.cc_emails) {
  let emailsToProcess = selectedUser.cc_emails;

  if (typeof emailsToProcess === "string") {
    emailsToProcess = [emailsToProcess.replace(/[{}]/g, '')];
  } else if (Array.isArray(emailsToProcess)) {
    emailsToProcess = emailsToProcess.map(item =>
      (typeof item === 'string' ? item.replace(/[{}]/g, '') : item)
    );
  } else {
    emailsToProcess = [];
  }

  let ccList = [];
  emailsToProcess.forEach(item => {
    if (typeof item === 'string' && item.includes(',')) {
      ccList.push(...item.split(',').map(x => x.trim()));
    } else if (typeof item === 'string' && item.length > 0) {
      ccList.push(item.trim());
    }
  });

  const validCcList = ccList.filter(email =>
    typeof email === 'string' && email.includes('@') && email.trim().length > 0
  );

  console.log("DEBUG: ccList generada (con limpieza):", validCcList);

  if (validCcList.length > 0) {
    validCcList.forEach(email => {
      form.append("cc_emails", email);
      console.log("✅ Ejecutivos CC añadidos:", email);
    });
  } else {
    console.log("ℹ️ No hay correos válidos para cc_emails");
  }
} else {
  console.log("ℹ️ Este cliente no tiene campo cc_emails definido");
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
    triggerAutomaticReply(response.data.ticket.id);
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
  if (selectedUser.cc_emails) {
  let emailsToProcess = selectedUser.cc_emails;

  if (typeof emailsToProcess === "string") {
    emailsToProcess = [emailsToProcess.replace(/[{}]/g, '')];
  } else if (Array.isArray(emailsToProcess)) {
    emailsToProcess = emailsToProcess.map(item =>
      (typeof item === 'string' ? item.replace(/[{}]/g, '') : item)
    );
  } else {
    emailsToProcess = [];
  }

  let ccList = [];
  emailsToProcess.forEach(item => {
    if (typeof item === 'string' && item.includes(',')) {
      ccList.push(...item.split(',').map(x => x.trim()));
    } else if (typeof item === 'string' && item.length > 0) {
      ccList.push(item.trim());
    }
  });

  const validCcList = ccList.filter(email =>
    typeof email === 'string' && email.includes('@') && email.trim().length > 0
  );

  console.log("DEBUG: ccList generada (con limpieza):", validCcList);

  if (validCcList.length > 0) {
    validCcList.forEach(email => {
      form.append("cc_emails", email);
      console.log("✅ Ejecutivos CC añadidos:", email);
    });
  } else {
    console.log("ℹ️ No hay correos válidos para cc_emails");
  }
} else {
  console.log("ℹ️ Este cliente no tiene campo cc_emails definido");
}
  
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
    triggerAutomaticReply(response.data.ticket.id);
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

  let ccEmails = [];
    if (selectedUser?.cc_emails) {
      let emailsToProcess = selectedUser.cc_emails;
      
      // 1. Limpiar llaves {} y garantizar que sea un array para iterar
      if (typeof emailsToProcess === "string") {
          emailsToProcess = [emailsToProcess.replace(/[{}]/g, '')]; 
      } else if (Array.isArray(emailsToProcess)) {
          emailsToProcess = emailsToProcess.map(item => 
              (typeof item === 'string' ? item.replace(/[{}]/g, '') : item)
          );
      } else {
          emailsToProcess = [];
      }
      
      let ccList = [];
      // 2. Iterar y desglosar si un elemento del array contiene comas
      emailsToProcess.forEach(item => {
          if (typeof item === 'string' && item.includes(',')) {
              ccList.push(...item.split(',').map(x => x.trim()));
          } else if (typeof item === 'string' && item.length > 0) {
              ccList.push(item.trim());
          }
      });

      // 3. Filtrar correos válidos
      ccEmails = ccList.filter(email => typeof email === 'string' && email.includes('@') && email.trim().length > 0);
    }

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
  summary += `*CC a Notificar:* ${
        ccEmails.length > 0 ? ccEmails.join(", ") : "Ninguno"
    }\n`;
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

const triggerAutomaticReply = (ticketId) => {
    if (!process.env.SERVER_URL || !process.env.BACKEND_STATIC_API_KEY) {
        console.error("triggerAutomaticReply: SERVER_URL o BACKEND_STATIC_API_KEY no están configurados.");
        return;
    }

    const replyEndpointUrl = `${process.env.SERVER_URL}/freshdesk/tickets/${ticketId}/reply`;

    const replyConfig = {
        method: "post",
        url: replyEndpointUrl,
        headers: {
            "Content-Type": "application/json",
            // Usamos la API Key estática para autenticar la llamada interna entre bot y backend
            "X-API-Key": process.env.BACKEND_STATIC_API_KEY, 
        },
        data: {}, // No necesitamos enviar datos si el mensaje es por defecto
    };

    // Disparamos la llamada sin esperar el resultado
    axios(replyConfig)
        .then(replyResponse => {
            console.log(`✅ Respuesta automática disparada para Ticket ID: ${ticketId}`);
        })
        .catch(replyError => {
            // Registramos la advertencia pero el ticket principal ya fue creado exitosamente
            const errorMsg = replyError.response 
                ? JSON.stringify(replyError.response.data) 
                : replyError.message;
            console.warn(
                `⚠️ Advertencia: Fallo al enviar la respuesta automática interna para Ticket ID: ${ticketId}. Error: ${errorMsg}`
            );
        });
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
