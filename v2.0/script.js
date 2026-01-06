(() => {
    // --- 定数 ---
    const APP_NAME = "PixelDraw";
    const APP_VERSION = "2.0";
    const WIDTH = 16;
    const HEIGHT = 16;
    const STORAGE_KEY = "pixelDrawingData-v2.0";
    
    // 固定パレット（最初からある6色 + 最後の透明1色）
    const FIXED_COLORS_START = ["#000000", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ffffff"];
    const FIXED_COLOR_END = "#00000000"; // 透明

    // --- 状態 ---
    let palette = [...FIXED_COLORS_START, FIXED_COLOR_END];
    let currentColorIndex = 0;
    let isDrawing = false;
    const pixels = [];

    // --- 要素取得 ---
    const $ = id => document.getElementById(id);
    const paletteEl = $("palette");
    const canvasEl = $("canvas");
    const titleInput = $("titleInput");
    const fileLoadInput = $("file-load");

    // --- 初期化：ピクセル生成 ---
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        const p = document.createElement("div");
        p.className = "pixel";
        p.dataset.index = i;
        p.dataset.colorIndex = palette.length - 1; // 初期値は透明(末尾)
        canvasEl.appendChild(p);
        pixels.push(p);
    }

    // --- パレット生成 ---
    const createPalette = () => {
        paletteEl.innerHTML = "";
        palette.forEach((color, i) => {
            const btn = document.createElement("div");
            const isTrans = color === FIXED_COLOR_END;
            btn.className = `color-btn ${isTrans ? "transparent" : ""} ${i === currentColorIndex ? "selected" : ""}`;
            btn.style.backgroundColor = isTrans ? "transparent" : color;
            
            // 削除不可の色にヒントを表示（任意）
            if (i < FIXED_COLORS_START.length || i === palette.length - 1) {
                btn.title = `固定色: ${color}`;
            } else {
                btn.title = `追加色: ${color}`;
            }

            btn.onclick = () => {
                currentColorIndex = i;
                createPalette();
            };
            paletteEl.appendChild(btn);
        });
    };

    // --- 描画処理 ---
    const paint = (el) => {
        if (!el || !el.classList.contains("pixel")) return;
        const color = palette[currentColorIndex];
        el.style.backgroundColor = color === FIXED_COLOR_END ? "transparent" : color;
        el.dataset.colorIndex = currentColorIndex;
    };

    // --- v2.0 圧縮ルール ---
    const compress = () => {
        const ids = pixels.map(p => Number(p.dataset.colorIndex));
        const res = [];
        for (let i = 0; i < ids.length; ) {
            let count = 1;
            let val = ids[i];
            while (i + count < ids.length && ids[i + count] === val) count++;
            res.push([val, count]);
            i += count;
        }
        return res;
    };

    // --- v1.x 互換デコード ---
    const decompress = (pxData) => {
        if (!pxData) return;
        let indices = [];
        for (let i = 0; i < pxData.length; i++) {
            const val = pxData[i];
            // v1.1 形式のデコード
            if (Array.isArray(val) && val.length === 2 && typeof pxData[i + 1] === "number") {
                const count = val[1];
                const colorIndex = pxData[++i];
                for (let c = 0; c < count; c++) indices.push(colorIndex);
            } 
            // v2.0 形式のデコード [colorIndex, count]
            else if (Array.isArray(val) && val.length === 2) {
                for (let c = 0; c < val[1]; c++) indices.push(val[0]);
            } 
            else if (typeof val === "number") {
                indices.push(val);
            }
        }
        pixels.forEach((p, i) => {
            const idx = indices[i] !== undefined ? indices[i] : palette.length - 1;
            p.dataset.colorIndex = idx;
            const color = palette[idx] || FIXED_COLOR_END;
            p.style.backgroundColor = color === FIXED_COLOR_END ? "transparent" : color;
        });
    };

    const getTs = () => {
        const d = new Date();
        const p = n => n.toString().padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
    };

    const saveToLocal = () => {
        const data = { a: APP_NAME, v: APP_VERSION, t: titleInput.value, pl: palette, px: compress() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };

    // --- ボタンイベント ---

    // JSON保存
    $("btn-save").onclick = () => {
        const data = { a: APP_NAME, v: APP_VERSION, t: titleInput.value.trim() || undefined, pl: palette, px: compress() };
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${APP_NAME}-VERSION-${APP_VERSION}_${getTs()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 画像保存 (v1.1形式 UI)
    $("btn-img-save").onclick = () => {
        const old = $("img-ui"); if (old) old.remove();
        const ui = document.createElement("div");
        ui.id = "img-ui";
        ui.style = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#c0c0c0;border:2px outset;padding:12px;z-index:9999";
        
        const sel = document.createElement("select");
        ["png", "jpeg"].forEach(f => {
            const opt = document.createElement("option");
            opt.value = f; opt.textContent = f.toUpperCase();
            sel.appendChild(opt);
        });

        const btn = document.createElement("button");
        btn.textContent = "保存";
        btn.style.marginLeft = "8px";
        btn.onclick = () => {
            const cvs = document.createElement("canvas");
            cvs.width = WIDTH; cvs.height = HEIGHT;
            const ctx = cvs.getContext("2d");
            pixels.forEach((p, i) => {
                const idx = p.dataset.colorIndex;
                if (palette[idx] !== FIXED_COLOR_END) {
                    ctx.fillStyle = palette[idx];
                    ctx.fillRect(i % WIDTH, Math.floor(i / WIDTH), 1, 1);
                }
            });
            const format = sel.value;
            cvs.toBlob(b => {
                const url = URL.createObjectURL(b);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${APP_NAME}-${APP_VERSION}_${getTs()}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                ui.remove();
            }, `image/${format}`, 0.92);
        };
        ui.appendChild(sel); ui.appendChild(btn);
        document.body.appendChild(ui);
        ui.onclick = (e) => { if(e.target === ui) ui.remove(); };
    };

    // JSON読み込み
    $("btn-load").onclick = () => { fileLoadInput.value = null; fileLoadInput.click(); };
    fileLoadInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const d = JSON.parse(ev.target.result);
                palette = d.pl || d.palette || [...FIXED_COLORS_START, FIXED_COLOR_END];
                titleInput.value = d.t || d.title || "";
                createPalette();
                decompress(d.px || d.pixels);
                saveToLocal();
            } catch (err) { alert("読み込み失敗"); }
        };
        reader.readAsText(file);
    };

    // 色追加
    $("btn-add-color").onclick = () => {
        const pk = document.createElement("input");
        pk.type = "color";
        pk.onchange = () => {
            // 透明色の手前に追加
            palette.splice(palette.length - 1, 0, pk.value);
            currentColorIndex = palette.length - 2;
            createPalette();
            saveToLocal();
        };
        pk.click();
    };

    // 選択色を削除 (最初の6色と最後の1色はロック)
    $("btn-remove-color").onclick = () => {
        const isLocked = currentColorIndex < FIXED_COLORS_START.length || currentColorIndex === palette.length - 1;
        if (isLocked) {
            alert("この色は初期パレットのため削除できません。");
            return;
        }
        palette.splice(currentColorIndex, 1);
        currentColorIndex = 0; // 黒に戻す
        createPalette();
        saveToLocal();
    };

    // パレット初期化
    $("btn-reset-palette").onclick = () => {
        if (confirm("パレットを初期状態に戻しますか？")) {
            palette = [...FIXED_COLORS_START, FIXED_COLOR_END];
            currentColorIndex = 0;
            createPalette();
            saveToLocal();
        }
    };

    // ボードリセット
    $("btn-reset").onclick = () => {
        if (confirm("キャンバスをすべてクリアしますか？")) {
            pixels.forEach(p => {
                p.style.backgroundColor = "transparent";
                p.dataset.colorIndex = palette.length - 1;
            });
            saveToLocal();
        }
    };

    // --- 描画イベント ---
    const handleMove = (e) => {
        if (!isDrawing) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const target = document.elementFromPoint(clientX, clientY);
        if (target && target.classList.contains("pixel")) paint(target);
    };

    canvasEl.onpointerdown = (e) => { isDrawing = true; paint(e.target); canvasEl.setPointerCapture(e.pointerId); };
    canvasEl.onpointermove = (e) => handleMove(e);
    window.onpointerup = () => { if (isDrawing) { isDrawing = false; saveToLocal(); } };

    // --- 起動処理 ---
    window.onload = () => {
        $("year").textContent = new Date().getFullYear();
        const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("pixelDrawingData-v2.0");
        if (saved) {
            try {
                const d = JSON.parse(saved);
                palette = d.pl || d.palette || [...FIXED_COLORS_START, FIXED_COLOR_END];
                titleInput.value = d.t || d.title || "";
                createPalette();
                decompress(d.px || d.pixels);
            } catch (e) { createPalette(); }
        } else {
            createPalette();
        }
    };
    titleInput.oninput = saveToLocal;
})();