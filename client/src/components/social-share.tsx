import { useLocation } from "wouter";
import { Facebook, Linkedin, Link2, Share2 } from "lucide-react";
import { FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { useToast } from "@/hooks/use-toast";
import { SITE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

type SocialShareProps = {
  title?: string;
  className?: string;
};

export function SocialShare({
  title = "Sampark — WhatsApp Business API Platform",
  className,
}: SocialShareProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const url = `${SITE_URL}${location === "/" ? "/" : location}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Page URL copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy the link.", variant: "destructive" });
    }
  };

  const items = [
    {
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: FaWhatsapp,
      className: "hover:bg-[#25D366]/15 hover:text-[#128C7E]",
    },
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: FaXTwitter,
      className: "hover:bg-[#075E54]/10 hover:text-[#075E54]",
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: Linkedin,
      className: "hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]",
    },
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
      className: "hover:bg-[#1877F2]/10 hover:text-[#1877F2]",
    },
  ] as const;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#075E54]/55 mr-1">
        <Share2 className="h-3.5 w-3.5" aria-hidden /> Share
      </span>
      {items.map(({ label, href, icon: Icon, className: itemClass }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          aria-label={label}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#075E54]/15 text-[#075E54]/70 transition-colors",
            itemClass,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        title="Copy link"
        aria-label="Copy link"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#075E54]/15 text-[#075E54]/70 transition-colors hover:bg-[#075E54]/10 hover:text-[#075E54]"
      >
        <Link2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
