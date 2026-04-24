import { Home, LogOut, Search, Shield, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";
import LoopLogo from "@/components/LoopLogo";
import { BadgeCheck } from "lucide-react";

export type SidebarSection = "feed" | "search" | "profile";

interface AppSidebarProps {
  active: SidebarSection;
  onSelect: (section: SidebarSection) => void;
  profile?: {
    name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
    verified?: boolean | null;
  } | null;
  displayName: string;
  initials: string;
}

const items: { key: SidebarSection; label: string; icon: typeof Home }[] = [
  { key: "feed", label: "Feed", icon: Home },
  { key: "search", label: "Buscar", icon: Search },
  { key: "profile", label: "Perfil", icon: UserIcon },
];

export function AppSidebar({ active, onSelect, profile, displayName, initials }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useRole();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className={cn("flex items-center gap-3 px-2 py-3", collapsed && "justify-center px-0")}>
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={displayName} />
            <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="inline-flex items-center gap-1 truncate text-sm font-semibold text-sidebar-foreground">
                {displayName}
                {profile?.verified && <BadgeCheck size={14} className="text-primary" />}
              </span>
              {profile?.username && (
                <span className="truncate text-xs text-sidebar-foreground/60">@{profile.username}</span>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      onClick={() => onSelect(item.key)}
                      tooltip={item.label}
                      className={cn(
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                      )}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => navigate("/admin")} tooltip="Panel admin">
                    <Shield />
                    <span>Panel admin</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Cerrar sesión"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed && (
          <div className="px-2 pb-2 pt-1">
            <LoopLogo />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
