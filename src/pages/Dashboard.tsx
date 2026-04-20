import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Heart,
  ImagePlus,
  Loader2,
  LogOut,
  Repeat2,
  Save,
  Search,
  Send,
  Shield,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { logAction } from "@/hooks/useAuditLog";
import { maskEmail } from "@/lib/maskEmail";
import { commentSchema, postSchema, socialProfileSchema } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import LoopLogo from "@/components/LoopLogo";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ProfileRow = {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url?: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  content: string;
  image_path: string | null;
  repost_of_post_id: string | null;
  created_at: string;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type LikeRow = {
  post_id: string;
  user_id: string;
};

type RepostRow = {
  post_id: string;
  user_id: string;
};

type FeedComment = CommentRow & {
  author?: ProfileRow;
};

type FeedLike = LikeRow & {
  author?: ProfileRow;
};

type FeedPost = PostRow & {
  author?: ProfileRow;
  comments: FeedComment[];
  likes: FeedLike[];
  likeCount: number;
  repostCount: number;
  likedByMe: boolean;
  repostedByMe: boolean;
  imageUrl: string | null;
};

type DeleteTarget =
  | { type: "post"; id: string; imagePath: string | null }
  | { type: "comment"; id: string };

const getInitials = (name?: string | null, username?: string | null, email?: string | null) => {
  const source = name || username || email || "U";
  return (
    source
      .replace("@", "")
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U"
  );
};

const getDisplayName = (profile?: ProfileRow, email?: string | null) => {
  if (profile?.name?.trim()) return profile.name.trim();
  if (profile?.username?.trim()) return `@${profile.username.trim()}`;
  return email ? maskEmail(email) : "Usuario";
};

const getRelativeDate = (value: string) =>
  formatDistanceToNow(new Date(value), { addSuffix: true, locale: es });

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { isAdmin } = useRole();

  const [profileForm, setProfileForm] = useState({ name: "", username: "", bio: "" });
  const [composerText, setComposerText] = useState("");
  const [composerImage, setComposerImage] = useState<File | null>(null);
  const [composerPreview, setComposerPreview] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const dashboardQuery = useQuery({
    queryKey: ["social-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles" as any)
        .select("id, name, username, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: postsData, error: postsError } = await supabase
        .from("posts" as any)
        .select("id, user_id, content, image_path, repost_of_post_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      const posts = (postsData ?? []) as unknown as PostRow[];
      const postIds = posts.map((post) => post.id);

      const [commentsRes, likesRes, repostsRes] = await Promise.all([
        postIds.length
          ? supabase
              .from("post_comments" as any)
              .select("id, post_id, user_id, content, created_at")
              .in("post_id", postIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from("post_likes" as any).select("post_id, user_id").in("post_id", postIds)
          : Promise.resolve({ data: [], error: null }),
        postIds.length
          ? supabase.from("post_reposts" as any).select("post_id, user_id").in("post_id", postIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (commentsRes.error) throw commentsRes.error;
      if (likesRes.error) throw likesRes.error;
      if (repostsRes.error) throw repostsRes.error;

      const comments = (commentsRes.data ?? []) as CommentRow[];
      const likes = (likesRes.data ?? []) as LikeRow[];
      const reposts = (repostsRes.data ?? []) as RepostRow[];

      const profileIds = Array.from(
        new Set([
          user.id,
          ...posts.map((post) => post.user_id),
          ...comments.map((comment) => comment.user_id),
          ...likes.map((like) => like.user_id),
        ]),
      );

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles" as any)
        .select("id, name, username, bio, avatar_url")
        .in("id", profileIds);

      if (profilesError) throw profilesError;

      const profiles = (profilesData ?? []) as unknown as ProfileRow[];
      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

      const imagePaths = posts.map((post) => post.image_path).filter(Boolean) as string[];
      const imageEntries = await Promise.all(
        imagePaths.map(async (path) => {
          const { data } = await supabase.storage.from("post-images").createSignedUrl(path, 60 * 60);
          return [path, data?.signedUrl ?? null] as const;
        }),
      );
      const imageMap = new Map(imageEntries);

      const commentsByPost = comments.reduce<Record<string, FeedComment[]>>((acc, comment) => {
        acc[comment.post_id] ??= [];
        acc[comment.post_id].push({ ...comment, author: profileMap.get(comment.user_id) });
        return acc;
      }, {});

      const likesByPost = likes.reduce<Record<string, FeedLike[]>>((acc, like) => {
        acc[like.post_id] ??= [];
        acc[like.post_id].push({ ...like, author: profileMap.get(like.user_id) });
        return acc;
      }, {});

      const repostsByPost = reposts.reduce<Record<string, RepostRow[]>>((acc, repost) => {
        acc[repost.post_id] ??= [];
        acc[repost.post_id].push(repost);
        return acc;
      }, {});

      const feed = posts.map<FeedPost>((post) => {
        const postLikes = likesByPost[post.id] ?? [];
        const postReposts = repostsByPost[post.id] ?? [];

        return {
          ...post,
          author: profileMap.get(post.user_id),
          comments: commentsByPost[post.id] ?? [],
          likes: postLikes,
          likeCount: postLikes.length,
          repostCount: postReposts.length,
          likedByMe: postLikes.some((like) => like.user_id === user.id),
          repostedByMe: postReposts.some((repost) => repost.user_id === user.id),
          imageUrl: post.image_path ? imageMap.get(post.image_path) ?? null : null,
        };
      });

      return {
        profile: ((profileData as unknown as ProfileRow | null) ?? profileMap.get(user.id) ?? null),
        feed,
      };
    },
  });

  const userSearchQuery = useQuery({
    queryKey: ["user-search", userSearch],
    enabled: userSearch.trim().length >= 2,
    queryFn: async () => {
      const term = userSearch.trim();
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("id, name, username, bio, avatar_url")
        .or(`username.ilike.%${term}%,name.ilike.%${term}%`)
        .order("username", { ascending: true })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as unknown as ProfileRow[];
    },
  });

  useEffect(() => {
    if (dashboardQuery.data?.profile) {
      setProfileForm({
        name: dashboardQuery.data.profile.name ?? "",
        username: dashboardQuery.data.profile.username ?? "",
        bio: dashboardQuery.data.profile.bio ?? "",
      });
    }
  }, [dashboardQuery.data?.profile]);

  useEffect(() => {
    if (!composerImage) {
      setComposerPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(composerImage);
    setComposerPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [composerImage]);

  const feed = dashboardQuery.data?.feed ?? [];
  const myPosts = useMemo(() => feed.filter((post) => post.user_id === user?.id), [feed, user?.id]);
  const currentProfile = dashboardQuery.data?.profile;
  const totalProfileLikes = myPosts.reduce((sum, post) => sum + post.likeCount, 0);
  const totalProfileComments = myPosts.reduce((sum, post) => sum + post.comments.length, 0);

  const refreshDashboard = () => queryClient.invalidateQueries({ queryKey: ["social-dashboard", user?.id] });

  const profileMutation = useMutation({
    mutationFn: async () => {
      const result = socialProfileSchema.safeParse(profileForm);
      if (!result.success) throw new Error(result.error.errors[0]?.message ?? "Datos inválidos");

      const { error } = await supabase
        .from("profiles" as any)
        .update({
          name: result.data.name || null,
          username: result.data.username || null,
          bio: result.data.bio || null,
        })
        .eq("id", user?.id);

      if (error) throw error;
      await logAction("profile_update", "profiles", { userId: user?.id });
    },
    onSuccess: async () => {
      toast({ title: "Perfil actualizado", description: "Tus cambios ya están guardados." });
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const result = postSchema.safeParse({ content: composerText, hasImage: !!composerImage });
      if (!result.success) throw new Error(result.error.errors[0]?.message ?? "Post inválido");

      let imagePath: string | null = null;
      if (composerImage && user?.id) {
        const safeName = composerImage.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        imagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
        const uploadResult = await supabase.storage.from("post-images").upload(imagePath, composerImage, {
          upsert: false,
          contentType: composerImage.type,
        });
        if (uploadResult.error) throw uploadResult.error;
      }

      const { error } = await supabase.from("posts" as any).insert({
        user_id: user?.id,
        content: result.data.content?.trim() || "",
        image_path: imagePath,
      } as any);

      if (error) throw error;
      await logAction("post_create", "posts", { hasImage: !!imagePath });
    },
    onSuccess: async () => {
      setComposerText("");
      setComposerImage(null);
      toast({ title: "Publicado", description: "Tu post ya aparece en el feed." });
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo publicar", description: error.message, variant: "destructive" });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (target: { id: string; imagePath: string | null }) => {
      const { error } = await supabase.from("posts" as any).delete().eq("id", target.id).eq("user_id", user?.id);
      if (error) throw error;

      if (target.imagePath) {
        await supabase.storage.from("post-images").remove([target.imagePath]);
      }

      await logAction("post_delete", "posts", { postId: target.id });
    },
    onSuccess: async () => {
      toast({ title: "Post eliminado", description: "Tu publicación ya no aparece en el feed." });
      setDeleteTarget(null);
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("post_comments" as any)
        .delete()
        .eq("id", commentId)
        .eq("user_id", user?.id);
      if (error) throw error;

      await logAction("comment_delete", "post_comments", { commentId });
    },
    onSuccess: async () => {
      toast({ title: "Comentario eliminado", description: "Tu comentario fue eliminado." });
      setDeleteTarget(null);
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (post: FeedPost) => {
      if (post.likedByMe) {
        const { error } = await supabase
          .from("post_likes" as any)
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user?.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("post_likes" as any).insert({
        post_id: post.id,
        user_id: user?.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: refreshDashboard,
    onError: (error: Error) => {
      toast({ title: "No se pudo actualizar el like", description: error.message, variant: "destructive" });
    },
  });

  const toggleRepostMutation = useMutation({
    mutationFn: async (post: FeedPost) => {
      if (post.repostedByMe) {
        const { error } = await supabase
          .from("post_reposts" as any)
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user?.id);
        if (error) throw error;
        return;
      }

      const { error } = await supabase.from("post_reposts" as any).insert({
        post_id: post.id,
        user_id: user?.id,
      } as any);
      if (error) throw error;
      await logAction("post_repost", "post_reposts", { postId: post.id });
    },
    onSuccess: refreshDashboard,
    onError: (error: Error) => {
      toast({ title: "No se pudo repostear", description: error.message, variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (postId: string) => {
      const content = commentDrafts[postId] ?? "";
      const result = commentSchema.safeParse({ content });
      if (!result.success) throw new Error(result.error.errors[0]?.message ?? "Comentario inválido");

      const { error } = await supabase.from("post_comments" as any).insert({
        post_id: postId,
        user_id: user?.id,
        content: result.data.content,
      } as any);
      if (error) throw error;
    },
    onSuccess: async (_data, postId) => {
      setCommentDrafts((current) => ({ ...current, [postId]: "" }));
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo comentar", description: error.message, variant: "destructive" });
    },
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const renderPostCard = (post: FeedPost, compact = false) => (
    <Card key={post.id} className="glass border-border">
      <CardHeader className="space-y-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 border border-border">
            <AvatarImage src={post.author?.avatar_url ?? undefined} alt={getDisplayName(post.author)} />
            <AvatarFallback className="font-semibold">
              {getInitials(post.author?.name, post.author?.username)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="font-medium text-foreground">{getDisplayName(post.author)}</p>
              {post.author?.username && <span className="text-sm text-muted-foreground">@{post.author.username}</span>}
              <span className="text-xs text-muted-foreground">• {getRelativeDate(post.created_at)}</span>
            </div>
            {post.content?.trim() && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{post.content}</p>}
          </div>
          {post.user_id === user?.id && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget({ type: "post", id: post.id, imagePath: post.image_path })}
              aria-label="Eliminar post"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {post.imageUrl && (
          <div className="overflow-hidden rounded-md border border-border bg-background/60">
            <img src={post.imageUrl} alt="Imagen del post" className="max-h-[520px] w-full object-cover" loading="lazy" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{post.likeCount} likes</span>
          <span>•</span>
          <span>{post.comments.length} comentarios</span>
          <span>•</span>
          <span>{post.repostCount} reposts</span>
        </div>

        {post.likes.length > 0 && (
          <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Les gusta a</p>
            <div className="flex flex-wrap gap-2">
              {post.likes.slice(0, compact ? 4 : 8).map((like) => (
                <div key={`${post.id}-${like.user_id}`} className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-foreground">
                  <Avatar className="h-6 w-6 border border-border">
                    <AvatarImage src={like.author?.avatar_url ?? undefined} alt={getDisplayName(like.author)} />
                    <AvatarFallback className="text-[10px] font-semibold">
                      {getInitials(like.author?.name, like.author?.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{getDisplayName(like.author)}</span>
                </div>
              ))}
              {post.likes.length > (compact ? 4 : 8) && (
                <div className="inline-flex items-center rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
                  +{post.likes.length - (compact ? 4 : 8)} más
                </div>
              )}
            </div>
          </div>
        )}

        {!compact && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Button
                variant={post.likedByMe ? "secondary" : "outline"}
                onClick={() => toggleLikeMutation.mutate(post)}
                disabled={toggleLikeMutation.isPending}
                className="border-border"
              >
                <Heart size={16} /> Like
              </Button>
              <Button
                variant={post.repostedByMe ? "secondary" : "outline"}
                onClick={() => toggleRepostMutation.mutate(post)}
                disabled={toggleRepostMutation.isPending}
                className="border-border"
              >
                <Repeat2 size={16} /> Repost
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={commentDrafts[post.id] ?? ""}
                  onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                  placeholder="Escribe un comentario"
                />
                <Button onClick={() => commentMutation.mutate(post.id)} disabled={commentMutation.isPending} size="icon">
                  <Send size={16} />
                </Button>
              </div>

              <div className="space-y-3">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="rounded-md border border-border bg-background/50 p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{getDisplayName(comment.author)}</span>
                      {comment.author?.username && <span>@{comment.author.username}</span>}
                      <span>• {getRelativeDate(comment.created_at)}</span>
                      {comment.user_id === user?.id && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ type: "comment", id: comment.id })}
                          className="ml-auto inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen gradient-bg">
      <header className="border-b border-border glass">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <LoopLogo />
          <div className="flex items-center gap-2 sm:gap-3">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="border-border">
                <Shield size={14} /> Admin
              </Button>
            )}
            <span className="hidden text-sm text-muted-foreground sm:block">{maskEmail(user?.email ?? "")}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-border">
              <LogOut size={16} /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Tabs defaultValue="feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="users">Usuarios</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-6">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="text-xl">Comparte algo</CardTitle>
                <CardDescription>Texto corto, una foto o ambas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 border border-border">
                    <AvatarFallback className="font-semibold">
                      {getInitials(currentProfile?.name, currentProfile?.username, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <Textarea
                    value={composerText}
                    onChange={(event) => setComposerText(event.target.value)}
                    placeholder="¿Qué estás pensando?"
                    maxLength={1000}
                    className="min-h-[120px] resize-none"
                  />
                </div>

                {composerPreview && (
                  <div className="relative overflow-hidden rounded-md border border-border bg-background/60">
                    <img src={composerPreview} alt="Vista previa del post" className="max-h-[420px] w-full object-cover" loading="lazy" />
                    <Button type="button" variant="secondary" size="icon" className="absolute right-3 top-3" onClick={() => setComposerImage(null)}>
                      <X size={16} />
                    </Button>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => setComposerImage(event.target.files?.[0] ?? null)}
                    />
                    <span className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 hover:bg-muted">
                      <ImagePlus size={16} /> Añadir foto
                    </span>
                  </label>

                  <Button onClick={() => createPostMutation.mutate()} disabled={createPostMutation.isPending}>
                    {createPostMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    Publicar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {dashboardQuery.isLoading && (
              <>
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-56 w-full rounded-lg" />
              </>
            )}

            {!dashboardQuery.isLoading && feed.length === 0 && (
              <Card className="glass border-border">
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <UserRound size={28} className="text-muted-foreground" />
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">Aún no hay posts</h1>
                    <p className="text-sm text-muted-foreground">Sé la primera persona en publicar algo.</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {feed.map((post) => renderPostCard(post))}
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              <section className="space-y-6">
                <Card className="glass border-border">
                  <CardHeader className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border border-border">
                        <AvatarImage src={currentProfile?.avatar_url ?? undefined} alt={getDisplayName(currentProfile, user?.email)} />
                        <AvatarFallback className="text-base font-semibold">
                          {getInitials(currentProfile?.name, currentProfile?.username, user?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-1">
                        <h1 className="truncate text-2xl font-semibold text-foreground">{getDisplayName(currentProfile, user?.email)}</h1>
                        <p className="truncate text-sm text-muted-foreground">
                          {currentProfile?.username ? `@${currentProfile.username}` : maskEmail(user?.email ?? "")}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded-md border border-border bg-background/60 px-2 py-3">
                        <div className="font-semibold text-foreground">{myPosts.length}</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                      </div>
                      <div className="rounded-md border border-border bg-background/60 px-2 py-3">
                        <div className="font-semibold text-foreground">{totalProfileLikes}</div>
                        <div className="text-xs text-muted-foreground">Likes</div>
                      </div>
                      <div className="rounded-md border border-border bg-background/60 px-2 py-3">
                        <div className="font-semibold text-foreground">{totalProfileComments}</div>
                        <div className="text-xs text-muted-foreground">Comentarios</div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <Card className="glass border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Editar perfil</CardTitle>
                    <CardDescription>Este apartado es independiente del feed.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Nombre</label>
                      <Input
                        value={profileForm.name}
                        onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Tu nombre"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Usuario</label>
                      <Input
                        value={profileForm.username}
                        onChange={(event) => setProfileForm((current) => ({ ...current, username: event.target.value.replace(/^@/, "") }))}
                        placeholder="usuario"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Descripción</label>
                      <Textarea
                        value={profileForm.bio}
                        onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
                        placeholder="Cuéntale al mundo quién eres"
                        maxLength={160}
                        className="min-h-[120px] resize-none"
                      />
                      <p className="text-right text-xs text-muted-foreground">{profileForm.bio.length}/160</p>
                    </div>
                    <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending} className="w-full">
                      {profileMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                      Guardar perfil
                    </Button>
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-6">
                <Card className="glass border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Tu bio</CardTitle>
                    <CardDescription>Así te verán otras personas.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {currentProfile?.bio?.trim() || "Aún no has escrito una descripción de perfil."}
                    </p>
                  </CardContent>
                </Card>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-foreground">Tus posts</h2>
                    <div className="text-xs text-muted-foreground">{myPosts.length} publicaciones</div>
                  </div>
                  {myPosts.length === 0 ? (
                    <Card className="glass border-border">
                      <CardContent className="py-12 text-center text-sm text-muted-foreground">
                        Todavía no has publicado nada.
                      </CardContent>
                    </Card>
                  ) : (
                    myPosts.map((post) => renderPostCard(post, true))
                  )}
                </section>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="text-xl">Buscar usuarios</CardTitle>
                <CardDescription>Busca por nombre o usuario.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Ej. maria o @maria" className="pl-9" />
                </div>

                {userSearch.trim().length < 2 ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    Escribe al menos 2 caracteres para buscar.
                  </div>
                ) : userSearchQuery.isLoading ? (
                  <>
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </>
                ) : (userSearchQuery.data?.length ?? 0) === 0 ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No encontramos usuarios con ese texto.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {userSearchQuery.data?.map((profile) => (
                      <Card key={profile.id} className="border-border bg-background/40">
                        <CardContent className="flex items-start gap-3 py-4">
                          <Avatar className="h-12 w-12 border border-border">
                            <AvatarImage src={profile.avatar_url ?? undefined} alt={getDisplayName(profile)} />
                            <AvatarFallback className="font-semibold">{getInitials(profile.name, profile.username)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">{getDisplayName(profile)}</p>
                              {profile.username && <span className="text-sm text-muted-foreground">@{profile.username}</span>}
                            </div>
                            <p className="text-sm leading-6 text-muted-foreground">
                              {profile.bio?.trim() || "Este usuario todavía no agregó descripción."}
                            </p>
                          </div>
                          <Users size={18} className="text-muted-foreground" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "post" ? "Eliminar post" : "Eliminar comentario"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "post"
                ? "Esta acción quitará la publicación del feed y no se puede deshacer."
                : "Esta acción quitará el comentario y no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                if (deleteTarget.type === "post") {
                  deletePostMutation.mutate({ id: deleteTarget.id, imagePath: deleteTarget.imagePath });
                  return;
                }
                deleteCommentMutation.mutate(deleteTarget.id);
              }}
              disabled={deletePostMutation.isPending || deleteCommentMutation.isPending}
            >
              {(deletePostMutation.isPending || deleteCommentMutation.isPending) ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
