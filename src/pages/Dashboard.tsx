import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  BadgeCheck,
  Camera,
  Heart,
  Home,
  ImagePlus,
  Loader2,
  LogOut,
  Menu,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Save,
  Search,
  Send,
  Settings,
  Shield,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { logAction } from "@/hooks/useAuditLog";
import { commentSchema, postSchema, repostSchema, socialProfileSchema } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import LoopLogo from "@/components/LoopLogo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type SectionKey = "feed" | "search" | "profile";

type ProfileRow = {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url?: string | null;
  verified?: boolean | null;
};

type PostRow = {
  id: string;
  user_id: string;
  content: string;
  image_path: string | null;
  repost_of_post_id: string | null;
  repost_comment: string | null;
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
  originalPost?: FeedPost | null;
};

type DeleteTarget =
  | { type: "post"; id: string; imagePath: string | null }
  | { type: "comment"; id: string };

type EditTarget =
  | { type: "post"; id: string; content: string }
  | { type: "comment"; id: string; content: string };

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

const getDisplayName = (profile?: ProfileRow | null, fallback?: string | null) => {
  if (profile?.name?.trim()) return profile.name.trim();
  if (profile?.username?.trim()) return `@${profile.username.trim()}`;
  return fallback || "Usuario";
};

const getRelativeDate = (value: string) =>
  formatDistanceToNow(new Date(value), { addSuffix: true, locale: es });

