import { TASK_PRIORITIES } from '@devsync/shared';
import gsap from 'gsap';
import { ArrowDownUp, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { humanize } from '@/lib/format';
import type { ProjectMember } from '@/lib/types';
import { hasActiveFilters, isManualOrder, type BoardFilters, type SortKey } from './boardLogic';
import { prefersReducedMotion } from './milk';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'position', label: 'Manual' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
  { value: 'dueDate', label: 'Due' },
  { value: 'priority', label: 'Priority' },
];

const ALL = 'all';

/** Text input that reports its value after 300 ms of inactivity. */
function DebouncedInput({
  label,
  value,
  placeholder,
  onCommit,
  className,
}: {
  label: string;
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => onCommit(draft), 300);
    return () => clearTimeout(timer);
  }, [draft]);

  return (
    <div className="relative min-w-0">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#8F8F8F]"
        aria-hidden
      />
      <Input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className={
          className ??
          'h-9 w-full max-w-[14rem] border-[#DEE2E6] bg-white pl-8 text-sm text-[#212529]'
        }
      />
    </div>
  );
}

/**
 * Milk Desk control panel: search + overflow filters + primary slot (New task).
 */
export function BoardToolbar({
  filters,
  members,
  onChange,
  onClear,
  primaryAction,
}: {
  filters: BoardFilters;
  members: ProjectMember[];
  onChange: (patch: Partial<BoardFilters>) => void;
  onClear: () => void;
  primaryAction?: ReactNode;
}) {
  const dirty = !isManualOrder(filters);
  const filtered = hasActiveFilters(filters);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || prefersReducedMotion()) return;
    const items = el.querySelectorAll('[data-milk-ctl]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 4 },
        { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.03, ease: 'power2.out' },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="flex flex-wrap items-center gap-2 border-b border-[#DEE2E6] bg-white px-1 py-2.5"
    >
      <div data-milk-ctl className="min-w-0 flex-1">
        <DebouncedInput
          label="Search tasks"
          placeholder="Search…"
          value={filters.q}
          onCommit={(q) => onChange({ q })}
        />
      </div>

      <div data-milk-ctl className="hidden items-center gap-1.5 md:flex">
        <Select
          value={filters.priority || ALL}
          onValueChange={(v) =>
            onChange({ priority: v === ALL ? '' : (v as BoardFilters['priority']) })
          }
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter by priority"
            className="h-9 w-[7.5rem] border-[#DEE2E6] bg-white"
          >
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Priority</SelectItem>
            {TASK_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {humanize(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.assignee || ALL}
          onValueChange={(v) => onChange({ assignee: v === ALL ? '' : v })}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter by assignee"
            className="h-9 w-36 border-[#DEE2E6] bg-white"
          >
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Assignee</SelectItem>
            <SelectItem value="me">Me</SelectItem>
            <SelectItem value="none">Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-milk-ctl
            variant="outline"
            size="sm"
            className="h-9 border-[#DEE2E6] bg-[#E9ECEF] text-[#212529] hover:bg-[#DEE2E6] md:hidden"
          >
            <Filter aria-hidden />
            Filters
            {filtered && (
              <span className="ml-1 size-1.5 rounded-full bg-[#017E84]" aria-hidden />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filters</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="grid gap-2 p-2">
            <Select
              value={filters.priority || ALL}
              onValueChange={(v) =>
                onChange({ priority: v === ALL ? '' : (v as BoardFilters['priority']) })
              }
            >
              <SelectTrigger size="sm" aria-label="Filter by priority" className="w-full">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Priority</SelectItem>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {humanize(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.assignee || ALL}
              onValueChange={(v) => onChange({ assignee: v === ALL ? '' : v })}
            >
              <SelectTrigger size="sm" aria-label="Filter by assignee" className="w-full">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Assignee</SelectItem>
                <SelectItem value="me">Me</SelectItem>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label="Filter by label"
              placeholder="Label"
              value={filters.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className="h-8"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            data-milk-ctl
            variant="outline"
            size="icon"
            className="size-9 border-[#DEE2E6] bg-white text-[#6C757D]"
            aria-label="Sort and more filters"
          >
            <SlidersHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Sort</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="grid gap-2 p-2">
            <Select value={filters.sort} onValueChange={(v) => onChange({ sort: v as SortKey })}>
              <SelectTrigger size="sm" aria-label="Sort by" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              aria-label={`Sort ${filters.order === 'asc' ? 'ascending, switch to descending' : 'descending, switch to ascending'}`}
              onClick={() => onChange({ order: filters.order === 'asc' ? 'desc' : 'asc' })}
            >
              <ArrowDownUp aria-hidden />
              {filters.order === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
            <Input
              aria-label="Filter by label"
              placeholder="Label"
              value={filters.label}
              onChange={(e) => onChange({ label: e.target.value })}
              className="hidden h-8 md:block"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {dirty && (
        <Button
          data-milk-ctl
          variant="ghost"
          size="sm"
          className="h-9 text-[#8F8F8F] hover:text-[#212529]"
          onClick={onClear}
        >
          <X aria-hidden />
          {filtered ? 'Clear' : 'Reset'}
        </Button>
      )}

      {primaryAction && (
        <div data-milk-ctl className="ml-auto flex shrink-0 items-center gap-2">
          {primaryAction}
        </div>
      )}
    </div>
  );
}
