(() => {
  // --- 定数 ---
  const SUPPORTED_LOAD_VERSIONS = ["1.0", "1.1", "2.0"]; 
  const APP_NAME = "PixelDraw";
  const APP_VERSION = "2.0"; 
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
  const imgSaveBtn = document.getElementById("btn-img-save");
  const fileLoadInput = document.getElementById("file-load");
  const titleInput = document.getElementById("titleInput");

  // --- ピクセル生成 ---
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const pixel = document.createElement("div");
    pixel.classList.add("pixel");
    pixel.dataset.index = i;
    pixel.style.backgroundColor = palette[palette.length - 1];
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

  // --- 新しい色追加（スマホ対応） ---
  addColorBtn.addEventListener("click", () => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const input = document.createElement("input");
    input.type = "color";
    input.style.display = isTouchDevice ? "none" : "fixed";
    if (!isTouchDevice) input.value = "#ffffff";
    document.body.appendChild(input);
    input.click();
    input.addEventListener(isTouchDevice ? "input" : "change", () => {
      palette.splice(palette.length - 1, 0, input.value);
      createPalette();
      saveToLocalStorage();
      document.body.removeChild(input);
    });
  });

  // --- ピクセル塗り ---
  function paintPixel(pixel) {
    pixel.style.backgroundColor = palette[currentColorIndex];
    pixel.dataset.colorIndex = currentColorIndex;
  }

  function onDrawChange() {
    saveToLocalStorage();
  }

  // --- マウス描画 ---
  canvasEl.addEventListener("mousedown", e => {
    if (!e.target.classList.contains("pixel")) return;
    isDrawing = true;
    paintPixel(e.target);
    onDrawChange();
  });
  canvasEl.addEventListener("mouseover", e => {
    if (isDrawing && e.target.classList.contains("pixel")) {
      paintPixel(e.target);
      onDrawChange();
    }
  });
  window.addEventListener("mouseup", () => { isDrawing = false; });

  // --- タッチ描画 ---
  canvasEl.addEventListener("touchstart", e => {
    e.preventDefault();
    Array.from(e.touches).forEach(touch => {
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && target.classList.contains("pixel")) paintPixel(target);
    });
    onDrawChange();
  });
  canvasEl.addEventListener("touchmove", e => {
    e.preventDefault();
    Array.from(e.touches).forEach(touch => {
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && target.classList.contains("pixel")) paintPixel(target);
    });
    onDrawChange();
  });
  canvasEl.addEventListener("touchend", () => { isDrawing = false; });

  // --- ボードリセット ---
  resetBtn.addEventListener("click", () => {
    if (confirm("本当にボードをリセットして全てクリアしますか？")) {
      canvasEl.querySelectorAll(".pixel").forEach(p => {
        p.style.backgroundColor = palette[palette.length - 1];
        delete p.dataset.colorIndex;
      });
      localStorage.removeItem("pixelDrawingData-v2.0");
      titleInput.value = "";
    }
  });

  // --- 画像保存 ---
  imgSaveBtn.addEventListener("click", () => {
    const formats = ["png", "jpeg"];
    const oldSelect = document.getElementById("img-format-select");
    if (oldSelect) oldSelect.remove();

    const select = document.createElement("select");
    select.id = "img-format-select";
    formats.forEach(f => {
      const option = document.createElement("option");
      option.value = f;
      option.textContent = f.toUpperCase();
      select.appendChild(option);
    });

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "保存";
    saveBtn.style.marginLeft = "8px";

    const wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.top = "50%";
    wrapper.style.left = "50%";
    wrapper.style.transform = "translate(-50%, -50%)";
    wrapper.style.background = "#c0c0c0";
    wrapper.style.border = "2px outset buttonface";
    wrapper.style.padding = "12px";
    wrapper.style.zIndex = "9999";
    wrapper.appendChild(select);
    wrapper.appendChild(saveBtn);
    document.body.appendChild(wrapper);

    saveBtn.addEventListener("click", () => {
      saveImage(select.value);
      wrapper.remove();
    });
    wrapper.addEventListener("click", (e) => {
      if (e.target === wrapper) wrapper.remove();
    });
  });

  function saveImage(format) {
    const cvs = document.createElement("canvas");
    cvs.width = WIDTH;
    cvs.height = HEIGHT;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    canvasEl.querySelectorAll(".pixel").forEach((p, i) => {
      const bg = p.style.backgroundColor;
      if (bg && bg !== palette[palette.length - 1]) {
        const x = i % WIDTH;
        const y = Math.floor(i / WIDTH);
        ctx.fillStyle = bg;
        ctx.fillRect(x, y, 1, 1);
      }
    });
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    cvs.toBlob(blob => downloadBlob(blob, `${APP_NAME}-${APP_VERSION}_${getTimestamp()}.${format}`), mime, 0.92);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- 縦横圧縮 ---
  function compressPixels2D() {
    const pixels = Array.from(canvasEl.querySelectorAll(".pixel")).map(p =>
      p.dataset.colorIndex !== undefined ? Number(p.dataset.colorIndex) : palette.length - 1
    );
    const result = [];
    const visited = Array(WIDTH * HEIGHT).fill(false);

    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const idx = y * WIDTH + x;
        if (visited[idx]) continue;
        const color = pixels[idx];
        let w = 1;
        while (x + w < WIDTH && !visited[y * WIDTH + x + w] && pixels[y * WIDTH + x + w] === color) w++;
        let h = 1;
        let canExpand = true;
        while (y + h < HEIGHT && canExpand) {
          for (let xi = 0; xi < w; xi++) {
            if (pixels[(y + h) * WIDTH + (x + xi)] !== color || visited[(y + h) * WIDTH + (x + xi)]) {
              canExpand = false;
              break;
            }
          }
          if (canExpand) h++;
        }
        result.push([x, y, w, h, color]);
        for (let dy = 0; dy < h; dy++)
          for (let dx = 0; dx < w; dx++)
            visited[(y + dy) * WIDTH + (x + dx)] = true;
      }
    }
    return result;
  }

  function fillCanvasWithCompressedPixels2D(rects) {
    canvasEl.querySelectorAll(".pixel").forEach((p, i) => {
      const idx = palette.length - 1;
      p.style.backgroundColor = palette[idx];
      p.dataset.colorIndex = idx;
    });
    rects.forEach(([x, y, w, h, colorIndex]) => {
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px < WIDTH && py < HEIGHT) {
            const pixel = canvasEl.querySelector(`.pixel[data-index="${py*WIDTH+px}"]`);
            if (pixel) {
              pixel.style.backgroundColor = palette[colorIndex];
              pixel.dataset.colorIndex = colorIndex;
            }
          }
        }
      }
    });
  }

  // --- ローカルストレージ保存 ---
  function saveToLocalStorage() {
    const data = {
      app: APP_NAME,
      version: APP_VERSION,
      width: WIDTH,
      height: HEIGHT,
      title: titleInput.value.trim() || undefined,
      palette,
      pixels: compressPixels2D()
    };
    localStorage.setItem("pixelDrawingData-v2.0", JSON.stringify(data));
  }

  // --- JSON保存 ---
  function downloadJson() {
    const data = {
      app: APP_NAME,
      version: APP_VERSION,
      width: WIDTH,
      height: HEIGHT,
      title: titleInput.value.trim() || undefined,
      palette,
      pixels: compressPixels2D()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const dt = new Date();
    const pad = n => n.toString().padStart(2, "0");
    const filename = `${APP_NAME}-VERSION-${APP_VERSION}_${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}_${pad(dt.getHours())}-${pad(dt.getMinutes())}-${pad(dt.getSeconds())}.json`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    alert("作品を保存しました。");
  }

  function getTimestamp() {
    const dt = new Date();
    const pad = n => n.toString().padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}_${pad(dt.getHours())}-${pad(dt.getMinutes())}-${pad(dt.getSeconds())}`;
  }

  // --- JSON読み込み ---
  loadBtn.addEventListener("click", () => {
    fileLoadInput.value = null;
    fileLoadInput.click();
  });

  fileLoadInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return alert("ファイルが選択されていません。");
    if (!file.name.endsWith(".json")) return alert("JSONファイルを選択してください。");

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.app !== APP_NAME) { alert("このデータはこのアプリのものではありません。"); return; }
        if (!SUPPORTED_LOAD_VERSIONS.includes(data.version)) {
          alert(`サポートされていないバージョンです。\n対応: ${SUPPORTED_LOAD_VERSIONS.join(", ")}\n読み込んだ: ${data.version}`);
          return;
        }
        if (data.width !== WIDTH || data.height !== HEIGHT) { alert("キャンバスサイズが異なります。"); return; }
        if (!Array.isArray(data.pixels)) { alert("ピクセルデータが不正です。"); return; }

        // パレット更新
        if (Array.isArray(data.palette)) { palette = data.palette; createPalette(); }

        // 旧バージョン対応
        if (data.version === "1.0" || data.version === "1.1") {
          // 横方向圧縮だった場合を想定
          if (data.pixels.length && typeof data.pixels[0] !== "object") {
            // 横圧縮を展開して縦横圧縮形式に変換
            fillCanvasWithCompressedPixels2D(expandLegacyPixels(data.pixels));
          } else {
            fillCanvasWithCompressedPixels2D(data.pixels);
          }
        } else {
          // v2.0 以降
          fillCanvasWithCompressedPixels2D(data.pixels);
        }

        titleInput.value = data.title || "";
        saveToLocalStorage();
        alert(`バージョン ${data.version} の作品を読み込みました。`);
      } catch {
        alert("JSONファイルの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
  });

  function expandLegacyPixels(pixels) {
    const result = [];
    let i = 0;
    while (i < pixels.length) {
      const val = pixels[i];
      if (Array.isArray(val) && val.length === 2 && typeof pixels[i+1] === "number") {
        const [start, count] = val;
        const colorIndex = pixels[i+1];
        for (let c = 0; c < count; c++) {
          const x = (start + c) % WIDTH;
          const y = Math.floor((start + c) / WIDTH);
          result.push([x, y, 1, 1, colorIndex]);
        }
        i += 2;
      } else if (typeof val === "number") {
        const x = i % WIDTH;
        const y = Math.floor(i / WIDTH);
        result.push([x, y, 1, 1, val]);
        i++;
      } else i++;
    }
    return result;
  }

  // --- ページロード時に保存データ復元 ---
  window.addEventListener("load", () => {
    const saved = localStorage.getItem("pixelDrawingData-v2.0");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.app === APP_NAME && SUPPORTED_LOAD_VERSIONS.includes(data.version) &&
            data.width === WIDTH && data.height === HEIGHT && Array.isArray(data.pixels)) {
          if (Array.isArray(data.palette)) { palette = data.palette; createPalette(); }
          if (data.version === "1.0" || data.version === "1.1") {
            fillCanvasWithCompressedPixels2D(expandLegacyPixels(data.pixels));
          } else {
            fillCanvasWithCompressedPixels2D(data.pixels);
          }
          titleInput.value = data.title || "";
        }
      } catch {}
    }
  });

  titleInput.addEventListener("input", saveToLocalStorage);

  // --- 初期化 ---
  createPalette();
})();
