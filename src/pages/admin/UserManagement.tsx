import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { logAction } from "@/hooks/useAuditLog";
import { createUserSchema } from "@/lib/validation";
import {
  UserPlus,
  Loader2,
  ShieldCheck,
  ShieldX,
  Ban,
  CheckCircle,
  Link2,
  Search,
  BadgeCheck,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  user_metadata: any;
  roles: string[];
  verified?: boolean;
}

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "user" as "admin" | "user",
  });

  const {
    data: users,
    isLoading,
    error,
  } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_users" },
      });
      if (error) throw error;
      return data.users;
    },
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = createUserSchema.safeParse(newUser);
    if (!result.success) {
      toast({
        title: "Datos inválidos",
        description: result.error.errors.map((e) => e.message).join(", "),
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "create_user", ...newUser },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: "Usuario creado", description: `${newUser.email} creado exitosamente.` });
      await logAction("admin_create_user", "users", {
        email: newUser.email,
        role: newUser.role,
      });
      setCreateOpen(false);
      setNewUser({ email: "", password: "", name: "", role: "user" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({
        title: "Error al crear usuario",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_role", target_user_id: userId, new_role: newRole },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({ title: "Rol actualizado" });
      await logAction("admin_update_role", "user_roles", {
        target_user_id: userId,
        new_role: newRole,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleBan = async (userId: string, ban: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "toggle_ban", target_user_id: userId, ban },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: ban ? "Usuario bloqueado" : "Usuario desbloqueado",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleVerified = async (userId: string, verified: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "toggle_verified", target_user_id: userId, verified },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: verified ? "Usuario verificado" : "Verificación retirada",
      });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateLink = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "generate_token",
          target_user_id: userId,
          target_email: email,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setGeneratedLink(data.action_link || "");
      setLinkDialogOpen(true);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.user_metadata?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Gestión de Usuarios
          </h2>
          <p className="text-sm text-muted-foreground">
            Administra cuentas, roles y acceso
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground font-semibold">
              <UserPlus size={16} className="mr-1.5" /> Crear usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Crear nuevo usuario
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="bg-input border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  className="bg-input border-border"
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre (opcional)</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="bg-input border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v: "admin" | "user") =>
                    setNewUser({ ...newUser, role: v })
                  }
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={creating}
                className="w-full gradient-primary text-primary-foreground font-semibold"
              >
                {creating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Crear"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Buscar por email o nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-input border-border pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-destructive text-sm">
            Error al cargar usuarios. Verifica tus permisos.
          </p>
        </div>
      ) : (
        <div className="glass rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((u) => (
                <TableRow key={u.id} className="border-border">
                  <TableCell>
                    <div>
                      <p className="text-foreground text-sm">{u.email}</p>
                      {u.user_metadata?.name && (
                        <p className="text-xs text-muted-foreground">
                          {u.user_metadata.name}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.id === currentUser?.id ? (
                      <Badge variant="outline" className="text-xs border-border">
                        {u.roles?.[0] === "admin" ? "Admin" : "Usuario"} (tú)
                      </Badge>
                    ) : (
                      <Select
                        value={u.roles?.[0] || "user"}
                        onValueChange={(v) => handleUpdateRole(u.id, v)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuario</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.banned_until ? (
                      <Badge
                        variant="destructive"
                        className="text-xs"
                      >
                        Bloqueado
                      </Badge>
                    ) : u.email_confirmed_at ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        Activo
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                      >
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.last_sign_in_at
                      ? new Date(u.last_sign_in_at).toLocaleDateString("es", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Nunca"}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id !== currentUser?.id && (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleToggleBan(u.id, !u.banned_until)
                          }
                          className="h-7 text-xs border-border"
                          title={
                            u.banned_until ? "Desbloquear" : "Bloquear"
                          }
                        >
                          {u.banned_until ? (
                            <CheckCircle size={13} />
                          ) : (
                            <Ban size={13} />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleGenerateLink(u.id, u.email)
                          }
                          className="h-7 text-xs border-border"
                          title="Generar enlace de acceso"
                        >
                          <Link2 size={13} />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Link/QR Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="glass border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Enlace de acceso generado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {generatedLink && (
              <>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeSVG value={generatedLink} size={180} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Enlace directo:
                  </Label>
                  <div className="bg-secondary rounded p-2 break-all text-xs text-foreground font-mono">
                    {generatedLink}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    toast({
                      title: "Copiado",
                      description: "Enlace copiado al portapapeles.",
                    });
                  }}
                  className="w-full gradient-primary text-primary-foreground font-semibold"
                >
                  Copiar enlace
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
