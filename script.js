(() => {
  // --- 定数 ---
  const SUPPORTED_VERSIONS = ["1.0", "1.1"];
  const APP_NAME = "PixelDraw";
  const APP_VERSION = "1.1";
  const WIDTH = 16;
  const HEIGHT = 16;

  // 初期パレット
  const INITIAL_PALETTE = [
    "#000000",
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ffffff",
    "#00000000" // 透明
  ];

  // 状態
  let palette = [...INITIAL_PALETTE];
  let currentColorIndex = 0;
  let isDrawing = false;

  // 要素取得
  const paletteEl = document.getElementById("palette");
  const addColorBtn = document.getElementById("btn-add-color");
  const resetBtn = document.getElementById("btn-reset");
  const resetPaletteBtn = document.getElementById("btn-reset-palette"); // ★追加
  const canvasEl = document.getElementById("canvas");
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
      if (color === "transparent" || color === "#00000000") btn.classList.add("transparent");

      // クリックで選択
      btn.addEventListener("click", () => selectColor(i, btn));

      // ゴミ箱マーク追加
      const trash = document.createElement("span");
      trash.textContent = "🗑";
      trash.style.cursor = "pointer";
      trash.style.marginLeft = "4px";
      trash.addEventListener("click", (e) => {
        e.stopPropagation();
        if (i >= INITIAL_PALETTE.length - 1) return; // 透明削除不可
        if (confirm(`色 ${color} を削除しますか？`)) {
          // 使用中かチェック
          const used = Array.from(canvasEl.querySelectorAll(".pixel")).some(
            (p) => Number(p.dataset.colorIndex) === i
          );
          if (used) return alert("この色は使用中のため削除できません。");
          palette.splice(i, 1);
          if (currentColorIndex === i) currentColorIndex = 0;
          createPalette();
          saveToLocalStorage();
        }
      });

      btn.appendChild(trash);
      paletteEl.appendChild(btn);

      if (i === currentColorIndex) btn.classList.add("selected");
    });
  }

  // --- 色選択 ---
  function selectColor(index, btnEl) {
    currentColorIndex = index;
    paletteEl.querySelectorAll(".color-btn").forEach((b) => b.classList.remove("selected"));
    btnEl.classList.add("selected");
  }

  // --- 新しい色追加 ---
  addColorBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "color";
    input.style.display = "none";
    document.body.appendChild(input);
    input.click();
    input.addEventListener("input", () => {
      palette.splice(palette.length - 1, 0, input.value); // 透明の前に追加
      createPalette();
      saveToLocalStorage();
      document.body.removeChild(input);
    });
  });

  // --- パレットリセット ---
  resetPaletteBtn.addEventListener("click", () => {
    if (confirm("パレットを初期状態に戻しますか？")) {
      palette = [...INITIAL_PALETTE];
      currentColorIndex = 0;
      createPalette();
      saveToLocalStorage();
    }
  });

  // --- ピクセル塗り ---
  function paintPixel(pixel) {
    pixel.style.backgroundColor = palette[currentColorIndex];
    pixel.dataset.colorIndex = currentColorIndex;
  }

  // --- 変更時処理 ---
  function onDrawChange() {
    saveToLocalStorage();
  }

  // --- マウスイベント ---
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

  window.addEventListener("mouseup", () => {
    isDrawing = false;
  });

  // --- ボードリセット ---
  resetBtn.addEventListener("click", () => {
    if (confirm("本当にボードをリセットして全てクリアしますか？")) {
      canvasEl.querySelectorAll(".pixel").forEach((p) => {
        p.style.backgroundColor = palette[palette.length - 1]; // 透明
        delete p.dataset.colorIndex;
      });
      localStorage.removeItem("pixelDrawingData-v1");
      titleInput.value = "";
    }
  });

  // --- JSON保存 ---
  saveBtn.addEventListener("click", () => downloadJson());

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
        if (!SUPPORTED_VERSIONS.includes(data.version))
          return alert(`サポートされていないバージョンです。対応バージョン: ${SUPPORTED_VERSIONS.join(", ")}\n読み込んだバージョン: ${data.version}`);
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

  // --- ページロード時復元 ---
  window.addEventListener("load", () => {
    const saved = localStorage.getItem("pixelDrawingData-v1");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (
          data.app === APP_NAME &&
          SUPPORTED_VERSIONS.includes(data.version) &&
          data.width === WIDTH &&
          data.height === HEIGHT &&
          Array.isArray(data.pixels)
        ) {
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

  // --- 画像保存 ---
  imgSaveBtn.addEventListener("click", () => {
    const formats = ["png", "jpeg"];
    const oldSelect = document.getElementById("img-format-select");
    if (oldSelect) oldSelect.remove();

    const select = document.createElement("select");
    select.id = "img-format-select";
    formats.forEach((f) => {
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
    cvs.toBlob(
      (blob) => downloadBlob(blob, `${APP_NAME}-${APP_VERSION}_${getTimestamp()}.${format}`),
      mime,
      0.92
    );
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

  function saveToLocalStorage() {
    const data = {
      app: APP_NAME,
      version: APP_VERSION,
      width: WIDTH,
      height: HEIGHT,
      title: titleInput.value.trim() || undefined,
      palette,
      pixels: compressPixels(getCanvasColorIndices())
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
      pixels: compressPixels(getCanvasColorIndices())
    };
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const dt = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
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

  function getCanvasColorIndices() {
    return Array.from(canvasEl.querySelectorAll(".pixel")).map((p) =>
      p.dataset.colorIndex !== undefined ? Number(p.dataset.colorIndex) : palette.length - 1
    );
  }

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

  function getTimestamp() {
    const dt = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}_${pad(dt.getHours())}-${pad(dt.getMinutes())}-${pad(dt.getSeconds())}`;
  }

  // 初期化
  createPalette();
})();