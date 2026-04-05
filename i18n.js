const appTranslations = {
  ja: {
    // Top page
    "select-version": "バージョンを選択して起動してください:",
    "open-v1.0": "v1.0 を開く",
    "open-v1.1": "v1.1 を開く",
    "open-v2.0": "v2.0 を開く",
    "open-v2.1": "v2.1 を開く",
    "update-v1.0": "正式版初回リリース。JSON保存・読込、画像保存 PNG/JPEG 対応。",
    "update-v1.1": "COLOR 追加対応。削除はボードリセットか保存JSONデータ編集のみ。",
    "update-v2.0": "パレットの色削除に対応。UIブラッシュアップ、ファイルサイズ縮小、内部コード改良。",
    "update-v2.1": "パレットの色の仕組みを変更。",
    "version-auto-detect-note": "※一部のバージョンではパレット数を元に読み込みバージョンを自動判別します",
    
    // Editor pages
    "label-lang-select": "言語を選択",
    "label-title": "作品名:",
    "placeholder-title": "作品名を入力してください",
    "btn-add-color": "色を追加",
    "btn-remove-color": "選択色を削除",
    "btn-reset-palette": "初期化",
    "btn-reset": "ボードをリセット",
    "btn-save": "JSONで保存",
    "btn-load": "JSON読み込み",
    "btn-img-save": "画像保存",
    
    // Alerts
    "alert-file-not-selected": "ファイルが選択されていません。",
    "alert-require-json": "JSONファイルを選択してください。",
    "alert-wrong-app": "【エラー: アプリが異なります】\nこのファイルは PixelDraw のデータではありません。\n違うアプリで保存されたか、ファイルが破損している可能性があります。",
    "alert-unsupported-version": "【エラー: 非対応のバージョンです】\nこのページでは、読み込んだバージョンに対応していません。\n新しいバージョンで保存されたデータの場合は、新しいページで開いてください。",
    "alert-canvas-size": "【エラー: キャンバスサイズ不一致】\nこのページのサイズと読み込んだデータはサイズが異なります。",
    "alert-data-corrupt": "【エラー: データ破損】\nデータが正しく読み込めません。ファイルが破損している可能性があります。",
    "alert-load-success": "作品を読み込みました。",
    "alert-load-version": "読み込みバージョン",
    "alert-load-fail": "【エラー: 読み込み失敗】\nファイルの中身を読み取れませんでした。\nファイル形式が正しいJSONファイルか確認してください。",
    "alert-cannot-delete-color": "この色は削除できません。",
    "confirm-reset-palette": "パレットをリセットしますか？",
    "confirm-clear-board": "クリアしますか？"
  },
  en: {
    // Top page
    "select-version": "Please select a version to launch:",
    "open-v1.0": "Open v1.0",
    "open-v1.1": "Open v1.1",
    "open-v2.0": "Open v2.0",
    "open-v2.1": "Open v2.1",
    "update-v1.0": "First official release. JSON save/load, PNG/JPEG image export supported.",
    "update-v1.1": "Added COLOR support. Deletion requires board reset or editing the saved JSON.",
    "update-v2.0": "Added palette color deletion. UI brushed up, file size reduced, internal code improved.",
    "update-v2.1": "Changed the palette color mechanism.",
    "version-auto-detect-note": "*Note: Some versions automatically detect the loading version based on the number of palette colors.",

    // Editor pages
    "label-lang-select": "Select Language",
    "label-title": "Title:",
    "placeholder-title": "Enter artwork title",
    "btn-add-color": "Add Color",
    "btn-remove-color": "Remove Color",
    "btn-reset-palette": "Reset",
    "btn-reset": "Reset Board",
    "btn-save": "Save as JSON",
    "btn-load": "Load JSON",
    "btn-img-save": "Save Image",

    // Alerts
    "alert-file-not-selected": "No file selected.",
    "alert-require-json": "Please select a JSON file.",
    "alert-wrong-app": "[Error: Different App]\nThis file is not PixelDraw data.\nIt might be saved by a different app, or the file is corrupted.",
    "alert-unsupported-version": "[Error: Unsupported Version]\nThis page does not support the loaded version.\nPlease open in a newer version page if it's saved with a newer app.",
    "alert-canvas-size": "[Error: Canvas Size Mismatch]\nThe size of this page and the loaded data are different.",
    "alert-data-corrupt": "[Error: Data Corrupted]\nData could not be read properly. The file might be corrupted.",
    "alert-load-success": "Artwork loaded successfully.",
    "alert-load-version": "Loaded version",
    "alert-load-fail": "[Error: Load Failed]\nCould not read the file content.\nPlease ensure it is a valid JSON file.",
    "alert-cannot-delete-color": "This color cannot be deleted.",
    "confirm-reset-palette": "Reset the palette?",
    "confirm-clear-board": "Clear the board?"
  }
};

window.i18nSetLanguage = function(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem("app-lang", lang);
  
  // Translate data-i18n texts
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (appTranslations[lang] && appTranslations[lang][key]) {
      el.textContent = appTranslations[lang][key];
    }
  });

  // Translate aria-labels if data-i18n-label exists
  document.querySelectorAll("[data-i18n-label]").forEach(el => {
    const key = el.getAttribute("data-i18n-label");
    if (appTranslations[lang] && appTranslations[lang][key]) {
      el.setAttribute("aria-label", appTranslations[lang][key]);
    }
  });

  // Translate placeholders if data-i18n-placeholder exists
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (appTranslations[lang] && appTranslations[lang][key]) {
      el.placeholder = appTranslations[lang][key];
    }
  });
  
  // Dispatch a custom event so other scripts can re-render if needed
  window.dispatchEvent(new Event("languageChanged"));
  return lang;
};

window.i18nGetLanguage = function() {
  const saved = localStorage.getItem("app-lang");
  if (saved && appTranslations[saved]) return saved;
  
  // Auto-detect browser language
  const browserLang = navigator.language.split('-')[0]; // e.g., 'ja-JP' -> 'ja'
  return appTranslations[browserLang] ? browserLang : "en";
};

window.i18nGetText = function(key) {
  const lang = window.i18nGetLanguage();
  return (appTranslations[lang] && appTranslations[lang][key]) ? appTranslations[lang][key] : key;
};

window.initI18n = function() {
  const currentLang = window.i18nGetLanguage();
  window.i18nSetLanguage(currentLang);

  const langSelect = document.getElementById("lang-select");
  if (langSelect) {
    langSelect.value = appTranslations[currentLang] ? currentLang : "en";
    langSelect.addEventListener("change", (e) => {
      window.i18nSetLanguage(e.target.value);
    });
  }
};

document.addEventListener("DOMContentLoaded", window.initI18n);
