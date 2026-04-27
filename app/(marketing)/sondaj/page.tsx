import { redirect } from "next/navigation";

// Currently only the sender survey exists. When a transporter survey ships,
// this page becomes a picker (`/sondaj/expeditori` vs `/sondaj/transportatori`).
export default function SurveyIndex() {
  redirect("/sondaj/expeditori");
}
