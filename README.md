# Conversor PDF → EPUB

Una aplicación web sencilla que convierte archivos PDF a formato EPUB. Sube un PDF desde el navegador y obtén de vuelta un EPUB válido listo para leer en tu e-reader (Kobo, Kindle, etc.), tablet o cualquier app de lectura.

## Características

- Conversión de PDF a EPUB directamente desde el navegador.
- Extracción automática del texto del PDF.
- División por páginas: cada página del PDF se convierte en un capítulo navegable del EPUB.
- Genera un EPUB válido (versión 2.0) con su tabla de contenidos (`toc.ncx`).
- Límite de archivo de 50 MB.
- Validación de tipo de archivo (solo acepta PDF).
- Manejo de errores claro (por ejemplo, avisa si el PDF es una imagen escaneada sin texto seleccionable).

## Tecnologías

- **Node.js** + **Express** — servidor web.
- **Multer** — manejo de la subida de archivos.
- **pdf-parse** — extracción del texto del PDF.
- **JSZip** — construcción del archivo EPUB (que internamente es un ZIP).

## Requisitos previos

- Tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior recomendada).

## Instalación

1. Clona este repositorio o descarga los archivos:

   ```bash
   git clone https://github.com/TU-USUARIO/conversor-pdf-epub.git
   cd conversor-pdf-epub
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

## Uso

1. Inicia el servidor:

   ```bash
   npm start
   ```

   También puedes usar el modo desarrollo, que reinicia el servidor automáticamente al guardar cambios:

   ```bash
   npm run dev
   ```

2. Abre tu navegador en:

   ```
   http://localhost:3000
   ```

3. Sube un archivo PDF a través de la interfaz y descarga el EPUB resultante.

## Cómo funciona

1. El usuario sube un PDF desde la interfaz web.
2. El servidor recibe el archivo en memoria (con un límite de 50 MB) y verifica que sea realmente un PDF.
3. `pdf-parse` extrae el texto del documento.
4. El texto se divide por saltos de página (los caracteres de avance de página del PDF). Si hay varias páginas, cada una se convierte en un capítulo; si no, todo el contenido queda en un único capítulo.
5. Se construye un EPUB válido con su estructura interna (`mimetype`, `container.xml`, archivos HTML por capítulo, `content.opf` y `toc.ncx`).
6. El EPUB se devuelve al navegador como descarga.

## Limitaciones

- **Solo funciona con PDFs que contienen texto seleccionable.** Si el PDF es una imagen escaneada (sin capa de texto), no se podrá extraer contenido. Para esos casos haría falta un proceso de OCR, que este conversor no incluye.
- El formato del EPUB es sencillo: conserva el texto y una división básica por páginas, pero no reproduce imágenes, columnas complejas ni el diseño visual original del PDF.
- La división en "capítulos" se basa en los saltos de página del PDF, por lo que los nombres de capítulo son genéricos (`Página 1`, `Página 2`, etc.).

## Posibles mejoras a futuro

- Soporte de OCR para PDFs escaneados.
- Detección inteligente de capítulos reales (por títulos o encabezados) en lugar de dividir por página.
- Inclusión de imágenes del PDF en el EPUB.
- Personalización de metadatos (autor, título, portada).

## Licencia

Este proyecto está disponible bajo la licencia MIT. Puedes usarlo, modificarlo y distribuirlo libremente.
