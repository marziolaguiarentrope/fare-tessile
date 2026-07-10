'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type BrandLogoProps = {
  className?: string;
  fallbackClassName?: string;
};

export function BrandLogo({ className, fallbackClassName }: BrandLogoProps) {
  const [hasLogo, setHasLogo] = useState(true);

  if (!hasLogo) {
    return (
      <span className={cn('font-semibold tracking-wide text-white', fallbackClassName)}>
        Fare Tessile
      </span>
    );
  }

  return (
    <Image
      src="/fare-tessile.png"
      alt="Fare Tessile"
      width={969}
      height={161}
      className={className}
      priority
      onError={() => setHasLogo(false)}
    />
  );
}
