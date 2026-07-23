/* =========================================================
   scene.js — persistent WebGL substrate
   One scene, one canvas, driven by scroll + pointer.
   Layers: agent orchestration graph (core + agent nodes + edges
   + traveling data packets) · orbital dust · grid floor
   ========================================================= */
(function () {
  "use strict";

  var canvas = document.getElementById("gl");
  if (!canvas || typeof THREE === "undefined") return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var mobile = window.innerWidth < 700;

  /* ---------- renderer ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !mobile,
      alpha: true,
      powerPreference: "high-performance"
    });
  } catch (e) {
    canvas.style.display = "none";
    return;
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x04070f, 0.028);

  var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0, 15);

  var world = new THREE.Group();
  scene.add(world);

  /* ---------- 1. agent network: orchestrator + connected agent nodes ---------- */
  var RADIUS = 4.2;
  var AGENT_COUNT = mobile ? 9 : 16;

  var agentPos = [];
  var agentSeed = [];
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < AGENT_COUNT; i++) {
    var t = (i + 0.5) / AGENT_COUNT;
    var y = 1 - t * 2;
    var r = Math.sqrt(Math.max(0, 1 - y * y));
    var th = golden * i;
    agentPos.push(new THREE.Vector3(Math.cos(th) * r * RADIUS, y * RADIUS, Math.sin(th) * r * RADIUS));
    agentSeed.push(Math.random());
  }

  // orchestrator core — a small wireframe icosahedron + a bright glow point at the origin
  var coreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.5, 1),
    new THREE.MeshBasicMaterial({ color: 0x8ffbe0, wireframe: true, transparent: true, opacity: 0.55 })
  );
  world.add(coreMesh);

  // shared point-glow shader — used for both the core spark and every agent node
  function makeNodeMaterial(size) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: size },
        uPixelRatio: { value: renderer.getPixelRatio() },
        uEnergy: { value: 1.0 }
      },
      vertexShader: [
        "attribute float aScale;",
        "attribute float aSeed;",
        "attribute vec3 aColor;",
        "uniform float uTime;",
        "uniform float uSize;",
        "uniform float uPixelRatio;",
        "varying float vSeed;",
        "varying vec3 vColor;",
        "varying float vFace;",
        "void main() {",
        "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
        "  gl_PointSize = uSize * aScale * uPixelRatio * (1.0 / -mv.z);",
        "  gl_Position = projectionMatrix * mv;",
        "  vSeed = aSeed;",
        "  vColor = aColor;",
        "  vFace = clamp((-mv.z - 8.0) / 12.0, 0.0, 1.0);",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uTime;",
        "uniform float uEnergy;",
        "varying float vSeed;",
        "varying vec3 vColor;",
        "varying float vFace;",
        "void main() {",
        "  vec2 c = gl_PointCoord - 0.5;",
        "  float d = length(c);",
        "  if (d > 0.44) discard;",
        "  float core = smoothstep(0.44, 0.08, d);",
        "  float ring = smoothstep(0.44, 0.32, d) - smoothstep(0.32, 0.2, d);",
        "  float pulse = 0.75 + 0.25 * sin(uTime * 1.6 + vSeed * 30.0);",
        "  float depthFade = 1.0 - vFace * 0.55;",
        "  float a = (core * 0.6 + ring) * pulse * depthFade * uEnergy;",
        "  gl_FragColor = vec4(vColor, a);",
        "}"
      ].join("\n")
    });
  }

  // agent nodes
  var agentPositions = new Float32Array(AGENT_COUNT * 3);
  var agentScales = new Float32Array(AGENT_COUNT);
  var agentSeeds = new Float32Array(AGENT_COUNT);
  var agentColors = new Float32Array(AGENT_COUNT * 3);
  var palette = [new THREE.Color(0x0a7cff), new THREE.Color(0x22d3ee), new THREE.Color(0x3cffc5)];

  for (var a = 0; a < AGENT_COUNT; a++) {
    agentPositions[a * 3] = agentPos[a].x;
    agentPositions[a * 3 + 1] = agentPos[a].y;
    agentPositions[a * 3 + 2] = agentPos[a].z;
    agentScales[a] = 0.85 + Math.random() * 0.5;
    agentSeeds[a] = agentSeed[a];
    var col = palette[a % palette.length];
    agentColors[a * 3] = col.r;
    agentColors[a * 3 + 1] = col.g;
    agentColors[a * 3 + 2] = col.b;
  }

  var agentGeo = new THREE.BufferGeometry();
  agentGeo.setAttribute("position", new THREE.BufferAttribute(agentPositions, 3));
  agentGeo.setAttribute("aScale", new THREE.BufferAttribute(agentScales, 1));
  agentGeo.setAttribute("aSeed", new THREE.BufferAttribute(agentSeeds, 1));
  agentGeo.setAttribute("aColor", new THREE.BufferAttribute(agentColors, 3));
  var agentMat = makeNodeMaterial(mobile ? 46.0 : 58.0);
  var agentNodes = new THREE.Points(agentGeo, agentMat);
  world.add(agentNodes);

  // core glow spark (single point at the origin)
  var coreGeo = new THREE.BufferGeometry();
  coreGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
  coreGeo.setAttribute("aScale", new THREE.BufferAttribute(new Float32Array([1]), 1));
  coreGeo.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array([0.42]), 1));
  coreGeo.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array([0.56, 0.98, 0.88]), 3));
  var coreMat = makeNodeMaterial(mobile ? 78.0 : 98.0);
  var coreSpark = new THREE.Points(coreGeo, coreMat);
  world.add(coreSpark);

  /* ---------- edges: orchestrator -> agents, and a sparse agent mesh ---------- */
  var edgeList = []; // { start: Vector3, end: Vector3, color: Color, speed, seed }

  var coreLinePositions = [];
  for (var e = 0; e < AGENT_COUNT; e++) {
    var p = agentPos[e];
    coreLinePositions.push(0, 0, 0, p.x, p.y, p.z);
    edgeList.push({ start: new THREE.Vector3(0, 0, 0), end: p.clone(), color: palette[e % palette.length], speed: 0.25 + Math.random() * 0.2, seed: Math.random() });
  }
  var coreLineGeo = new THREE.BufferGeometry();
  coreLineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(coreLinePositions), 3));
  var coreLineMat = new THREE.LineBasicMaterial({ color: 0x2ea8ff, transparent: true, opacity: 0.22 });
  var coreLines = new THREE.LineSegments(coreLineGeo, coreLineMat);
  world.add(coreLines);

  var meshLinePositions = [];
  var crossStep = Math.max(2, Math.floor(AGENT_COUNT / 3));
  for (var m = 0; m < AGENT_COUNT; m++) {
    var pa = agentPos[m];
    var pb = agentPos[(m + 1) % AGENT_COUNT];
    meshLinePositions.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    edgeList.push({ start: pa.clone(), end: pb.clone(), color: palette[(m + 1) % palette.length], speed: 0.18 + Math.random() * 0.16, seed: Math.random() });

    if (m % crossStep === 0) {
      var pc = agentPos[(m + Math.floor(AGENT_COUNT / 2)) % AGENT_COUNT];
      meshLinePositions.push(pa.x, pa.y, pa.z, pc.x, pc.y, pc.z);
      edgeList.push({ start: pa.clone(), end: pc.clone(), color: palette[m % palette.length], speed: 0.14 + Math.random() * 0.12, seed: Math.random() });
    }
  }
  var meshLineGeo = new THREE.BufferGeometry();
  meshLineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(meshLinePositions), 3));
  var meshLineMat = new THREE.LineBasicMaterial({ color: 0x1fd7c4, transparent: true, opacity: 0.12 });
  var meshLines = new THREE.LineSegments(meshLineGeo, meshLineMat);
  world.add(meshLines);

  /* ---------- traveling data packets along every edge ---------- */
  var PKT = edgeList.length;
  var pktPositions = new Float32Array(PKT * 3);
  var pktColors = new Float32Array(PKT * 3);
  var pktSeeds = new Float32Array(PKT);
  var pktScales = new Float32Array(PKT);

  for (var pk = 0; pk < PKT; pk++) {
    pktColors[pk * 3] = edgeList[pk].color.r;
    pktColors[pk * 3 + 1] = edgeList[pk].color.g;
    pktColors[pk * 3 + 2] = edgeList[pk].color.b;
    pktSeeds[pk] = edgeList[pk].seed;
    pktScales[pk] = 0.6 + Math.random() * 0.5;
  }

  var pktGeo = new THREE.BufferGeometry();
  pktGeo.setAttribute("position", new THREE.BufferAttribute(pktPositions, 3));
  pktGeo.setAttribute("aColor", new THREE.BufferAttribute(pktColors, 3));
  pktGeo.setAttribute("aSeed", new THREE.BufferAttribute(pktSeeds, 1));
  pktGeo.setAttribute("aScale", new THREE.BufferAttribute(pktScales, 1));

  var pktMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPixelRatio: { value: renderer.getPixelRatio() },
      uEnergy: { value: 1.0 }
    },
    vertexShader: [
      "attribute float aScale;",
      "attribute vec3 aColor;",
      "uniform float uPixelRatio;",
      "varying vec3 vColor;",
      "void main() {",
      "  vColor = aColor;",
      "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
      "  gl_PointSize = 26.0 * aScale * uPixelRatio * (1.0 / -mv.z);",
      "  gl_Position = projectionMatrix * mv;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform float uEnergy;",
      "varying vec3 vColor;",
      "void main() {",
      "  float d = length(gl_PointCoord - 0.5);",
      "  if (d > 0.5) discard;",
      "  float core = smoothstep(0.5, 0.0, d);",
      "  gl_FragColor = vec4(vColor, core * uEnergy * 0.9);",
      "}"
    ].join("\n")
  });

  var packets = new THREE.Points(pktGeo, pktMat);
  world.add(packets);

  /* ---------- outer containment field (subtle, geometric) ---------- */
  var containment = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(RADIUS * 1.85, 1)),
    new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.06 })
  );
  world.add(containment);

  /* ---------- 3. orbital dust ---------- */
  var DUST = mobile ? 1200 : 3000;
  var dpos = new Float32Array(DUST * 3);
  var dseed = new Float32Array(DUST);
  var dscale = new Float32Array(DUST);

  for (var j = 0; j < DUST; j++) {
    var rad = 9 + Math.random() * 26;
    var ang = Math.random() * Math.PI * 2;
    dpos[j * 3] = Math.cos(ang) * rad;
    dpos[j * 3 + 1] = (Math.random() - 0.5) * 30;
    dpos[j * 3 + 2] = Math.sin(ang) * rad - 8;
    dseed[j] = Math.random();
    dscale[j] = 0.3 + Math.random() * 1.1;
  }

  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(dseed, 1));
  dustGeo.setAttribute("aScale", new THREE.BufferAttribute(dscale, 1));

  var dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: renderer.getPixelRatio() }
    },
    vertexShader: [
      "attribute float aSeed;",
      "attribute float aScale;",
      "uniform float uTime;",
      "uniform float uPixelRatio;",
      "varying float vSeed;",
      "void main() {",
      "  vec3 p = position;",
      "  p.y += sin(uTime * 0.25 + aSeed * 6.2831) * 1.4;",
      "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
      "  gl_PointSize = 90.0 * aScale * uPixelRatio * (1.0 / -mv.z);",
      "  gl_Position = projectionMatrix * mv;",
      "  vSeed = aSeed;",
      "}"
    ].join("\n"),
    fragmentShader: [
      "uniform float uTime;",
      "varying float vSeed;",
      "void main() {",
      "  float d = length(gl_PointCoord - 0.5);",
      "  if (d > 0.5) discard;",
      "  float core = smoothstep(0.5, 0.0, d);",
      "  float tw = 0.35 + 0.65 * sin(uTime * 1.3 + vSeed * 44.0);",
      "  gl_FragColor = vec4(vec3(0.42, 0.72, 1.0), core * tw * 0.42);",
      "}"
    ].join("\n")
  });

  var dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ---------- 4. grid floor ---------- */
  var grid = new THREE.GridHelper(90, 46, 0x0a7cff, 0x0a7cff);
  grid.material.transparent = true;
  grid.material.opacity = 0.06;
  grid.material.blending = THREE.AdditiveBlending;
  grid.position.y = -11;
  scene.add(grid);

  /* ---------- state driven by scroll + pointer ---------- */
  var state = {
    x: 0,          // world x offset
    y: 0,
    z: 0,
    scale: 1,
    camZ: 15,
    energy: 1,
    spin: 0.055,
    shellOpacity: 0.13,
    canvasOpacity: 1
  };
  window.__sceneState = state;

  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", function (e) {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  });

  /* ---------- render loop ---------- */
  var clock = new THREE.Clock();
  var visible = true;
  document.addEventListener("visibilitychange", function () {
    visible = !document.hidden;
    if (visible) clock.getDelta();
  });

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;

    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.getElapsedTime();

    agentMat.uniforms.uTime.value = t;
    coreMat.uniforms.uTime.value = t;

    var targetEnergy = state.energy;
    agentMat.uniforms.uEnergy.value += (targetEnergy - agentMat.uniforms.uEnergy.value) * 0.06;
    coreMat.uniforms.uEnergy.value += (targetEnergy - coreMat.uniforms.uEnergy.value) * 0.06;
    pktMat.uniforms.uEnergy.value += (targetEnergy - pktMat.uniforms.uEnergy.value) * 0.06;

    // travelling data packets — recompute each edge's progress along its line
    var pktAttr = pktGeo.attributes.position.array;
    for (var pk2 = 0; pk2 < PKT; pk2++) {
      var ed = edgeList[pk2];
      var prog = (t * ed.speed + ed.seed) % 1;
      pktAttr[pk2 * 3] = ed.start.x + (ed.end.x - ed.start.x) * prog;
      pktAttr[pk2 * 3 + 1] = ed.start.y + (ed.end.y - ed.start.y) * prog;
      pktAttr[pk2 * 3 + 2] = ed.start.z + (ed.end.z - ed.start.z) * prog;
    }
    pktGeo.attributes.position.needsUpdate = true;

    dustMat.uniforms.uTime.value = t;

    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    world.position.x += (state.x - world.position.x) * 0.06;
    world.position.y += (state.y - world.position.y) * 0.06;
    world.position.z += (state.z - world.position.z) * 0.06;

    var s = world.scale.x + (state.scale - world.scale.x) * 0.06;
    world.scale.set(s, s, s);

    if (!reduced) {
      world.rotation.y += state.spin * dt;
      world.rotation.x += (pointer.y * 0.32 - world.rotation.x) * 0.04;
      world.rotation.y += (pointer.x * 0.06) * dt;

      coreMesh.rotation.y += state.spin * dt * 1.8;
      coreMesh.rotation.x += state.spin * dt * 0.9;
      containment.rotation.y -= state.spin * dt * 0.5;
      containment.rotation.x += state.spin * dt * 0.2;

      dust.rotation.y += 0.012 * dt;
      grid.position.z = ((t * 1.2) % 4) - 2;
    }

    containment.material.opacity += (state.shellOpacity - containment.material.opacity) * 0.06;

    var curOp = parseFloat(canvas.style.opacity || "1");
    canvas.style.opacity = (curOp + (state.canvasOpacity - curOp) * 0.06).toFixed(3);

    camera.position.z += (state.camZ - camera.position.z) * 0.05;
    camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 0.6 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  frame();

  /* ---------- resize ---------- */
  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.5 : 2));
      agentMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      coreMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      pktMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      dustMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    }, 160);
  });
})();