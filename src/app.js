import "dotenv/config"; // ¡Esta línea debe ir primero!
import { createBot, createProvider, createFlow } from "@builderbot/bot";
import { JsonFileDB as Database } from "@builderbot/database-json";
import { BaileysProvider as Provider } from "@builderbot/provider-baileys";

// Importación de los flujos usando ES6 imports
import flujoPrincipal from "../flows/flujoPrincipal.js";
import flujoInactividad from "../flows/flujoInactividad.js";
import flujoInstructivosArchivos from "../flows/instructivos/flujoInstructivosArchivos.js";
import flujoInstructivosCategorias from "../flows/instructivos/flujoInstructivosCategorias.js";
import flujoAltaBotuser from "../flows/altaBotUser/flujoAltaBotUser.js";
import flujoConfirmacionAlta from "../flows/altaBotUser/flujoConfirmacionAlta.js";
import flujoSoporte from "../flows/soporte/flujoSoporte.js";
import flujoAplicaciones from "../flows/soporte/tiposProblemas/flujoAplicaciones.js";
import flujoDespachosCio from "../flows/soporte/tiposProblemas/flujoDespachosCio.js";
import flujoImpresoraComun from "../flows/soporte/tiposProblemas/flujoImpresoraComun.js";
import flujoImpresoraFiscal from "../flows/soporte/tiposProblemas/flujoImpresoraFiscal.js";
import flujoLibroIva from "../flows/soporte/tiposProblemas/flujoLibroIva.js";
import flujoServidor from "../flows/soporte/tiposProblemas/flujoServidor.js";
import flujoSiges from "../flows/soporte/tiposProblemas/flujoSiges.js";
import flujoSOS from "../flows/SOS/flujoSOS.js";

const PORT = process.env.PORT ?? 3008;

const main = async () => {
  const adapterDB = new Database({ filename: "db.json" });
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
  ]);
  const adapterProvider = createProvider(Provider);

  const { handleCtx, httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  // Endpoints API originales mantenidos (puedes mantener estos si los necesitas)
  adapterProvider.server.post(
    "/v1/messages",
    handleCtx(async (bot, req, res) => {
      const { number, message, urlMedia } = req.body;
      await bot.sendMessage(number, message, { media: urlMedia ?? null });
      return res.end("sended");
    })
  );

  adapterProvider.server.post(
    "/v1/register",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("REGISTER_FLOW", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/samples",
    handleCtx(async (bot, req, res) => {
      const { number, name } = req.body;
      await bot.dispatch("SAMPLES", { from: number, name });
      return res.end("trigger");
    })
  );

  adapterProvider.server.post(
    "/v1/blacklist",
    handleCtx(async (bot, req, res) => {
      const { number, intent } = req.body;
      if (intent === "remove") bot.blacklist.remove(number);
      if (intent === "add") bot.blacklist.add(number);

      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ status: "ok", number, intent }));
    })
  );

  httpServer(+PORT);
};

main();
