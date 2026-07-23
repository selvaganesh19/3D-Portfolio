/* =========================================================
   script.js — interaction layer
   GSAP ScrollTrigger choreography · scene control · UI
   ========================================================= */

/* ---------------- boot sequence ---------------- */
(function loaderAnimation() {
  var loader = document.getElementById("loader");
  if (!loader) return;
  setTimeout(function () {
    loader.classList.add("done");
    document.body.style.overflow = "";
    if (!window.gsap) {
      document.querySelectorAll(".reveal").forEach(function (el) {
        el.style.opacity = 1;
        el.style.transform = "none";
      });
    } else {
      gsap.fromTo(
        ".hero-reveal",
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.1, stagger: 0.09, ease: "power3.out", delay: 0.25 }
      );
    }
  }, 4100);
  document.body.style.overflow = "hidden";
})();

/* ---------------- scrambling headline ---------------- */
function hack(el) {
  if (!el) return;
  var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var interval = null;
  el.addEventListener("mouseover", function (event) {
    var iteration = 0;
    clearInterval(interval);
    interval = setInterval(function () {
      event.target.innerText = event.target.innerText
        .split("")
        .map(function (letter, index) {
          if (index < iteration) return event.target.dataset.value[index];
          return letters[Math.floor(Math.random() * 26)];
        })
        .join("");
      if (iteration >= event.target.dataset.value.length) clearInterval(interval);
      iteration += 1 / 3;
    }, 30);
  });
}
hack(document.querySelector(".hacker1"));
hack(document.querySelector(".hacker2"));

/* ---------------- cursor follower ---------------- */
(function () {
  var cursor = document.querySelector(".cursor-follower");
  if (!cursor) return;

  var HOVER_SELECTOR = "a, button, .tab-links, input, textarea, [data-tilt]";
  var active = window.innerWidth >= 600;

  window.addEventListener("resize", function () {
    active = window.innerWidth >= 600;
    if (!active) {
      cursor.classList.remove("expand", "shirnk");
      cursor.style.opacity = "0";
    } else {
      cursor.style.opacity = "";
    }
  });

  var mx = 0, my = 0, fx = 0, fy = 0, delay = 0.14;

  document.addEventListener("mousemove", function (e) {
    mx = e.clientX;
    my = e.clientY;
  });

  (function loop() {
    if (active) {
      fx += (mx - fx) * delay;
      fy += (my - fy) * delay;
      cursor.style.transform = "translate(" + fx + "px," + fy + "px) translate(-50%,-50%)";
    }
    requestAnimationFrame(loop);
  })();

  // event delegation — works for every current AND future element (e.g. the
  // PWA install button, which is created after this script runs), instead of
  // a one-time querySelectorAll that misses anything added later.
  document.addEventListener("mouseover", function (e) {
    if (!active) return;
    var el = e.target.closest(HOVER_SELECTOR);
    if (!el) return;
    var cls = el.classList.contains("no-hover-cursor") ? "shirnk" : "expand";
    cursor.classList.add(cls);
  });

  document.addEventListener("mouseout", function (e) {
    if (!active) return;
    var el = e.target.closest(HOVER_SELECTOR);
    if (!el) return;
    var cls = el.classList.contains("no-hover-cursor") ? "shirnk" : "expand";
    cursor.classList.remove(cls);
  });
})();

/* ---------------- skills tabs ---------------- */
function opentab(evt, tabname) {
  var tablinks = document.getElementsByClassName("tab-links");
  var tabcontents = document.getElementsByClassName("tab-contents");
  for (var i = 0; i < tablinks.length; i++) tablinks[i].classList.remove("active-link");
  for (var k = 0; k < tabcontents.length; k++) tabcontents[k].classList.remove("active-tab");
  (evt.currentTarget || evt.target).classList.add("active-link");
  var panel = document.getElementById(tabname);
  panel.classList.add("active-tab");
  if (window.gsap) {
    gsap.fromTo(panel.querySelectorAll("li"),
      { opacity: 0, x: -18 },
      { opacity: 1, x: 0, duration: 0.5, stagger: 0.06, ease: "power2.out" });
  }
}

/* ---------------- visitor counter ---------------- */
(function visitcount() {
  var visit = document.getElementById("visit");
  if (!visit) return;
  fetch("https://api.counterapi.dev/v1/ssr/ssr/up")
    .then(function (r) {
      if (!r.ok) throw new Error("Network response was not ok");
      return r.json();
    })
    .then(function (data) { visit.innerHTML = data.count; })
    .catch(function (err) {
      visit.innerHTML = "—";
      console.error("Counter fetch failed:", err);
    });
})();

