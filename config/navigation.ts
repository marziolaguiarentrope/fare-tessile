import { BarChart3, LayoutDashboard, ShoppingBag } from 'lucide-react';

export const navigation = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'E-comm Hub', href: '/ecommerce', icon: ShoppingBag },
  { label: 'Google Ads', href: '/google-ads', icon: BarChart3 },
] as const;
