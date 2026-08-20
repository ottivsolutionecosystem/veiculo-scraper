import type { LucideIcon } from "lucide-react";
import {
  Flame,
  Search,
  Columns3,
  GitCompareArrows,
  Radio,
  Settings,
  ScrollText,
  Users,
  LayoutDashboard,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  masterOnly?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  pinBottom?: boolean;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Hoje",
    items: [
      { href: "/", label: "Fila de trabalho", icon: Flame },
      { href: "/solicitacoes", label: "Kanban", icon: Columns3 },
      { href: "/busca", label: "Veículos consignados", icon: Search },
    ],
  },
  {
    title: "Administração",
    pinBottom: true,
    items: [
      { href: "/operacao", label: "Operação", icon: LayoutDashboard, masterOnly: true },
      { href: "/revisao-fipe", label: "Revisão FIPE", icon: GitCompareArrows, masterOnly: true },
      { href: "/equipe", label: "Equipe", icon: Users, masterOnly: true },
      { href: "/fontes", label: "Fontes", icon: Radio, masterOnly: true },
      { href: "/ajustes", label: "Ajustes", icon: Settings, masterOnly: true },
      { href: "/auditoria", label: "Auditoria", icon: ScrollText, masterOnly: true },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function navGroupsFor(isMaster: boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isMaster || !item.masterOnly),
  })).filter((group) => group.items.length > 0);
}
