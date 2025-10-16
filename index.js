import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
app.use(bodyParser.json());

// 🔑 Variables de entorno (configúralas en Render)
const token = process.env.ACCESS_TOKEN;
const verifyToken = process.env.VERIFY_TOKEN;
const phoneNumberId = process.env.PHONE_NUMBER_ID;

// ✅ Verificación del Webhook (solo la primera vez)
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

// 💬 Procesar mensajes entrantes
app.post("/webhook", async (req, res) => {
  try {
    const data = req.body;

    if (data.object) {
      const message = data.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!message) return res.sendStatus(200); // No hay mensaje nuevo

      const from = message.from; // Número del usuario
      let text = message.text?.body;

      // 👀 Log para depurar
      console.log("📩 Mensaje recibido:", JSON.stringify(message, null, 2));

      // 👉 Detectar botones o listas interactivas
      if (message.type === "interactive") {
        const interactive = message.interactive;
        if (interactive.type === "button_reply") {
          text = interactive.button_reply.title;
        } else if (interactive.type === "list_reply") {
          text = interactive.list_reply.title;
        }
      }

      // 🧠 Lógica del bot
      if (text?.toLowerCase() === "menu") {
        await sendMenu(from);
      } else if (["💡 Información", "🕒 Horarios", "📞 Contacto"].includes(text)) {
        await handleMenuOption(from, text);
      } else if (text) {
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
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  } catch (err) {
    console.error("❌ Error enviando mensaje:", err.response?.data || err.message);
  }
}

// 📋 Enviar menú con botones
async function sendMenu(to) {
  try {
    await axios.post(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: "📋 *Menú principal*\nSelecciona una opción:",
          },
          action: {
            buttons: [
              { type: "reply", reply: { id: "1", title: "💡 Información" } },
              { type: "reply", reply: { id: "2", title: "🕒 Horarios" } },
              { type: "reply", reply: { id: "3", title: "📞 Contacto" } },
            ],
          },
        },
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  } catch (err) {
    console.error("❌ Error enviando menú:", err.response?.data || err.message);
  }
}

// ⚙️ Lógica de respuestas del menú
async function handleMenuOption(to, option) {
  switch (option) {
    case "💡 Información":
      await sendTextMessage(
        to,
        "Somos un bot de prueba para WhatsApp API 😎\nPuedes pedirme horarios o contacto."
      );
      break;

    case "🕒 Horarios":
      await sendTextMessage(to, "🕓 Atendemos de lunes a viernes, de 8am a 6pm.");
      break;

    case "📞 Contacto":
      await sendTextMessage(to, "📞 Puedes escribirnos a soporte@midominio.com o al +57 300 123 4567.");
      break;

    default:
      await sendTextMessage(to, "😅 No entiendo esa opción. Escribe *menu* para ver las opciones nuevamente.");
  }
}

// 🚀 Iniciar servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Bot activo en puerto ${PORT}`));
