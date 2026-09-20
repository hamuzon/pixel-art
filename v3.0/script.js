(() => {
    // --- 定数 ---
    const APP_NAME = "PixelDraw";
    const ACCEPTED_APP_NAMES = ["PixelDraw", "art.pixel"];
    const APP_VERSION = "3.0";
    const WIDTH = 16;
    const HEIGHT = 16;
    const STORAGE_KEY = "pixelDrawingData-v3.0";
    const BASE_YEAR = 2025;

    // 固定パレット（最初からある6色 + 最後の透明1色）
    const FIXED_COLORS_START = [
        "#000000",
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
        "#ffffff"
    ];

    const FIXED_COLOR_END = "#00000000";

    // --- 状態 ---
    let palette = [...FIXED_COLORS_START, FIXED_COLOR_END];
    let currentColorIndex = 0;
    let isDrawing = false;
    const pixels = [];

    // ユーザーが追加した色のみ返す（固定パレットと透明を除外）
    const getAddedColors = () => {
      // 固定色は最初のN個(FIXED_COLORS_START)、最後は透明色
      return palette.slice(FIXED_COLORS_START.length, palette.length - 1);
    };

    // --- 要素取得 ---
    const $ = id => document.getElementById(id);
    const paletteEl = $("palette");
    const canvasEl = $("canvas");
    const titleInput = $("titleInput");
    const fileLoadInput = $("file-load");
    // 追加色の編集ボタン
    const editColorBtn = $("btn-edit-color");
    const updateEditButtonState = () => {
        const isEditable = currentColorIndex >= FIXED_COLORS_START.length && currentColorIndex < palette.length - 1;
        editColorBtn.disabled = !isEditable;
        editColorBtn.style.opacity = isEditable ? "1" : "0.5";
    };

    // --- 初期化：ピクセル生成 ---
    if (canvasEl) {
        for (let i = 0; i < WIDTH * HEIGHT; i++) {
            const p = document.createElement("div");

            p.className = "pixel";
            p.dataset.index = i;
            p.dataset.colorIndex = palette.length - 1;

            canvasEl.appendChild(p);
            pixels.push(p);
        }
    }

    // --- パレット生成 ---
    const createPalette = () => {
        if (!paletteEl) return;

        paletteEl.innerHTML = "";

        palette.forEach((color, i) => {
            const btn = document.createElement("div");
            const isTrans = color === FIXED_COLOR_END;

            // クラス名設定
            btn.className = `color-btn ${isTrans ? "transparent" : ""} ${i === currentColorIndex ? "selected" : ""}`;
            
            btn.style.backgroundColor = isTrans ? "transparent" : color;
            
            btn.title =
                i < FIXED_COLORS_START.length || i === palette.length - 1
                    ? `固定色: ${color}`
                    : `追加色: ${color}`;
            
            btn.onclick = () => {
                currentColorIndex = i;
                createPalette();
                updateEditButtonState();
            };
            

            
            paletteEl.appendChild(btn);
        });
    };

    // --- 描画 ---
    const paint = el => {
        if (!el || !el.classList.contains("pixel")) return;

        const color = palette[currentColorIndex];

        el.style.backgroundColor =
            color === FIXED_COLOR_END ? "transparent" : color;

        el.dataset.colorIndex = currentColorIndex;
    };

    // --- データ圧縮 ---
    // 固定色: [index, count], 追加色(index>=6): [index, "#hex", count]
    const compress = () => {
        const ids = pixels.map(p => Number(p.dataset.colorIndex));
        const res = [];

        for (let i = 0; i < ids.length;) {
            let count = 1;
            const val = ids[i];

            while (
                i + count < ids.length &&
                ids[i + count] === val
            ) {
                count++;
            }

            // 追加色・透明色はカラーコード付きで保存
            if (val >= FIXED_COLORS_START.length) {
                res.push([val, palette[val], count]);
            } else {
                res.push([val, count]);
            }
            i += count;
        }

        return res;
    };

    // --- データ復元 ---
    const decompress = pxData => {
        if (!pxData) return;

        const indices = [];

        for (let i = 0; i < pxData.length; i++) {
            const val = pxData[i];

            // v3.0: [index, "#hex", count] — 追加色のカラーコード付き
            if (
                Array.isArray(val) &&
                val.length === 3 &&
                typeof val[0] === "number" &&
                typeof val[1] === "string" &&
                typeof val[2] === "number"
            ) {
                const colorIndex = val[0];
                const hexColor = val[1];
                const count = val[2];
                // 透明色は常にパレットの最後（固定位置）に解決
                if (hexColor === FIXED_COLOR_END) {
                    const transIdx = palette.length - 1;
                    for (let c = 0; c < count; c++) indices.push(transIdx);
                }
                // パレットにその色がなければ復元（インデックスの色と一致しない場合）
                else if (palette[colorIndex] !== hexColor) {
                    // パレット内で同じ色を探す
                    const existingIdx = palette.indexOf(hexColor);
                    if (existingIdx !== -1) {
                        for (let c = 0; c < count; c++) indices.push(existingIdx);
                    } else {
                        // 追加色として挿入（透明色の前）
                        const oldTransIdx = palette.length - 1;
                        palette.splice(palette.length - 1, 0, hexColor);
                        const newIdx = palette.length - 2;
                        const newTransIdx = palette.length - 1;
                        // 既に indices に記録された透明色のインデックスを新しい透明インデックスに追従
                        for (let j = 0; j < indices.length; j++) {
                            if (indices[j] === oldTransIdx) indices[j] = newTransIdx;
                        }
                        for (let c = 0; c < count; c++) indices.push(newIdx);
                    }
                } else {
                    for (let c = 0; c < count; c++) indices.push(colorIndex);
                }
            }

            // v1.1互換
            else if (
                Array.isArray(val) &&
                val.length === 2 &&
                typeof pxData[i + 1] === "number"
            ) {
                const count = val[1];
                const colorIndex = pxData[++i];

                for (let c = 0; c < count; c++) {
                    indices.push(colorIndex);
                }
            }

            // v2.1: [index, count]
            else if (
                Array.isArray(val) &&
                val.length === 2
            ) {
                for (let c = 0; c < val[1]; c++) {
                    indices.push(val[0]);
                }
            }

            // 非圧縮データ
            else if (typeof val === "number") {
                indices.push(val);
            }
        }

        pixels.forEach((p, i) => {
            // 安全なカラーインデックス; 範囲外は透明にフォールバック
            let idx = indices[i];
            if (idx === undefined || idx < 0 || idx >= palette.length) {
                idx = palette.length - 1; // 固定の透明色インデックス
            }

            p.dataset.colorIndex = idx;

            const color = palette[idx] || FIXED_COLOR_END;

            p.style.backgroundColor =
                color === FIXED_COLOR_END
                    ? "transparent"
                    : color;
        });
    };

    // --- LocalStorage保存 ---
    const saveToLocal = () => {
        // 追加色を [index, hex] ペアで保存 (index >= FIXED_COLORS_START.length)
        const addedPairs = palette.slice(FIXED_COLORS_START.length, -1)
            .map((c, idx) => [FIXED_COLORS_START.length + idx, c]);
        const data = {
            a: APP_NAME,
            v: APP_VERSION,
            t: titleInput ? titleInput.value : "",
            ac: addedPairs,            // v3.0: 追加色（インデックス付き）
            px: compress()
        };

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(data)
        );
    };

    // --- 対応バージョン ---
    const SUPPORTED_VERSIONS = [
        "1.0",
        "1.1",
        "2.0",
        "2.1",
        "3.0"
    ];

    // --- 読み込みデータ適用 ---
    const applyLoadedData = d => {
        // データからパレットを復元（透明色は常に最後）
        if (Array.isArray(d.ac)) {
            // v3.0形式: ac は [[index, "#hex"], ...] ペアまたは ["#hex", ...]
            const addedColors = d.ac.map(entry =>
                Array.isArray(entry) ? entry[1] : entry
            );
            palette = [...FIXED_COLORS_START, ...addedColors, FIXED_COLOR_END];
        } else {
            // 旧バージョン(v2.x等)のフルパレットから重複を除去して復元
            const savedPalette = d.pl || d.palette || [...FIXED_COLORS_START, FIXED_COLOR_END];
            const addedColors = savedPalette.filter(c => !FIXED_COLORS_START.includes(c) && c !== FIXED_COLOR_END);
            const reconstructed = [...FIXED_COLORS_START, ...addedColors, FIXED_COLOR_END];
            palette = reconstructed.filter((c, i) => reconstructed.indexOf(c) === i);
        }

        if (titleInput) {
            titleInput.value =
                d.t ||
                d.title ||
                "";
        }

        createPalette();
        decompress(d.px || d.pixels);
    };

    // --- バージョン取得 ---
    const getDataVersion = d => {
        return String(
            d?.v ||
            d?.version ||
            ""
        ).trim();
    };

    // --- データ検証 ---
    const validateLoadedData = (
        d,
        { showAlert = false } = {}
    ) => {
        const appName = String(
            d?.a ||
            d?.app ||
            ""
        ).trim();

        const fileVersion = getDataVersion(d);

        let version = fileVersion;

        const pxData =
            d?.px ||
            d?.pixels;

        const plData =
            d?.pl ||
            d?.palette;

        // v1.0救済
        if (
            version === "1.0" &&
            Array.isArray(plData) &&
            plData.length > 7
        ) {
            version = "1.1";
        }

        const fail = message => {
            if (showAlert) {
                alert(message);
            }

            return null;
        };

        if (!ACCEPTED_APP_NAMES.includes(appName)) {
            return fail(
                window.i18nGetText("alert-wrong-app")
            );
        }

        if (!SUPPORTED_VERSIONS.includes(version)) {
            return fail(
                `${window.i18nGetText("alert-unsupported-version")}\n(v${version})`
            );
        }

        if (
            (d?.width && d.width !== WIDTH) ||
            (d?.height && d.height !== HEIGHT)
        ) {
            return fail(
                window.i18nGetText("alert-canvas-size")
            );
        }

        if (!Array.isArray(pxData)) {
            return fail(
                window.i18nGetText("alert-data-corrupt")
            );
        }

        if (
            plData !== undefined &&
            !Array.isArray(plData)
        ) {
            return fail(
                window.i18nGetText("alert-data-corrupt")
            );
        }

        return version;
    };

    // --- フッター・コピーライト更新 ---
    const updateFooter = () => {
        const currentYear =
            new Date().getFullYear();

        const yearDisplay =
            currentYear > BASE_YEAR
                ? `${BASE_YEAR}~${currentYear}`
                : `${BASE_YEAR}`;

        document
            .querySelectorAll(".year, #year")
            .forEach(el => {
                el.textContent = yearDisplay;
            });

        const host =
            location.hostname.toLowerCase();

        const container =
            $("footer-link-container");

        if (!container) return;

        let linkHref = "";
        let linkText = "";

        if (
            host.includes(
                "pixel-art.hamusata.f5.si"
            )
        ) {
            linkHref =
                "https://hamusata.f5.si";

            linkText = "@hamusata";
        }

        else if (
            host === "hamuzon.github.io"
        ) {
            linkHref =
                "https://github.com/hamuzon";

            linkText = "@hamuzon";
        }

        else if (
            host === "hamuzon-jp.f5.si"
        ) {
            linkHref =
                "https://hamuzon-jp.f5.si";

            linkText = "@hamuzon";
        }

        if (linkHref) {
            container.innerHTML = `
                <a
                    href="${linkHref}"
                    target="_blank"
                    rel="noopener noreferrer"
                >${linkText}</a>
            `;
        }
    };

    // --- JSON保存 ---
    if ($("btn-save")) {
        $("btn-save").onclick = () => {
            const addedPairs = palette.slice(FIXED_COLORS_START.length, -1)
                .map((c, idx) => [FIXED_COLORS_START.length + idx, c]);
            const data = {
                a: APP_NAME,
                v: APP_VERSION,
                t: titleInput
                    ? titleInput.value.trim() || undefined
                    : undefined,
                pl: palette,          // 旧バージョン互換用フルパレット
                ac: addedPairs,       // v3.0: 追加色（インデックス付き）
                px: compress()
            };

            const blob = new Blob(
                [JSON.stringify(data)],
                {
                    type: "application/json"
                }
            );

            const url =
                URL.createObjectURL(blob);

            const a =
                document.createElement("a");

            const ts = () => {
                const d = new Date();

                return `${d.getFullYear()}-${String(
                    d.getMonth() + 1
                ).padStart(2, "0")}-${String(
                    d.getDate()
                ).padStart(2, "0")}_${String(
                    d.getHours()
                ).padStart(2, "0")}-${String(
                    d.getMinutes()
                ).padStart(2, "0")}-${String(
                    d.getSeconds()
                ).padStart(2, "0")}`;
            };

            a.href = url;

            a.download =
                `${APP_NAME}-${APP_VERSION}_${ts()}.json`;

            a.click();

            URL.revokeObjectURL(url);
        };
    }

    // --- 画像保存 ---
    if ($("btn-img-save")) {
        $("btn-img-save").onclick = () => {
            const old = $("img-ui");

            if (old) {
                old.remove();
            }

            const ui =
                document.createElement("div");

            ui.id = "img-ui";

            ui.style =
                "position:fixed;" +
                "top:50%;" +
                "left:50%;" +
                "transform:translate(-50%,-50%);" +
                "background:#c0c0c0;" +
                "border:2px outset;" +
                "padding:12px;" +
                "z-index:9999;" +
                "display:flex;" +
                "align-items:center;" +
                "gap:8px";

            const sel =
                document.createElement("select");

            sel.setAttribute(
                "aria-label",
                window.i18nGetText(
                    "label-img-format"
                )
            );

            ["png", "jpeg"].forEach(f => {
                const opt =
                    document.createElement("option");

                opt.value = f;
                opt.textContent =
                    f.toUpperCase();

                sel.appendChild(opt);
            });

            const btn =
                document.createElement("button");

            btn.textContent = "保存";

            const close =
                document.createElement("button");

            close.textContent = "×";

            close.onclick = () => {
                ui.remove();
            };

            btn.onclick = () => {
                const cvs =
                    document.createElement("canvas");

                cvs.width = WIDTH;
                cvs.height = HEIGHT;

                const ctx =
                    cvs.getContext("2d");

                pixels.forEach((p, i) => {
                    const idx =
                        Number(
                            p.dataset.colorIndex
                        );

                    if (
                        palette[idx] !==
                        FIXED_COLOR_END
                    ) {
                        ctx.fillStyle =
                            palette[idx];

                        ctx.fillRect(
                            i % WIDTH,
                            Math.floor(i / WIDTH),
                            1,
                            1
                        );
                    }
                });

                cvs.toBlob(blob => {
                    if (!blob) return;

                    const a =
                        document.createElement("a");

                    a.href =
                        URL.createObjectURL(blob);

                    const dt = new Date();

                    const pad = n =>
                        String(n).padStart(2, "0");

                    const tsStr =
                        `${dt.getFullYear()}-${pad(
                            dt.getMonth() + 1
                        )}-${pad(
                            dt.getDate()
                        )}_${pad(
                            dt.getHours()
                        )}-${pad(
                            dt.getMinutes()
                        )}-${pad(
                            dt.getSeconds()
                        )}`;

                    a.download =
                        `${APP_NAME}-${APP_VERSION}_${tsStr}.${sel.value}`;

                    a.click();

                    URL.revokeObjectURL(a.href);

                    ui.remove();
                }, `image/${sel.value}`);
            };

            ui.appendChild(sel);
            ui.appendChild(btn);
            ui.appendChild(close);

            document.body.appendChild(ui);
        };
    }

    // --- JSON読み込み ---
    const loadBtn = $("btn-load");

    if (loadBtn && fileLoadInput) {
        loadBtn.addEventListener(
            "click",
            () => {
                fileLoadInput.value = "";
                fileLoadInput.click();
            }
        );

        fileLoadInput.addEventListener(
            "change",
            e => {
                const file =
                    e.target.files[0];

                if (!file) {
                    alert(
                        window.i18nGetText(
                            "alert-file-not-selected"
                        )
                    );

                    return;
                }

                if (
                    !file.name
                        .toLowerCase()
                        .endsWith(".json")
                ) {
                    alert(
                        window.i18nGetText(
                            "alert-require-json"
                        )
                    );

                    return;
                }

                const reader =
                    new FileReader();

                reader.onload = ev => {
                    try {
                        const data =
                            JSON.parse(
                                ev.target.result
                            );

                        const version =
                            validateLoadedData(
                                data,
                                {
                                    showAlert: true
                                }
                            );

                        if (!version) {
                            return;
                        }

                        applyLoadedData(data);
                        updateEditButtonState();
                        saveToLocal();

                        alert(
                            `${window.i18nGetText(
                                "alert-load-success"
                            )}\n(v${version})`
                        );
                    }
                    catch {
                        alert(
                            window.i18nGetText(
                                "alert-load-fail"
                            )
                        );
                    }
                };

                reader.readAsText(file);
            }
        );
    }

    // --- 色追加 ---
    if ($("btn-add-color")) {
        $("btn-add-color").onclick = () => {
            const old = $("color-ui");

            if (old) {
                old.remove();
            }

            const ui =
                document.createElement("div");

            ui.id = "color-ui";

            ui.style =
                "position:fixed;" +
                "top:50%;" +
                "left:50%;" +
                "transform:translate(-50%,-50%);" +
                "background:#c0c0c0;" +
                "border:2px outset;" +
                "padding:12px;" +
                "z-index:9999;" +
                "display:flex;" +
                "gap:5px";

            const pk =
                document.createElement("input");

            pk.type = "color";
            pk.value = "#000000";

            pk.setAttribute(
                "aria-label",
                window.i18nGetText(
                    "label-color-pick"
                )
            );

            const btn =
                document.createElement("button");

            btn.textContent = "追加";

            btn.onclick = () => {
                const oldTransIdx = palette.length - 1;
                palette.splice(
                    palette.length - 1,
                    0,
                    pk.value
                );
                const newTransIdx = palette.length - 1;

                // 透明色だったピクセルを新しい透明インデックスに追従
                pixels.forEach(p => {
                    if (Number(p.dataset.colorIndex) === oldTransIdx) {
                        p.dataset.colorIndex = newTransIdx;
                    }
                });

                currentColorIndex =
                    palette.length - 2;

                createPalette();
                updateEditButtonState();
                saveToLocal();

                ui.remove();
            };

            const cancel =
                document.createElement("button");

            cancel.textContent = "×";

            cancel.onclick = () => {
                ui.remove();
            };

            ui.appendChild(pk);
            ui.appendChild(btn);
            ui.appendChild(cancel);

            document.body.appendChild(ui);
        };
    }

    // --- 色削除 ---
    if ($("btn-remove-color")) {
        $("btn-remove-color").onclick = () => {
            if (
                currentColorIndex <
                FIXED_COLORS_START.length ||
                currentColorIndex ===
                palette.length - 1
            ) {
                alert(
                    window.i18nGetText(
                        "alert-cannot-delete-color"
                    )
                );

                return;
            }

            const deletedIdx = currentColorIndex;
            palette.splice(
                deletedIdx,
                1
            );
            const newTransIdx = palette.length - 1;

            // ピクセルのインデックスを更新：
            // - 削除された色で塗られていたピクセルは透明に戻す
            // - 削除された色より後ろのインデックスだったピクセルは 1 つ前に詰める
            pixels.forEach(p => {
                const idx = Number(p.dataset.colorIndex);
                if (idx === deletedIdx) {
                    p.dataset.colorIndex = newTransIdx;
                    p.style.backgroundColor = "transparent";
                } else if (idx > deletedIdx) {
                    p.dataset.colorIndex = idx - 1;
                }
            });

            currentColorIndex = 0;

            createPalette();
            updateEditButtonState();
            saveToLocal();
        };
    }

    // --- 色編集 ---
    if (editColorBtn) {
        editColorBtn.onclick = () => {
            // 追加色のみ編集可能
            if (
                currentColorIndex < FIXED_COLORS_START.length ||
                currentColorIndex >= palette.length - 1
            ) {
                return;
            }

            const old = $("color-ui");

            if (old) {
                old.remove();
            }

            const ui =
                document.createElement("div");

            ui.id = "color-ui";

            ui.style =
                "position:fixed;" +
                "top:50%;" +
                "left:50%;" +
                "transform:translate(-50%,-50%);" +
                "background:#c0c0c0;" +
                "border:2px outset;" +
                "padding:12px;" +
                "z-index:9999;" +
                "display:flex;" +
                "gap:5px";

            const pk =
                document.createElement("input");

            pk.type = "color";
            pk.value = palette[currentColorIndex];

            pk.setAttribute(
                "aria-label",
                window.i18nGetText(
                    "label-color-pick"
                )
            );

            const btn =
                document.createElement("button");

            btn.textContent = "変更";

            btn.onclick = () => {
                palette[currentColorIndex] = pk.value;

                // 描画済みピクセルの色も反映
                pixels.forEach(p => {
                    if (Number(p.dataset.colorIndex) === currentColorIndex) {
                        p.style.backgroundColor = pk.value;
                    }
                });

                createPalette();
                updateEditButtonState();
                saveToLocal();

                ui.remove();
            };

            const cancel =
                document.createElement("button");

            cancel.textContent = "×";

            cancel.onclick = () => {
                ui.remove();
            };

            ui.appendChild(pk);
            ui.appendChild(btn);
            ui.appendChild(cancel);

            document.body.appendChild(ui);
        };
    }

    // --- パレットリセット ---
    if ($("btn-reset-palette")) {
        $("btn-reset-palette").onclick = () => {
            if (
                confirm(
                    window.i18nGetText(
                        "confirm-reset-palette"
                    )
                )
            ) {
                palette = [
                    ...FIXED_COLORS_START,
                    FIXED_COLOR_END
                ];

                const newTransIdx = palette.length - 1;
                pixels.forEach(p => {
                    const idx = Number(p.dataset.colorIndex);
                    // 追加色または旧透明色だったピクセルは透明にリセット
                    if (idx >= FIXED_COLORS_START.length) {
                        p.dataset.colorIndex = newTransIdx;
                        p.style.backgroundColor = "transparent";
                    }
                });

                currentColorIndex = 0;

                createPalette();
                updateEditButtonState();
                saveToLocal();
            }
        };
    }

    // --- キャンバスリセット ---
    if ($("btn-reset")) {
        $("btn-reset").onclick = () => {
            if (
                confirm(
                    window.i18nGetText(
                        "confirm-clear-board"
                    )
                )
            ) {
                pixels.forEach(p => {
                    p.style.backgroundColor =
                        "transparent";

                    p.dataset.colorIndex =
                        palette.length - 1;
                });

                saveToLocal();
            }
        };
    }

    // --- 描画イベント ---
    if (canvasEl) {
        const handleMove = e => {
            if (!isDrawing) return;

            const clientX =
                e.touches
                    ? e.touches[0].clientX
                    : e.clientX;

            const clientY =
                e.touches
                    ? e.touches[0].clientY
                    : e.clientY;

            const target =
                document.elementFromPoint(
                    clientX,
                    clientY
                );

            if (
                target &&
                target.classList.contains("pixel")
            ) {
                paint(target);
            }
        };

        canvasEl.onpointerdown = e => {
            isDrawing = true;

            paint(e.target);

            canvasEl.setPointerCapture(
                e.pointerId
            );
        };

        canvasEl.onpointermove = e => {
            handleMove(e);
        };

        window.onpointerup = () => {
            if (isDrawing) {
                isDrawing = false;
                saveToLocal();
            }
        };
    }

    // --- タイトル変更 ---
    if (titleInput) {
        titleInput.oninput = saveToLocal;
    }

    // --- 起動処理 ---
    window.addEventListener(
        "load",
        () => {
            updateFooter();

            const saved =
                localStorage.getItem(
                    STORAGE_KEY
                );

            if (saved) {
                try {
                    const d =
                        JSON.parse(saved);

                    const version =
                        validateLoadedData(d);

                    if (!version) {
                        throw new Error(
                            "INVALID_CACHED_DATA"
                        );
                    }

                    applyLoadedData(d);
                    updateEditButtonState();
                }
                catch {
                    createPalette();
                    updateEditButtonState();
                }
            }
            else {
                createPalette();
                updateEditButtonState();
            }
        }
    );
})();
