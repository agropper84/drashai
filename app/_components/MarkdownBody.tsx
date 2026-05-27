'use client';
// Lightweight markdown renderer for scholar/synthesis answers.
// Handles: headings, bold, italic, blockquotes, lists, tables, hr, code.
// No external dependencies — pure regex-based rendering.

import { Fragment, type ReactNode } from 'react';

function parseInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Split on bold (**), italic (*), and inline code (`)
  const rx = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = rx.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[2]) parts.push(<strong key={key++}>{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={key++} className="md-code">{match[4]}</code>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

interface TableData { headers: string[]; rows: string[][]; }

function parseTable(lines: string[]): TableData | null {
  if (lines.length < 2) return null;
  const headers = lines[0].split('|').map(c => c.trim()).filter(Boolean);
  // line[1] is the separator (---|---) — skip it
  const rows = lines.slice(2).map(l => l.split('|').map(c => c.trim()).filter(Boolean));
  if (headers.length === 0) return null;
  return { headers, rows };
}

export function MarkdownBody({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (!line.trim()) { i++; continue; }

    // Horizontal rule
    if (/^-{3,}$/.test(line.trim()) || /^\*{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} className="md-hr" />);
      i++; continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="md-h3">{parseInline(line.slice(4))}</h4>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="md-h2">{parseInline(line.slice(3))}</h3>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="md-h1">{parseInline(line.slice(2))}</h2>);
      i++; continue;
    }

    // Table (starts with |)
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1]?.includes('---')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const table = parseTable(tableLines);
      if (table) {
        elements.push(
          <div key={`t${i}`} className="md-table-wrap">
            <table className="md-table">
              <thead>
                <tr>{table.headers.map((h, j) => <th key={j}>{parseInline(h)}</th>)}</tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{parseInline(cell)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote key={`q${i}`} className="md-blockquote">
          {quoteLines.map((ql, qi) => <p key={qi}>{parseInline(ql)}</p>)}
        </blockquote>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol${i}`} className="md-ol">
          {items.map((item, li) => <li key={li}>{parseInline(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Unordered list
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul${i}`} className="md-ul">
          {items.map((item, li) => <li key={li}>{parseInline(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Regular paragraph
    elements.push(<p key={i} className="md-p">{parseInline(line)}</p>);
    i++;
  }

  return <div className="md-body">{elements}</div>;
}
