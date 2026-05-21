"use client";

import Link from "next/link";
import { ReactNode } from "react";

export function PageShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 md:px-12 md:py-16">
      <header className="mb-12 flex flex-col gap-6 border-b border-rule pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/"
            className="label hover:text-ink"
            aria-label="Back to dashboard"
          >
            ← Content Vault
          </Link>
          {title && (
            <h1 className="mt-3 font-display text-5xl font-medium leading-[0.95] tracking-tightest md:text-6xl">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-3 max-w-xl text-ash">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
