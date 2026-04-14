import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify calling user using their JWT directly with service role client
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "No authorization header" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Extract JWT and verify user
  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await adminClient.auth.getUser(jwt);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // Check admin role
  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();

  if (!roleData) return json({ error: "Admin access required" }, 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { action } = body;

  try {
    switch (action) {
      case "list_users": {
        const {
          data: { users },
          error,
        } = await adminClient.auth.admin.listUsers();
        if (error) throw error;

        const { data: roles } = await adminClient
          .from("user_roles")
          .select("*");

        const usersWithRoles = users.map((u) => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          email_confirmed_at: u.email_confirmed_at,
          banned_until: u.banned_until,
          user_metadata: u.user_metadata,
          roles:
            roles
              ?.filter((r) => r.user_id === u.id)
              .map((r) => r.role) ?? [],
        }));

        return json({ users: usersWithRoles });
      }

      case "create_user": {
        const { email, password, role = "user", name } = body;
        if (!email || !password) throw new Error("Email and password required");

        const { data: newUser, error } =
          await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name },
          });
        if (error) throw error;

        await adminClient
          .from("user_roles")
          .insert({ user_id: newUser.user.id, role });
        await adminClient
          .from("profiles")
          .upsert({ id: newUser.user.id, name });

        await adminClient.from("audit_logs").insert({
          user_id: user.id,
          user_email: user.email,
          action: "create_user",
          resource: "users",
          details: {
            created_user_id: newUser.user.id,
            created_email: email,
            role,
          },
        });

        return json({ success: true, user: newUser.user });
      }

      case "update_role": {
        const { target_user_id, new_role } = body;
        if (!target_user_id || !new_role)
          throw new Error("target_user_id and new_role required");

        if (target_user_id === user.id && new_role !== "admin") {
          return json({ error: "No puedes modificar tu propio rol de administrador." }, 403);
        }

        if (!["admin", "user"].includes(new_role)) {
          return json({ error: "Rol inválido." }, 400);
        }

        await adminClient
          .from("user_roles")
          .delete()
          .eq("user_id", target_user_id);
        await adminClient
          .from("user_roles")
          .insert({ user_id: target_user_id, role: new_role });

        await adminClient.from("audit_logs").insert({
          user_id: user.id,
          user_email: user.email,
          action: "update_role",
          resource: "user_roles",
          details: { target_user_id, new_role },
        });

        return json({ success: true });
      }

      case "toggle_ban": {
        const { target_user_id, ban } = body;
        if (!target_user_id) throw new Error("target_user_id required");

        if (ban) {
          await adminClient.auth.admin.updateUserById(target_user_id, {
            ban_duration: "876000h",
          });
        } else {
          await adminClient.auth.admin.updateUserById(target_user_id, {
            ban_duration: "none",
          });
        }

        await adminClient.from("audit_logs").insert({
          user_id: user.id,
          user_email: user.email,
          action: ban ? "ban_user" : "unban_user",
          resource: "users",
          details: { target_user_id },
        });

        return json({ success: true });
      }

      case "generate_token": {
        const { target_email } = body;
        if (!target_email) throw new Error("target_email required");

        const { data, error } =
          await adminClient.auth.admin.generateLink({
            type: "magiclink",
            email: target_email,
          });
        if (error) throw error;

        await adminClient.from("audit_logs").insert({
          user_id: user.id,
          user_email: user.email,
          action: "generate_token",
          resource: "users",
          details: { target_email },
        });

        return json({
          success: true,
          action_link: data.properties?.action_link,
        });
      }

      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
