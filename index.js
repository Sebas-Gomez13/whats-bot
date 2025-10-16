import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// 🔑 Variables de entorno (las pones en Render)
const token = process.env.ACCESS_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

// ✅ Verificación del webhook
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const verifyTokenQuery = req.query["hub.verify_token"];

  if (mode === "subscribe" && verifyTokenQuery === verifyToken) {
    console.log("✅ Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// 💬 Escucha y responde mensajes
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;

    if (data.object) {
      const message = data.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      const from = message?.from;
      const text = message?.text?.body;

      // Si el usuario escribe "menu", le mostramos los botones
      if (text?.toLowerCase() === "menu") {
        await sendMenu(from);
      }

      // Si selecciona un botón
      else if (message?.button?.text) {
        const choice = message.button.text;
        await handleMenuOption(from, choice);
      }

      // Si escribe algo diferente
      else if (text) {
        await sendTextMessage(from, "👋 ¡Hola! Escribe *menu* para ver las opciones.");
      }
    }
  } catch (error) {
    console.error("❌ Error procesando mensaje:", error.response?.data || error.message);
  }

  res.sendStatus(200);
});

// 🧠 Enviar mensaje de texto
async function sendTextMessage(to, body) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      text: { body },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// 📋 Enviar menú con botones
async function sendMenu(to) {
  await axios.post(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: "📋 *Menú principal*\nSelecciona una opción:" },
        action: {
          buttons: [
            { type: "reply", reply: { id: "1", title: "💡 Información" } },
            { type: "reply", reply: { id: "2", title: "🕒 Horarios" } },
            { type: "reply", reply: { id: "3", title: "📞 Contacto" } },
          ],
        },
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

// ⚙️ Lógica de respuestas del menú
async function handleMenuOption(to, option) {
  switch (option) {
    case "💡 Información":
      await sendTextMessage(to, "Somos un bot de prueba para WhatsApp API 😎\nPuedes pedirme horarios o contacto.");
      break;

    case "🕒 Horarios":
      await sendTextMessage(to, "🕓 Atendemos de lunes a viernes, de 8am a 6pm.");
      break;

    case "📞 Contacto":
      await sendTextMessage(to, "📞 Puedes escribirnos a soporte@midominio.com o al +57 300 123 4567.");
      break;

    default:
      await sendTextMessage(to, "No entiendo esa opción 😅 Escribe *menu* para ver las opciones nuevamente.");
  }
}

app.listen(10000, () => console.log("🚀 Bot activo en puerto 10000"));
