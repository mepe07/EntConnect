import { Login } from "~/views/login/login";

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