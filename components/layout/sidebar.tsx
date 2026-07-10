'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { navigation } from '@/config/navigation';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-none flex-col bg-gradient-to-b from-black via-brand-navy to-brand-denim p-3">
      {/* Brand block */}
      <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.06] p-3">
        <BrandLogo className="h-10 w-auto" fallbackClassName="text-lg" />
        <p className="text-[10px] text-white/40">Fare Tessile Hub</p>
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              href={item.href}
              key={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-white/[0.12] font-semibold text-brand-gold'
                  : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90',
              )}
            >
              <item.icon size={15} className={active ? 'opacity-100' : 'opacity-60'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Workspace info */}
      <div className="mt-4 rounded-lg border border-white/10 px-3 py-2.5 text-xs">
        <p className="font-medium text-white/55">Fare Tessile</p>
        <p className="text-white/30">Business workspace</p>
      </div>
    </aside>
  );
}
