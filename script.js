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
    pixel.style.backgroundColor = "#ffffff";
    canvasEl.appendChild(pixel);
  }

  function renderPalette() {
    paletteEl.innerHTML = "";
    palette.forEach((color, index) => {
      const swatch = document.createElement("div");
      swatch.classList.add("swatch");
      if (index === currentColorIndex) {
        swatch.classList.add("selected");
      }
      swatch.style.backgroundColor = color;
      swatch.dataset.index = index;
      swatch.addEventListener("click", () => {
        currentColorIndex = index;
        renderPalette();
      });
      const del = document.createElement("button");
      del.textContent = "🗑️";
      del.classList.add("delete-btn");
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("この色を削除しますか？")) {
          palette.splice(index, 1);
          if (currentColorIndex >= palette.length) currentColorIndex = palette.length - 1;
          if (currentColorIndex < 0) currentColorIndex = 0;
          renderPalette();
        }
      });
      swatch.appendChild(del);
      paletteEl.appendChild(swatch);
    });
  }

  function resetPalette() {
    if (confirm("パレットを初期状態に戻しますか？")) {
      palette = [
        "#000000",
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#ffffff",
        "#00000000"
      ];
      currentColorIndex = 0;
      renderPalette();
    }
  }

  addColorBtn.addEventListener("click", () => {
    const picker = document.createElement("input");
    picker.type = "color";
    picker.value = "#000000";
    picker.style.position = "absolute";
    picker.style.left = "-9999px";
    document.body.appendChild(picker);
    picker.addEventListener("input", (e) => {
      const newColor = e.target.value;
      if (!palette.includes(newColor)) {
        palette.push(newColor);
        renderPalette();
      }
    });
    picker.addEventListener("change", () => {
      document.body.removeChild(picker);
    });
    picker.click();
  });

  function paintPixel(pixel) {
    if (pixel && pixel.classList.contains("pixel")) {
      pixel.style.backgroundColor = palette[currentColorIndex];
    }
  }

  // マウス描画
  canvasEl.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("pixel")) {
      isDrawing = true;
      paintPixel(e.target);
    }
  });
  canvasEl.addEventListener("mouseover", (e) => {
    if (isDrawing && e.target.classList.contains("pixel")) {
      paintPixel(e.target);
    }
  });
  document.addEventListener("mouseup", () => {
    isDrawing = false;
  });

  // タッチ描画（スマホ対応）
  canvasEl.addEventListener("touchstart", (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.classList.contains("pixel")) {
      isDrawing = true;
      paintPixel(target);
    }
  });
  canvasEl.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.classList.contains("pixel")) {
      paintPixel(target);
    }
  });
  document.addEventListener("touchend", () => {
    isDrawing = false;
  });

  resetBtn.addEventListener("click", () => {
    if (confirm("キャンバスをリセットしますか？")) {
      Array.from(canvasEl.children).forEach((p) => {
        p.style.backgroundColor = "#ffffff";
      });
      resetPalette();
    }
  });

  saveBtn.addEventListener("click", () => {
    const data = {
      app: APP_NAME,
      version: APP_VERSION,
      title: titleInput.value,
      palette: palette,
      pixels: Array.from(canvasEl.children).map((p) => p.style.backgroundColor)
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixel.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  loadBtn.addEventListener("click", () => {
    fileLoadInput.click();
  });
  fileLoadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.app !== APP_NAME || !SUPPORTED_VERSIONS.includes(data.version)) {
          alert("対応していないデータです");
          return;
        }
        titleInput.value = data.title || "";
        palette = data.palette || palette;
        renderPalette();
        Array.from(canvasEl.children).forEach((p, i) => {
          p.style.backgroundColor = data.pixels[i] || "#ffffff";
        });
      } catch {
        alert("読み込みに失敗しました");
      }
    };
    reader.readAsText(file);
  });

  imgSaveBtn.addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    Array.from(canvasEl.children).forEach((p, i) => {
      const x = i % WIDTH;
      const y = Math.floor(i / WIDTH);
      ctx.fillStyle = p.style.backgroundColor || "#ffffff";
      ctx.fillRect(x, y, 1, 1);
    });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixel.png";
    a.click();
  });

  renderPalette();
})();
