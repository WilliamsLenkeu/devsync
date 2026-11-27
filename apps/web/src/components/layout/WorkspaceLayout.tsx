import { Outlet } from 'react-router-dom';
import { TaskSheetHost } from '@/features/tasks/TaskSheetHost';
import { WorkspaceProvider } from '@/lib/workspace';

/** Routes /w/:id — contexte workspace + host sheet (motion sheet = autre scope). */
export function WorkspaceLayout() {
  return (
    <WorkspaceProvider>
      <Outlet />
      <TaskSheetHost />
    </WorkspaceProvider>
  );
}
