document.addEventListener("DOMContentLoaded", () => {
  const baseYear = 2025;
  const currentYear = new Date().getFullYear();
  const yearDisplay = currentYear > baseYear ? `${baseYear}~${currentYear}` : `${baseYear}`;

  document.querySelectorAll(".year").forEach(el => {
    el.textContent = yearDisplay;
  });

  const host = location.hostname.toLowerCase();
  const container = document.getElementById("footer-link-container");
  if (!container) return;

  let linkHref = "";
  let linkText = "";

  if (host.endsWith("hamusata.f5.si")) {
    linkHref = "https://hamusata.f5.si";
    linkText = "@hamusata";
  } else if (host.endsWith("hamuzon.github.io")) {
    linkHref = "https://github.com/Hamuzon";
    linkText = "@hamuzon";
  } else if (host.endsWith("hamuzon-jp.f5.si")) {
    linkHref = "https://hamuzon-jp.f5.si";
    linkText = "@hamuzon";
  }

  if (linkHref) {
    container.innerHTML = ` <a href="${linkHref}" target="_blank" rel="noopener noreferrer">${linkText}</a>`;
  }
});