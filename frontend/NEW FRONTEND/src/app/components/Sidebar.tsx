import { Link, useLocation, useParams } from "react-router";
import { Home, Settings, PlusCircle, User, FileText, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  isWorkspace?: boolean;
}

export function Sidebar({ isWorkspace = false }: SidebarProps) {
  const location = useLocation();
  const { projectId } = useParams();
  const { user, logout } = useAuth();

  const basePath = isWorkspace ? `/workspace/${projectId}` : "/dashboard";

  const navItems = isWorkspace
    ? [
        { to: basePath, icon: Home, label: "Workspace" },
        { to: `${basePath}/meeting-result-review`, icon: FileText, label: "Meeting Reviews" },
        { to: "/dashboard", icon: Home, label: "Back to Dashboard" },
        { to: "/dashboard/settings", icon: Settings, label: "Settings" },
        { to: "/dashboard/edit-profile", icon: User, label: "Edit Profile" },
      ]
    : [
        { to: "/dashboard", icon: Home, label: "Dashboard" },
        { to: "/dashboard/settings", icon: Settings, label: "Settings" },
        { to: "/dashboard/add-project", icon: PlusCircle, label: "Add Project" },
        { to: "/dashboard/edit-profile", icon: User, label: "Edit Profile" },
      ];

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground min-h-screen flex flex-col border-r border-sidebar-border">
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-xl">Project Hub</h2>
        <p className="text-sm text-sidebar-foreground/70 mt-1">{user?.name}</p>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
