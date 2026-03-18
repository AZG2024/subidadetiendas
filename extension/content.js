// ============================================================
// SAFETY: This extension ONLY creates/fills. NEVER deletes.
// NEVER clicks submit/save/delete buttons.
// ============================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'fillForm') {
    fillForm(msg.data, msg.images)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // async response
  }
});

async function fillForm(data, images) {
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // ---- Helper: Set value on React-controlled input ----
  function setReactInput(input, value) {
    if (!input || !value) return;
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ---- Helper: Fill a react-select dropdown ----
  async function fillReactSelect(inputId, value) {
    if (!value) return;
    const input = document.getElementById(inputId);
    if (!input) {
      console.warn(`[StoreProcessor] react-select input #${inputId} not found`);
      return;
    }

    // Find the control container
    const container = input.closest('[class*="container"]');
    if (!container) return;

    const control = container.querySelector('[class*="control"]');
    if (!control) return;

    // Click to open dropdown
    control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    await delay(300);

    // Type the value
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    ).set;
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await delay(400);

    // Select the first option (or "Create" option for creatable selects)
    const menu = document.querySelector('[class*="menu"]');
    if (menu) {
      const option = menu.querySelector('[class*="option"]');
      if (option) {
        option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        option.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }
    }
    await delay(200);
  }

  // ---- Helper: Fill text input by placeholder ----
  function fillInputByPlaceholder(placeholder, value) {
    if (!value) return;
    const input = document.querySelector(`input[placeholder="${placeholder}"]`);
    if (input) {
      setReactInput(input, value);
    } else {
      console.warn(`[StoreProcessor] Input with placeholder "${placeholder}" not found`);
    }
  }

  // ---- Helper: Fill tags ----
  async function fillTags(tagsArray) {
    if (!tagsArray || tagsArray.length === 0) return;
    const input = document.querySelector('input[placeholder*="presiona Enter para agregar"]');
    if (!input) {
      console.warn('[StoreProcessor] Tags input not found');
      return;
    }

    for (const tag of tagsArray) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      ).set;
      nativeSetter.call(input, tag);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await delay(100);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      await delay(150);
    }
  }

  // ---- Helper: Upload images via file input ----
  async function uploadImages(fileInputId, imagesData) {
    if (!imagesData || imagesData.length === 0) return;
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput) {
      console.warn(`[StoreProcessor] File input #${fileInputId} not found`);
      return;
    }

    const dt = new DataTransfer();
    for (const img of imagesData) {
      // Convert base64 data URL to File
      const res = await fetch(img.data);
      const blob = await res.blob();
      const file = new File([blob], img.name || 'store-image.png', { type: img.type || 'image/png' });
      dt.items.add(file);
    }

    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ============================================================
  // FILL SEQUENCE
  // ============================================================

  console.log('[StoreProcessor] Starting form fill...');

  // 1. Tipo de Uso (react-select)
  await fillReactSelect('react-select-5-input', data.tipoDeUso);
  await delay(300);

  // 2. Prioridad (react-select)
  await fillReactSelect('react-select-6-input', data.prioridad);
  await delay(300);

  // 3. Titulo (text input)
  fillInputByPlaceholder('Título descriptivo del asset...', data.titulo);
  await delay(100);

  // 4. Descripcion (text input)
  fillInputByPlaceholder('Describe el asset...', data.descripcion);
  await delay(100);

  // 5. Categoria (react-select creatable)
  await fillReactSelect('react-select-7-input', data.categoria);
  await delay(600); // Wait for subcategory to enable

  // 6. Subcategoria (react-select creatable, enabled after category)
  await fillReactSelect('react-select-8-input', data.subcategoria);
  await delay(300);

  // 7. Tags
  await fillTags(data.tags);
  await delay(200);

  // 8. Ubicacion Fisica
  fillInputByPlaceholder('Ej: Centro Comercial Gamarra', data.ubicacionFisica);
  await delay(100);

  // 9. Piso
  fillInputByPlaceholder('Ej: Piso 2', data.piso);
  await delay(100);

  // 10. Stand
  fillInputByPlaceholder('Ej: A-123', data.stand);
  await delay(100);

  // 11. Pasillo
  fillInputByPlaceholder('Ej: Pasillo A', data.pasillo);
  await delay(100);

  // 12. Rango de Precio
  fillInputByPlaceholder('Ej: S/ 50 - S/ 100', data.rangoDePrecio);
  await delay(100);

  // 13. Images — user uploads manually
  // (automatic upload removed to avoid naming conflicts in admin)

  // NEVER click "Crear Asset" — user does it manually
  console.log('[StoreProcessor] Form fill complete. Review and click "Crear Asset" manually.');
}
