'use client';
// Floating pill in the bottom-right corner. Replaces TaskRail.
// Click to open a slim popover with tasks + add input.

import { useEffect, useRef, useState } from 'react';
import { useEncounters } from '@/app/_lib/encounters-store';
import type { Encounter, Task } from '@/app/_lib/types';

const TaskIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l2 2 4-4"/>
    <rect x="3" y="4" width="18" height="16" rx="2"/>
  </svg>
);

export function TasksPill({ file }: { file: Encounter }) {
  const { patch } = useEncounters();
  const [open, setOpen] = useState(false);
  const [newTask, setNewTask] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const tasks = file.tasks || [];
  const open_count = tasks.filter((t) => !t.done).length;

  const toggle = (id: string) => patch(file.id, { toggleTask: id });
  const add = () => {
    const body = newTask.trim();
    if (!body) return;
    patch(file.id, { addTask: { body } });
    setNewTask('');
  };

  return (
    <div ref={ref}>
      <button type="button" className="fd-tasks-pill" onClick={() => setOpen((v) => !v)}>
        <span className="fd-tasks-pill-icon"><TaskIcon/></span>
        <span className="fd-tasks-pill-count">
          {open_count > 0 ? <><strong>{open_count}</strong> task{open_count === 1 ? '' : 's'}</> : 'No tasks'}
        </span>
      </button>

      {open && (
        <div className="fd-tasks-popover">
          <div className="fd-tasks-popover-head">
            <span className="fd-tasks-popover-title">Tasks</span>
            <span className="fd-tasks-popover-sub">{open_count} open</span>
          </div>

          {tasks.length === 0 && (
            <div style={{
              fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
              fontSize: 13, color: 'var(--ink-3)', padding: '6px 0 4px',
            }}>
              Nothing yet for this file.
            </div>
          )}

          {tasks.map((t) => <TaskRow key={t.id} task={t} onToggle={() => toggle(t.id)}/>)}

          <div className="fd-task-add">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="+ Add task..."
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: () => void }) {
  return (
    <div className={`fd-task${task.done ? ' done' : ''}`} onClick={onToggle}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="fd-task-body">
        {task.body}
        {task.due && !task.done && <div className="fd-task-due">due {task.due}</div>}
      </div>
    </div>
  );
}
