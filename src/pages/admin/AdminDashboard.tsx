import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoopLogo from "@/components/LoopLogo";
import UserManagement from "./UserManagement";
import AuditLogs from "./AuditLogs";
import { LogOut, Users, ScrollText, ArrowLeft } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen gradient-bg">
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <LoopLogo />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="border-border"
            >
              <ArrowLeft size={14} className="mr-1" /> Dashboard
            </Button>
            <span className="text-xs text-muted-foreground hidden sm:block">
              {user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={signOut}
              className="border-border"
            >
              <LogOut size={14} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger
              value="users"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users size={14} className="mr-1.5" /> Usuarios
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ScrollText size={14} className="mr-1.5" /> Bitácora
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogs />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
