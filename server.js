import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.mimetype)) {
      return cb(new Error("Formato no admitido. Usa JPG, PNG o WebP."));
    }
    cb(null, true);
  }
});

app.use(express.static(path.join(__dirname, "public")));
app.get("/api/health", (_req, res) => res.json({ ok: true, model: MODEL }));

app.post("/api/analyze", upload.single("photo"), async (req, res) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: "Falta configurar GEMINI_API_KEY en el servidor. Consulta el archivo README." });
    if (!req.file) return res.status(400).json({ error: "No recibí una foto. Selecciona una imagen e inténtalo de nuevo." });

    const prompt = `Analiza esta foto de una nevera, despensa o alimentos. Identifica SOLO alimentos/productos que sean visualmente reconocibles. No inventes productos ocultos. Devuelve JSON válido con esta estructura exacta:
{"products":[{"name":"nombre común en español","confidence":"alta|media|baja","notes":"breve detalle opcional"}]}
Usa nombres cortos de ingredientes en español (por ejemplo: huevo, leche, tomate, queso). No incluyas utensilios ni envases vacíos. Si no puedes reconocer alimentos, devuelve {"products":[]}. No afirmes cantidades exactas salvo que sean claramente visibles.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: req.file.mimetype, data: req.file.buffer.toString("base64") } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      })
    });

    const payload = await upstream.json();
    if (!upstream.ok) {
      const msg = payload?.error?.message || "El servicio de IA rechazó la solicitud.";
      const status = upstream.status === 429 ? 429 : 502;
      return res.status(status).json({ error: `Gemini: ${msg}` });
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { return res.status(502).json({ error: "La IA respondió en un formato inesperado. Inténtalo de nuevo." }); }

    const products = Array.isArray(parsed.products) ? parsed.products
      .filter(p => p && typeof p.name === "string" && p.name.trim())
      .slice(0, 40)
      .map(p => ({
        name: p.name.trim().slice(0, 60),
        confidence: ["alta", "media", "baja"].includes(p.confidence) ? p.confidence : "media",
        notes: typeof p.notes === "string" ? p.notes.slice(0, 120) : ""
      })) : [];
    res.json({ products });
  } catch (err) {
    if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "La imagen supera 8 MB. Elige una foto más pequeña." });
    res.status(500).json({ error: err.message || "Ocurrió un error al analizar la foto." });
  }
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Solicitud inválida." });
});


app.post("/api/recipes", express.json({ limit: "20kb" }), async (req, res) => {
  try {
    if (!API_KEY) return res.status(503).json({ error: "Falta configurar GEMINI_API_KEY en el servidor. Consulta el README." });
    const ingredients = Array.isArray(req.body?.ingredients)
      ? req.body.ingredients.filter(x => typeof x === "string").map(x => x.trim()).filter(Boolean).slice(0, 60)
      : [];
    const maxMinutes = Math.max(5, Math.min(180, Number(req.body?.maxMinutes) || 30));
    const meal = ["all", "breakfast", "lunch", "dinner", "snack"].includes(req.body?.meal) ? req.body.meal : "all";
    if (!ingredients.length) return res.status(400).json({ error: "Agrega o identifica al menos un ingrediente." });
    const mealNames = { all: "desayuno, almuerzo, cena y meriendas", breakfast: "desayuno", lunch: "almuerzo", dinner: "cena", snack: "meriendas" };
    const prompt = `Eres un asistente culinario práctico. Genera 4 recetas realistas usando principalmente estos ingredientes disponibles: ${ingredients.join(", ")}. Tiempo máximo aproximado por receta: ${maxMinutes} minutos. Tipo solicitado: ${mealNames[meal]}. Puedes mencionar ingredientes opcionales que falten, pero distingue claramente los que ya están disponibles de los que faltan. Incluye variedad y, si encaja, alguna opción paraguaya. No inventes que un ingrediente está disponible. Devuelve SOLO JSON válido con esta estructura: {"recipes":[{"title":"...","description":"...","timeMinutes":20,"category":"Desayuno|Almuerzo|Cena|Merienda","availableIngredients":["..."],"missingIngredients":["..."],"steps":["paso 1","paso 2","paso 3"],"youtubeSearch":"frase breve para buscar tutorial exacto en YouTube"}]}. Cada receta debe tener 3 a 6 pasos, tiempos realistas, instrucciones seguras para cocinar carne y huevos, y una consulta de YouTube en español. No afirmes que los videos están verificados; solo prepara una búsqueda relevante.`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.55 } })
    });
    const payload = await upstream.json();
    if (!upstream.ok) {
      const msg = payload?.error?.message || "El servicio de IA rechazó la solicitud.";
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: `Gemini: ${msg}` });
    }
    const output = payload?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
    let parsed;
    try { parsed = JSON.parse(output); } catch { return res.status(502).json({ error: "La IA respondió en un formato inesperado. Inténtalo otra vez." }); }
    const recipes = Array.isArray(parsed.recipes) ? parsed.recipes.slice(0, 4).map((r, i) => ({
      title: String(r.title || `Receta ${i + 1}`).slice(0, 100),
      description: String(r.description || "Receta sugerida según tus ingredientes.").slice(0, 280),
      timeMinutes: Math.max(1, Math.min(240, Number(r.timeMinutes) || maxMinutes)),
      category: String(r.category || "Comida").slice(0, 30),
      availableIngredients: Array.isArray(r.availableIngredients) ? r.availableIngredients.filter(x => typeof x === "string").slice(0, 20) : [],
      missingIngredients: Array.isArray(r.missingIngredients) ? r.missingIngredients.filter(x => typeof x === "string").slice(0, 20) : [],
      steps: Array.isArray(r.steps) ? r.steps.filter(x => typeof x === "string").slice(0, 8) : [],
      youtubeSearch: String(r.youtubeSearch || `${r.title || "receta"} tutorial en español`).slice(0, 180)
    })) : [];
    res.json({ recipes });
  } catch (err) {
    res.status(500).json({ error: err.message || "No se pudieron generar las recetas." });
  }
});

app.listen(PORT, () => console.log(`Nevera IA escuchando en puerto ${PORT}`));
