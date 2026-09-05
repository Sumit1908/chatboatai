import { useEffect, useRef } from "react";
import * as THREE from "three";

const WA = {
  green: 0x25d366,
  teal: 0x128c7e,
  dark: 0x075e54,
  light: 0xdcf8c6,
  mid: 0x34b7f1,
};

function usePrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function createRenderer(mount: HTMLElement, alpha = true) {
  const w = mount.clientWidth || 1;
  const h = mount.clientHeight || 1;
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);
  return { renderer, w, h };
}

/** Full-page fixed backdrop — WhatsApp green particle network, scroll-linked */
export function ScrollScene({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = usePrefersReducedMotion();

    const { renderer } = createRenderer(mount);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      (mount.clientWidth || 1) / (mount.clientHeight || 1),
      0.1,
      100,
    );
    camera.position.z = 12;

    const COUNT = reduced ? 120 : 380;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const green = new THREE.Color(WA.green);
    const teal = new THREE.Color(WA.teal);
    const dark = new THREE.Color(WA.dark);
    const light = new THREE.Color(WA.light);

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 32;
      positions[i3 + 1] = (Math.random() - 0.5) * 20;
      positions[i3 + 2] = (Math.random() - 0.5) * 14;
      speeds[i] = 0.2 + Math.random() * 0.7;
      const pick = [green, teal, dark, light][Math.floor(Math.random() * 4)];
      colors[i3] = pick.r;
      colors[i3 + 1] = pick.g;
      colors[i3 + 2] = pick.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const linePos: number[] = [];
    for (let i = 0; i < COUNT; i += 2) {
      for (let j = i + 1; j < Math.min(i + 10, COUNT); j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < 9) {
          linePos.push(
            positions[i * 3],
            positions[i * 3 + 1],
            positions[i * 3 + 2],
            positions[j * 3],
            positions[j * 3 + 1],
            positions[j * 3 + 2],
          );
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: WA.green,
      transparent: true,
      opacity: 0.22,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.6, 0.06, 16, 120),
      new THREE.MeshBasicMaterial({
        color: WA.green,
        transparent: true,
        opacity: 0.55,
      }),
    );
    ring.rotation.x = Math.PI / 2.5;
    scene.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(5.2, 0.03, 12, 100),
      new THREE.MeshBasicMaterial({
        color: WA.teal,
        transparent: true,
        opacity: 0.35,
      }),
    );
    ring2.rotation.x = Math.PI / 3;
    scene.add(ring2);

    let raf = 0;
    let scrollTarget = 0;
    let scrollSmooth = 0;
    const clock = new THREE.Clock();

    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      scrollTarget = window.scrollY / max;
    };
    const onResize = () => {
      const nw = mount.clientWidth || 1;
      const nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      scrollSmooth += (scrollTarget - scrollSmooth) * 0.05;

      const arr = (geometry.getAttribute("position") as THREE.BufferAttribute)
        .array as Float32Array;
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        arr[i3 + 1] += Math.sin(t * speeds[i] + i) * 0.003;
        arr[i3] += Math.cos(t * speeds[i] * 0.6 + i) * 0.002;
      }
      geometry.getAttribute("position").needsUpdate = true;

      points.rotation.y = t * 0.05 + scrollSmooth * 1.1;
      points.rotation.x = scrollSmooth * 0.4;
      lines.rotation.copy(points.rotation);
      ring.rotation.z = t * 0.15 + scrollSmooth * 1.4;
      ring2.rotation.z = -t * 0.08 - scrollSmooth * 0.8;
      ring.position.y = Math.sin(t * 0.35) * 0.4 - scrollSmooth * 3;
      ring2.position.y = Math.cos(t * 0.25) * 0.3 - scrollSmooth * 2.2;

      camera.position.x = Math.sin(scrollSmooth * Math.PI) * 2.2;
      camera.position.y = scrollSmooth * -2.8;
      camera.lookAt(0, scrollSmooth * -1.4, 0);
      renderer.render(scene, camera);
    };

    if (reduced) renderer.render(scene, camera);
    else animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
      ring2.geometry.dispose();
      (ring2.material as THREE.Material).dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    />
  );
}

/** In-section canvas: floating message-bubble spheres that react to scroll */
export function MessageBubblesScene({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = usePrefersReducedMotion();
    const { renderer } = createRenderer(mount);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      (mount.clientWidth || 1) / Math.max(mount.clientHeight || 1, 1),
      0.1,
      50,
    );
    camera.position.z = 10;

    const group = new THREE.Group();
    scene.add(group);

    const mats = [
      new THREE.MeshStandardMaterial({
        color: WA.green,
        emissive: WA.green,
        emissiveIntensity: 0.35,
        roughness: 0.4,
        metalness: 0.1,
      }),
      new THREE.MeshStandardMaterial({
        color: WA.teal,
        emissive: WA.teal,
        emissiveIntensity: 0.25,
        roughness: 0.45,
      }),
      new THREE.MeshStandardMaterial({
        color: WA.light,
        emissive: 0x88cc88,
        emissiveIntensity: 0.15,
        roughness: 0.5,
      }),
      new THREE.MeshStandardMaterial({
        color: WA.dark,
        emissive: WA.dark,
        emissiveIntensity: 0.2,
        roughness: 0.5,
      }),
    ];

    const bubbles: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
    for (let i = 0; i < (reduced ? 8 : 18); i++) {
      const geo = new THREE.SphereGeometry(0.25 + Math.random() * 0.45, 24, 24);
      const mesh = new THREE.Mesh(geo, mats[i % mats.length]);
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 4,
      );
      group.add(mesh);
      bubbles.push({ mesh, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() });
    }

    // Chat-tail cones as “bubble tails”
    for (let i = 0; i < 6; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.4, 8),
        mats[i % mats.length],
      );
      cone.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 4, -1);
      cone.rotation.z = Math.PI;
      group.add(cone);
    }

    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(4, 6, 8);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x88ffaa, 0.45));

    let raf = 0;
    let scrollY = 0;
    const clock = new THREE.Clock();
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    const onResize = () => {
      const nw = mount.clientWidth || 1;
      const nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    let visible = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    io.observe(mount);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!visible && !reduced) {
        return;
      }
      const t = clock.getElapsedTime();
      const scrollFactor = scrollY * 0.001;
      group.rotation.y = t * 0.12 + scrollFactor;
      group.rotation.x = Math.sin(t * 0.2) * 0.15;
      bubbles.forEach((b, i) => {
        b.mesh.position.y += Math.sin(t * b.speed + b.phase) * 0.004;
        b.mesh.position.x += Math.cos(t * b.speed * 0.7 + i) * 0.002;
        b.mesh.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.06);
      });
      renderer.render(scene, camera);
    };
    if (!reduced) animate();
    else renderer.render(scene, camera);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      io.disconnect();
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else (obj.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`absolute inset-0 -z-0 overflow-hidden ${className}`}
    />
  );
}

