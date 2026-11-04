import { Route, Routes } from 'react-router-dom';
import { AuthedLayout } from '@/components/layout/AuthedLayout';
import { WorkspaceLayout } from '@/components/layout/WorkspaceLayout';
import { RealtimeProvider } from '@/features/realtime/RealtimeProvider';
import { RedirectIfAuthed, RequireAuth } from '@/lib/auth';
import { AcceptInvitationPage } from '@/pages/AcceptInvitation';
import { ActivityPage } from '@/pages/Activity';
import { ApiTokensPage } from '@/pages/ApiTokens';
import { AppSettingsPage } from '@/pages/AppSettings';
import { DashboardPage } from '@/pages/Dashboard';
import { LandingPage } from '@/pages/Landing';
import { LoginPage } from '@/pages/Login';
import { MembersPage } from '@/pages/Members';
import { NotificationsPage } from '@/pages/Notifications';
import { ProfilePage } from '@/pages/Profile';
import { ProjectBoardPage } from '@/pages/ProjectBoard';
import { ProjectListPage } from '@/pages/ProjectList';
import { ProjectOverviewPage } from '@/pages/ProjectOverview';
import { RegisterPage } from '@/pages/Register';
import { WorkspaceSelectPage } from '@/pages/WorkspaceSelect';
import { WorkspaceSettingsPage } from '@/pages/WorkspaceSettings';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
      <Route path="/register" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />

      <Route
        element={
          <RequireAuth>
            <RealtimeProvider>
              <AuthedLayout />
            </RealtimeProvider>
          </RequireAuth>
        }
      >
        <Route path="/invitations/accept" element={<AcceptInvitationPage />} />
        <Route path="/app" element={<WorkspaceSelectPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<AppSettingsPage />} />

        <Route path="/w/:workspaceId" element={<WorkspaceLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="projects/:projectId" element={<ProjectOverviewPage />} />
          <Route path="projects/:projectId/board" element={<ProjectBoardPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="settings" element={<WorkspaceSettingsPage />} />
          <Route path="api-tokens" element={<ApiTokensPage />} />
        </Route>
      </Route>

      <Route path="*" element={<div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Page not found</div>} />
    </Routes>
  );
}
