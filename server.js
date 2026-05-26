const express = require('express');
const multer  = require('multer');
const pdfParse = require('pdf-parse');
const JSZip   = require('jszip');
const path    = require('path');
const { randomUUID } = require('crypto');

const app  = express();
const PORT = 3000;

app.use(express.static('public'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  }
});

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function textToHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

function buildEpub(title, chapters) {
  const zip  = new JSZip();
  const uid  = randomUUID();
  const safe = escapeXml(title);

  // mimetype must be first and uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // META-INF/container.xml
  zip.folder('META-INF').file('container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder('OEBPS');

  // Chapter HTML files
  chapters.forEach((ch, i) => {
    const chTitle = escapeXml(ch.title);
    const chBody  = textToHtml(ch.text);
    oebps.file(`chapter${String(i + 1).padStart(3, '0')}.html`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${chTitle}</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.7; margin: 2em; }
    p    { margin: 0.8em 0; }
    h1   { font-size: 1.4em; margin-bottom: 1.2em; }
  </style>
</head>
<body>
  <h1>${chTitle}</h1>
  <p>${chBody}</p>
</body>
</html>`);
  });

  // content.opf
  const manifestItems = chapters.map((_, i) => {
    const id = `chapter${String(i + 1).padStart(3, '0')}`;
    return `    <item id="${id}" href="${id}.html" media-type="application/xhtml+xml"/>`;
  }).join('\n');

  const spineItems = chapters.map((_, i) => {
    const id = `chapter${String(i + 1).padStart(3, '0')}`;
    return `    <itemref idref="${id}"/>`;
  }).join('\n');

  const ncxItems = chapters.map((ch, i) => {
    const id  = `chapter${String(i + 1).padStart(3, '0')}`;
    const num = i + 1;
    return `  <navPoint id="nav${num}" playOrder="${num}">
    <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
    <content src="${id}.html"/>
  </navPoint>`;
  }).join('\n');

  oebps.file('content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${safe}</dc:title>
    <dc:language>es</dc:language>
    <dc:identifier id="uid">${uid}</dc:identifier>
  </metadata>
  <manifest>
${manifestItems}
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`);

  oebps.file('toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${uid}"/>
  </head>
  <docTitle><text>${safe}</text></docTitle>
  <navMap>
${ncxItems}
  </navMap>
</ncx>`);

  return zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE'
  });
}

app.post('/convert', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo PDF.' });
  }

  try {
    const data  = await pdfParse(req.file.buffer);
    const title = path.parse(req.file.originalname).name;

    // Split by form-feed characters (page breaks in PDFs)
    const rawPages = data.text.split(/\f/).filter(p => p.trim().length > 0);

    const chapters = rawPages.length > 1
      ? rawPages.map((text, i) => ({ title: `Página ${i + 1}`, text }))
      : [{ title, text: data.text }];

    const epubBuffer = await buildEpub(title, chapters);

    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.epub"`);
    res.send(epubBuffer);
  } catch (err) {
    console.error('Error en conversión:', err);
    res.status(500).json({
      error: 'No se pudo convertir el archivo. Verifica que el PDF contiene texto seleccionable (no es una imagen escaneada).'
    });
  }
});

app.use((err, req, res, next) => {
  if (err.message === 'Solo se permiten archivos PDF') {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'El archivo supera el límite de 50 MB.' });
  }
  res.status(500).json({ error: 'Error interno del servidor.' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
