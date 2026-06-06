import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { useNavigate } from 'react-router-dom';

// ── Geographic data ────────────────────────────────────────────────────────────
const COUNTRIES = [
  { name: 'Turkey',      code: 'tr', lat: 39.0,  lng: 35.0   },
  { name: 'South Korea', code: 'kr', lat: 35.9,  lng: 127.8  },
  { name: 'Thailand',    code: 'th', lat: 15.0,  lng: 100.0  },
  { name: 'Mexico',      code: 'mx', lat: 23.6,  lng: -102.6 },
  { name: 'Colombia',    code: 'co', lat: 4.6,   lng: -74.3  },
  { name: 'Costa Rica',  code: 'cr', lat: 9.7,   lng: -83.8  },
  { name: 'Brazil',      code: 'br', lat: -14.2, lng: -51.9  },
];

// lat/lng → unit sphere position (Three.js Y-up, equirectangular-compatible)
function latLngToVec3(lat, lng, r = 1) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta)
  );
}

// ── Canvas globe texture (equirectangular projection) ─────────────────────────
function buildGlobeTexture() {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // project [lng, lat] → canvas [x, y]
  const p = (lng, lat) => [((lng + 180) / 360) * W, ((90 - lat) / 180) * H];

  // Ocean
  const og = ctx.createLinearGradient(0, 0, 0, H);
  og.addColorStop(0,   '#12305e');
  og.addColorStop(0.45,'#1a5fa0');
  og.addColorStop(1,   '#0c2040');
  ctx.fillStyle = og;
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(80,140,230,0.14)';
  ctx.lineWidth = 1.5;
  for (let ln = -180; ln <= 180; ln += 30) {
    const [x] = p(ln, 0);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let lt = -90; lt <= 90; lt += 30) {
    const [, y] = p(0, lt);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const fill = (pts) => {
    ctx.beginPath();
    const [x0, y0] = p(...pts[0]); ctx.moveTo(x0, y0);
    for (let i = 1; i < pts.length; i++) { const [x, y] = p(...pts[i]); ctx.lineTo(x, y); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  };

  ctx.fillStyle   = '#5d8f45';
  ctx.strokeStyle = '#4a7436';
  ctx.lineWidth   = 2;

  // North America
  fill([[-168,70],[-158,72],[-140,70],[-126,72],[-100,74],[-80,78],[-65,82],[-58,80],
        [-64,72],[-66,60],[-64,46],[-68,44],[-70,42],[-74,38],[-78,34],[-82,30],
        [-88,30],[-90,32],[-92,30],[-96,24],[-104,18],[-85,12],[-79,8],[-85,14],
        [-88,18],[-90,16],[-94,20],[-100,24],[-104,22],[-110,24],[-116,30],
        [-120,34],[-124,40],[-126,48],[-132,56],[-140,60],[-150,60],[-158,58],
        [-164,62],[-168,66]]);

  // Greenland
  fill([[-46,83],[-20,84],[-16,78],[-20,70],[-30,68],[-42,68],[-50,74]]);

  // South America
  fill([[-80,10],[-76,8],[-62,10],[-52,6],[-50,2],[-52,-2],[-44,-4],[-36,-8],
        [-36,-18],[-40,-22],[-44,-26],[-48,-30],[-52,-34],[-58,-38],[-62,-44],
        [-66,-48],[-68,-54],[-66,-56],[-60,-52],[-56,-46],[-52,-40],[-48,-34],
        [-44,-26],[-40,-20],[-38,-12],[-40,-4],[-44,0],[-50,2],[-58,4],
        [-68,0],[-74,4],[-80,6]]);

  // Europe
  fill([[-10,36],[-8,38],[-2,36],[0,44],[4,50],[8,54],[12,56],[18,58],[24,60],
        [28,62],[26,70],[20,70],[16,66],[12,62],[8,58],[4,54],[0,48],[-2,44],[-8,44]]);

  // British Isles
  fill([[-6,50],[-2,50],[2,52],[0,56],[-4,58],[-6,56],[-8,52]]);

  // Africa
  fill([[-18,16],[-16,20],[-18,26],[-8,26],[0,28],[10,30],[20,30],[32,26],[36,20],
        [40,14],[44,10],[44,4],[42,-2],[40,-8],[36,-14],[30,-22],[26,-28],[20,-34],
        [18,-36],[20,-34],[26,-28],[30,-24],[34,-18],[36,-12],[34,-4],[30,2],
        [26,8],[22,14],[16,18],[10,18],[4,12],[-2,8],[-8,8],[-14,10],[-18,14]]);

  // Arabian peninsula
  fill([[26,38],[36,38],[44,36],[50,30],[56,26],[58,20],[56,16],[50,14],
        [44,14],[38,16],[34,18],[32,24],[28,30],[26,36]]);

  // Asia main
  fill([[26,42],[30,46],[36,50],[46,54],[58,56],[70,58],[80,62],[90,66],
        [100,68],[110,70],[120,68],[130,62],[140,58],[144,50],[140,44],
        [136,38],[128,34],[122,28],[120,22],[110,18],[106,14],[100,10],
        [104,6],[108,2],[112,-4],[108,-6],[104,-2],[100,4],[98,8],[96,14],
        [92,20],[88,22],[84,28],[80,28],[74,22],[68,20],[60,22],[56,28],
        [54,32],[52,36],[48,40],[44,40],[40,42],[36,44],[32,44],[28,44]]);

  // Japan
  fill([[130,32],[132,34],[134,36],[136,38],[138,40],[140,42],[142,44],
        [140,46],[138,44],[136,42],[134,40],[132,36]]);

  // SE Asia peninsula + Malay
  fill([[98,20],[100,18],[102,16],[104,14],[106,12],[106,10],[104,6],
        [102,2],[104,0],[108,2],[112,0],[114,2],[114,6],[108,8],
        [104,10],[100,4],[98,8],[96,14]]);

  // Sumatra
  fill([[96,6],[100,4],[104,2],[106,-2],[106,-4],[104,-4],[100,-2],[96,4]]);

  // Australia
  fill([[114,-22],[120,-18],[128,-16],[136,-14],[140,-14],[146,-18],
        [152,-24],[154,-28],[152,-36],[148,-40],[144,-38],[138,-36],
        [132,-34],[126,-32],[120,-32],[114,-28],[112,-24]]);

  // Ice caps
  ctx.fillStyle = 'rgba(215,232,255,0.65)';
  ctx.strokeStyle = 'rgba(190,215,255,0.35)';
  ctx.lineWidth = 1;
  fill([[-180,72],[0,72],[180,72],[180,90],[-180,90]]);
  fill([[-180,-68],[0,-68],[180,-68],[180,-90],[-180,-90]]);

  return c;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SentinelOrbit({ size = 420 }) {
  const mountRef   = useRef(null);
  const navigateRef = useRef(null);
  const nav = useNavigate();
  navigateRef.current = nav;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth  || size;
    const H = mount.clientHeight || size;

    // ── Scene
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.z = 2.65;

    // ── WebGL renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0, 0);
    mount.appendChild(renderer.domElement);

    // ── CSS2D label renderer
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(W, H);
    labelRenderer.domElement.style.cssText =
      'position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;border-radius:50%;';
    mount.appendChild(labelRenderer.domElement);

    // ── Globe
    const texture = new THREE.CanvasTexture(buildGlobeTexture());
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 64),
      new THREE.MeshPhongMaterial({ map: texture, specular: new THREE.Color(0x1a3a6b), shininess: 18 })
    );
    scene.add(globe);

    // ── Atmosphere
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.028, 32, 32),
      new THREE.MeshPhongMaterial({ color: 0x2255cc, transparent: true, opacity: 0.07, side: THREE.FrontSide, depthWrite: false })
    ));

    // ── Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(3, 2, 4);
    scene.add(sun);

    // ── Markers + labels
    const labelItems = [];
    COUNTRIES.forEach(({ name, code, lat, lng }) => {
      const localPos = latLngToVec3(lat, lng, 1.0);

      // Gold pin dot
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      dot.position.copy(localPos);
      dot.userData.country = name;
      globe.add(dot);

      // HTML label
      const div = document.createElement('div');
      div.innerHTML = `<img src="https://flagcdn.com/w20/${code}.png" width="14" height="10" style="border-radius:2px;margin-right:5px;flex-shrink:0;object-fit:cover;" alt="${name}" />${name}`;
      div.style.cssText = [
        'display:flex','align-items:center',
        'background:rgba(5,12,30,0.88)',
        'color:#fff',
        'font-size:9.5px',
        'font-family:system-ui,-apple-system,sans-serif',
        'font-weight:700',
        'letter-spacing:0.4px',
        'padding:3px 7px 3px 5px',
        'border-radius:4px',
        'border:1px solid rgba(255,215,0,0.55)',
        'white-space:nowrap',
        'cursor:pointer',
        'pointer-events:auto',
        'transform:translate(-50%,-190%)',
        'transition:background .12s,color .12s',
        'user-select:none',
        'box-shadow:0 1px 8px rgba(0,0,0,0.55)',
      ].join(';');

      div.addEventListener('click', (e) => {
        e.stopPropagation();
        navigateRef.current(`/discover?country=${encodeURIComponent(name)}`);
      });
      div.addEventListener('mouseenter', () => {
        div.style.background = 'rgba(255,215,0,0.95)';
        div.style.color = '#0a0f1e';
      });
      div.addEventListener('mouseleave', () => {
        div.style.background = 'rgba(5,12,30,0.88)';
        div.style.color = '#fff';
      });

      const label = new CSS2DObject(div);
      label.position.copy(localPos);
      globe.add(label);
      labelItems.push({ label, localPos: localPos.clone() });
    });

    // ── Rotation state
    let rotY = 0.5, rotX = 0;
    let isDragging = false, lastX = 0, lastY = 0;

    const onMouseDown  = (e) => { isDragging = true; lastX = e.clientX; lastY = e.clientY; mount.style.cursor = 'grabbing'; };
    const onMouseMove  = (e) => { if (!isDragging) return; rotY += (e.clientX - lastX) * 0.005; rotX = Math.max(-0.8, Math.min(0.8, rotX + (e.clientY - lastY) * 0.005)); lastX = e.clientX; lastY = e.clientY; };
    const onMouseUp    = () => { isDragging = false; mount.style.cursor = 'grab'; };
    const onTouchStart = (e) => { isDragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; };
    const onTouchMove  = (e) => { if (!isDragging) return; rotY += (e.touches[0].clientX - lastX) * 0.006; rotX = Math.max(-0.8, Math.min(0.8, rotX + (e.touches[0].clientY - lastY) * 0.006)); lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; };

    mount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    mount.addEventListener('touchstart', onTouchStart, { passive: true });
    mount.addEventListener('touchmove',  onTouchMove,  { passive: true });
    mount.addEventListener('touchend',   onMouseUp);

    // ── Click on dot markers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dots = globe.children.filter(c => c.userData.country);
    const onGlobeClick = (e) => {
      const r = mount.getBoundingClientRect();
      mouse.x =  ((e.clientX - r.left) / W) * 2 - 1;
      mouse.y = -((e.clientY - r.top)  / H) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(dots);
      if (hits.length) navigateRef.current(`/discover?country=${encodeURIComponent(hits[0].object.userData.country)}`);
    };
    mount.addEventListener('click', onGlobeClick);

    // ── Helpers for visibility check
    const _euler    = new THREE.Euler();
    const _worldPos = new THREE.Vector3();
    const _camNorm  = camera.position.clone().normalize();

    // ── Animation loop
    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!isDragging) rotY += 0.0035;
      globe.rotation.y = rotY;
      globe.rotation.x = rotX;
      _euler.copy(globe.rotation);

      // Hide labels on the back hemisphere
      labelItems.forEach(({ label, localPos }) => {
        _worldPos.copy(localPos).applyEuler(_euler);
        const facing = _worldPos.dot(_camNorm) > 0.06;
        label.element.style.opacity       = facing ? '1' : '0';
        label.element.style.pointerEvents = facing ? 'auto' : 'none';
      });

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    // ── Resize
    const onResize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('mousedown', onMouseDown);
      mount.removeEventListener('click', onGlobeClick);
      mount.removeEventListener('touchstart', onTouchStart);
      mount.removeEventListener('touchmove', onTouchMove);
      mount.removeEventListener('touchend', onMouseUp);
      texture.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (mount.contains(labelRenderer.domElement)) mount.removeChild(labelRenderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'relative', width: size, height: size, cursor: 'grab', borderRadius: '50%' }}
    />
  );
}