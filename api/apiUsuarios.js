import axios from "axios";

const validateUser = async (state, from) => {
  const currentState = await state.getMyState(from);
  if (!currentState) {
    await state.update(from, {}); 
  }
  const config = {
    method: "get",
    url: `${process.env.SERVER_URL}/botusers?phone=${from}`,
  };

  const botuser = await axios(config);

  const resultado = botuser.data.length > 0;

  if (resultado) {
    const user = botuser.data[0];
    console.log(user);
    await state.update({
      creds: {
        createUser: user.createUser,
        canSOS: user.canSOS,
        adminPdf: user.adminPdf,
        id: user.id,
      },
    });
    await state.update({ users: user.clients });
    await state.update({ phone: from });
  } else {
    console.log(`⚠️ No se encontró el usuario ${from} en el backend`);
  }
  return resultado;
};

const validateUserID = async (state, fullId) => {
  await state.update({ id: fullId });

  const config = {
    method: "get",
    url: `${process.env.SERVER_URL}/clients?id=${fullId}`,
  };

  const user = await axios(config);

  if (user.data.length !== 0) {
    await state.update({ info: user.data[0].info });
    await state.update({ vip: user.data[0].vip });
    await state.update({ vipmail: user.data[0].vipmail });
    await state.update({ testing: user.data[0].testing });
    return user.data[0];
  } else {
    return false;
  }
};

const computers = async (state) => {
  const userId = await state.get("selectedUser").id;
  const zone = await state.get("area");

  const config = {
    method: "get",
    url: `${process.env.SERVER_URL}/pcs?clientId=${userId}&area=${zone}`,
  };

  const computers = await axios(config).then((i) => i.data);

  computers.sort((a, b) => {
    if (a.alias < b.alias) return -1;
    if (a.alias > b.alias) return 1;
    return 0;
  });

  const computersArray = [];

  computers.map((e) => {
    computersArray.push(e);
  });

  await state.update({ computers: computersArray });
};

const altaBotuser = async (state) => {
  const newBotuser = await state.get("newBotuser");

  const config = {
    method: "post",
    url: `${process.env.SERVER_URL}/botusers`,
    data: newBotuser,
  };

  await axios(config).then((i) => i.data);
};


const buildNewUserInfoSummary = async (state) => {
  const newUser = (await state.get("newBotuser")) || {};

  const areaMapping = {
    P: "Playa/Boxes",
    T: "Tienda",
    A: "Administracion",
    G: "Gerente / Dueño",
  };

  const formattedData = {
    Nombre: newUser.name,
    Telefono: newUser.phone,
    "Alta de Usuarios": newUser.createUser ? "SI" : "NO",
    "Ver Instructivos Admin/Contable": newUser.adminPdf ? "SI" : "NO",
    "Generar Ticket SOS": newUser.canSOS ? "SI" : "NO",
    Encargado: newUser.manager ? "SI" : "NO",
    // Solo incluye Area y Correo si es un manager
    ...(newUser.manager && {
      Area: newUser.area ? areaMapping[newUser.area] : "No especificado",
      Correo: newUser.email || "No especificado",
    }),
    
    "Cliente Asociado (ID)": newUser.clientId || "N/A",
  };

  let result = "Datos Nuevo Usuario\n";
  for (const [key, value] of Object.entries(formattedData)) {
    if (value !== undefined) {
      result += `${key}: ${value}\n`;
    }
  }

  return result;
};

export { altaBotuser, validateUser, validateUserID, computers, buildNewUserInfoSummary };
