import { redirect } from 'next/navigation';

// Replaces the 3,800-line monster. The old App component is now spread across
// app/(app)/* — each route does only its own work.

export default function Root() {
  redirect('/files');
}