const NameWithBadge = ({
  profile,
  fallback,
  className,
}: {
  profile?: ProfileRow | null;
  fallback?: string | null;
  className?: string;
}) => (
  <span className={cn("inline-flex items-center gap-1", className)}>
    <span className="font-medium text-foreground">{getDisplayName(profile, fallback)}</span>
    {profile?.verified && <BadgeCheck size={14} className="text-primary" aria-label="Verificado" />}
  </span>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { isAdmin } = useRole();

  const [activeSection, setActiveSection] = useState<SectionKey>("feed");
  const [profileForm, setProfileForm] = useState({ name: "", username: "", bio: "" });
  const [composerText, setComposerText] = useState("");
  const [composerImage, setComposerImage] = useState<File | null>(null);
  const [composerPreview, setComposerPreview] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchFilter, setSearchFilter] = useState<"all" | "users" | "posts">("all");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [repostTarget, setRepostTarget] = useState<FeedPost | null>(null);
  const [repostComment, setRepostComment] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ["social-dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles" as any)
        .select("id, name, username, bio, avatar_url, verified")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: postsData, error: postsError } = await supabase
        .from("posts" as any)
        .select("id, user_id, content, image_path, repost_of_post_id, repost_comment, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsError) throw postsError;

      const posts = (postsData ?? []) as unknown as PostRow[];

      // Fetch original posts referenced by reposts (if not already in feed)
      const originalIds = Array.from(
        new Set(
          posts
            .map((p) => p.repost_of_post_id)
            .filter((id): id is string => !!id && !posts.some((pp) => pp.id === id)),
        ),
      );
      let originalPosts: PostRow[] = [];
      if (originalIds.length) {
        const { data: origData } = await supabase
          .from("posts" as any)
          .select("id, user_id, content, image_path, repost_of_post_id, repost_comment, created_at")
          .in("id", originalIds);
        originalPosts = (origData ?? []) as unknown as PostRow[];
      }

      const allPosts = [...posts, ...originalPosts];
      const allPostIds = allPosts.map((p) => p.id);

      const [commentsRes, likesRes, repostsRes] = await Promise.all([
        allPostIds.length
          ? supabase
              .from("post_comments" as any)
              .select("id, post_id, user_id, content, created_at")
              .in("post_id", allPostIds)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        allPostIds.length
          ? supabase.from("post_likes" as any).select("post_id, user_id").in("post_id", allPostIds)
          : Promise.resolve({ data: [], error: null }),
        allPostIds.length
          ? supabase.from("post_reposts" as any).select("post_id, user_id").in("post_id", allPostIds)
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
          ...allPosts.map((post) => post.user_id),
          ...comments.map((comment) => comment.user_id),
          ...likes.map((like) => like.user_id),
        ]),
      );

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles" as any)
        .select("id, name, username, bio, avatar_url, verified")
        .in("id", profileIds);

      if (profilesError) throw profilesError;

      const profiles = (profilesData ?? []) as unknown as ProfileRow[];
      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

      const imagePaths = allPosts.map((post) => post.image_path).filter(Boolean) as string[];
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

      const buildFeedPost = (post: PostRow): FeedPost => {
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
      };

      const feedPostsMap = new Map<string, FeedPost>();
      allPosts.forEach((p) => feedPostsMap.set(p.id, buildFeedPost(p)));

      const feed = posts.map((post) => {
        const fp = feedPostsMap.get(post.id)!;
        if (post.repost_of_post_id) {
          fp.originalPost = feedPostsMap.get(post.repost_of_post_id) ?? null;
        }
        return fp;
      });

      return {
        profile: ((profileData as unknown as ProfileRow | null) ?? profileMap.get(user.id) ?? null),
        feed,
      };
    },
  });

  const searchQuery = useQuery({
    queryKey: ["global-search", globalSearch],
    enabled: globalSearch.trim().length >= 2,
    queryFn: async () => {
      const term = globalSearch.trim();
      const [usersRes, postsRes] = await Promise.all([
        supabase
          .from("profiles" as any)
          .select("id, name, username, bio, avatar_url, verified")
          .or(`username.ilike.%${term}%,name.ilike.%${term}%`)
          .order("username", { ascending: true })
          .limit(20),
        supabase
          .from("posts" as any)
          .select("id, user_id, content, image_path, repost_of_post_id, repost_comment, created_at")
          .ilike("content", `%${term}%`)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const users = (usersRes.data ?? []) as unknown as ProfileRow[];
      const rawPosts = (postsRes.data ?? []) as unknown as PostRow[];

      const authorIds = Array.from(new Set(rawPosts.map((p) => p.user_id)));
      const { data: authorsData } = authorIds.length
        ? await supabase
            .from("profiles" as any)
            .select("id, name, username, bio, avatar_url, verified")
            .in("id", authorIds)
        : { data: [] };
      const authorMap = new Map(((authorsData ?? []) as unknown as ProfileRow[]).map((a) => [a.id, a]));

      const posts = rawPosts.map((p) => ({ ...p, author: authorMap.get(p.user_id) }));

      return { users, posts };
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
  const headerName = getDisplayName(currentProfile, "Mi cuenta");

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
      setEditProfileOpen(false);
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
    },
  });

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("No autenticado");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles" as any)
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updateError) throw updateError;

      await logAction("avatar_update", "profiles", { userId: user.id });
    },
    onSuccess: async () => {
      toast({ title: "Foto actualizada" });
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo subir la foto", description: error.message, variant: "destructive" });
    },
    onSettled: () => setAvatarUploading(false),
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
      toast({ title: "Post eliminado" });
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
      toast({ title: "Comentario eliminado" });
      setDeleteTarget(null);
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" });
    },
  });

  const editPostMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const result = postSchema.safeParse({ content, hasImage: true }); // hasImage true to skip empty validation
      if (!result.success) throw new Error(result.error.errors[0]?.message ?? "Inválido");
      const { error } = await supabase
        .from("posts" as any)
        .update({ content: content.trim() })
        .eq("id", id)
        .eq("user_id", user?.id);
      if (error) throw error;
      await logAction("post_edit", "posts", { postId: id });
    },
    onSuccess: async () => {
      toast({ title: "Post actualizado" });
      setEditTarget(null);
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo editar", description: error.message, variant: "destructive" });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const result = commentSchema.safeParse({ content });
      if (!result.success) throw new Error(result.error.errors[0]?.message ?? "Inválido");
      const { error } = await supabase
        .from("post_comments" as any)
        .update({ content: result.data.content })
        .eq("id", id)
        .eq("user_id", user?.id);
      if (error) throw error;
      await logAction("comment_edit", "post_comments", { commentId: id });
    },
    onSuccess: async () => {
      toast({ title: "Comentario actualizado" });
      setEditTarget(null);
      await refreshDashboard();
    },
    onError: (error: Error) => {
      toast({ title: "No se pudo editar", description: error.message, variant: "destructive" });
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

  const repostMutation = useMutation({
    mutationFn: async ({ post, comment }: { post: FeedPost; comment: string }) => {
      const result = repostSchema.safeParse({ comment });
      if (!result.success) throw new Error(result.error.errors[0]?.message ?? "Inválido");

      // Create a post entry that references the original
      const { error: postError } = await supabase.from("posts" as any).insert({
        user_id: user?.id,
        content: "",
        repost_of_post_id: post.id,
        repost_comment: result.data.comment?.trim() || null,
      } as any);
      if (postError) throw postError;

      // Track in post_reposts as well
      const { error: trackError } = await supabase.from("post_reposts" as any).insert({
        post_id: post.id,
        user_id: user?.id,
      } as any);
      if (trackError && trackError.code !== "23505") throw trackError;

      await logAction("post_repost", "posts", { postId: post.id });
    },
    onSuccess: async () => {
      toast({ title: "Reposteado", description: "Tu repost aparece en el feed." });
      setRepostTarget(null);
      setRepostComment("");
      await refreshDashboard();
    },
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

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagen demasiado grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    avatarMutation.mutate(file);
  };

  const openEdit = (target: EditTarget) => {
    setEditTarget(target);
    setEditValue(target.content);
  };

  const renderInnerOriginalPost = (original: FeedPost) => (
    <div className="mt-3 rounded-md border border-border bg-background/40 p-3">
      <div className="flex items-center gap-2 text-xs">
        <Avatar className="h-7 w-7 border border-border">
          <AvatarImage src={original.author?.avatar_url ?? undefined} alt={getDisplayName(original.author)} />
          <AvatarFallback className="text-[10px] font-semibold">
            {getInitials(original.author?.name, original.author?.username)}
          </AvatarFallback>
        </Avatar>
        <NameWithBadge profile={original.author} />
        {original.author?.username && (
          <span className="text-muted-foreground">@{original.author.username}</span>
        )}
        <span className="text-muted-foreground">• {getRelativeDate(original.created_at)}</span>
      </div>
      {original.content?.trim() && (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{original.content}</p>
      )}
      {original.imageUrl && (
        <div className="mt-2 overflow-hidden rounded-md border border-border">
          <img src={original.imageUrl} alt="Imagen original" className="max-h-[320px] w-full object-cover" loading="lazy" />
        </div>
      )}
    </div>
  );

  const renderPostCard = (post: FeedPost, compact = false) => {
    const isMine = post.user_id === user?.id;
    const isRepost = !!post.repost_of_post_id;

    return (
      <Card key={post.id} className="glass border-border">
        <CardHeader className="space-y-4">
          {isRepost && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Repeat2 size={14} />
              <span>{getDisplayName(post.author)} reposteó</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Avatar className="h-11 w-11 border border-border">
              <AvatarImage src={post.author?.avatar_url ?? undefined} alt={getDisplayName(post.author)} />
              <AvatarFallback className="font-semibold">
                {getInitials(post.author?.name, post.author?.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <NameWithBadge profile={post.author} />
                {post.author?.username && <span className="text-sm text-muted-foreground">@{post.author.username}</span>}
                <span className="text-xs text-muted-foreground">• {getRelativeDate(post.created_at)}</span>
              </div>
              {/* Repost comment */}
              {isRepost && post.repost_comment?.trim() && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{post.repost_comment}</p>
              )}
              {/* Regular content */}
              {!isRepost && post.content?.trim() && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{post.content}</p>
              )}
              {/* Inner original post for reposts */}
              {isRepost && post.originalPost && renderInnerOriginalPost(post.originalPost)}
            </div>
            {isMine && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Opciones del post">
                    <MoreHorizontal size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  {!isRepost && (
                    <DropdownMenuItem onClick={() => openEdit({ type: "post", id: post.id, content: post.content })}>
                      <Pencil size={14} className="mr-2" /> Editar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget({ type: "post", id: post.id, imagePath: post.image_path })}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={14} className="mr-2" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isRepost && post.imageUrl && (
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
                  <div
                    key={`${post.id}-${like.user_id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-foreground"
                  >
                    <Avatar className="h-6 w-6 border border-border">
                      <AvatarImage src={like.author?.avatar_url ?? undefined} alt={getDisplayName(like.author)} />
                      <AvatarFallback className="text-[10px] font-semibold">
                        {getInitials(like.author?.name, like.author?.username)}
                      </AvatarFallback>
                    </Avatar>
                    <NameWithBadge profile={like.author} />
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
                  variant="outline"
                  onClick={() => toggleLikeMutation.mutate(post)}
                  disabled={toggleLikeMutation.isPending}
                  className={cn(
                    "border-border transition-colors",
                    post.likedByMe &&
                      "border-[hsl(270_85%_60%)] bg-[hsl(270_85%_60%/0.15)] text-[hsl(270_85%_70%)] hover:bg-[hsl(270_85%_60%/0.25)] hover:text-[hsl(270_85%_75%)]",
                  )}
                >
                  <Heart size={16} className={cn(post.likedByMe && "fill-current")} /> Like
                </Button>
                <Button
                  variant={post.repostedByMe ? "secondary" : "outline"}
                  onClick={() => {
                    setRepostTarget(post);
                    setRepostComment("");
                  }}
                  disabled={repostMutation.isPending}
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
                        <NameWithBadge profile={comment.author} />
                        {comment.author?.username && <span>@{comment.author.username}</span>}
                        <span>• {getRelativeDate(comment.created_at)}</span>
                        {comment.user_id === user?.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="ml-auto inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
                                aria-label="Opciones del comentario"
                              >
                                <MoreHorizontal size={14} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem
                                onClick={() => openEdit({ type: "comment", id: comment.id, content: comment.content })}
                              >
                                <Pencil size={14} className="mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget({ type: "comment", id: comment.id })}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 size={14} className="mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
  };

  const sectionLabels: Record<SectionKey, { label: string; icon: typeof Home }> = {
    feed: { label: "Feed", icon: Home },
    search: { label: "Buscar", icon: Search },
    profile: { label: "Perfil", icon: UserIcon },
  };

  return (
    <div className="min-h-screen gradient-bg">
      <header className="border-b border-border glass">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <LoopLogo />
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={currentProfile?.avatar_url ?? undefined} alt={headerName} />
                <AvatarFallback className="text-xs font-semibold">
                  {getInitials(currentProfile?.name, currentProfile?.username, user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="inline-flex items-center gap-1 text-sm text-foreground">
                {headerName}
                {currentProfile?.verified && <BadgeCheck size={14} className="text-primary" />}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-border">
                  <Menu size={16} />
                  <span className="hidden sm:inline">Menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 bg-popover">
                <DropdownMenuLabel>Navegación</DropdownMenuLabel>
                {(Object.keys(sectionLabels) as SectionKey[]).map((key) => {
                  const Icon = sectionLabels[key].icon;
                  return (
                    <DropdownMenuItem key={key} onClick={() => setActiveSection(key)}>
                      <Icon size={14} className="mr-2" /> {sectionLabels[key].label}
                    </DropdownMenuItem>
                  );
                })}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield size={14} className="mr-2" /> Panel admin
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut size={14} className="mr-2" /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as SectionKey)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            {(Object.keys(sectionLabels) as SectionKey[]).map((key) => {
              const Icon = sectionLabels[key].icon;
              return (
                <TabsTrigger key={key} value={key} className="gap-2">
                  <Icon size={14} /> <span className="hidden sm:inline">{sectionLabels[key].label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* FEED */}
          <TabsContent value="feed" className="space-y-6">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="text-xl">Comparte algo</CardTitle>
                <CardDescription>Texto corto, una foto o ambas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 border border-border">
                    <AvatarImage src={currentProfile?.avatar_url ?? undefined} alt={headerName} />
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
                    <img src={composerPreview} alt="Vista previa" className="max-h-[420px] w-full object-cover" loading="lazy" />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="absolute right-3 top-3"
                      onClick={() => setComposerImage(null)}
                    >
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

          {/* SEARCH */}
          <TabsContent value="search" className="space-y-6">
            <Card className="glass border-border">
              <CardHeader>
                <CardTitle className="text-xl">Buscar</CardTitle>
                <CardDescription>Busca usuarios y publicaciones.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    value={globalSearch}
                    onChange={(event) => setGlobalSearch(event.target.value)}
                    placeholder="Busca personas o publicaciones"
                    className="pl-9"
                  />
                </div>

                {globalSearch.trim().length >= 2 && (
                  <Tabs value={searchFilter} onValueChange={(v) => setSearchFilter(v as typeof searchFilter)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="all">Todo</TabsTrigger>
                      <TabsTrigger value="users">Usuarios</TabsTrigger>
                      <TabsTrigger value="posts">Publicaciones</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                {globalSearch.trim().length < 2 ? (
                  <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    Escribe al menos 2 caracteres para buscar.
                  </div>
                ) : searchQuery.isLoading ? (
                  <>
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                  </>
                ) : (
                  <div className="space-y-6">
                    {(searchFilter === "all" || searchFilter === "users") && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Usuarios ({searchQuery.data?.users.length ?? 0})
                        </h3>
                        {(searchQuery.data?.users.length ?? 0) === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin coincidencias.</p>
                        ) : (
                          <div className="grid gap-3">
                            {searchQuery.data?.users.map((profile) => (
                              <Card key={profile.id} className="border-border bg-background/40">
                                <CardContent className="flex items-start gap-3 py-4">
                                  <Avatar className="h-12 w-12 border border-border">
                                    <AvatarImage src={profile.avatar_url ?? undefined} alt={getDisplayName(profile)} />
                                    <AvatarFallback className="font-semibold">
                                      {getInitials(profile.name, profile.username)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <NameWithBadge profile={profile} />
                                      {profile.username && (
                                        <span className="text-sm text-muted-foreground">@{profile.username}</span>
                                      )}
                                    </div>
                                    <p className="text-sm leading-6 text-muted-foreground">
                                      {profile.bio?.trim() || "Sin descripción."}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {(searchFilter === "all" || searchFilter === "posts") && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          Publicaciones ({searchQuery.data?.posts.length ?? 0})
                        </h3>
                        {(searchQuery.data?.posts.length ?? 0) === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin coincidencias.</p>
                        ) : (
                          <div className="grid gap-3">
                            {searchQuery.data?.posts.map((post) => (
                              <Card key={post.id} className="border-border bg-background/40">
                                <CardContent className="space-y-2 py-4">
                                  <div className="flex items-center gap-2 text-xs">
                                    <Avatar className="h-7 w-7 border border-border">
                                      <AvatarImage src={post.author?.avatar_url ?? undefined} alt={getDisplayName(post.author)} />
                                      <AvatarFallback className="text-[10px] font-semibold">
                                        {getInitials(post.author?.name, post.author?.username)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <NameWithBadge profile={post.author} />
                                    <span className="text-muted-foreground">• {getRelativeDate(post.created_at)}</span>
                                  </div>
                                  <p className="whitespace-pre-wrap text-sm text-foreground">{post.content}</p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROFILE */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="glass border-border">
              <CardHeader className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-20 w-20 border border-border">
                      <AvatarImage src={currentProfile?.avatar_url ?? undefined} alt={headerName} />
                      <AvatarFallback className="text-base font-semibold">
                        {getInitials(currentProfile?.name, currentProfile?.username, user?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                        disabled={avatarUploading}
                      />
                      {avatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                    </label>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="truncate text-2xl font-semibold text-foreground">{headerName}</h1>
                      {currentProfile?.verified && (
                        <BadgeCheck size={20} className="text-primary" aria-label="Verificado" />
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {currentProfile?.username ? `@${currentProfile.username}` : "Sin nombre de usuario"}
                    </p>
                    {currentProfile?.bio?.trim() && (
                      <p className="text-sm leading-6 text-foreground">{currentProfile.bio}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="Opciones de perfil">
                        <MoreHorizontal size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 bg-popover">
                      <DropdownMenuItem onClick={() => setEditProfileOpen(true)}>
                        <Pencil size={14} className="mr-2" /> Editar perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setPrivacyOpen(true)}>
                        <Settings size={14} className="mr-2" /> Privacidad y cuenta
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                        <LogOut size={14} className="mr-2" /> Cerrar sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "post" ? "Eliminar post" : "Eliminar comentario"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
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
              {deletePostMutation.isPending || deleteCommentMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget?.type === "post" ? "Editar post" : "Editar comentario"}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            maxLength={editTarget?.type === "post" ? 1000 : 500}
            className="min-h-[140px] resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!editTarget) return;
                if (editTarget.type === "post") {
                  editPostMutation.mutate({ id: editTarget.id, content: editValue });
                } else {
                  editCommentMutation.mutate({ id: editTarget.id, content: editValue });
                }
              }}
              disabled={editPostMutation.isPending || editCommentMutation.isPending}
            >
              {editPostMutation.isPending || editCommentMutation.isPending ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Repost dialog */}
      <Dialog
        open={!!repostTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRepostTarget(null);
            setRepostComment("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Repostear</DialogTitle>
            <DialogDescription>Añade un comentario opcional a tu repost.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={repostComment}
            onChange={(event) => setRepostComment(event.target.value)}
            placeholder="Comparte tu opinión (opcional)"
            maxLength={500}
            className="min-h-[100px] resize-none"
          />
          {repostTarget && (
            <div className="rounded-md border border-border bg-background/40 p-3 text-sm text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 text-xs">
                <NameWithBadge profile={repostTarget.author} />
                {repostTarget.author?.username && <span>@{repostTarget.author.username}</span>}
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap text-foreground">
                {repostTarget.content || "(sin texto)"}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRepostTarget(null);
                setRepostComment("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => repostTarget && repostMutation.mutate({ post: repostTarget, comment: repostComment })}
              disabled={repostMutation.isPending}
            >
              {repostMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Repeat2 size={16} />}
              Repostear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit profile dialog */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
            <DialogDescription>Actualiza tu información pública.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={profileForm.name}
                onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Input
                value={profileForm.username}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, username: event.target.value.replace(/^@/, "") }))
                }
                placeholder="usuario"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={profileForm.bio}
                onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
                placeholder="Cuéntale al mundo quién eres"
                maxLength={160}
                className="min-h-[120px] resize-none"
              />
              <p className="text-right text-xs text-muted-foreground">{profileForm.bio.length}/160</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditProfileOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => profileMutation.mutate()} disabled={profileMutation.isPending}>
              {profileMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Privacy dialog */}
      <Dialog open={privacyOpen} onOpenChange={setPrivacyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacidad y cuenta</DialogTitle>
            <DialogDescription>Información sobre tu cuenta y seguridad.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Correo</p>
              <p className="mt-1 text-foreground">{user?.email}</p>
            </div>
            <div className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Verificación</p>
              <p className="mt-1 inline-flex items-center gap-2 text-foreground">
                {currentProfile?.verified ? (
                  <>
                    <BadgeCheck size={16} className="text-primary" /> Cuenta verificada
                  </>
                ) : (
                  <>
                    <ShieldAlert size={16} className="text-muted-foreground" /> No verificada — solo el admin puede otorgar la insignia.
                  </>
                )}
              </p>
            </div>
            <div className="rounded-md border border-border bg-background/40 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Seguridad</p>
              <Button
                variant="outline"
                className="mt-2 w-full"
                onClick={() => {
                  setPrivacyOpen(false);
                  navigate("/mfa-setup");
                }}
              >
                Configurar autenticación de dos factores
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
