let storeData = null;
let storeImages = [];

const $btnRead = document.getElementById('btnRead');
const $btnFill = document.getElementById('btnFill');
const $status = document.getElementById('status');
const $preview = document.getElementById('preview');
const $imageFiles = document.getElementById('imageFiles');
const $imageSection = document.getElementById('imageSection');
const $imageStatus = document.getElementById('imageStatus');

// Step 1: Read JSON from clipboard
$btnRead.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    const parsed = JSON.parse(text);

    if (!parsed.titulo && !parsed.categoria) {
      throw new Error('JSON does not contain expected store data');
    }

    // Extract images from JSON if present
    storeImages = parsed.imagenes || [];
    delete parsed.imagenes;
    storeData = parsed;

    $status.textContent = 'Store data loaded!';
    $status.className = 'status success';

    // Show preview
    $preview.style.display = 'block';
    $preview.innerHTML = `
      <div class="preview-item"><strong>Titulo:</strong> ${storeData.titulo || '—'}</div>
      <div class="preview-item"><strong>Categoria:</strong> ${storeData.categoria || '—'} / ${storeData.subcategoria || '—'}</div>
      <div class="preview-item"><strong>Tags:</strong> ${(storeData.tags || []).join(', ') || '—'}</div>
      <div class="preview-item"><strong>Ubicacion:</strong> ${storeData.ubicacionFisica || '—'}</div>
      <div class="preview-item"><strong>Stand:</strong> ${storeData.stand || '—'}</div>
      <div class="preview-item"><strong>Tipo de Uso:</strong> ${storeData.tipoDeUso || '—'}</div>
      <div class="preview-item"><strong>Prioridad:</strong> ${storeData.prioridad || '—'}</div>
    `;

    // Handle image section visibility
    if (storeImages.length > 0) {
      $imageSection.style.display = 'none';
      $imageStatus.style.display = 'block';
      $imageStatus.textContent = `${storeImages.length} images loaded from clipboard`;
      $imageStatus.className = 'status success';
    } else {
      $imageSection.style.display = '';
      $imageStatus.style.display = 'none';
    }

    $btnFill.disabled = false;
  } catch (err) {
    $status.textContent = 'Error: ' + err.message;
    $status.className = 'status error';
    storeData = null;
    storeImages = [];
    $btnFill.disabled = true;
    $preview.style.display = 'none';
    $imageSection.style.display = '';
    $imageStatus.style.display = 'none';
  }
});

// Step 3: Send data to content script
$btnFill.addEventListener('click', async () => {
  if (!storeData) return;

  // Use images from clipboard JSON, or fallback to file picker
  let imagesBase64 = storeImages;

  if (imagesBase64.length === 0) {
    const imageFiles = $imageFiles.files;
    if (imageFiles.length > 0) {
      for (const file of imageFiles) {
        const base64 = await fileToBase64(file);
        imagesBase64.push({ data: base64, name: file.name, type: file.type });
      }
    }
  }

  // Send to content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('portalgamarrino.com')) {
      $status.textContent = 'Error: Open the admin page on portalgamarrino.com first';
      $status.className = 'status error';
      return;
    }

    $status.textContent = 'Filling form...';
    $status.className = 'status';

    chrome.tabs.sendMessage(tab.id, {
      action: 'fillForm',
      data: storeData,
      images: imagesBase64
    }, (response) => {
      if (chrome.runtime.lastError) {
        $status.textContent = 'Error: ' + chrome.runtime.lastError.message;
        $status.className = 'status error';
        return;
      }
      if (response && response.success) {
        $status.textContent = 'Form filled! Review and click "Crear Asset" manually.';
        $status.className = 'status success';
      } else {
        $status.textContent = 'Error: ' + (response?.error || 'Unknown error');
        $status.className = 'status error';
      }
    });
  } catch (err) {
    $status.textContent = 'Error: ' + err.message;
    $status.className = 'status error';
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
