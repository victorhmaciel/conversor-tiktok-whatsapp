const form = document.querySelector('#converter');
const linkInput = document.querySelector('#link');
const fileInput = document.querySelector('#file');
const linkFields = document.querySelector('#link-fields');
const fileFields = document.querySelector('#file-fields');
const status = document.querySelector('#status');
const result = document.querySelector('#result');
const preview = document.querySelector('#preview');
const details = document.querySelector('#details');
const download = document.querySelector('#download');
const share = document.querySelector('#share');
const submitButtons = [...form.querySelectorAll('button[type="submit"]')];

let previewUrl;
let outputFile;

function setStatus(message, error = false) {
  status.textContent = message;
  status.hidden = !message;
  status.classList.toggle('error', error);
}

function clearResult() {
  result.hidden = true;
  preview.removeAttribute('src');
  download.removeAttribute('href');
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = undefined;
  outputFile = undefined;
}

form.addEventListener('change', event => {
  if (event.target.name !== 'source') return;
  const useFile = event.target.value === 'file';
  fileFields.hidden = !useFile;
  fileInput.disabled = !useFile;
  fileInput.required = useFile;
  linkFields.hidden = useFile;
  linkInput.disabled = useFile;
  linkInput.required = !useFile;
  setStatus('');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  const format = event.submitter?.value ?? 'webp';
  const useFile = !fileInput.disabled;
  const input = fileInput.files[0];
  if (useFile && (!input?.size || input.size > 4_000_000)) {
    setStatus('Escolha um arquivo de imagem de até 4 MB.', true);
    return;
  }

  clearResult();
  setStatus('Convertendo a figurinha…');
  submitButtons.forEach(button => { button.disabled = true; });
  try {
    const response = await fetch('/api/converter?formato=' + format, {
      method: 'POST',
      headers: { 'Content-Type': useFile ? 'application/octet-stream' : 'application/json' },
      body: useFile ? input : JSON.stringify({ url: linkInput.value.trim() }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error ?? 'A conversão falhou. Tente novamente.');
    }
    if (response.headers.get('content-type') !== 'image/' + format) {
      throw new Error('O servidor retornou um formato inesperado.');
    }

    const blob = await response.blob();
    outputFile = new File([blob], 'figurinha.' + format, { type: blob.type });
    previewUrl = URL.createObjectURL(outputFile);
    preview.src = previewUrl;
    download.href = previewUrl;
    download.download = outputFile.name;
    download.textContent = 'Baixar ' + format.toUpperCase();
    const size = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(blob.size / 1000);
    details.textContent = format.toUpperCase() + ' · 512 × 512 px · ' + size + ' KB';
    share.hidden = !(navigator.share && navigator.canShare?.({ files: [outputFile] }));
    result.hidden = false;
    setStatus('Conversão concluída.');
  } catch (error) {
    setStatus(error.message === 'Failed to fetch' ? 'Falha de conexão. Tente novamente.' : error.message, true);
  } finally {
    submitButtons.forEach(button => { button.disabled = false; });
  }
});

share.addEventListener('click', async () => {
  if (!outputFile) return;
  try {
    await navigator.share({ files: [outputFile] });
  } catch (error) {
    if (error.name !== 'AbortError') setStatus('O compartilhamento falhou. Use o botão Baixar.', true);
  }
});
