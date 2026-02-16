(() => {
    // --- 定数 ---
    const APP_NAME = "PixelDraw";
    const APP_VERSION = "2.0";
    const WIDTH = 16;
    const HEIGHT = 16;
    const STORAGE_KEY = "pixelDrawingData-v2.0";
    const BASE_YEAR = 2025;

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
    if (canvasEl) {
        for (let i = 0; i < WIDTH * HEIGHT; i++) {
            const p = document.createElement("div");
            p.className = "pixel";
            p.dataset.index = i;
            p.dataset.colorIndex = palette.length - 1; // 初期値は透明
            canvasEl.appendChild(p);
            pixels.push(p);
        }
    }

    // --- パレット生成ロジック ---
    const createPalette = () => {
        if (!paletteEl) return;
        paletteEl.innerHTML = "";
        palette.forEach((color, i) => {
            const btn = document.createElement("div");
            const isTrans = color === FIXED_COLOR_END;
            btn.className = `color-btn ${isTrans ? "transparent" : ""} ${i === currentColorIndex ? "selected" : ""}`;
            btn.style.backgroundColor = isTrans ? "transparent" : color;
            btn.title = (i < FIXED_COLORS_START.length || i === palette.length - 1) ? `固定色: ${color}` : `追加色: ${color}`;
            
            btn.onclick = () => {
                currentColorIndex = i;
                createPalette();
            };
            paletteEl.appendChild(btn);
        });
    };

    // --- 描画・データ圧縮・復元ロジック ---
    const paint = (el) => {
        if (!el || !el.classList.contains("pixel")) return;
        const color = palette[currentColorIndex];
        el.style.backgroundColor = color === FIXED_COLOR_END ? "transparent" : color;
        el.dataset.colorIndex = currentColorIndex;
    };

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

    const decompress = (pxData) => {
        if (!pxData) return;
        let indices = [];
        for (let i = 0; i < pxData.length; i++) {
            const val = pxData[i];
            if (Array.isArray(val) && val.length === 2 && typeof pxData[i + 1] === "number") { // v1.1互換
                const count = val[1];
                const colorIndex = pxData[++i];
                for (let c = 0; c < count; c++) indices.push(colorIndex);
            } else if (Array.isArray(val) && val.length === 2) { // v2.0
                for (let c = 0; c < val[1]; c++) indices.push(val[0]);
            } else if (typeof val === "number") {
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

    const saveToLocal = () => {
        const data = { a: APP_NAME, v: APP_VERSION, t: titleInput.value, pl: palette, px: compress() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    };

    const SUPPORTED_VERSIONS = ["1.0", "1.1", "2.0", "2.1"];

    const applyLoadedData = (d) => {
        palette = d.pl || d.palette || [...FIXED_COLORS_START, FIXED_COLOR_END];
        titleInput.value = d.t || d.title || "";
        createPalette();
        decompress(d.px || d.pixels);
    };

    const getDataVersion = (d) => String(d?.v || d?.version || "").trim();

    const validateLoadedData = (d, { showAlert = false } = {}) => {
        const appName = String(d?.a || d?.app || "").trim();
        const version = getDataVersion(d);
        const pxData = d?.px || d?.pixels;
        const plData = d?.pl || d?.palette;

        const fail = (message) => {
            if (showAlert) alert(message);
            return null;
        };

        if (appName && appName !== APP_NAME) return fail("このデータはこのアプリのものではありません。");

        if (!SUPPORTED_VERSIONS.includes(version)) {
            return fail(`サポートされていないバージョンです。
対応: ${SUPPORTED_VERSIONS.join(", ")}
読み込んだ: ${version || "(不明)"}`);
        }

        if ((d?.width && d.width !== WIDTH) || (d?.height && d.height !== HEIGHT)) {
            return fail("キャンバスサイズが異なります。");
        }

        if (!Array.isArray(pxData)) return fail("ピクセルデータが不正です。");
        if (plData !== undefined && !Array.isArray(plData)) return fail("パレットデータが不正です。");

        return version;
    };

    // --- フッター・コピーライト更新処理 ---
    const updateFooter = () => {
        // 年の表示
        const currentYear = new Date().getFullYear();
        const yearDisplay = currentYear > BASE_YEAR ? `${BASE_YEAR}~${currentYear}` : `${BASE_YEAR}`;
        document.querySelectorAll(".year, #year").forEach(el => {
            el.textContent = yearDisplay;
        });

        // リンクの動的生成
        const host = location.hostname.toLowerCase();
        const container = $("footer-link-container");
        if (!container) return;

        let linkHref = "";
        let linkText = "";

        if (host.includes("pixel-art.hamusata.f5.si")) {
            linkHref = "https://hamusata.f5.si";
            linkText = "@hamusata";
        } else if (host === "hamuzon.github.io") {
            linkHref = "https://github.com/Hamuzon";
            linkText = "@hamuzon";
        } else if (host === "hamuzon-jp.f5.si") {
            linkHref = "https://hamuzon-jp.f5.si";
            linkText = "@hamuzon";
        }

        if (linkHref) {
            container.innerHTML = ` <a href="${linkHref}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
        }
    };

    // --- イベントリスナー設定 ---
    if ($("btn-save")) $("btn-save").onclick = () => {
        const data = { a: APP_NAME, v: APP_VERSION, t: titleInput.value.trim() || undefined, pl: palette, px: compress() };
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ts = () => {
            const d = new Date();
            return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}_${d.getHours().toString().padStart(2,"0")}-${d.getMinutes().toString().padStart(2,"0")}-${d.getSeconds().toString().padStart(2,"0")}`;
        };
        a.href = url;
        a.download = `${APP_NAME}-V${APP_VERSION}_${ts()}.Json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if ($("btn-img-save")) $("btn-img-save").onclick = () => {
        const old = $("img-ui"); if (old) old.remove();
        const ui = document.createElement("div");
        ui.id = "img-ui";
        ui.style = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#c0c0c0;border:2px outset;padding:12px;z-index:9999;display:flex;align-items:center;gap:8px";
        const sel = document.createElement("select");
        ["png", "jpeg"].forEach(f => { const opt = document.createElement("option"); opt.value = f; opt.textContent = f.toUpperCase(); sel.appendChild(opt); });
        const btn = document.createElement("button");
        btn.textContent = "保存";
        const close = document.createElement("button");
        close.textContent = "×";
        close.onclick = () => ui.remove();
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
            cvs.toBlob(b => {
                const a = document.createElement("a");
                a.href = URL.createObjectURL(b);
                a.download = `pixelart.${sel.value}`;
                a.click();
                ui.remove();
            }, `image/${sel.value}`);
        };
        ui.appendChild(sel); ui.appendChild(btn); ui.appendChild(close);
        document.body.appendChild(ui);
    };

    const loadBtn = $("btn-load");
    if (loadBtn && fileLoadInput) {
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
                    const appName = String(data.a || data.app || "").trim();
                    const version = getDataVersion(data);
                    const pxData = data.px || data.pixels;
                    const plData = data.pl || data.palette;

                    if (appName && appName !== APP_NAME) { alert("このデータはこのアプリのものではありません。"); return; }
                    if (!SUPPORTED_VERSIONS.includes(version)) {
                        alert(`サポートされていないバージョンです。
対応: ${SUPPORTED_VERSIONS.join(", ")}
読み込んだ: ${version || "(不明)"}`);
                        return;
                    }
                    if ((data.width && data.width !== WIDTH) || (data.height && data.height !== HEIGHT)) { alert("キャンバスサイズが異なります。"); return; }
                    if (!Array.isArray(pxData)) { alert("ピクセルデータが不正です。"); return; }
                    if (plData !== undefined && !Array.isArray(plData)) { alert("パレットデータが不正です。"); return; }

                    if (Array.isArray(plData)) { palette = plData; createPalette(); }
                    else { createPalette(); }

                    decompress(pxData);
                    titleInput.value = data.t || data.title || "";
                    saveToLocal();
                    alert(`バージョン ${version} の作品を読み込みました。`);
                } catch {
                    alert("JSONファイルの読み込みに失敗しました。");
                }
            };
            reader.readAsText(file);
        });
    }

    if ($("btn-add-color")) $("btn-add-color").onclick = () => {
        const pk = document.createElement("input"); pk.type = "color";
        pk.onchange = () => { palette.splice(palette.length - 1, 0, pk.value); currentColorIndex = palette.length - 2; createPalette(); saveToLocal(); };
        pk.click();
    };

    if ($("btn-remove-color")) $("btn-remove-color").onclick = () => {
        if (currentColorIndex < FIXED_COLORS_START.length || currentColorIndex === palette.length - 1) {
            alert("この色は削除できません。"); return;
        }
        palette.splice(currentColorIndex, 1); currentColorIndex = 0; createPalette(); saveToLocal();
    };

    if ($("btn-reset-palette")) $("btn-reset-palette").onclick = () => {
        if (confirm("パレットをリセットしますか？")) { palette = [...FIXED_COLORS_START, FIXED_COLOR_END]; currentColorIndex = 0; createPalette(); saveToLocal(); }
    };

    if ($("btn-reset")) $("btn-reset").onclick = () => {
        if (confirm("クリアしますか？")) { pixels.forEach(p => { p.style.backgroundColor = "transparent"; p.dataset.colorIndex = palette.length - 1; }); saveToLocal(); }
    };

    // --- 描画イベント ---
    if (canvasEl) {
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
    }

    if (titleInput) titleInput.oninput = saveToLocal;

    // --- 起動処理 ---
    window.addEventListener('load', () => {
        updateFooter();
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const d = JSON.parse(saved);
                const version = validateLoadedData(d);
                if (!version) throw new Error("INVALID_CACHED_DATA");
                applyLoadedData(d);
            } catch (e) { createPalette(); }
        } else {
            createPalette();
        }
    });
})();
