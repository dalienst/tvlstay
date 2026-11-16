import { redirect } from "next/navigation";

// Help became the staff guide. Kept so old links still work.
export default function Help() {
  redirect("/admin/guide");
}
