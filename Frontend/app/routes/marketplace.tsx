import { Marketplace } from "~/views/marketplace";

const title = "Marketplace";

export default function MarketplaceRoute() {
  return (
    <>
    <title>{title}</title>
    <meta property="og:title" content={title} />
    <Marketplace />
    </>
  );
}
