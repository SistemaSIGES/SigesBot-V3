const opMenuInicial = async (state) => {
  const creds = await state.get("creds");
  let options = "";

  if (creds.canSOS) {
    options += "0. Generar un ticket *SOS*\n";
  }

  options += "1. Descargar un instructivo\n";

  options += "2. Generar un ticket de soporte\n";

  if (creds.createUser) {
    options += "3. Dar de alta nuevo teléfono\n";
  }

  options += "O envie *salir* para finalizar la conversacion\n";

  return options.trim();
};

const computerOptions = async (state) => {
  const computers = await state.get("computers");

  if (!computers || computers.length === 0)
    return 'No se encontraron puestos de trabajo registrados en esta zona\nEnvíe "0" para continuar';

  const array = ["Elija el número del puesto de trabajo donde necesita soporte"];

  let i = 1;

  computers.forEach((e) => {
    array.push(`${i} - ${e.alias}`);
    i++;
  });

  // Mensaje final abajo de todo
  array.push('Si no lo sabe o ninguno es correcto, envíe "0"');

  return array.join("\n");
};

const opMenuProblemas = (state) => {
  const area = state.get("area");

  if (area === "A")
    return [
      "1. Apps de Pago y Fidelización",
      "2. Impresora Fiscal / Comandera",
      "3. Despachos CIO",
      "4. Sistema SIGES",
      "5. Impresora Común / Oficina",
      "6. Libro IVA",
      "7. Servidor",
    ];
  else
    return [
      "1. Apps de Pago y Fidelización",
      "2. Impresora Fiscal / Comandera",
      "3. Despachos CIO",
      "4. Sistema SIGES",
      "5. Impresora Común / Oficina",
    ];
};

export { opMenuInicial, computerOptions, opMenuProblemas };
