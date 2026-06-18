import { redirect } from "next/navigation";

export default function ClientsDashboardRedirectPage() {
  redirect("/client/feed");
}
