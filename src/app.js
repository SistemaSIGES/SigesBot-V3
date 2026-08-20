import "dotenv/config"; // ¡Esta línea debe ir primero!
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

import fs from "fs";
import path from "path";
import { fetchLatestBaileysVersion } from "baileys";

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

  let waVersion;
  try {
    const { version } = await fetchLatestBaileysVersion();
    waVersion = version;
    console.log(`✅ Versión de WhatsApp Web obtenida dinámicamente: ${waVersion.join(".")}`);
  } catch (e) {
    console.log("⚠️ No se pudo obtener versión dinámica de WhatsApp, usando fallback.");
  }

  const adapterProvider = createProvider(Provider, waVersion ? { version: waVersion } : {});

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  // Rutas web para ver el QR e iniciar sesión cómodamente desde el navegador
  adapterProvider.server.get("/", (req, res) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    const qrPath = path.join(process.cwd(), "bot.qr.png");
    if (fs.existsSync(qrPath)) {
      const imgBase64 = fs.readFileSync(qrPath).toString("base64");
      res.end(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SIGES BOT - WhatsApp Login</title>
          <meta http-equiv="refresh" content="5">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #f8fafc; padding: 1rem; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 420px; width: 100%; border: 1px solid #334155; }
            h1 { font-size: 1.5rem; margin-bottom: 0.75rem; color: #38bdf8; }
            p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.5rem; }
            .qr-wrapper { background: white; padding: 1rem; border-radius: 12px; display: inline-block; margin-bottom: 1.5rem; }
            img { display: block; width: 240px; height: 240px; }
            .badge { display: inline-block; background: #0369a1; color: #e0f2fe; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; }
            .footer { margin-top: 1rem; font-size: 0.8rem; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">SIGES BOT</span>
            <h1 style="margin-top: 0.75rem;">Escaneá el código QR</h1>
            <p>Abrí WhatsApp en tu celular &gt; <b>Dispositivos vinculados</b> &gt; <b>Vincular un dispositivo</b>.</p>
            <div class="qr-wrapper">
              <img src="data:image/png;base64,${imgBase64}" alt="QR WhatsApp" />
            </div>
            <p class="footer">⏳ Esta página se actualiza automáticamente cada 5 segundos.</p>
          </div>
        </body>
        </html>
      `);
    } else {
      res.end(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SIGES BOT - Estado</title>
          <meta http-equiv="refresh" content="5">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #f8fafc; padding: 1rem; }
            .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); max-width: 420px; width: 100%; border: 1px solid #334155; }
            h1 { font-size: 1.5rem; margin-bottom: 0.75rem; color: #4ade80; }
            p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            .footer { margin-top: 1.5rem; font-size: 0.8rem; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">🤖</div>
            <h1>SIGES BOT Online</h1>
            <p>El bot se encuentra en ejecución. Si ya vinculaste tu WhatsApp, el bot está listo para responder mensajes.</p>
            <p class="footer">Si acabás de reiniciar, aguardá unos segundos que se cargue el código QR.</p>
          </div>
        </body>
        </html>
      `);
    }
  });

  adapterProvider.server.get("/qr", (req, res) => {
    res.writeHead(302, { Location: "/" });
    res.end();
  });

  httpServer(PORT);
  // Manejar Ctrl+C
  process.on("SIGINT", () => {
    console.log("\nBot detenido manualmente");
    process.exit(0);
  });
};

main();
