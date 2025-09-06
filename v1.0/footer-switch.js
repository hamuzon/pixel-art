(() => {
  const baseYear = 2025;
  const currentYear = new Date().getFullYear();
  const yearDisplay = currentYear > baseYear ? `${baseYear}~${currentYear}` : `${baseYear}`;

  const host = location.hostname.toLowerCase();

  const footerHamusata = document.getElementById("footer-hamusata");
  const footerHamuzon = document.getElementById("footer-hamuzon");
  const footerOther = document.getElementById("footer-other");

  const yearHamusata = document.getElementById("year-hamusata");
  const yearHamuzon = document.getElementById("year-hamuzon");
  const yearOther = document.getElementById("year-other");

  yearHamusata.textContent = yearDisplay;
  yearHamuzon.textContent = yearDisplay;
  yearOther.textContent = yearDisplay;

  const linkHamuzon = document.getElementById("link-hamuzon");

  if (host === "pixel-art.hamusata.f5.si" || host === "home.hamusata.f5.si") {
    footerHamusata.style.display = "inline";
  } else if (host === "hamuzon.github.io") {
    footerHamuzon.style.display = "inline";
    linkHamuzon.href = "https://github.com/Hamuzon";
    linkHamuzon.textContent = "@hamuzon";
  } else if (host === "hamuzon-jp.f5.si") {
    footerHamuzon.style.display = "inline";
    linkHamuzon.href = "https://hamuzon-jp.f5.si";
    linkHamuzon.textContent = "@hamuzon";
  } else {
    footerOther.style.display = "inline";
  }
})();
