import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { setupTree } from "@/lib/marketing-content";

const WA = {
  green: 0x25d366,
  teal: 0x128c7e,
  dark: 0x075e54,
  light: 0xdcf8c6,
};

type TreeNode = {
  label: string;
  children?: TreeNode[];
};

type LayoutNode = {
  node: TreeNode;
  x: number;
  y: number;
  depth: number;
};

function flattenTree(
  node: TreeNode,
  depth = 0,
  x = 0,
  y = 0,
  gapX = 2.8,
  gapY = 1.8,
): LayoutNode[] {
  const result: LayoutNode[] = [{ node, x, y, depth }];
  if (!node.children?.length) return result;

  const childCount = node.children.length;
  const totalWidth = (childCount - 1) * gapX;
  const startX = x - totalWidth / 2;

  node.children.forEach((child, i) => {
    const cx = startX + i * gapX;
    const cy = y - gapY;
    result.push(...flattenTree(child, depth + 1, cx, cy, gapX * 0.55, gapY));
  });

  return result;
}

function prefersReduced() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function SetupTreeScene({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      rootMargin: "80px 0px",
      threshold: 0.05,
    });
    io.observe(host);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const mount = hostRef.current;
    if (!mount || !active) return;

    const reduced = prefersReduced();
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 80);
    camera.position.set(0, 0, 14);
    camera.lookAt(0, 0, 0);

    const layout = flattenTree(setupTree, 0, 0, 3.5);

    const nodeMeshes: THREE.Mesh[] = [];
    const disposables: THREE.Object3D[] = [];
    const edges: { from: THREE.Vector3; to: THREE.Vector3; mat: THREE.LineBasicMaterial }[] = [];

    const nodeByLabel = new Map<string, THREE.Vector3>();

    layout.forEach(({ node, x, y, depth }) => {
      const isRoot = depth === 0;
      const isBranch = depth === 1;
      const radius = isRoot ? 0.42 : isBranch ? 0.28 : 0.16;
      const color = isRoot ? WA.green : isBranch ? WA.teal : WA.light;

      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 20, 20),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: isRoot ? 0.55 : isBranch ? 0.35 : 0.15,
          roughness: 0.45,
        }),
      );
      mesh.position.set(x, y, 0);
      scene.add(mesh);
      nodeMeshes.push(mesh);
      disposables.push(mesh);
      nodeByLabel.set(node.label, mesh.position.clone());

      if (node.children) {
        node.children.forEach((child) => {
          const childLayout = layout.find((l) => l.node.label === child.label);
          if (childLayout) {
            const mat = new THREE.LineBasicMaterial({
              color: WA.green,
              transparent: true,
              opacity: 0.45,
            });
            const from = new THREE.Vector3(x, y, 0);
            const to = new THREE.Vector3(childLayout.x, childLayout.y, 0);
            const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
            const line = new THREE.Line(geo, mat);
            scene.add(line);
            disposables.push(line);
            edges.push({ from, to, mat });
          }
        });
      }
    });

    const pulses: THREE.Mesh[] = [];
    edges.forEach(() => {
      const pulse = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color: WA.green }),
      );
      scene.add(pulse);
      pulses.push(pulse);
      disposables.push(pulse);
    });

    scene.add(new THREE.AmbientLight(0xaaffcc, 0.55));
    const dl = new THREE.DirectionalLight(0xffffff, 1);
    dl.position.set(4, 6, 8);
    scene.add(dl);

    const clock = new THREE.Clock();
    let raf = 0;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      nodeMeshes.forEach((mesh, i) => {
        mesh.scale.setScalar(1 + Math.sin(t * 1.8 + i * 0.7) * 0.06);
      });

      pulses.forEach((pulse, i) => {
        const edge = edges[i];
        if (!edge) return;
        const progress = (t * 0.35 + i * 0.25) % 1;
        pulse.position.lerpVectors(edge.from, edge.to, progress);
        edge.mat.opacity = 0.25 + Math.sin(t * 2 + i) * 0.2;
      });

      scene.rotation.z = Math.sin(t * 0.08) * 0.02;
      renderer.render(scene, camera);
    };

    const onResize = () => {
      const nw = mount.clientWidth || 1;
      const nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    if (reduced) {
      renderer.render(scene, camera);
    } else {
      tick();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      disposables.forEach((obj) => {
        obj.traverse((child) => {
          if (
            child instanceof THREE.Mesh ||
            child instanceof THREE.Line
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
  }, [active]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`pointer-events-none w-full h-[280px] sm:h-[420px] md:h-[520px] ${className}`}
    />
  );
}

export function SetupTreeLabels() {
  const renderBranch = (node: TreeNode, depth = 0) => (
    <div key={node.label} className={depth > 0 ? "ml-4 md:ml-6 border-l-2 border-[#25D366]/25 pl-4" : ""}>
      <div
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-2 ${
          depth === 0
            ? "bg-[#075E54] text-white font-semibold"
            : depth === 1
              ? "bg-[#25D366]/15 text-[#075E54] font-medium border border-[#25D366]/30"
              : "bg-white/80 text-[#075E54]/75 text-sm border border-[#075E54]/10"
        }`}
      >
        <span
          className={`rounded-full shrink-0 ${
            depth === 0 ? "h-2.5 w-2.5 bg-[#25D366]" : depth === 1 ? "h-2 w-2 bg-[#128C7E]" : "h-1.5 w-1.5 bg-[#25D366]/60"
          }`}
        />
        {node.label}
      </div>
      {node.children && (
        <div className="space-y-1 mb-3">
          {node.children.map((child) =>
            child.children ? renderBranch(child, depth + 1) : (
              <div key={child.label} className="ml-4 md:ml-6 border-l-2 border-[#25D366]/15 pl-4">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/80 text-[#075E54]/75 text-sm border border-[#075E54]/10 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]/60 shrink-0" />
                  {child.label}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );

  return <div className="text-left">{renderBranch(setupTree)}</div>;
}
