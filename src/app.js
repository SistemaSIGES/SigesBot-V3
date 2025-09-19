import "dotenv/config"; 
import { createBot, createProvider, createFlow } from "@builderbot/bot";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";
import { MemoryDB } from "@builderbot/bot";

// Importación de los flujos usando ES6 imports
import flujoPrincipal from "../flows/flujoPrincipal.js";
import flujoInactividad from "../flows/flujoInactividad.js";
import flujoInstructivosArchivos from "../flows/instructivos/flujoInstructivosArchivos.js";
import flujoInstructivosCategorias from "../flows/instructivos/flujoInstructivosCategorias.js";
import flujoAltaBotuser from "../flows/altaBotUser/flujoAltaBotUser.js";
import flujoAltaBotUserUnaEstacion from "../flows/altaBotUser/flujoAltaBotUserUnaEstacion.js";
import flujoConfirmacionAlta from "../flows/altaBotUser/flujoConfirmacionAlta.js";
import flujoSoporte from "../flows/soporte/flujoSoporte.js";
import flujoSoporteUnaEstacion from "../flows/soporte/flujoSoporteUnaEstacion.js";
import flujoAplicaciones from "../flows/soporte/tiposProblemas/flujoAplicaciones.js";
import flujoDespachosCio from "../flows/soporte/tiposProblemas/flujoDespachosCio.js";
import flujoImpresoraComun from "../flows/soporte/tiposProblemas/flujoImpresoraComun.js";
import flujoImpresoraFiscal from "../flows/soporte/tiposProblemas/flujoImpresoraFiscal.js";
import flujoLibroIva from "../flows/soporte/tiposProblemas/flujoLibroIva.js";
import flujoServidor from "../flows/soporte/tiposProblemas/flujoServidor.js";
import flujoSiges from "../flows/soporte/tiposProblemas/flujoSiges.js";
import flujoSOS from "../flows/SOS/flujoSOS.js";
import flujoSOSUnaEstacion from "../flows/SOS/flujoSOSUnaEstacion.js";

const PORT = process.env.PORT ?? 3008;

const main = async () => {
  const adapterDB = new MemoryDB();
  const adapterFlow = createFlow([
    flujoPrincipal,
    flujoInactividad,
    flujoInstructivosArchivos,
    flujoInstructivosCategorias,
    flujoAltaBotuser,
    flujoSoporte,
    flujoConfirmacionAlta,
    flujoSOS,
    flujoAplicaciones,
    flujoDespachosCio,
    flujoImpresoraComun,
    flujoImpresoraFiscal,
    flujoLibroIva,
    flujoServidor,
    flujoSiges,
    flujoSOSUnaEstacion,
    flujoSoporteUnaEstacion,
    flujoAltaBotUserUnaEstacion,
  ]);
  const adapterProvider = createProvider(Provider);

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  httpServer(PORT);
  process.on('SIGINT', () => {
  console.log('\nBot detenido manualmente');
  process.exit(0);
});
};

main();
