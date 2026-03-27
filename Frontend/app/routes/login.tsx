import { Login } from "~/pages/Login/Login";

const title = "Login";

export default function Home() {
  return (
    <>
    <title>{title}</title>
    <meta property="og:title" content={title} />
    <Login />
    </>
  );
}