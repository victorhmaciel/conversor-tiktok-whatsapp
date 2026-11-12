import sharp from 'sharp';

const inputLimit = 4_000_000;
const pixelLimit = 36_000_000;
const frameLimit = 120;
const cdnDomains = ['ibyteimg.com', 'tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokcdn-eu.com', 'tiktokv.com'];
const redirects = new Set([301, 302, 303, 307, 308]);

class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function jsonError(message, status) {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function mediaUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new InputError('Cole o endereço completo da imagem do TikTok.');
  }

  const { hostname, protocol, port, username, password } = url;
  if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
    throw new InputError('Esse link abre uma página do TikTok. Cole o endereço direto da imagem ou envie o arquivo da figurinha.');
  }
  const isCdn = cdnDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
  if (protocol !== 'https:' || port || username || password || !isCdn) {
    throw new InputError('Use um endereço HTTPS direto da mídia do TikTok ou envie o arquivo.');
  }
  return url;
}

async function readLimited(message, maxBytes) {
  if (Number(message.headers.get('content-length')) > maxBytes) {
    await message.body?.cancel();
    throw new InputError('O arquivo de entrada pode ter até 4 MB.', 413);
  }
  if (!message.body) throw new InputError('Envie um arquivo ou um link direto.');

  const chunks = [];
  let bytes = 0;
  const reader = message.body.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new InputError('O arquivo de entrada pode ter até 4 MB.', 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, bytes);
}

async function fetchMedia(value) {
  let url = mediaUrl(value);
  const signal = AbortSignal.timeout(7000);
  try {
    for (let hop = 0; hop < 4; hop++) {
      const response = await fetch(url, {
        redirect: 'manual',
        signal,
        headers: { Accept: 'image/webp,image/gif,image/png,image/jpeg,*/*;q=0.1' },
      });
      if (redirects.has(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) break;
        url = mediaUrl(new URL(location, url).href);
        continue;
      }
      if (response.ok) return await readLimited(response, inputLimit);
      await response.body?.cancel();
      break;
    }
  } catch (error) {
    if (error instanceof InputError) throw error;
  }
  throw new InputError('O TikTok não entregou a imagem. O link pode ter expirado. Tente um link novo ou envie o arquivo.', 502);
}

function isSupportedImage(input) {
  const type = input.toString('ascii', 0, 12);
  return (type.startsWith('RIFF') && type.slice(8) === 'WEBP')
    || type.startsWith('GIF87a') || type.startsWith('GIF89a')
    || input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || (input[0] === 255 && input[1] === 216 && input[2] === 255);
}

async function convert(input, format) {
  if (!isSupportedImage(input)) {
    throw new InputError('O conteúdo precisa ser uma imagem WebP, GIF, PNG ou JPG.', 415);
  }

  const image = sharp(input, { animated: true, limitInputPixels: pixelLimit });
  const metadata = await image.metadata();
  const frames = metadata.pages ?? 1;
  const sourceHeight = metadata.pageHeight ?? metadata.height;
  if (frames > frameLimit || metadata.width * sourceHeight * frames > pixelLimit) {
    throw new InputError('A imagem é grande demais para processar. Use até 120 quadros e uma resolução menor.', 413);
  }

  const animation = frames > 1 ? { delay: metadata.delay, loop: metadata.loop ?? 0 } : {};
  const sized = image.resize(512, 512, {
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  if (format === 'gif') {
    const gif = await sized.gif({ ...animation, effort: 3, keepDuplicateFrames: true }).toBuffer();
    if (gif.length > inputLimit) {
      throw new InputError('O GIF ultrapassou 4 MB. Tente o WebP ou uma animação menor.', 422);
    }
    return gif;
  }

  const limit = frames > 1 ? 500_000 : 100_000;
  if (metadata.format === 'webp' && metadata.width === 512 && sourceHeight === 512 && input.length <= limit) {
    return input;
  }
  for (const quality of [85, 68, 48, 29, 12]) {
    const webp = await sized.clone().webp({ ...animation, quality, effort: 2 }).toBuffer();
    if (webp.length <= limit) return webp;
  }
  throw new InputError('O WebP ultrapassou o limite de tamanho mesmo após a compressão. Tente o GIF ou uma animação menor.', 422);
}

export default async function converter(request) {
  if (request.method !== 'POST') return jsonError('Use POST para converter.', 405);
  const url = new URL(request.url);
  const format = url.searchParams.get('formato');
  if (format !== 'webp' && format !== 'gif') return jsonError('Escolha WebP ou GIF.', 400);

  try {
    let input;
    if (request.headers.get('content-type')?.startsWith('application/json')) {
      const body = await readLimited(request, 8192);
      let payload;
      try {
        payload = JSON.parse(body.toString('utf8'));
      } catch {
        throw new InputError('Envie um endereço válido.');
      }
      if (typeof payload?.url !== 'string') throw new InputError('Cole o endereço da imagem.');
      input = await fetchMedia(payload.url.trim());
    } else {
      input = await readLimited(request, inputLimit);
    }
    const output = await convert(input, format);
    return new Response(output, {
      headers: {
        'Content-Type': 'image/' + format,
        'Content-Disposition': 'inline; filename="figurinha.' + format + '"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof InputError) return jsonError(error.message, error.status);
    return jsonError('Não foi possível ler ou converter esta imagem. Tente outro arquivo.', 422);
  }
}
