import { Outlet } from 'react-router-dom';
import { TaskSheetHost } from '@/features/tasks/TaskSheetHost';
import { WorkspaceProvider } from '@/lib/workspace';

/** Everything under /w/:workspaceId: loads the workspace + role, hosts the task sheet. */
export function WorkspaceLayout() {
  return (
    <WorkspaceProvider>
      <Outlet />
      <TaskSheetHost />
    </WorkspaceProvider>
  );
}
