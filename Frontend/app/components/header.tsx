import logoHeader from "../assets/media/logo_header.png";

export function Header() {
  return (
    <header>
      <div className="logo"><img src={logoHeader} /></div>
    </header>
  );
}