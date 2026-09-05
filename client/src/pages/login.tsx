import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FaWhatsapp } from "react-icons/fa";
import { Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, MessageCircle, Shield, Zap } from "lucide-react";
import * as THREE from "three";
import { SESSION_SUPERSEDED_KEY } from "@/hooks/use-auth";
import { cheapestPlan, usePublicPlans } from "@/hooks/use-public-plans";
import { AuthSeo } from "@/components/seo-head";

function LoginScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || reducedMotion) return;

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
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(0, 0, 18);

    const WA_GREEN = new THREE.Color(0x25d366);
    const WA_TEAL = new THREE.Color(0x128c7e);
    const WA_LIGHT = new THREE.Color(0xdcf8c6);
    const WA_BLUE = new THREE.Color(0x34b7f1);

    // Floating chat bubbles
    const bubbleCount = 24;
    const bubbleGeo = new THREE.SphereGeometry(1, 24, 24);
    const bubbles: THREE.Mesh[] = [];
    const bubbleData: { speed: number; phase: number; radius: number; yAmp: number }[] = [];

    for (let i = 0; i < bubbleCount; i++) {
      const scale = 0.15 + Math.random() * 0.45;
      const color = [WA_GREEN, WA_TEAL, WA_LIGHT, WA_BLUE][i % 4];
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        transparent: true,
        opacity: 0.12 + Math.random() * 0.15,
        roughness: 0.2,
        metalness: 0.1,
        clearcoat: 0.8,
      });
      const mesh = new THREE.Mesh(bubbleGeo, mat);
      mesh.scale.setScalar(scale);
      scene.add(mesh);
      bubbles.push(mesh);
      bubbleData.push({
        speed: 0.15 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        radius: 4 + Math.random() * 10,
        yAmp: 3 + Math.random() * 6,
      });
    }

    // Floating ring outlines (message indicators)
    const ringGeo = new THREE.TorusGeometry(1, 0.04, 12, 48);
    const rings: THREE.Mesh[] = [];
    const ringData: { speed: number; phase: number; radius: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: [WA_GREEN, WA_TEAL][i % 2],
        transparent: true,
        opacity: 0.08 + Math.random() * 0.1,
      });
      const mesh = new THREE.Mesh(ringGeo, mat);
      mesh.scale.setScalar(0.6 + Math.random() * 1.2);
      scene.add(mesh);
      rings.push(mesh);
      ringData.push({
        speed: 0.1 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        radius: 5 + Math.random() * 9,
      });
    }

    // Particle field
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;
      sizes[i] = 0.02 + Math.random() * 0.06;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    const pMat = new THREE.PointsMaterial({
      color: WA_GREEN,
      size: 0.06,
      transparent: true,
      opacity: 0.25,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Mouse interaction
    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      bubbles.forEach((b, i) => {
        const d = bubbleData[i];
        b.position.x = Math.cos(t * d.speed + d.phase) * d.radius;
        b.position.y = Math.sin(t * d.speed * 0.7 + d.phase) * d.yAmp;
        b.position.z = Math.sin(t * d.speed * 0.5 + d.phase * 2) * 4;
      });

      rings.forEach((r, i) => {
        const d = ringData[i];
        r.position.x = Math.sin(t * d.speed + d.phase) * d.radius;
        r.position.y = Math.cos(t * d.speed * 0.8 + d.phase) * 5;
        r.position.z = Math.cos(t * d.speed * 0.4 + d.phase) * 3;
        r.rotation.x = t * 0.3 + d.phase;
        r.rotation.y = t * 0.2;
      });

      const posArr = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        posArr[i * 3 + 1] += Math.sin(t + i) * 0.002;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.02;
      camera.position.y += (mouse.y * 1.0 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const nw = mount.clientWidth || 1;
      const nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 -z-10"
      aria-hidden="true"
    />
  );
}

const features = [
  { icon: MessageCircle, text: "Bulk WhatsApp campaigns" },
  { icon: Shield, text: "End-to-end encryption" },
  { icon: Zap, text: "Real-time analytics" },
];

export default function Login() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data: plansData } = usePublicPlans();
  const startingPrice = cheapestPlan(plansData?.plans ?? [])?.priceLabel;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_SUPERSEDED_KEY)) {
      sessionStorage.removeItem(SESSION_SUPERSEDED_KEY);
      setError("You were signed out because your account was opened on another device.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const url = mode === "login" ? "/api/login" : "/api/register";
    const body =
      mode === "login"
        ? { email, password }
        : { email, password, firstName, lastName };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Something went wrong. Please try again.");
        return;
      }

      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
      queryClient.removeQueries({
        predicate: (q) => q.queryKey[0] !== "/api/auth/user",
      });
      const destination =
        data.user?.role === "super_admin" ? "/admin" : "/dashboard";

      // Login always happens on the root domain; the authenticated app
      // lives on the app.<domain> subdomain. Cross-subdomain requires a
      // real navigation (SPA routing can't move to a different host), and
      // the session cookie must already be shared via COOKIE_DOMAIN for
      // this to land the user already logged in.
      const primaryDomain = import.meta.env.VITE_PRIMARY_DOMAIN as string | undefined;
      if (primaryDomain && window.location.hostname !== `app.${primaryDomain}`) {
        window.location.href = `https://app.${primaryDomain}${destination}`;
      } else {
        navigate(destination);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen flex overflow-hidden">
      <AuthSeo path="/login" />
      <LoginScene />

      {/* Background gradient overlay */}
      <div
        className="pointer-events-none fixed inset-0 -z-[5]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(37,211,102,0.14), transparent 50%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(18,140,126,0.1), transparent 50%), linear-gradient(135deg, rgba(247,251,248,0.95), rgba(255,255,255,0.9))",
        }}
      />

      {/* Left side - branding (hidden on mobile) */}
      <div
        className={`hidden lg:flex lg:w-1/2 flex-col justify-center px-16 xl:px-24 transition-all duration-700 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"}`}
      >
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25">
              <FaWhatsapp className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold text-[#075E54]">
                ChatBoatAI
              </h1>
              <p className="text-xs text-[#075E54]/60 tracking-wide">WhatsApp Business Platform</p>
            </div>
          </div>

          <h2 className="font-heading text-4xl xl:text-5xl font-bold text-[#075E54] leading-tight mb-6">
            Scale your business
            <br />
            <span className="text-[#25D366]">conversations</span>
          </h2>

          <p className="text-lg text-[#075E54]/70 mb-10 leading-relaxed">
            Send campaigns, manage conversations, and grow your audience — all from one powerful dashboard.
          </p>

          <div className="space-y-4">
            {features.map((f, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 transition-all duration-500 ${mounted ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
                style={{ transitionDelay: `${300 + i * 150}ms` }}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366]">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="text-[#075E54]/80 font-medium">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex items-center gap-3">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-[#25D366] to-[#128c7e] flex items-center justify-center text-[10px] font-bold text-white"
                >
                  {["A", "R", "S", "K"][i]}
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#075E54]">Trusted by 500+ businesses</p>
              <p className="text-xs text-[#075E54]/50">across India</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8">
        <div
          className={`w-full max-w-[420px] transition-all duration-700 ${mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"}`}
          style={{ transitionDelay: "200ms" }}
        >
          <Link href="/">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 gap-1.5 text-[#075E54]/70 hover:text-[#075E54] hover:bg-[#25D366]/10"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to homepage
            </Button>
          </Link>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-lg shadow-[#25D366]/25">
              <FaWhatsapp className="h-5 w-5" />
            </div>
            <h1 className="font-heading text-xl font-bold text-[#075E54]">
              ChatBoatAI
            </h1>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_32px_80px_-20px_rgba(7,94,84,0.2)] p-8">
            <div className="text-center mb-6">
              <h2 className="font-heading text-xl font-bold text-[#075E54]">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-[#075E54]/60">
                {mode === "login"
                  ? "Sign in to your workspace"
                  : startingPrice
                    ? `Start your 3-day free trial — from ${startingPrice}/mo after`
                    : "Start your 3-day free trial"}
              </p>
            </div>

            <Tabs
              value={mode}
              onValueChange={(v) => {
                setMode(v as "login" | "register");
                setError("");
              }}
              className="mb-6"
            >
              <TabsList className="grid w-full grid-cols-2 bg-[#075E54]/5 rounded-xl p-1">
                <TabsTrigger
                  value="login"
                  data-testid="tab-login"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#075E54] data-[state=active]:shadow-sm"
                >
                  Log In
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  data-testid="tab-register"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#075E54] data-[state=active]:shadow-sm"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mb-4 rounded-xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-medium text-[#075E54]/70">First name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      data-testid="input-firstname"
                      className="h-11 rounded-xl border-[#075E54]/15 bg-white/60 focus:border-[#25D366] focus:ring-[#25D366]/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-medium text-[#075E54]/70">Last name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      data-testid="input-lastname"
                      className="h-11 rounded-xl border-[#075E54]/15 bg-white/60 focus:border-[#25D366] focus:ring-[#25D366]/20"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-[#075E54]/70">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                  className="h-11 rounded-xl border-[#075E54]/15 bg-white/60 focus:border-[#25D366] focus:ring-[#25D366]/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-[#075E54]/70">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "register" ? 8 : undefined}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-password"
                    className="h-11 rounded-xl border-[#075E54]/15 bg-white/60 pr-10 focus:border-[#25D366] focus:ring-[#25D366]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#075E54]/40 hover:text-[#075E54]/70 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "register" && (
                  <p className="text-[11px] text-[#075E54]/40 mt-1">At least 8 characters</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-[#25D366] text-white font-semibold hover:bg-[#20bd5a] shadow-lg shadow-[#25D366]/20 transition-all duration-200 hover:shadow-xl hover:shadow-[#25D366]/30 hover:-translate-y-0.5 gap-2"
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                    </svg>
                    Please wait…
                  </span>
                ) : (
                  <>
                    {mode === "login" ? "Log In" : "Start free trial"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {mode === "register" && (
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#25D366]/5 p-3">
                <CheckCircle2 className="h-4 w-4 text-[#25D366] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#075E54]/60 leading-relaxed">
                  No credit card required. Trial includes up to 100 contacts and 100 messages/day.
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-[#075E54]/40 mt-6">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-[#25D366]">Terms</a>{" "}
            and{" "}
            <a href="/privacy" className="underline hover:text-[#25D366]">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
