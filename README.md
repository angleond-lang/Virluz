# Virluz Web — MVP

Prototipo funcional de Virluz para detectar posibles señales de phishing.

## Qué incluye

- Login y registro simulado (modo local).
- Rol usuario y administrador.
- Dashboard.
- Analizador de URL basado en reglas.
- Analizador de texto basado en indicadores.
- Flujo de carga de imágenes preparado para OCR/IA.
- Historial.
- Base de datos local de sitios oficiales con CRUD para administrador.
- Chatbot básico.
- Feedback/monetización preparada conceptualmente.
- Módulo de publicidad administrable.
- Diseño responsive.

## Requisitos

- Node.js LTS
- Visual Studio Code

## Ejecutar

1. Abre esta carpeta en VS Code.
2. Abre la terminal.
3. Ejecuta:

```bash
npm install
npm run dev
```

4. Abre la URL que muestre Vite, normalmente `http://localhost:5173`.

## Acceso de administrador

En el login, utiliza cualquier correo que contenga la palabra `admin`, por ejemplo:

`admin@virluz.local`

La contraseña puede ser cualquiera en este prototipo.

## Importante

Esta versión es un MVP académico: los datos se guardan en `localStorage`. No uses este sistema para manejar contraseñas reales ni datos sensibles.

La siguiente fase recomendada es conectar Supabase para autenticación real, base de datos persistente, Row Level Security y almacenamiento de imágenes.

## Despliegue

Puedes desplegar el frontend en Vercel, Netlify o Cloudflare Pages.

Para Vercel:

- Sube el proyecto a GitHub.
- Importa el repositorio en Vercel.
- Framework: Vite.
- Build command: `npm run build`.
- Output directory: `dist`.

