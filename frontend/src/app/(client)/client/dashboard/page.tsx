import { redirect } from "next/navigation";

export default function ClientDashboardRedirectPage() {
  redirect("/client/feed");
}
