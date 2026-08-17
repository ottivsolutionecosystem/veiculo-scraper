import type { LucideIcon } from "lucide-react";
import {
  Flame,
  Search,
  Phone,
  Users,
  ClipboardList,
  UserRound,
  GitCompareArrows,
  Radio,
  Settings,
  ScrollText,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Fila do dia", icon: Flame },
  { href: "/busca", label: "Busca", icon: Search },
  { href: "/discador", label: "Discador", icon: Phone },
  { href: "/clientes", label: "Clientes e interesses", icon: Users },
  { href: "/solicitacoes", label: "Solicitações", icon: ClipboardList },
  { href: "/vendedores", label: "Vendedores", icon: UserRound },
  { href: "/revisao-fipe", label: "Revisão de match FIPE", icon: GitCompareArrows },
  { href: "/fontes", label: "Fontes", icon: Radio },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
  { href: "/auditoria", label: "Auditoria", icon: ScrollText },
];
