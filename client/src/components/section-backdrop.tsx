import { useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";

const WA = {
  green: 0x25d366,
  teal: 0x128c7e,
  dark: 0x075e54,
  light: 0xdcf8c6,
};

export type SceneVariant =
  | "particles"
  | "shield"
  | "grid"
  | "orbit"
  | "helix"
  | "spark"
  | "soft"
  | "wave"
  | "bubbles"
  | "rings"
  | "typing"
  | "ticks"
  | "broadcast"
  | "messages"
  | "inbox";

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Lazily mounts a WebGL scene only while the section is near the viewport,
 * then disposes it — keeps us under the browser WebGL context limit.
 */
export function SectionBackdrop({
  variant = "particles",
  intensity = "subtle",
  className = "",
}: {
  variant?: SceneVariant;
  intensity?: "subtle" | "bold";
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      rootMargin: "120px 0px",
      threshold: 0.01,
    });
    io.observe(host);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const mount = hostRef.current;
    if (!mount || !active) return;
    const reduced = prefersReduced();
    const bold = intensity === "bold";

    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 60);
    camera.position.z = bold ? 9 : 11;

    const disposables: THREE.Object3D[] = [];
    const clock = new THREE.Clock();
    let raf = 0;
    let scrollFactor = 0;

    const green = new THREE.Color(WA.green);
    const teal = new THREE.Color(WA.teal);

    const addPoints = (count: number, spread = 14) => {
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * spread;
        positions[i3 + 1] = (Math.random() - 0.5) * (spread * 0.55);
        positions[i3 + 2] = (Math.random() - 0.5) * 8;
        const c = Math.random() > 0.5 ? green : teal;
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: bold ? 0.12 : 0.07,
        vertexColors: true,
        transparent: true,
        opacity: bold ? 0.85 : 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      disposables.push(pts);
      return pts;
    };

    let update: ((t: number) => void) | null = null;

    if (variant === "particles") {
      const pts = addPoints(reduced ? 60 : bold ? 200 : 110, 12);
      update = (t) => {
        pts.rotation.y = t * 0.06 + scrollFactor * 0.4;
        pts.rotation.x = Math.sin(t * 0.2) * 0.08;
      };
    }

    if (variant === "soft") {
      const count = reduced ? 40 : bold ? 70 : 50;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 16;
        positions[i3 + 1] = (Math.random() - 0.5) * 6;
        positions[i3 + 2] = (Math.random() - 0.5) * 4;
        const c = green.clone().lerp(teal, Math.random());
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: bold ? 0.2 : 0.14,
        vertexColors: true,
        transparent: true,
        opacity: bold ? 0.35 : 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      disposables.push(pts);
      update = (t) => {
        const arr = (geo.getAttribute("position") as THREE.BufferAttribute)
          .array as Float32Array;
        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          arr[i3 + 1] += Math.sin(t * 0.25 + i) * 0.002;
        }
        geo.getAttribute("position").needsUpdate = true;
        pts.rotation.y = t * 0.02;
      };
    }

    if (variant === "spark") {
      const pts = addPoints(reduced ? 80 : bold ? 320 : 220, 18);
      const mat = pts.material as THREE.PointsMaterial;
      mat.size = bold ? 0.09 : 0.06;
      mat.opacity = bold ? 0.95 : 0.65;
      update = (t) => {
        pts.rotation.y = t * 0.14 + scrollFactor * 0.5;
        pts.rotation.z = Math.sin(t * 0.35) * 0.12;
        const arr = (
          (pts.geometry.getAttribute("position") as THREE.BufferAttribute).array
        ) as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] += Math.sin(t * 2.2 + i) * 0.003;
        }
        pts.geometry.getAttribute("position").needsUpdate = true;
      };
    }

    if (variant === "grid") {
      const COLS = bold ? 20 : 14;
      const ROWS = bold ? 12 : 8;
      const lineVerts: number[] = [];
      const lineColors: number[] = [];
      const addLine = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, mix: number) => {
        lineVerts.push(x1, y1, z1, x2, y2, z2);
        const c = green.clone().lerp(teal, mix);
        lineColors.push(c.r, c.g, c.b, c.r, c.g, c.b);
      };
      const w = 14;
      const d = 7;
      for (let i = 0; i <= COLS; i++) {
        const x = (i / COLS - 0.5) * w;
        addLine(x, 0, -d / 2, x, 0, d / 2, i / COLS);
      }
      for (let i = 0; i <= ROWS; i++) {
        const z = (i / ROWS - 0.5) * d;
        addLine(-w / 2, 0, z, w / 2, 0, z, i / ROWS);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
      const lines = new THREE.LineSegments(
        geo,
        new THREE.LineBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: bold ? 0.55 : 0.3,
        }),
      );
      scene.add(lines);
      disposables.push(lines);
      camera.position.set(0, 4, 11);
      camera.lookAt(0, 0, 0);
      update = (t) => {
        lines.rotation.y = t * 0.04 + scrollFactor * 0.2;
      };
    }

    if (variant === "wave") {
      const COLS = bold ? 36 : 24;
      const ROWS = bold ? 18 : 12;
      const count = COLS * ROWS;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const i = (y * COLS + x) * 3;
          positions[i] = (x / COLS - 0.5) * 14;
          positions[i + 1] = 0;
          positions[i + 2] = (y / ROWS - 0.5) * 7;
          const c = green.clone().lerp(teal, x / COLS);
          colors[i] = c.r;
          colors[i + 1] = c.g;
          colors[i + 2] = c.b;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.14,
        vertexColors: true,
        transparent: true,
        opacity: bold ? 0.9 : 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      disposables.push(pts);
      camera.position.set(0, bold ? 2.2 : 3.5, bold ? 10 : 12);
      camera.lookAt(0, 0, 0);
      update = (t) => {
        const arr = (geo.getAttribute("position") as THREE.BufferAttribute)
          .array as Float32Array;
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            const idx = (y * COLS + x) * 3;
            const px = arr[idx];
            const pz = arr[idx + 2];
            arr[idx + 1] =
              Math.sin(px * 0.7 + t * 1.6) * (bold ? 0.55 : 0.28) +
              Math.cos(pz * 1.0 + t) * (bold ? 0.3 : 0.15);
          }
        }
        geo.getAttribute("position").needsUpdate = true;
        pts.rotation.y = Math.sin(t * 0.12) * 0.1;
      };
    }

    if (variant === "shield") {
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(bold ? 1.3 : 0.9, 1),
        new THREE.MeshStandardMaterial({
          color: WA.green,
          emissive: WA.green,
          emissiveIntensity: 0.45,
          wireframe: true,
        }),
      );
      scene.add(core);
      disposables.push(core);

      const solid = new THREE.Mesh(
        new THREE.IcosahedronGeometry(bold ? 0.75 : 0.5, 0),
        new THREE.MeshStandardMaterial({
          color: WA.teal,
          emissive: WA.dark,
          emissiveIntensity: 0.35,
          flatShading: true,
        }),
      );
      scene.add(solid);
      disposables.push(solid);

      const plate = new THREE.Mesh(
        new THREE.CircleGeometry(2.4, 48),
        new THREE.MeshBasicMaterial({
          color: WA.green,
          transparent: true,
          opacity: 0.08,
          side: THREE.DoubleSide,
        }),
      );
      scene.add(plate);
      disposables.push(plate);

      scene.add(new THREE.AmbientLight(0xaaffcc, 0.55));
      const dl = new THREE.DirectionalLight(0xffffff, 1);
      dl.position.set(3, 5, 6);
      scene.add(dl);

      update = (t) => {
        core.rotation.x = t * 0.22;
        core.rotation.y = t * 0.35;
        solid.rotation.y = -t * 0.5;
        plate.rotation.z = Math.sin(t * 0.15) * 0.05;
      };
    }

    if (variant === "rings") {
      const rings: THREE.Mesh[] = [];
      [1.6, 2.4, 3.2, 4.0].forEach((r, i) => {
        const mesh = new THREE.Mesh(
          new THREE.TorusGeometry(r * (bold ? 1 : 0.8), 0.03, 8, 72),
          new THREE.MeshBasicMaterial({
            color: i % 2 ? WA.green : WA.teal,
            transparent: true,
            opacity: bold ? 0.6 : 0.32,
          }),
        );
        mesh.rotation.x = Math.PI / 2 + i * 0.22;
        scene.add(mesh);
        rings.push(mesh);
        disposables.push(mesh);
      });
      update = (t) => {
        rings.forEach((r, i) => {
          r.rotation.z = t * (0.12 + i * 0.06) * (i % 2 ? 1 : -1);
          r.scale.setScalar(1 + Math.sin(t * 0.8 + i) * 0.04);
        });
      };
    }

    if (variant === "orbit") {
      const hub = new THREE.Mesh(
        new THREE.SphereGeometry(bold ? 0.35 : 0.25, 16, 16),
        new THREE.MeshBasicMaterial({ color: WA.green }),
      );
      scene.add(hub);
      disposables.push(hub);

      const dots: THREE.Mesh[] = [];
      for (let i = 0; i < (bold ? 12 : 8); i++) {
        const d = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 10, 10),
          new THREE.MeshBasicMaterial({ color: i % 2 ? WA.teal : WA.light }),
        );
        scene.add(d);
        dots.push(d);
        disposables.push(d);
      }

      update = (t) => {
        hub.scale.setScalar(1 + Math.sin(t * 2) * 0.08);
        dots.forEach((d, i) => {
          const a = t * (0.45 + (i % 3) * 0.1) + (i / dots.length) * Math.PI * 2;
          const radius = (bold ? 2.2 : 1.6) + (i % 4) * 0.35;
          const tilt = (i % 2 ? 0.4 : -0.3) * Math.sin(t * 0.3);
          d.position.set(
            Math.cos(a) * radius,
            Math.sin(a * 1.5 + tilt) * 0.6,
            Math.sin(a) * radius * 0.6,
          );
        });
      };
    }

    if (variant === "bubbles") {
      const group = new THREE.Group();
      scene.add(group);
      disposables.push(group);
      const mats = [
        new THREE.MeshStandardMaterial({
          color: WA.green,
          emissive: WA.green,
          emissiveIntensity: 0.3,
          roughness: 0.4,
        }),
        new THREE.MeshStandardMaterial({
          color: WA.teal,
          emissive: WA.teal,
          emissiveIntensity: 0.2,
          roughness: 0.45,
        }),
        new THREE.MeshStandardMaterial({
          color: WA.light,
          emissive: 0x88cc88,
          emissiveIntensity: 0.12,
          roughness: 0.5,
        }),
      ];
      const bubbles: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
      for (let i = 0; i < (reduced ? 6 : bold ? 16 : 10); i++) {
        const mesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.2 + Math.random() * 0.4, 20, 20),
          mats[i % mats.length],
        );
        mesh.position.set(
          (Math.random() - 0.5) * 9,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 3,
        );
        group.add(mesh);
        bubbles.push({
          mesh,
          phase: Math.random() * 6,
          speed: 0.4 + Math.random(),
        });
      }
      scene.add(new THREE.AmbientLight(0xaaffcc, 0.5));
      const dl = new THREE.DirectionalLight(0xffffff, 1);
      dl.position.set(4, 5, 7);
      scene.add(dl);
      update = (t) => {
        group.rotation.y = t * 0.1 + scrollFactor * 0.3;
        bubbles.forEach((b, i) => {
          b.mesh.position.y += Math.sin(t * b.speed + b.phase) * 0.004;
          b.mesh.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.05);
        });
      };
    }

    if (variant === "typing") {
      const group = new THREE.Group();
      scene.add(group);
      disposables.push(group);
      const dots: THREE.Mesh[] = [];
      const offsets = [-0.35, 0, 0.35];
      offsets.forEach((x, i) => {
        const d = new THREE.Mesh(
          new THREE.SphereGeometry(bold ? 0.14 : 0.1, 16, 16),
          new THREE.MeshBasicMaterial({
            color: i === 1 ? WA.teal : WA.green,
            transparent: true,
            opacity: bold ? 0.85 : 0.55,
          }),
        );
        d.position.set(x * 2.2, 0, 0);
        group.add(d);
        dots.push(d);
      });
      const pill = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.7, 0.15),
        new THREE.MeshBasicMaterial({
          color: WA.light,
          transparent: true,
          opacity: bold ? 0.25 : 0.15,
        }),
      );
      pill.position.z = -0.2;
      group.add(pill);
      disposables.push(pill);
      update = (t) => {
        dots.forEach((d, i) => {
          d.position.y = Math.sin(t * 3.5 - i * 0.55) * (bold ? 0.18 : 0.12);
          d.scale.setScalar(0.85 + Math.max(0, Math.sin(t * 3.5 - i * 0.55)) * 0.25);
        });
        group.position.y = Math.sin(t * 0.4) * 0.15;
      };
    }

    if (variant === "ticks") {
      const group = new THREE.Group();
      scene.add(group);
      disposables.push(group);
      const tickShape = new THREE.Shape();
      tickShape.moveTo(0, 0);
      tickShape.lineTo(0.35, -0.45);
      tickShape.lineTo(1.1, 0.55);
      const tickGeo = new THREE.ExtrudeGeometry(tickShape, {
        depth: 0.04,
        bevelEnabled: false,
      });
      tickGeo.center();
      const ticks: { mesh: THREE.Mesh; phase: number }[] = [];
      for (let i = 0; i < (reduced ? 4 : bold ? 10 : 7); i++) {
        const isDouble = i % 2 === 0;
        const mesh = new THREE.Mesh(
          tickGeo.clone(),
          new THREE.MeshBasicMaterial({
            color: isDouble ? 0x34b7f1 : WA.green,
            transparent: true,
            opacity: bold ? 0.75 : 0.45,
          }),
        );
        mesh.position.set(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2,
        );
        mesh.rotation.z = (Math.random() - 0.5) * 0.4;
        mesh.scale.setScalar(0.35 + Math.random() * 0.25);
        group.add(mesh);
        ticks.push({ mesh, phase: Math.random() * 6 });
      }
      update = (t) => {
        group.rotation.y = t * 0.05;
        ticks.forEach(({ mesh, phase }, i) => {
          mesh.position.y += Math.sin(t * 0.6 + phase) * 0.003;
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.opacity =
            (bold ? 0.75 : 0.45) * (0.6 + 0.4 * Math.sin(t * 1.2 + i));
        });
      };
    }

    if (variant === "broadcast") {
      const rings: { mesh: THREE.Mesh; speed: number; offset: number }[] = [];
      for (let i = 0; i < (bold ? 5 : 4); i++) {
        const mesh = new THREE.Mesh(
          new THREE.RingGeometry(0.3, 0.38, 48),
          new THREE.MeshBasicMaterial({
            color: WA.green,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
        rings.push({ mesh, speed: 0.35 + i * 0.08, offset: i * 0.9 });
        disposables.push(mesh);
      }
      const center = new THREE.Mesh(
        new THREE.CircleGeometry(0.45, 32),
        new THREE.MeshBasicMaterial({ color: WA.green, transparent: true, opacity: bold ? 0.5 : 0.35 }),
      );
      scene.add(center);
      disposables.push(center);
      update = (t) => {
        center.scale.setScalar(1 + Math.sin(t * 2.5) * 0.06);
        rings.forEach(({ mesh, speed, offset }) => {
          const cycle = ((t * speed + offset) % 3) / 3;
          const scale = 0.5 + cycle * (bold ? 5 : 4);
          mesh.scale.set(scale, scale, 1);
          (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - cycle) * (bold ? 0.55 : 0.35);
        });
      };
    }

    if (variant === "messages") {
      const group = new THREE.Group();
      scene.add(group);
      disposables.push(group);
      const bubbles: { mesh: THREE.Mesh; phase: number; drift: number }[] = [];
      const count = reduced ? 5 : bold ? 12 : 8;
      for (let i = 0; i < count; i++) {
        const sent = i % 2 === 0;
        const w = 1.2 + Math.random() * 1.4;
        const h = 0.45 + Math.random() * 0.35;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(w, h, 0.12),
          new THREE.MeshStandardMaterial({
            color: sent ? WA.light : 0xffffff,
            emissive: sent ? 0x448844 : 0x888888,
            emissiveIntensity: 0.08,
            roughness: 0.6,
          }),
        );
        mesh.position.set(
          sent ? 1.5 + Math.random() * 2 : -3 - Math.random() * 2,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 2,
        );
        mesh.rotation.z = (Math.random() - 0.5) * 0.08;
        group.add(mesh);
        bubbles.push({ mesh, phase: Math.random() * 6, drift: 0.3 + Math.random() * 0.5 });
      }
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dl = new THREE.DirectionalLight(0xffffff, 0.8);
      dl.position.set(2, 4, 5);
      scene.add(dl);
      update = (t) => {
        group.rotation.y = Math.sin(t * 0.08) * 0.15;
        bubbles.forEach(({ mesh, phase, drift }) => {
          mesh.position.y += Math.sin(t * drift + phase) * 0.004;
          mesh.position.x += Math.cos(t * drift * 0.5 + phase) * 0.002;
        });
      };
    }

    if (variant === "inbox") {
      const group = new THREE.Group();
      scene.add(group);
      disposables.push(group);
      const rows: THREE.Mesh[] = [];
      const rowCount = reduced ? 5 : bold ? 9 : 7;
      for (let i = 0; i < rowCount; i++) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(6 + Math.random() * 2, 0.35, 0.08),
          new THREE.MeshBasicMaterial({
            color: i % 3 === 0 ? WA.green : 0xffffff,
            transparent: true,
            opacity: bold ? 0.35 : 0.22,
          }),
        );
        mesh.position.set(0, 2.5 - i * 0.75, 0);
        group.add(mesh);
        rows.push(mesh);
      }
      const avatarGeo = new THREE.CircleGeometry(0.22, 16);
      for (let i = 0; i < rowCount; i++) {
        const av = new THREE.Mesh(
          avatarGeo.clone(),
          new THREE.MeshBasicMaterial({
            color: WA.teal,
            transparent: true,
            opacity: bold ? 0.5 : 0.35,
          }),
        );
        av.position.set(-3.8, 2.5 - i * 0.75, 0.1);
        group.add(av);
        disposables.push(av);
      }
      update = (t) => {
        group.position.y = Math.sin(t * 0.25) * 0.2;
        rows.forEach((row, i) => {
          row.position.x = Math.sin(t * 0.4 + i * 0.5) * 0.15;
        });
      };
    }

    if (variant === "helix") {
      const count = reduced ? 80 : 160;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const tt = i / count;
        const a = tt * Math.PI * 6;
        const i3 = i * 3;
        positions[i3] = Math.cos(a) * 2.2;
        positions[i3 + 1] = (tt - 0.5) * 8;
        positions[i3 + 2] = Math.sin(a) * 2.2;
        const c = green.clone().lerp(teal, tt);
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.13,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      disposables.push(pts);
      const positions2 = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const tt = i / count;
        const a = tt * Math.PI * 6 + Math.PI;
        const i3 = i * 3;
        positions2[i3] = Math.cos(a) * 2.2;
        positions2[i3 + 1] = (tt - 0.5) * 8;
        positions2[i3 + 2] = Math.sin(a) * 2.2;
      }
      const geo2 = new THREE.BufferGeometry();
      geo2.setAttribute("position", new THREE.BufferAttribute(positions2, 3));
      geo2.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const pts2 = new THREE.Points(geo2, mat.clone());
      scene.add(pts2);
      disposables.push(pts2);
      update = (t) => {
        pts.rotation.y = t * 0.35;
        pts2.rotation.y = t * 0.35;
      };
    }

    if (!update) {
      const pts = addPoints(80);
      update = (t) => {
        pts.rotation.y = t * 0.05;
      };
    }

    const onScroll = () => {
      scrollFactor = window.scrollY * 0.0008;
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

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      update?.(t);
      renderer.render(scene, camera);
    };

    if (reduced) {
      update?.(0);
      renderer.render(scene, camera);
    } else {
      tick();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      disposables.forEach((obj) => {
        obj.traverse((child) => {
          if (
            child instanceof THREE.Mesh ||
            child instanceof THREE.Points ||
            child instanceof THREE.LineSegments
          ) {
            child.geometry?.dispose();
            const mat = child.material;
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else mat?.dispose();
          }
        });
        scene.remove(obj);
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [active, variant, intensity]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    />
  );
}

export function AnimatedSection({
  children,
  variant = "particles",
  intensity = "subtle",
  className = "",
  id,
  dark = false,
}: {
  children: ReactNode;
  variant?: SceneVariant;
  intensity?: "subtle" | "bold";
  className?: string;
  id?: string;
  dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden ${dark ? "bg-[#042f2a] text-white" : ""} ${className}`}
    >
      <SectionBackdrop variant={variant} intensity={intensity} />
      <div className="relative z-10">{children}</div>
    </section>
  );
}
