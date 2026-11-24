import { Outlet } from 'react-router-dom';
import { TaskSheetHost } from '@/features/tasks/TaskSheetHost';
import { WorkspaceProvider } from '@/lib/workspace';

/** Routes under /w/:workspaceId: workspace context + task sheet host. */
export function WorkspaceLayout() {
  return (
    <WorkspaceProvider>
      <Outlet />
      <TaskSheetHost />
    </WorkspaceProvider>
  );
}
