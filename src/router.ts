/** Tiny client-side router — fetches section HTML fragments into #content */

const content = document.getElementById("content")!;
const navLinks = document.querySelectorAll<HTMLAnchorElement>("nav a[data-section]");
const backdrop = document.getElementById("backdrop")!;
const heroContent = document.getElementById("hero-content")!;

// ── Hero animation ──
requestAnimationFrame(() => backdrop.classList.add("show"));
setTimeout(() => heroContent.classList.add("rise"), 1500);

// ── Copy-to-clipboard helper ──
function fallbackCopy(text: string) {
  const temp = document.createElement("textarea");
  temp.value = text;
  temp.setAttribute("readonly", "");
  temp.style.position = "absolute";
  temp.style.left = "-9999px";
  document.body.appendChild(temp);
  temp.select();
  document.execCommand("copy");
  document.body.removeChild(temp);
}

function bindCopyButtons() {
  content.querySelectorAll<HTMLButtonElement>(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = btn.getAttribute("data-copy") || "";
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          fallbackCopy(text);
        }
      } catch {
        fallbackCopy(text);
      }
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = "Copy"; }, 1500);
    });
  });
}

// ── Confetti ──
let confettiCanvas: HTMLCanvasElement | null = null;
let confettiCtx: CanvasRenderingContext2D | null = null;
let confettiRunning = false;
const confettiColors = ["#8ef6ff", "#ffc857", "#7dd87d", "#ff8fab", "#9b8cff"];

function ensureConfettiCanvas() {
  if (confettiCanvas) return;
  confettiCanvas = document.createElement("canvas");
  confettiCanvas.id = "confetti-canvas";
  confettiCanvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(confettiCanvas);
  confettiCtx = confettiCanvas.getContext("2d");
  const resize = () => {
    confettiCanvas!.width = window.innerWidth;
    confettiCanvas!.height = window.innerHeight;
  };
  window.addEventListener("resize", resize);
  resize();
}

function startConfetti() {
  ensureConfettiCanvas();
  if (!confettiCtx || confettiRunning) return;
  confettiRunning = true;
  const w = confettiCanvas!.width;
  const h = confettiCanvas!.height;
  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * w,
    y: -Math.random() * h * 0.3,
    size: 6 + Math.random() * 8,
    vy: 3 + Math.random() * 4,
    vx: (Math.random() - 0.5) * 4,
    rot: Math.random() * Math.PI * 2,
    rs: (Math.random() - 0.5) * 0.25,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }));
  const duration = 2200;
  const start = performance.now();
  const frame = (now: number) => {
    const elapsed = now - start;
    confettiCtx!.clearRect(0, 0, w, h);
    pieces.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.rot += p.rs;
      if (p.y > h) { p.y = -20; p.x = Math.random() * w; }
      confettiCtx!.save();
      confettiCtx!.translate(p.x, p.y);
      confettiCtx!.rotate(p.rot);
      confettiCtx!.fillStyle = p.color;
      confettiCtx!.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      confettiCtx!.restore();
    });
    if (elapsed < duration) requestAnimationFrame(frame);
    else { confettiCtx!.clearRect(0, 0, w, h); confettiRunning = false; }
  };
  requestAnimationFrame(frame);
}

function bindConfetti() {
  const targets = content.querySelectorAll("[data-confetti]");
  const triggered = new WeakSet();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !triggered.has(entry.target)) {
        triggered.add(entry.target);
        startConfetti();
      }
    });
  }, { threshold: 0.4 });
  targets.forEach((el) => observer.observe(el));
}

// ── Section loader ──
async function loadSection(section: string) {
  try {
    const res = await fetch(`/sections/${section}/index.html`);
    if (!res.ok) throw new Error(res.statusText);
    content.innerHTML = await res.text();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    content.innerHTML = `<div class="error">Section not found.</div>`;
  }

  // Update active state
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.section === section);
  });

  // Bind interactive elements in newly loaded content
  bindCopyButtons();
  bindConfetti();
}

// Handle nav clicks
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const section = link.dataset.section!;
    history.pushState(null, "", `#${section}`);
    loadSection(section);
  });
});

// Handle back/forward
window.addEventListener("popstate", () => {
  const section = location.hash.slice(1) || "why";
  loadSection(section);
});

// Initial load
const initial = location.hash.slice(1) || "why";
loadSection(initial);
