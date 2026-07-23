# Selvaganesh | 3D AI/ML Engineer Portfolio

A premium, state-of-the-art interactive 3D developer portfolio. The website features a persistent WebGL substrate simulating an agent orchestration network, driven dynamically by scrolling and user pointer interactions, with a high-fidelity glassmorphism HUD interface.

Check out the repository: [github.com/selvaganesh19/3D-Portfolio](https://github.com/selvaganesh19/3D-Portfolio)

---

## 🚀 Key Features

*   **Persistent 3D Substrate**: Built using **Three.js** and custom GLSL vertex/fragment shaders. Renders an interactive agent orchestration graph containing core orchestrator nodes, sparse agent connections, rotating geometric containment fields, and moving data packet streams.
*   **Dynamic Scroll Choreography**: Uses **GSAP (GreenSock Animation Platform)** with **ScrollTrigger** to guide the 3D scene smoothly through different viewport configurations (translation, rotation, scale, energy intensity, camera distance) as you scroll down the page.
*   **Hacker Headline scramble**: A JavaScript-driven textual scrambler effect triggers on mouse hover over the major typography sections (`SELVA GANESH`).
*   **Cursor Follower**: Fluid cursor follower with deceleration that reacts dynamically (expanding or shrinking) depending on whether the pointer is over clickable link targets or interactive cards.
*   **PWA (Progressive Web App)**: Complete offline capability and installation prompt support powered by service workers and cache policies configured in `sw.js` and `manifest.json`.
*   **Performance Metrics HUD**: Displays agent connections, shipped projects, certifications, and current scroll progress readouts.
*   **Visitor Counter API**: A live visitor counter integrating with `api.counterapi.dev` to count page visits asynchronously.
*   **Contact Form**: Production-ready form integrated directly with FormSubmit for seamless messaging.

---

## 🛠️ Technology Stack

*   **Structure**: HTML5, Semantic Elements
*   **Styling**: Custom CSS3, CSS variables, Glassmorphism design elements, Custom typography (JetBrains Mono & Sora)
*   **Animation**: GSAP (ScrollTrigger, Batch animation system)
*   **3D Graphics**: Three.js, Custom WebGL Shaders (GLSL)
*   **Offline/App Capabilities**: Service Workers (PWA), `manifest.json`
*   **Libraries**:
    *   `Three.js` (r128)
    *   `GSAP` (v3.12.5)
    *   `vanilla-tilt.js` (v1.8.1) — tilt-on-hover physics for cards
    *   `Bootstrap Icons` (v1.10.5)

---

## 📂 Project Structure

```
3D-Portfolio/
├── icons/                 # PWA icons (Android, Apple, Favicon sizes)
├── images/                # Project preview screenshots
├── index.html             # Core layout, SEO meta tags, and HUD elements
├── style.css              # Custom styling, fonts, variables, and layouts
├── scene.js               # WebGL substrate, shaders, and particle systems
├── script.js              # UI events, cursor tracking, and GSAP choreography
├── sw.js                  # Service worker for PWA assets caching
├── manifest.json          # PWA installation properties
├── favicon.ico            # Root favicon
├── Selva-resume.pdf       # Integrated downloadable resume
├── vanilla-tilt_min.js    # Local vanilla-tilt library
├── skill1.jpg             # Generated futuristic orb asset for skills
└── README.md              # Documentation
```

---

## 📦 Local Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/selvaganesh19/3D-Portfolio.git
   cd 3D-Portfolio
   ```

2. **Serve the Project**:
   Since the project references custom local scripts and service workers, running it directly from `file://` might block local storage or caching. Serve it using a local HTTP server:
   * **Node.js**:
     ```bash
     npx serve .
     ```
   * **Python**:
     ```bash
     python -m http.server 8000
     ```

3. **Open in Browser**:
   Navigate to `http://localhost:5000` (or `http://localhost:8000` for Python) in your browser.

---

## 🎨 Production Optimizations Added
*   **Local Caching Assets**: Added local `vanilla-tilt_min.js` and resolved the missing `skill1.jpg` references, eliminating PWA registration failures in production environments.
*   **Root Favicon Compatibility**: Configured a copy of `favicon.ico` in the root folder to prevent automatic client-side 404 console errors.
*   **Clean Commit History**: Organized and pushed directly to `origin/main` on Git.
