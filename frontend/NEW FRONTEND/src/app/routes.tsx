import { createBrowserRouter } from "react-router";
import { AuthLayout } from "./components/AuthLayout";
import { ProtectedLayout } from "./components/ProtectedLayout";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import { AddProject } from "./pages/AddProject";
import { EditProfile } from "./pages/EditProfile";
import { Workspace } from "./pages/Workspace";
import { Settings } from "./pages/Settings";
import { PasskeySetup } from "./pages/PasskeySetup";
import { MeetingResultReview } from "./pages/MeetingResultReview";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AuthLayout,
    children: [
      { index: true, Component: Login },
      { path: "register", Component: Register },
      { path: "forgot-password", Component: ForgotPassword },
      { path: "reset-password", Component: ResetPassword },
    ],
  },
  {
    path: "/dashboard",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "add-project", Component: AddProject },
      { path: "edit-profile", Component: EditProfile },
      { path: "settings", Component: Settings },
      { path: "passkey-setup", Component: PasskeySetup },
    ],
  },
  {
    path: "/workspace/:projectId",
    Component: ProtectedLayout,
    children: [
      { index: true, Component: Workspace },
      { path: "meeting-result-review", Component: MeetingResultReview },
    ],
  },
]);

