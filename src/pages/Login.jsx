import { useState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "../components/Button";
import { Field, Input } from "../components/Field";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const { login, authError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      // The auth context displays the login error.
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <img className="login-logo" src="/church-logo.png" alt="" aria-hidden="true" />
          <div>
            <h1>Bethel Church Treasurer</h1>
            <p>Seventh-day Adventist</p>
          </div>
        </div>
        <form onSubmit={submit} className="stack">
          <Field label="Username">
            <Input value={username} onChange={(event) => setUsername(event.target.value)} required autoComplete="username" />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          </Field>
          {authError && <p className="alert danger">{authError}</p>}
          <Button disabled={loading} type="submit">
            <LogIn size={18} />
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </section>
    </main>
  );
}
