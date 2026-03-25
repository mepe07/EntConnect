import logoHeader from "../assets/media/logo_header.png";

export function Header() {
  return (
    <header>
      <div className="container header-container">
        <img src={logoHeader} className="logo" />

        <div className="menu">
          <div className="profile-picture">R</div>
        </div>
      </div>
    </header>
  );
}