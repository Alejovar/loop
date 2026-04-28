import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Lock } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource: string | null;
  details: Record<string, any>;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: "Inicio de sesión", color: "bg-blue-500/20 text-blue-400" },
  login_failed: { label: "Login fallido", color: "bg-red-500/20 text-red-400" },
  mfa_failed: { label: "MFA fallido", color: "bg-red-500/20 text-red-400" },
  password_reset_requested: { label: "Reset de contraseña", color: "bg-orange-500/20 text-orange-400" },
  logout: { label: "Cierre de sesión", color: "bg-gray-500/20 text-gray-400" },
  register: { label: "Registro", color: "bg-green-500/20 text-green-400" },
  mfa_enrolled: { label: "MFA activado", color: "bg-purple-500/20 text-purple-400" },
  mfa_verified: { label: "MFA verificado", color: "bg-purple-500/20 text-purple-400" },
  admin_create_user: { label: "Usuario creado", color: "bg-green-500/20 text-green-400" },
  admin_update_role: { label: "Rol actualizado", color: "bg-yellow-500/20 text-yellow-400" },
  ban_user: { label: "Usuario bloqueado", color: "bg-red-500/20 text-red-400" },
  unban_user: { label: "Usuario desbloqueado", color: "bg-green-500/20 text-green-400" },
  generate_token: { label: "Token generado", color: "bg-cyan-500/20 text-cyan-400" },
  page_view: { label: "Vista de página", color: "bg-gray-500/20 text-gray-400" },
  navigation: { label: "Navegación", color: "bg-gray-500/20 text-gray-400" },
  profile_update: { label: "Perfil actualizado", color: "bg-blue-500/20 text-blue-400" },
  create_user: { label: "Usuario creado (admin)", color: "bg-green-500/20 text-green-400" },
  update_role: { label: "Rol cambiado (admin)", color: "bg-yellow-500/20 text-yellow-400" },
};

const AuditLogs = () => {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      // Use decrypted RPC function for admin viewing
      const { data, error } = await supabase.rpc("get_decrypted_audit_logs" as any, {
        p_limit: 500,
      });
      if (error) {
        // Fallback to direct query if RPC fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("audit_logs" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500);
        if (fallbackError) throw fallbackError;
        return (fallbackData as any[]) ?? [];
      }
      return (data as any[]) ?? [];
    },
  });

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch =
      !search ||
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resource?.toLowerCase().includes(search.toLowerCase());
    const matchesAction =
      actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const uniqueActions = [...new Set(logs?.map((l) => l.action) ?? [])];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          Bitácora de actividad
          <Lock size={16} className="text-primary" />
        </h2>
        <p className="text-sm text-muted-foreground">
          Registro completo de todas las interacciones en el sistema (datos encriptados con pgcrypto)
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar por email, acción o recurso..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-input border-border pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48 bg-input border-border">
            <SelectValue placeholder="Filtrar por acción" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>
                {ACTION_LABELS[action]?.label || action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="glass rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Recurso</TableHead>
                <TableHead>Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs?.map((log) => {
                const actionInfo = ACTION_LABELS[log.action];
                const isEncrypted = log.details && '_encrypted' in (log.details || {});
                return (
                  <TableRow key={log.id} className="border-border">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString("es", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {log.user_email || "Sistema"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs border-0 ${actionInfo?.color || "bg-muted text-muted-foreground"}`}
                      >
                        {actionInfo?.label || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.resource || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {isEncrypted ? (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Lock size={12} /> Encriptado
                        </span>
                      ) : Object.keys(log.details || {}).length > 0 ? (
                        <code className="text-xs text-muted-foreground bg-secondary rounded px-1.5 py-0.5 break-all">
                          {JSON.stringify(log.details)}
                        </code>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredLogs?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No se encontraron registros
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
