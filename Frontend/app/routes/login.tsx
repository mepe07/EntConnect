import { Login } from "~/views/login/login";

const title = "Login";

export default function LoginRoute() {
  return (
    <>
    <title>{title}</title>
    <meta property="og:title" content={title} />
    <Login />
    </>
  );
}