# Nevera IA — web app con Gemini y tutoriales de YouTube

Aplicación web responsive en español. Permite subir una foto, pedir a Gemini que identifique alimentos y generar recetas personalizadas (desayuno, almuerzo, cena y meriendas). Cada receta incluye un enlace de búsqueda de tutoriales relevantes en YouTube.

## Antes de publicar
La app no está publicada todavía. Necesitas una cuenta de GitHub, una cuenta de Render y una clave API de Gemini. Nunca compartas la clave ni la subas a GitHub.

## 1) Crear una clave Gemini
1. Abre https://aistudio.google.com/apikey e inicia sesión.
2. Crea una API key y guárdala de forma privada.
3. No la pegues en el HTML ni la subas al repositorio.
4. Revisa las cuotas y condiciones gratuitas vigentes en https://ai.google.dev/gemini-api/docs/pricing.

## 2) Subir el código a GitHub
1. Entra en https://github.com/ e inicia sesión.
2. Crea un repositorio llamado `nevera-ia`.
3. Descomprime este ZIP en una computadora si puedes. Sube al repositorio el contenido de la carpeta `nevera_ia_app`, conservando la carpeta `public` y su archivo `index.html`. Deben quedar `server.js`, `package.json`, `render.yaml`, `.gitignore` y `public/index.html` en sus respectivas rutas.
4. No subas archivos `.env` ni la clave API. El `.gitignore` excluye `.env` y `node_modules`.

## 3) Publicar en Render
1. Abre https://render.com/ y crea una cuenta o inicia sesión.
2. Selecciona **New → Blueprint** y conecta tu cuenta de GitHub.
3. Elige el repositorio `nevera-ia` y confirma el despliegue detectado desde `render.yaml`.
4. En la configuración del servicio, entra a **Environment** y agrega `GEMINI_API_KEY` con tu clave privada de AI Studio.
5. Espera que termine el despliegue y abre la URL pública `https://...onrender.com` que Render te muestre.

Si usas la opción Web Service manual: runtime Node, Build Command `npm install`, Start Command `npm start`, y agrega `GEMINI_API_KEY` como variable de entorno.

## 4) Probar
1. Abre la URL pública en el teléfono.
2. Sube una foto clara y pulsa **Identificar productos de la foto**.
3. Revisa y corrige los alimentos identificados.
4. Elige el tiempo y tipo de comida y pulsa **Generar recetas**.
5. En cada receta, pulsa **Ver tutorial en YouTube**. Por ahora se abre una búsqueda de YouTube basada en el título/consulta de receta, no un video individual verificado.

## Limitaciones
- El plan gratuito de Render puede suspender servicios inactivos; la primera visita posterior puede tardar en cargar. Consulta https://render.com/docs/free.
- El uso gratuito de Gemini tiene cuotas y condiciones que pueden cambiar.
- Los enlaces de YouTube son búsquedas relacionadas y no garantizan que el primer video coincida exactamente con cada receta.
- La IA puede equivocarse; verifica ingredientes, alergias, conservación y cocción segura.
- La aplicación no está publicada hasta completar las cuentas, configurar la clave y desplegar el servicio.
