export default async function handler(req, res) {
  // Autoriser uniquement les requêtes POST
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Méthode non autorisée."
    });
  }

  try {
    // Vérifier la clé API OpenAI
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Le service ONE AI n'est pas encore configuré."
      });
    }

    // Vérifier le message reçu
    const { messages } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Veuillez envoyer un message."
      });
    }

    // Limiter la taille de l'historique pour maîtriser les coûts
    const conversation = messages.slice(-20).map((message) => {
      if (
        !message ||
        !["user", "assistant"].includes(message.role) ||
        typeof message.content !== "string"
      ) {
        throw new Error("Message invalide.");
      }

      return {
        role: message.role,
        content: message.content.slice(0, 8000)
      };
    });

    // Envoyer la demande à OpenAI
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Tu es ONE AI, un assistant d'intelligence artificielle utile, " +
                "précis, respectueux et honnête. Réponds en français par défaut, " +
                "mais utilise la langue demandée par l'utilisateur. Explique les " +
                "choses clairement, aide à apprendre, à créer et à résoudre des " +
                "problèmes. N'invente pas de faits lorsque tu es incertain."
            },
            ...conversation
          ],
          temperature: 0.7,
          max_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur OpenAI :", data.error?.message || response.status);

      return res.status(502).json({
        error: "ONE AI n'a pas pu répondre. Réessaie plus tard."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "Aucune réponse reçue de l'intelligence artificielle."
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Erreur ONE AI :", error.message);

    return res.status(500).json({
      error: "Une erreur est survenue. Veuillez réessayer."
    });
  }
}
