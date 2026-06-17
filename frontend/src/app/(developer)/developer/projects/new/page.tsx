import { redirect } from "next/navigation";

export default function DeveloperNewProjectPage() {
  // Keep existing dashboard links working by forwarding to the canonical project creation flow.
  redirect("/client/projects/new");
}
