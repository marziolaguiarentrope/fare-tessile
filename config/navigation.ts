import { BarChart3, Bot, Building2, Cable, ClipboardList, Gauge, LayoutDashboard, Megaphone, PenSquare, Settings, ShieldCheck, ShoppingBag, Sparkles, Wallet, Workflow } from 'lucide-react';

export const navigation = [
  { label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { label: 'E-commerce Hub', href: '/ecommerce', icon: ShoppingBag },
  { label: 'Clients', href: '/clients', icon: Building2 },
  { label: 'Accounts', href: '/accounts', icon: ClipboardList },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { label: 'Ads Intelligence', href: '/ads-intelligence', icon: Sparkles },
  { label: 'AI Actions', href: '/ai-actions', icon: Bot },
  { label: 'Automations', href: '/automations', icon: Workflow },
  { label: 'Budget Pacing', href: '/budget-pacing', icon: Wallet },
  { label: 'Performance Analytics', href: '/performance-analytics', icon: BarChart3 },
  { label: 'Recommendations', href: '/recommendations', icon: Gauge },
  { label: 'Copy Studio', href: '/copy-studio', icon: PenSquare },
  { label: 'Integrations', href: '/integrations', icon: Cable },
  { label: 'Team & Permissions', href: '/team-permissions', icon: ShieldCheck },
  { label: 'Settings', href: '/settings', icon: Settings }
] as const;
