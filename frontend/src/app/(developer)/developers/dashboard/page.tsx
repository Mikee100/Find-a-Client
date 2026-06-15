import { redirect } from "next/navigation";

export default function DevelopersDashboardRedirectPage() {
  redirect("/developer/dashboard");
}