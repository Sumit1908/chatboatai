import { FadeIn } from "@/components/marketing-layout";

/* Shared building blocks for the public marketing pages. */

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <FadeIn>
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
        {eyebrow && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#0E8C7F]">{eyebrow}</p>
        )}
        <h2 className="font-heading text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
          {title}
        </h2>
        {subtitle && <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">{subtitle}</p>}
      </div>
    </FadeIn>
  );
}
