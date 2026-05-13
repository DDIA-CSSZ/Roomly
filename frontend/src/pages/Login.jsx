import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { login } from "../api/auth";
import "./Login.css";

/**
 * Pagina de Login pentru Roomly.
 *
 * Layout: split-screen, zona vizuală în stânga (brand) + formular în dreapta.
 * Flux: validare locală -> POST /auth/login -> GET /auth/me -> redirect dashboard.
 */
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({ email: "", password: "" });
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  // Dacă utilizatorul a fost redirecționat aici dintr-o rută protejată,
  // îl trimitem înapoi acolo după login.
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  function validate() {
    const next = { email: "", password: "" };
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      next.email = "Te rog introdu adresa de email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = "Adresa de email nu pare validă.";
    }

    if (!password) {
      next.password = "Te rog introdu parola.";
    }

    setErrors(next);
    return !next.email && !next.password;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      // Mesaj prietenos. Pentru 401 backend-ul trimite "Incorrect email or password."
      const msg =
        err?.status === 401
          ? "Email sau parolă incorectă."
          : err?.status === 403
          ? "Contul tău este inactiv. Contactează administratorul."
          : err?.message ||
            "A apărut o eroare neașteptată. Te rog încearcă din nou.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* === STÂNGA: zona vizuală / branding === */}
      <aside className="login-hero" aria-hidden="true">
        <div className="login-hero__overlay" />
        <div className="login-hero__content">
          <div className="login-hero__logo">
            <span className="login-hero__logo-mark">R</span>
            <span className="login-hero__logo-text">Roomly</span>
          </div>
          <h2 className="login-hero__title">
            Servicii hoteliere,
            <br />
            la un click distanță.
          </h2>
          <p className="login-hero__subtitle">
            Trimite rapid cereri către recepție, housekeeping sau mentenanță
            și urmărește totul în timp real.
          </p>
          <ul className="login-hero__features">
            <li>Cereri trimise online, fără apeluri telefonice</li>
            <li>Status în timp real pentru fiecare solicitare</li>
            <li>Comunicare directă cu echipa hotelului</li>
          </ul>
        </div>
      </aside>

      {/* === DREAPTA: formular === */}
      <main className="login-form-wrapper">
        <div className="login-form-card">
          <div className="login-form-card__brand">
            <span className="login-form-card__brand-mark">R</span>
            <span className="login-form-card__brand-text">Roomly</span>
          </div>

          <h1 className="login-form-card__title">Bine ai venit</h1>
          <p className="login-form-card__subtitle">
            Autentifică-te în contul tău pentru a continua.
          </p>

          {serverError && (
            <div className="login-alert" role="alert">
              {serverError}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label htmlFor="email" className="login-field__label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={`login-field__input ${
                  errors.email ? "login-field__input--error" : ""
                }`}
                placeholder="nume@exemplu.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                }}
                autoComplete="email"
                disabled={loading}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <span id="email-error" className="login-field__error">
                  {errors.email}
                </span>
              )}
            </div>

            <div className="login-field">
              <label htmlFor="password" className="login-field__label">
                Parolă
              </label>
              <div className="login-field__password-wrap">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`login-field__input ${
                    errors.password ? "login-field__input--error" : ""
                  }`}
                  placeholder="Introdu parola"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password)
                      setErrors((p) => ({ ...p, password: "" }));
                  }}
                  autoComplete="current-password"
                  disabled={loading}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                />
                <button
                  type="button"
                  className="login-field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  aria-label={
                    showPassword ? "Ascunde parola" : "Afișează parola"
                  }
                >
                  {showPassword ? "Ascunde" : "Afișează"}
                </button>
              </div>
              {errors.password && (
                <span id="password-error" className="login-field__error">
                  {errors.password}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="login-submit__spinner" aria-hidden="true" />
                  Se autentifică...
                </>
              ) : (
                "Autentificare"
              )}
            </button>
          </form>

          <p className="login-form-card__footer">
            Nu ai cont încă?{" "}
            <Link to="/register" className="login-form-card__link">
              Creează un cont
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
