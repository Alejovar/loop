import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2, CheckCircle2, XCircle, Flag } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Report {
  id: string;
  post_id: string;
  reporter_id: string;
  reporter_email: string | null;
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
}

interface PostInfo {
  id: string;
  content: string | null;
  user_id: string;
  image_path: string | null;
  created_at: string;
}

const Reports = () => {
  const qc = useQueryClient();

  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_reports" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const postIds = [...new Set((reports ?? []).map((r) => r.post_id))];

  const { data: posts } = useQuery<Record<string, PostInfo>>({
    queryKey: ["admin-reports-posts", postIds.join(",")],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts" as any)
        .select("id, content, user_id, image_path, created_at")
        .in("id", postIds);
      if (error) throw error;
      const map: Record<string, PostInfo> = {};
      (data as any[])?.forEach((p) => (map[p.id] = p));
      return map;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("post_reports" as any)
        .update({ status, reviewed_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Reporte actualizado" });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("posts" as any).delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-reports-posts"] });
      toast({ title: "Post eliminado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Flag size={18} className="text-primary" /> Reportes de publicaciones
        </h2>
        <p className="text-sm text-muted-foreground">
          Revisa los reportes enviados por usuarios y toma acción.
        </p>
      </div>

      {reports?.length === 0 && (
        <Card className="glass border-border">
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay reportes pendientes 🎉
          </CardContent>
        </Card>
      )}

      {reports?.map((r) => {
        const post = posts?.[r.post_id];
        const statusColor =
          r.status === "pending"
            ? "bg-amber-500/20 text-amber-400"
            : r.status === "reviewed"
            ? "bg-green-500/20 text-green-400"
            : "bg-gray-500/20 text-gray-400";
        return (
          <Card key={r.id} className="glass border-border">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Reporte de {r.reporter_email || "usuario"}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleString("es")}
                </p>
              </div>
              <Badge className={`text-xs border-0 ${statusColor}`}>{r.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Motivo</p>
                <p className="text-sm text-foreground bg-secondary rounded p-2">{r.reason}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Contenido reportado
                </p>
                {post ? (
                  <div className="bg-secondary rounded p-2 space-y-1">
                    <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                      {post.content || "(sin texto)"}
                    </p>
                    {post.image_path && (
                      <p className="text-xs text-muted-foreground">📷 Incluye imagen</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-destructive italic">Post eliminado</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {post && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("¿Eliminar este post definitivamente?")) {
                        deletePost.mutate(post.id);
                        updateStatus.mutate({ id: r.id, status: "reviewed" });
                      }
                    }}
                  >
                    <Trash2 size={14} className="mr-1" /> Eliminar post
                  </Button>
                )}
                {r.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: r.id, status: "reviewed" })}
                    >
                      <CheckCircle2 size={14} className="mr-1" /> Marcar revisado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus.mutate({ id: r.id, status: "dismissed" })}
                    >
                      <XCircle size={14} className="mr-1" /> Descartar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Reports;
