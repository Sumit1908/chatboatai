import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, LayoutGrid, CreditCard, HelpCircle, Mail } from "lucide-react";
import { SeoHead } from "@/components/seo-head";

const HELPFUL_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/features", label: "Features", icon: LayoutGrid },
  { href: "/pricing", label: "Pricing", icon: CreditCard },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
  { href: "/contact", label: "Contact", icon: Mail },
] as const;

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F7FBF8] text-[#075E54] flex flex-col">
      <SeoHead
        title="Page Not Found | Sampark"
        description="The page you requested was not found. Return to Sampark home, features, pricing, FAQ or contact support for WhatsApp Business API help."
        path="/404"
        robots="noindex, follow"
        includeOrganization={false}
      />
      <header className="border-b border-[#075E54]/10 bg-white/80">
        <div className="container mx-auto max-w-4xl px-4 h-14 flex items-center">
          <Link href="/" className="font-heading font-bold text-lg">
            Sampark
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center space-y-6">
          <p className="text-sm font-semibold tracking-widest uppercase text-[#25D366]">404</p>
          <h1 className="font-heading text-3xl md:text-4xl font-bold">Page not found</h1>
          <p className="text-[#075E54]/65 leading-relaxed">
            The page you requested does not exist or may have moved. Use the links below to continue
            exploring Sampark’s WhatsApp Business API platform.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {HELPFUL_LINKS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="outline"
                  className="gap-2 border-[#075E54]/15 text-[#075E54] hover:bg-[#25D366]/10"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </div>
          <div className="pt-4">
            <Link href="/">
              <Button className="gap-2 bg-[#25D366] text-white hover:bg-[#20bd5a]">
                <ArrowLeft className="h-4 w-4" /> Back to home
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
