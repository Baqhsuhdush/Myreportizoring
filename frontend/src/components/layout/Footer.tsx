export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer__wave" aria-hidden="true" />
      <p className="app-footer__text">
        Fizika Lab · Физика — просто и понятно · © {new Date().getFullYear()}
      </p>
    </footer>
  );
}