/** In-section: orbiting WhatsApp-green rings + icosahedron “signal core” */
export function SignalCoreScene({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = usePrefersReducedMotion();
    const { renderer } = createRenderer(mount);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      (mount.clientWidth || 1) / Math.max(mount.clientHeight || 1, 1),
      0.1,
      50,
    );
    camera.position.z = 9;

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 1),
      new THREE.MeshStandardMaterial({
        color: WA.green,
        emissive: WA.green,
        emissiveIntensity: 0.5,
        wireframe: true,
        roughness: 0.3,
      }),
    );
    scene.add(core);

    const solid = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85, 0),
      new THREE.MeshStandardMaterial({
        color: WA.teal,
        emissive: WA.dark,
        emissiveIntensity: 0.4,
        flatShading: true,
      }),
    );
    scene.add(solid);

    const rings: THREE.Mesh[] = [];
    [2.2, 3.1, 4.0].forEach((r, i) => {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.04, 12, 80),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? WA.green : WA.teal,
          transparent: true,
          opacity: 0.7 - i * 0.15,
        }),
      );
      mesh.rotation.x = Math.PI / 2 + i * 0.35;
      mesh.rotation.y = i * 0.4;
      scene.add(mesh);
      rings.push(mesh);
    });

    // Orbiting dots
    const orbitDots: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshBasicMaterial({ color: WA.green }),
      );
      scene.add(d);
      orbitDots.push(d);
    }

    scene.add(new THREE.AmbientLight(0xaaffcc, 0.6));
    const dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(3, 5, 6);
    scene.add(dl);

    let raf = 0;
    const clock = new THREE.Clock();
    let visible = true;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
      },
      { threshold: 0.05 },
    );
    io.observe(mount);

    const onResize = () => {
      const nw = mount.clientWidth || 1;
      const nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!visible && !reduced) return;
      const t = clock.getElapsedTime();
      core.rotation.x = t * 0.25;
      core.rotation.y = t * 0.4;
      solid.rotation.y = -t * 0.55;
      rings.forEach((r, i) => {
        r.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? 1 : -1);
      });
      orbitDots.forEach((d, i) => {
        const a = t * 0.6 + (i / 12) * Math.PI * 2;
        const radius = 2.6 + (i % 3) * 0.55;
        d.position.set(Math.cos(a) * radius, Math.sin(a * 1.3) * 0.6, Math.sin(a) * radius);
      });
      renderer.render(scene, camera);
    };
    if (!reduced) animate();
    else renderer.render(scene, camera);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      io.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`absolute inset-0 overflow-hidden ${className}`}
    />
  );
}

/** Wave / ribbon of connected points — delivery “pulse” visualization */
export function DeliveryWaveScene({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = usePrefersReducedMotion();
    const { renderer } = createRenderer(mount);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      (mount.clientWidth || 1) / Math.max(mount.clientHeight || 1, 1),
      0.1,
      50,
    );
    camera.position.set(0, 2.5, 11);
    camera.lookAt(0, 0, 0);

    const COLS = 40;
    const ROWS = 20;
    const COUNT = COLS * ROWS;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const green = new THREE.Color(WA.green);
    const teal = new THREE.Color(WA.teal);

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const i3 = i * 3;
        positions[i3] = (x / COLS - 0.5) * 14;
        positions[i3 + 1] = 0;
        positions[i3 + 2] = (y / ROWS - 0.5) * 7;
        const c = green.clone().lerp(teal, x / COLS);
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let raf = 0;
    const clock = new THREE.Clock();
    let visible = true;
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
      },
      { threshold: 0.05 },
    );
    io.observe(mount);
    const onResize = () => {
      const nw = mount.clientWidth || 1;
      const nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!visible && !reduced) return;
      const t = clock.getElapsedTime();
      const arr = (geo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const i = y * COLS + x;
          const i3 = i * 3;
          const px = arr[i3];
          const pz = arr[i3 + 2];
          arr[i3 + 1] =
            Math.sin(px * 0.8 + t * 1.8) * 0.55 + Math.cos(pz * 1.1 + t * 1.2) * 0.35;
        }
      }
      geo.getAttribute("position").needsUpdate = true;
      points.rotation.y = Math.sin(t * 0.15) * 0.12;
      renderer.render(scene, camera);
    };
    if (!reduced) animate();
    else renderer.render(scene, camera);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      io.disconnect();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden
      className={`absolute inset-0 overflow-hidden ${className}`}
    />
  );
}
