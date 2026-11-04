import { useSearchParams } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { withTaskParam } from './boardLogic';
import { TaskDetails } from './TaskDetails';

/** Opens the task detail sheet when the URL has `?task=<id>`. Mounted once in WorkspaceLayout. */
export function TaskSheetHost() {
  const [params, setParams] = useSearchParams();
  const taskId = params.get('task');
  const close = () => setParams((prev) => withTaskParam(prev, null), { replace: true });

  return (
    <Sheet open={!!taskId} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl"
        showCloseButton
      >
        <SheetTitle className="sr-only">Task details</SheetTitle>
        <SheetDescription className="sr-only">
          Edit the task, comments and activity.
        </SheetDescription>
        {taskId && <TaskDetails taskId={taskId} onClose={close} />}
      </SheetContent>
    </Sheet>
  );
}
