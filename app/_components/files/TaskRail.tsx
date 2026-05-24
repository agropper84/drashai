'use client';
// Right rail on the file detail. Collapsible — stays in line with the header.
// Persists tasks via the encounters store (api.encounters.patch).

import { useState } from 'react';
import { useEncounters } from '@/app/_lib/encounters-store';
import type { Encounter, Task } from '@/app/_lib/types';

export function TaskRail({ file }: { file: Encounter }) {
  const { patch } = useEncounters();
  const [collapsed, setCollapsed] = useState(false);
  const [newTask, setNewTask] = useState('');

  const tasks = file.tasks || [];
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  const toggle = (taskId: string) => patch(file.id, { toggleTask: taskId });
  const remove = (taskId: string) => patch(file.id, { removeTask: taskId });
  const add = () => {
    const body = newTask.trim();
    if (!body) return;
    patch(file.id, { addTask: { body } });
    setNewTask('');
  };

  if (collapsed) {
    return (
      <div className="task-rail rail-collapsed" onClick={() => setCollapsed(false)}>
        <div className="task-rail-head">
          <button
            type="button"
            className="task-rail-collapse"
            onClick={(e) => { e.stopPropagation(); setCollapsed(false); }}
            title="Expand tasks">
            <Chevron dir="left"/>
          </button>
          <span className="heb-stack" style={{ fontFamily: 'JetBrains Mono', color: 'var(--ink-3)' }}>
            {open.length} TASKS
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="task-rail">
      <div className="task-rail-head">
        <div>
          <h3>משימות</h3>
          <div className="en">Tasks · {open.length} open</div>
        </div>
        <button
          type="button"
          className="task-rail-collapse"
          onClick={() => setCollapsed(true)}
          title="Collapse">
          <Chevron dir="right"/>
        </button>
      </div>

      <div className="task-rail-body">
        <div className="task-list">
          {open.map((t) => (
            <TaskRow key={t.id} task={t} onToggle={() => toggle(t.id)} onRemove={() => remove(t.id)}/>
          ))}
          {open.length === 0 && (
            <div style={{
              fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
              fontSize: 13, color: 'var(--ink-3)', padding: '8px 4px',
            }}>
              No open tasks.
            </div>
          )}
        </div>

        <div className="task-add">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="+ Add task..."
            onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          />
        </div>

        {done.length > 0 && (
          <>
            <div style={{
              fontFamily: 'JetBrains Mono', fontSize: 9, letterSpacing: '0.12em',
              color: 'var(--ink-4)', textTransform: 'uppercase',
              marginTop: 16, marginBottom: 6,
            }}>
              Done · {done.length}
            </div>
            <div className="task-list">
              {done.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={() => toggle(t.id)} onRemove={() => remove(t.id)}/>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onRemove }: { task: Task; onToggle: () => void; onRemove: () => void }) {
  return (
    <div className={'task' + (task.done ? ' done' : '')} onClick={onToggle}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <div className="task-body">
        {task.body}
        {task.due && <div className="task-due">due {task.due}</div>}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'}/>
    </svg>
  );
}
