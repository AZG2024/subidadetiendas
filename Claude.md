# Person Remover — CLAUDE.md

## Descripción del Proyecto
Aplicación web local (sin backend) que usa la API de Google Gemini para remover personas de fotografías. El usuario elige la versión del modelo, sube una imagen, la IA procesa la remoción y puede descargar el resultado.

---

## Stack Técnico
- **Frontend only**: HTML + CSS + Vanilla JS (un solo archivo `index.html`)
- **Sin backend**: Las llamadas a la API de Google Gemini se hacen directamente desde el browser
- **Ejecución**: Local (abrir `index.html` directamente en el navegador o con Live Server)
- **API**: Google Gemini API (REST via `fetch`)

---

## Modelos de Gemini a Usar

| Versión en UI        | Modelo API                        | Notas                              |
|----------------------|-----------------------------------|------------------------------------|
| **Gemini 2.5 Pro**   | `gemini-2.5-pro-exp-03-25`       | Mejor calidad, más lento           |
| **Gemini 2.0 Flash** | `gemini-2.0-flash-exp`           | Más rápido, respuesta casi inmediata |

Ambos modelos soportan image input y image output (generación de imagen en el response).

> Confirmar los model strings exactos en: https://ai.google.dev/gemini-api/docs/models

---

## Prompts por Defecto

### Prompt 1 — Detección y descripción (análisis previo)
```
Analyze this image and identify all people present. Describe their positions, 
size relative to the frame, and the background behind them. Be precise about 
what needs to be reconstructed to remove them naturally.
```

### Prompt 2 — Remoción (generación de imagen)
```
Remove all people from this image. Fill the areas where people were with 
a natural continuation of the background, matching the lighting, texture, 
and perspective of the surrounding environment. The result should look like 
the original scene but without any human presence. Return only the edited image.
```

> **Nota**: Gemini 2.0 Flash Experimental soporta image output. Gemini 1.5 Flash puede requerir un enfoque diferente (descripción + imagen separada). Ajustar según respuesta real de la API durante desarrollo.

---

## Flujo de Usuario

```
1. Usuario ingresa su Google Gemini API Key
        ↓
2. Selecciona versión del modelo
   [ Gemini Pro Image ]  [ Gemini Flash ]
        ↓
3. Sube una foto (drag & drop o file picker)
        ↓
4. Preview de la imagen original
        ↓
5. Click en "Remove People"
        ↓
6. Loading state mientras la API procesa
        ↓
7. Preview del resultado (imagen procesada)
        ↓
8. Botón "Download Image" → descarga el archivo
```

---

## Estructura de Archivos

```
person-remover/
├── index.html          # Toda la app (HTML + CSS + JS en un solo archivo)
├── CLAUDE.md           # Este archivo
└── README.md           # Instrucciones de uso rápido
```

---

## Llamada a la API — Estructura Base

```javascript
// Endpoint base
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// Función principal
async function removePersonFromImage(apiKey, model, imageBase64, mimeType) {
  const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`;
  
  const body = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: mimeType,   // "image/jpeg" | "image/png" | "image/webp"
            data: imageBase64      // base64 sin el prefijo data:...
          }
        },
        {
          text: PROMPT_REMOVE_PEOPLE  // Prompt 2 definido arriba
        }
      ]
    }],
    generationConfig: {
      response_modalities: ["image", "text"]  // Necesario para output de imagen
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return await response.json();
}
```

### Extraer la imagen del response
```javascript
function extractImageFromResponse(responseData) {
  const parts = responseData.candidates?.[0]?.content?.parts || [];
  
  for (const part of parts) {
    if (part.inline_data?.mime_type?.startsWith("image/")) {
      return {
        base64: part.inline_data.data,
        mimeType: part.inline_data.mime_type
      };
    }
  }
  return null; // No image in response
}
```

---

## Manejo de la API Key
- El usuario ingresa su API Key en un input de tipo `password` en la UI
- Se guarda **solo en memoria** (variable JS), nunca en localStorage ni cookies
- Se muestra un aviso: *"Tu API key se usa solo localmente y no se almacena"*
- Obtener API Key en: https://aistudio.google.com/app/apikey

---

## Formatos de Imagen Soportados
- `image/jpeg` (.jpg, .jpeg)
- `image/png` (.png)
- `image/webp` (.webp)
- Tamaño máximo recomendado: **4MB** (límite práctico de Gemini inline_data)

---

## Limitaciones Conocidas
1. **CORS**: La API de Gemini permite llamadas desde el browser sin problema de CORS
2. **Calidad variable**: La remoción de personas con fondos complejos puede ser imperfecta
3. **Rate limits**: Sin backend no hay control de rate limiting; depende de los límites de la cuenta del usuario
4. **Tamaño de imagen**: Máximo ~4MB recomendado para `inline_data`

---

## UI/UX — Decisiones de Diseño
- **Tema**: Oscuro, profesional, minimalista
- **Layout**: Centrado, máximo 800px de ancho
- **Estados visuales**:
  - `idle`: Formulario de configuración + drop zone
  - `loading`: Spinner + mensaje "Removing people..."
  - `success`: Before/After side-by-side + botón download
  - `error`: Mensaje de error claro con posible causa
- **Sin dependencias externas**: Solo HTML/CSS/JS vanilla

---

## Próximos Pasos de Desarrollo
- [ ] Crear `index.html` con la UI completa
- [ ] Implementar conversión de imagen a base64
- [ ] Implementar llamada a la API con los dos modelos
- [ ] Manejar respuesta y mostrar imagen resultante
- [ ] Implementar descarga de imagen
- [ ] Testing con ambos modelos
- [ ] Manejar errores de API (401, 429, 500)

---

## Referencias
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Gemini Image Generation](https://ai.google.dev/gemini-api/docs/image-generation)
- [Google AI Studio](https://aistudio.google.com/)
- [Modelos disponibles](https://ai.google.dev/gemini-api/docs/models)