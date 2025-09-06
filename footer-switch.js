(() => {
  const baseYear = 2025;
  const currentYear = new Date().getFullYear();
  const yearDisplay = currentYear > baseYear ? `${baseYear}~${currentYear}` : `${baseYear}`;

  const host = location.hostname.toLowerCase();

  const footers = {
    hamusata: document.getElementById("footer-hamusata"),
    hamuzon: document.getElementById("footer-hamuzon"),
    other: document.getElementById("footer-other"),
  };

  const years = {
    hamusata: document.getElementById("year-hamusata"),
    hamuzon: document.getElementById("year-hamuzon"),
    other: document.getElementById("year-other"),
  };

  Object.values(years).forEach(el => { if(el) el.textContent = yearDisplay; });

  const linkHamuzon = document.getElementById("link-hamuzon");

  // 表示条件
  if (host === "pixel-art.hamusata.f5.si" || host === "home.hamusata.f5.si") {
    if (footers.hamusata) footers.hamusata.style.display = "inline";
  } else if (host === "hamuzon.github.io") {
    if (footers.hamuzon) footers.hamuzon.style.display = "inline";
    if (linkHamuzon) {
      linkHamuzon.href = "https://github.com/Hamuzon";
      linkHamuzon.textContent = "@hamuzon";
    }
  } else if (host === "hamuzon-jp.f5.si") {
    if (footers.hamuzon) footers.hamuzon.style.display = "inline";
    if (linkHamuzon) {
      linkHamuzon.href = "https://hamuzon-jp.f5.si";
      linkHamuzon.textContent = "@hamuzon";
    }
  } else {
    if (footers.other) footers.other.style.display = "inline";
  }
})();