/* ---------------- scroll choreography ---------------- */
(function () {
  if (!window.gsap || !window.ScrollTrigger) {
    // CDN unreachable — show everything rather than leaving the page blank
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  var scene = window.__sceneState;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* staggered section reveals */
  ScrollTrigger.batch(".reveal:not(.hero-reveal)", {
    start: "top 88%",
    once: true,
    onEnter: function (targets) {
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.08,
        ease: "power3.out"
      });
    }
  });

  /* scroll rail + coordinate readout */
  var rail = document.getElementById("railFill");
  var coord = document.getElementById("coord");
  ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    onUpdate: function (self) {
      if (rail) rail.style.height = (self.progress * 100).toFixed(2) + "%";
      if (coord) coord.textContent = self.progress.toFixed(3);
    }
  });

  /* nav active state per section */
  var links = document.querySelectorAll(".menu-item");
  ["#page1", "#about", "#skills", "#timeline", "#projects", "#contact"].forEach(function (id, i) {
    var el = document.querySelector(id);
    if (!el) return;
    ScrollTrigger.create({
      trigger: el,
      start: "top 55%",
      end: "bottom 55%",
      onToggle: function (self) {
        if (!self.isActive) return;
        links.forEach(function (l) { l.classList.remove("selected"); });
        if (links[i]) links[i].classList.add("selected");
      }
    });
  });

  if (!scene || reduced) return;

  /* the globe travels through the page — one keyframe per section */
  function stage(trigger, vars) {
    gsap.to(scene, Object.assign({
      ease: "none",
      scrollTrigger: {
        trigger: trigger,
        start: "top 70%",
        end: "top 20%",
        scrub: 1
      }
    }, vars));
  }

  // hero -> about : globe clears out to the far right edge, well past the text column
  stage("#about", { x: 9.5, y: 1.2, z: -10, scale: 0.5, camZ: 16, energy: 0.6, spin: 0.05, shellOpacity: 0.08, canvasOpacity: 0.4 });

  // about -> skills : swings to the left edge, still clear of the copy
  stage("#skills", { x: -9.5, y: -0.6, z: -8, scale: 0.55, camZ: 14, energy: 0.75, spin: 0.12, shellOpacity: 0.14, canvasOpacity: 0.45 });

  // skills -> timeline : centres, drops far back, calm
  stage("#timeline", { x: 0, y: 2, z: -22, scale: 1.1, camZ: 19, energy: 0.4, spin: 0.03, shellOpacity: 0.05, canvasOpacity: 0.3 });

  // timeline -> projects : far back, dim, out of the way of the cards
  stage("#projects", { x: 4, y: -2.5, z: -26, scale: 1.3, camZ: 23, energy: 0.3, spin: 0.02, shellOpacity: 0.04, canvasOpacity: 0.28 });

  // projects -> contact : returns to centre, tight and hot
  stage("#contact", { x: 0, y: 0, z: -3, scale: 0.65, camZ: 13, energy: 1.1, spin: 0.09, shellOpacity: 0.24, canvasOpacity: 0.75 });

  /* hero parallax: headline drifts as you leave */
  gsap.to("#heading", {
    y: -90,
    opacity: 0.15,
    ease: "none",
    scrollTrigger: { trigger: "#page1", start: "top top", end: "bottom top", scrub: 0.6 }
  });

  /* project cards rise on a slight 3D arc */
  gsap.utils.toArray(".work").forEach(function (card, i) {
    gsap.fromTo(card,
      { rotateX: 9, y: 60 },
      {
        rotateX: 0,
        y: 0,
        ease: "power2.out",
        scrollTrigger: { trigger: card, start: "top 92%", end: "top 55%", scrub: 0.8 }
      }
    );
  });

  /* energy pulse when hovering a project */
  document.querySelectorAll(".work").forEach(function (card) {
    card.addEventListener("mouseenter", function () {
      gsap.to(scene, { energy: 0.95, spin: 0.16, duration: 0.6, overwrite: "auto" });
    });
    card.addEventListener("mouseleave", function () {
      gsap.to(scene, { energy: 0.45, spin: 0.02, duration: 0.8, overwrite: "auto" });
    });
  });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();

/* ---------------- telegram bot links ---------------- */
function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

document.addEventListener("DOMContentLoaded", function () {
  var pdfBotDemo = document.getElementById("pdfBotDemo");
  if (pdfBotDemo) {
    pdfBotDemo.href = isMobile()
      ? "tg://resolve?domain=pdf_con_bot"
      : "https://web.telegram.org/a/#7970400236";
  }
  var emailBotDemo = document.getElementById("emailBotDemo");
  if (emailBotDemo) {
    emailBotDemo.href = isMobile()
      ? "tg://resolve?domain=email_chatbot"
      : "https://web.telegram.org/a/#5446888298";
  }
});

/* ---------------- resume download ---------------- */
function downloadResume(event) {
  event.preventDefault();
  event.stopPropagation();
  var link = document.createElement("a");
  link.href = "./Selva-resume.pdf";
  link.download = "Selva-resume.pdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ---------------- PWA ---------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (e) {
      console.log("SW registration failed:", e);
    });
  });
}

(function () {
  var deferredPrompt = null;

  var installContainer = document.createElement("div");
  installContainer.id = "pwa-install-container";
  installContainer.style.cssText = "text-align:center;margin:20px 0;display:none;";

  var installBtn = document.createElement("button");
  installBtn.id = "pwa-install-btn";
  installBtn.className = "button";
  installBtn.innerHTML = "Install Portfolio App";
  installContainer.appendChild(installBtn);

  var footer = document.getElementById("footer");
  if (footer) {
    var footerUl = footer.querySelector("ul");
    if (footerUl) footerUl.insertAdjacentElement("afterend", installContainer);
    else footer.appendChild(installContainer);
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installContainer.style.display = "block";
  });

  installBtn.addEventListener("click", function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      installContainer.style.display = "none";
    });
  });

  window.addEventListener("appinstalled", function () {
    installContainer.style.display = "none";
  });
})();