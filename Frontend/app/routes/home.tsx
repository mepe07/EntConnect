import { Dashboard } from "~/views/dashboard/dashboard";

const title = "Dashboard";

export default function Home() {
  return (
    <>
    <title>{title}</title>
    <meta property="og:title" content={title} />
    <Dashboard />
    </>
  );
}