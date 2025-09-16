(() => {
  // --- 定数 ---
  const SUPPORTED_VERSIONS = ["1.0", "1.1", "2.0"];
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
  const fileLoadEl = document.getElementById("file-load");
  const titleInput = document.getElementById("titleInput");

  // --- キャンバス初期化 ---
  function initCanvas() {
    canvasEl.innerHTML = "";
    canvasEl.style.display = "grid";
    canvasEl.style.gridTemplateColumns = `repeat(${WIDTH}, 20px)`;
    canvasEl.style.gridTemplateRows = `repeat(${HEIGHT}, 20px)`;

    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      const pixel = document.createElement("div");
      pixel.className = "pixel";
      pixel.dataset.colorIndex = "-1";
      pixel.style.backgroundColor = "transparent";
      pixel.addEventListener("mousedown", () => drawPixel(pixel));
      pixel.addEventListener("mouseenter", () => {
        if (isDrawing) drawPixel(pixel);
      });
      canvasEl.appendChild(pixel);
    }
  }

  // --- ピクセル塗り ---
  function drawPixel(pixel) {
    pixel.dataset.colorIndex = currentColorIndex;
    pixel.style.backgroundColor = palette[currentColorIndex];
  }

  // --- パレット描画 ---
  function renderPalette() {
    paletteEl.innerHTML = "";
    palette.forEach((color, idx) => {
      const btn = document.createElement("button");
      btn.className = "color-btn";
      btn.style.backgroundColor = color;
      btn.setAttribute("aria-label", `色 ${idx + 1}`);
      if (idx === currentColorIndex) {
        btn.classList.add("selected");
      }
      btn.addEventListener("click", () => {
        currentColorIndex = idx;
        renderPalette();
      });
      paletteEl.appendChild(btn);
    });
  }

  // --- 保存処理 ---
  function saveData() {
    const pixels = Array.from(canvasEl.querySelectorAll(".pixel")).map(
      (p) => parseInt(p.dataset.colorIndex, 10)
    );

    const data = {
      app: APP_NAME,
      version: APP_VERSION, // 常に v2.0 で保存
      title: titleInput.value || "",
      palette,
      width: WIDTH,
      height: HEIGHT,
      pixels,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${APP_NAME}-v${APP_VERSION}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- 読み込み処理 ---
  function loadData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (data.app !== APP_NAME) {
          alert("対応していないアプリのデータです。");
          return;
        }
        if (!SUPPORTED_VERSIONS.includes(data.version)) {
          alert(`未対応のバージョンです: ${data.version}`);
          return;
        }

        titleInput.value = data.title || "";
        palette = data.palette || palette;
        renderPalette();

        const pixels = canvasEl.querySelectorAll(".pixel");
        data.pixels.forEach((colorIndex, i) => {
          if (pixels[i]) {
            pixels[i].dataset.colorIndex = colorIndex;
            pixels[i].style.backgroundColor =
              palette[colorIndex] || "transparent";
          }
        });
      } catch (err) {
        alert("読み込みに失敗しました。");
      }
    };
    reader.readAsText(file);
  }

  // --- 画像保存 ---
  function saveAsImage() {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");

    const pixels = canvasEl.querySelectorAll(".pixel");
    pixels.forEach((p, i) => {
      const x = i % WIDTH;
      const y = Math.floor(i / WIDTH);
      const colorIndex = parseInt(p.dataset.colorIndex, 10);
      ctx.fillStyle = palette[colorIndex] || "transparent";
      ctx.fillRect(x, y, 1, 1);
    });

    const link = document.createElement("a");
    link.download = `${APP_NAME}-v${APP_VERSION}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  // --- リセット ---
  function resetBoard() {
    initCanvas();
  }

  // --- イベント登録 ---
  addColorBtn.addEventListener("click", () => {
    const newColor = prompt("追加する色コードを入力してください (例: #123456)");
    if (newColor) {
      palette.push(newColor);
      renderPalette();
    }
  });

  resetBtn.addEventListener("click", resetBoard);
  saveBtn.addEventListener("click", saveData);
  loadBtn.addEventListener("click", () => fileLoadEl.click());
  fileLoadEl.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      loadData(e.target.files[0]);
    }
  });
  imgSaveBtn.addEventListener("click", saveAsImage);

  document.body.addEventListener("mousedown", () => (isDrawing = true));
  document.body.addEventListener("mouseup", () => (isDrawing = false));

  // --- 初期化 ---
  initCanvas();
  renderPalette();
})();