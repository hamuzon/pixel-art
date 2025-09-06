(() => {
  const SUPPORTED_VERSIONS = ["1.0", "1.1"];
  const APP_NAME = "PixelDraw";
  const APP_VERSION = "1.1";
  const WIDTH = 16;
  const HEIGHT = 16;

  let palette = [
    "#000000",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ffffff",
    "#00000000"
  ];

  let currentColorIndex = 0;
  let isDrawing = false;

  const paletteEl = document.getElementById("palette");
  const addColorBtn = document.getElementById("btn-add-color");
  const canvasEl = document.getElementById("canvas");
  const resetBtn = document.getElementById("btn-reset");
  const saveBtn = document.getElementById("btn-save");
  const loadBtn = document.getElementById("btn-load");
  const imgSaveBtn = document.getElementById("btn-img-save");
  const fileLoadInput = document.getElementById("file-load");
  const titleInput = document.getElementById("titleInput");

  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const pixel = document.createElement("div");
    pixel.classList.add("pixel");
    pixel.dataset.index = i;
    pixel.style.backgroundColor = palette[palette.length - 1];
    canvasEl.appendChild(pixel);
  }

  function createPalette() {
    paletteEl.innerHTML = "";
    palette.forEach((color, i) => {
      const btn = document.createElement("div");
      btn.className = "color-btn";
      btn.style.backgroundColor = color;
      btn.title = `色: ${color}`;
      if (color === "transparent" || color === "#00000000") btn.classList.add("transparent");
      btn.addEventListener("click", () => selectColor(i, btn));
      paletteEl.appendChild(btn);
      if (i === currentColorIndex) btn.classList.add("selected");
    });
  }

  function selectColor(index, btnEl) {
    currentColorIndex = index;
    paletteEl.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btnEl.classList.add("selected");
  }

  addColorBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "color";
    input.value = "#ffffff";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);

    input.addEventListener("change", () => {
      const newColor = input.value;
      palette.splice(palette.length - 1, 0, newColor); // 透明の前に追加
      createPalette();
      saveToLocalStorage();
      document.body.removeChild(input);
    });

    input.click();
  });

  function paintPixel(pixel) {
    pixel.style.backgroundColor = palette[currentColorIndex];
    pixel.dataset.colorIndex = currentColorIndex;
  }

  function onDrawChange() {
    saveToLocalStorage();
  }

  canvasEl.addEventListener("mousedown", (e) => {
    if (!e.target.classList.contains("pixel")) return;
    isDrawing = true;
    paintPixel(e.target);
    onDrawChange();
  });

  canvasEl.addEventListener("mouseover", (e) => {
    if (isDrawing && e.target.classList.contains("pixel")) {
      paintPixel(e.target);
      onDrawChange();
    }
  });

  canvasEl.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.classList.contains("pixel")) {
      paintPixel(target);
      onDrawChange();
    }
  }, { passive: false });

  canvasEl.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (let touch of e.touches) {
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && target.classList.contains("pixel")) {
        paintPixel(target);
        onDrawChange();
      }
    }
  }, { passive: false });

  window.addEventListener("mouseup", () => {
    isDrawing = false;
  });

  window.addEventListener("touchend", () => {
    isDrawing = false;
  });

  resetBtn.addEventListener("click", () => {
    if (confirm("本当にボードをリセットして全てクリアしますか？")) {
      canvasEl.querySelectorAll(".pixel").forEach(p => {
        p.style.backgroundColor = palette[palette.length - 1];
        delete p.dataset.colorIndex;
      });
      localStorage.removeItem("pixelDrawingData-v1");
      titleInput.value = "";
    }
  });

  saveBtn.addEventListener("click", downloadJson);

  loadBtn.addEventListener("click", () => {
    fileLoadInput.value = null;
    fileLoadInput.click();
  });

  fileLoadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return alert("ファイルが選択されていません。");
    if (!file.name.endsWith(".json")) return alert("JSONファイルを選択してください.");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.app !== APP_NAME) return alert("このデータはこのアプリのものではありません。");
        if (!SUPPORTED_VERSIONS.includes(data.version)) {
          return alert(`非対応バージョンです。対応: ${SUPPORTED_VERSIONS.join(", ")}, 読込: ${data.version}`);
        }
        if (data.width !== WIDTH || data.height !== HEIGHT) return alert("キャンバスサイズが異なります。");
        if (!Array.isArray(data.pixels)) return alert("ピクセルデータが不正です。");

        if (Array.isArray(data.palette)) {
          palette = data.palette;
          createPalette();
        }

        fillCanvas(data.pixels);
        titleInput.value = data.title || "";
        saveToLocalStorage();
        alert(`バージョン ${data.version} の作品を読み込みました。`);
      } catch {
        alert("JSONファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
  });

  window.addEventListener("load", () => {
    const saved = localStorage.getItem("pixelDrawingData-v1");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.app === APP_NAME &&
            SUPPORTED_VERSIONS.includes(data.version) &&
            data.width === WIDTH &&
            data.height === HEIGHT &&
            Array.isArray(data.pixels)) {

          if (Array.isArray(data.palette)) {
            palette = data.palette;
            createPalette();
          }
          fillCanvas(data.pixels);
          titleInput.value = data.title || "";
        }
      } catch {}
    }
  });

  titleInput.addEventListener("input", saveToLocalStorage);

  function saveToLocalStorage() {
    const data = {
      app: APP_NAME,
      version: APP_VERSION,
      width: WIDTH,
      height: HEIGHT,
      title: titleInput.value.trim() || undefined,
      palette,
      pixels: getCanvasColorIndices(),
    };
    localStorage.setItem("pixelDrawingData-v1", JSON.stringify(data));
  }

  function downloadJson() {
    const data = {
      app: APP_NAME,
      version: APP_VERSION,
      width: WIDTH,
      height: HEIGHT,
      title: titleInput.value.trim() || undefined,
      palette,
      pixels: getCanvasColorIndices(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const dt = new Date();
    const pad = n => n.toString().padStart(2, "0");
    const filename = `${APP_NAME}-VERSION-${APP_VERSION}_${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}_${pad(dt.getHours())}-${pad(dt.getMinutes())}-${pad(dt.getSeconds())}.json`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("作品を保存しました。");
  }

  function getCanvasColorIndices() {
    const indices = [];
    canvasEl.querySelectorAll(".pixel").forEach(p => {
      const idx = p.dataset.colorIndex !== undefined ? Number(p.dataset.colorIndex) : palette.length - 1;
      indices.push(idx);
    });
    return indices;
  }

  function fillCanvas(pixels) {
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      const idx = pixels[i] !== undefined ? pixels[i] : palette.length - 1;
      const pixel = canvasEl.querySelector(`.pixel[data-index="${i}"]`);
      if (pixel) {
        pixel.style.backgroundColor = palette[idx];
        pixel.dataset.colorIndex = idx;
      }
    }
  }

  createPalette();
})();
