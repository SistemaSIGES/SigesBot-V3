// Función placeholder para deleteData (crear una simple)
const deleteData = (from) => {
  console.log(`[deleteData] Limpiando datos para ${from}`);
  // Aquí puedes agregar lógica específica de limpieza si es necesaria
};

const respuesta = async (from, provider, text) => {
  let prov = provider.getInstance();

  await prov.sendMessage(`${from}@s.whatsapp.net`, { text });
};

const respuestaConDelay = async (from, provider, text) => {
  setTimeout(async () => {
    let prov = provider.getInstance();

    await prov.sendMessage(`${from}@s.whatsapp.net`, { text });
  }, 600);
};

const sendMessages = async (from, provider, state) => {
  let zone = "";

  const ticketZone = state.get("zone");

  switch (ticketZone) {
    case "P":
      zone = "Playa/Boxes";
      break;

    case "A":
      zone = "Administracion";
      break;

    case "T":
      zone = "Tienda";
      break;
  }

  const cliente = state.get("selectedUser");

  if (cliente.vip) {
    await respuesta(from, provider, `Tu ejecutivo de cuenta ya fue notificado del problema`);

    await respuesta(
      cliente.vip,
      provider,
      `El cliente ${cliente.info} genero un ticket pidiendo soporte para ${zone} - ${state.get(
        "problem"
      )}. Nivel de urgencia: ${state.get("priority")}`
    );
  }

  const managers = state.get("sendMessage");

  for (let i = 0; i < managers.length; i++) {
    await respuesta(
      managers[i],
      provider,
      `Se genero un ticket pidiendo soporte para ${zone} - ${state.get(
        "problem"
      )}. Nivel de urgencia: ${state.get("priority")}`
    );
  }

  deleteData(from);
};

const sendSOSMessages = async (from, provider, state) => {
  const cliente = state.get("selectedUser");

  if (cliente.vip) {
    await respuesta(from, provider, `Tu ejecutivo de cuenta ya fue notificado del problema`);

    await respuesta(
      cliente.vip,
      provider,
      `El cliente ${cliente.info} genero un ticket *SOS* - Opcion "0" del bot`
    );
  }

  const managers = state.get("sendMessage");

  for (let i = 0; i < managers.length; i++) {
    await respuesta(
      managers[i],
      provider,
      `Se genero un ticket *SOS* - Nivel de urgencia: Muy Alto`
    );
  }

  deleteData(from);
};

export { respuesta, respuestaConDelay, sendMessages, sendSOSMessages };
