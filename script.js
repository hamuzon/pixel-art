(() => {
  // --- 定数 ---
  const SUPPORTED_VERSIONS = ["1.0", "1.1"];
  const APP_NAME = "PixelDraw";
  const APP_VERSION = "1.1";
  const WIDTH = 16;
  const HEIGHT = 16;

  // --- パレット（初期値） ---
  let palette = [
    "#000000",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ffffff",
    "#00000000" // 透明
  ];

  // --- 状態 ---
  let currentColorIndex = 0;
  let isDrawing = false;

  // --- 要素取得 ---
  const paletteEl = document.getElementById("palette");
  const addColorBtn = document.getElementById("btn-add-color");
  const canvasEl = document.getElementById("canvas");
  const resetBtn = document.getElementById("btn-reset");
  const saveBtn = document.getElementById("btn-save");
  const loadBtn = document.getElementById("btn-load");
  const fileLoadInput = document.getElementById("file-load");
  const titleInput = document.getElementById("titleInput");

  // --- ピクセル生成 ---
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const pixel = document.createElement("div");
    pixel.classList.add("pixel");
    pixel.dataset.index = i;
    pixel.style.backgroundColor = palette[palette.length - 1]; // 透明
    canvasEl.appendChild(pixel);
  }

  // --- パレット生成 ---
  function createPalette() {
    paletteEl.innerHTML = "";
    palette.forEach((color, i) => {
      const btn = document.createElement("div");
      btn.className = "color-btn";
      btn.style.backgroundColor = color;
      btn.title = `色: ${color}`;
      if (color === "#00000000") btn.classList.add("transparent");
      btn.addEventListener("click", () => selectColor(i, btn));
      paletteEl.appendChild(btn);
      if (i === currentColorIndex) btn.classList.add("selected");
    });
  }

  // --- 色選択 ---
  function selectColor(index, btnEl) {
    currentColorIndex = index;
    paletteEl.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
    btnEl.classList.add("selected");
  }

  // --- 色追加 ---
  addColorBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "color";
    input.value = "#ffffff";
    input.style.position = "fixed";
    input.style.left = "-9999px";
    document.body.appendChild(input);

    input.addEventListener("input", () => {
      palette.splice(palette.length - 1, 0, input.value);
      createPalette();
      currentColorIndex = palette.length - 2; // 選択状態に
      selectColor(currentColorIndex, paletteEl.children[currentColorIndex]);
      saveToLocalStorage();
    });

    input.addEventListener("change", () => {
      document.body.removeChild(input);
    });

    input.click();
  });

  // --- ピクセル塗り ---
  function paintPixel(pixel) {
    pixel.style.backgroundColor = palette[currentColorIndex];
    pixel.dataset.colorIndex = currentColorIndex;
  }

  function onDrawChange() {
    saveToLocalStorage();
  }

  // --- マウス操作 ---
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

  window.addEventListener("mouseup", () => { isDrawing = false; });

  // --- ボードリセット ---
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

  // --- JSON保存 ---
  saveBtn.addEventListener("click", () => { downloadJson(); });

  // --- JSON読み込み ---
  loadBtn.addEventListener("click", () => {
    fileLoadInput.value = null;
    fileLoadInput.click();
  });

  fileLoadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return alert("ファイルが選択されていません。");
    if (!file.name.endsWith(".json")) return alert("JSONファイルを選択してください。");

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

        fillCanvasWithCompressedPixels(data.pixels);
        titleInput.value = data.title || "";
        saveToLocalStorage();
        alert(`バージョン ${data.version} の作品を読み込みました。`);
      } catch {
        alert("JSONファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
  });

  // --- ページロード時に復元 ---
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
          fillCanvasWithCompressedPixels(data.pixels);
          titleInput.value = data.title || "";
        }
      } catch {}
    }
  });

  // --- 作品名変更で保存 ---
  titleInput.addEventListener("input", () => saveToLocalStorage());

  // --- ローカルストレージ保存 ---
  function saveToLocalStorage() {
    const data = {
      app: APP_NAME,
      version: APP_VERSION,
      width: WIDTH,
      height: HEIGHT,
      title: titleInput.value.trim() || undefined,
      palette,
      pixels: compressPixels(getCanvasColorIndices()),
    };
    localStorage.setItem("pixelDrawingData-v1", JSON.stringify(data));
  }

  // --- JSONダウンロード ---
  function downloadJson() {
    const data = {
      app: APP_NAME,
      version: APP_VERSION,
      width: WIDTH,
      height: HEIGHT,
      title: titleInput.value.trim() || undefined,
      palette,
      pixels: compressPixels(getCanvasColorIndices()),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const dt = new Date();
    const pad = n => n.toString().padStart(2, "0");
    const filename = `${APP_NAME}-VERSION-${APP_VERSION}_${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}_${pad(dt.getHours())}-${pad(dt.getMinutes())}-${pad(dt.getSeconds())}.json`;
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

  // --- キャンバスの色インデックス取得 ---
  function getCanvasColorIndices() {
    const indices = [];
    canvasEl.querySelectorAll(".pixel").forEach(p => {
      const idx = p.dataset.colorIndex !== undefined ? Number(p.dataset.colorIndex) : palette.length - 1;
      indices.push(idx);
    });
    return indices;
  }

  // --- ピクセル配列圧縮 ---
  function compressPixels(indices) {
    const compressed = [];
    let i = 0;
    while (i < indices.length) {
      const current = indices[i];
      let count = 1;
      while (i + count < indices.length && indices[i + count] === current) count++;
      if (count >= 3) {
        compressed.push([i, count]);
        compressed.push(current);
        i += count;
      } else {
        for (let j = 0; j < count; j++) compressed.push(current);
        i += count;
      }
    }
    return compressed;
  }

  // --- 圧縮ピクセルを展開 ---
  function fillCanvasWithCompressedPixels(pixels) {
    const indices = [];
    for (let i = 0; i < pixels.length; i++) {
      const val = pixels[i];
      if (Array.isArray(val) && val.length === 2 && typeof pixels[i + 1] === "number") {
        const [start, count] = val;
        const colorIndex = pixels[i + 1];
        for (let c = 0; c < count; c++) indices[start + c] = colorIndex;
        i++;
      } else if (typeof val === "number") indices.push(val);
    }
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      const idx = indices[i] !== undefined ? indices[i] : palette.length - 1;
      const pixel = canvasEl.querySelector(`.pixel[data-index="${i}"]`);
      if (pixel) {
        pixel.style.backgroundColor = palette[idx];
        pixel.dataset.colorIndex = idx;
      }
    }
  }

  // --- 初期化 ---
  createPalette();
})();
