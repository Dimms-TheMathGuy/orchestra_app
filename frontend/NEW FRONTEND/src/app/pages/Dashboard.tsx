import { Link } from "react-router";
import { Sidebar } from "../components/Sidebar";
import { mockProjects } from "../data/mockData";
import { Users, Calendar } from "lucide-react";

export function Dashboard() {
  const ongoingProjects = mockProjects.filter((p) => p.status === "ongoing");
  const completedProjects = mockProjects.filter((p) => p.status === "completed");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <h1 className="mb-8 text-foreground">Dashboard</h1>

        <section className="mb-12">
          <h2 className="mb-4 text-foreground">Ongoing Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ongoingProjects.map((project) => (
              <Link
                key={project.id}
                to={`/workspace/${project.id}`}
                className="bg-card border border-border rounded-lg shadow-sm p-6 hover:shadow-md transition-all hover:border-primary/50"
              >
                <h3 className="mb-2 text-card-foreground">{project.name}</h3>
                <p className="text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <span>
                      Team Leader: {project.members.find((m) => m.role === "Team Leader")?.user.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <span>{project.members.length} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary" />
                    <span>Created {project.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-foreground">Completed Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedProjects.map((project) => (
              <Link
                key={project.id}
                to={`/workspace/${project.id}`}
                className="bg-card border border-border rounded-lg shadow-sm p-6 hover:shadow-md transition-all opacity-75 hover:opacity-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-card-foreground">{project.name}</h3>
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded">
                    Completed
                  </span>
                </div>
                <p className="text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <span>
                      Team Leader: {project.members.find((m) => m.role === "Team Leader")?.user.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    <span>{project.members.length} members</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
