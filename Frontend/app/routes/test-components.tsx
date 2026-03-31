import { TestComponents } from "~/views/test-components";

const title = "Test Components";

export default function TestComponentsRoute() {
  return (
    <>
    <title>{title}</title>
    <meta property="og:title" content={title} />
    <TestComponents />
    </>
  );
}
