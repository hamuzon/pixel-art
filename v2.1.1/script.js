(() => {
    // --- 定数 ---
    const APP_NAME = "PixelDraw";
    const ACCEPTED_APP_NAMES = ["PixelDraw", "art.pixel"];
    const APP_VERSION = "2.1";
    const WIDTH = 16;
    const HEIGHT = 16;
    const STORAGE_KEY = "pixelDrawingData-v2.1";
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

            btn.className = `color-btn ${
                isTrans ? "transparent" : ""
            } ${
                i === currentColorIndex ? "selected" : ""
            }`;

            btn.style.backgroundColor = isTrans ? "transparent" : color;

            btn.title =
                i < FIXED_COLORS_START.length || i === palette.length - 1
                    ? `固定色: ${color}`
                    : `追加色: ${color}`;

            btn.onclick = () => {
                currentColorIndex = i;
                createPalette();
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

            res.push([val, count]);
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

            // v1.1互換
            if (
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

            // v2.1
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
            const idx =
                indices[i] !== undefined
                    ? indices[i]
                    : palette.length - 1;

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
        const data = {
            a: APP_NAME,
            v: APP_VERSION,
            t: titleInput ? titleInput.value : "",
            pl: palette,
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
        "2.1"
    ];

    // --- 読み込みデータ適用 ---
    const applyLoadedData = d => {
        palette =
            d.pl ||
            d.palette ||
            [...FIXED_COLORS_START, FIXED_COLOR_END];

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

        // PixelDraw / art.pixel の両方を許可
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
            const data = {
                a: APP_NAME,
                v: APP_VERSION,
                t: titleInput
                    ? titleInput.value.trim() || undefined
                    : undefined,
                pl: palette,
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

                        if (
                            Array.isArray(
                                data.pl ||
                                data.palette
                            )
                        ) {
                            palette =
                                data.pl ||
                                data.palette;

                            createPalette();
                        }
                        else {
                            createPalette();
                        }

                        decompress(
                            data.px ||
                            data.pixels
                        );

                        if (titleInput) {
                            titleInput.value =
                                data.t ||
                                data.title ||
                                "";
                        }

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
                palette.splice(
                    palette.length - 1,
                    0,
                    pk.value
                );

                currentColorIndex =
                    palette.length - 2;

                createPalette();
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

            palette.splice(
                currentColorIndex,
                1
            );

            currentColorIndex = 0;

            createPalette();
            saveToLocal();
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

                currentColorIndex = 0;

                createPalette();
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
                }
                catch {
                    createPalette();
                }
            }
            else {
                createPalette();
            }
        }
    );
})();
