// Removida importación no existente
// const { addProps } = require("./apiTickets.js")

const banderaElegida = (from, body, state) => {
  switch (body) {
    case "1":
      state.update({ bandera: "YP" });
      return true;
    case "2":
      state.update({ bandera: "SH" });
      return true;
    case "3":
      state.update({ bandera: "AX" });
      return true;
    case "4":
      state.update({ bandera: "PU" });
      return true;
    case "5":
      state.update({ bandera: "GU" });
      return true;
    case "6":
      state.update({ bandera: "RE" });
      return true;
    case "7":
      state.update({ bandera: "BL" });
      return true;
    case "8":
      state.update({ bandera: "OT" });
      return true;

    default:
      return false;
  }
};

const zonaElegida = (from, body, state) => {
  switch (body) {
    case "1":
      state.update({ zone: "P" });
      return true;
    case "2":
      state.update({ zone: "T" });
      return true;
    case "3":
      state.update({ zone: "A" });
      return true;

    default:
      return false;
  }
};

export { banderaElegida, zonaElegida };
