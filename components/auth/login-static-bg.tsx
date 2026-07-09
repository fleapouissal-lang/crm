/** Decorative login background — CSS-only, no pointer interaction */
export function LoginStaticBackground() {
  return (
    <div className="login-static-bg" aria-hidden>
      <div className="login-static-bg__base" />
      <div className="login-static-bg__mesh" />
      <div className="login-static-bg__blob login-static-bg__blob--1" />
      <div className="login-static-bg__blob login-static-bg__blob--2" />
      <div className="login-static-bg__blob login-static-bg__blob--3" />
      <div className="login-static-bg__grain" />
    </div>
  );
}
