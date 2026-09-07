import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import api from "../utils/axios";

/**
 * The employee's way in.
 *
 * His owner adds him and reads him a code, or sends him a link with the code
 * in it. Here he chooses a password, and from then on he signs in on the
 * ordinary login screen like everybody else. One way in rather than two.
 *
 * Public by necessity: he has no account yet, and the code is the credential.
 * The server treats a wrong code and an already used one the same way, so this
 * page cannot be used to find out which codes exist.
 */
const JoinShop = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // Read from the link on the first render rather than in an effect. A link
  // carries the code, so he does not have to read it off a phone screen and
  // type it; typing it is still allowed for a code given verbally.
  const [code, setCode] = useState(() => params.get("code") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Choose a password of at least 8 characters.");
      return;
    }

    setWorking(true);
    try {
      const { data } = await api.post("/api/staff/accept", {
        code: code.trim(),
        email: email.trim() || undefined,
        password,
      });
      toast.success(data.message);
      navigate(`/login?email=${encodeURIComponent(data.email || email)}`);
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Could not set up your account. Check the code with your owner.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-sage/20 bg-white/80 p-6 shadow-sm sm:p-8">
        <div className="mb-5">
          <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-clay/10 text-clay">
            <KeyRound className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-black tracking-tight text-espresso">
            Join your shop
          </h1>
          <p className="mt-1.5 text-sm text-espresso/60">
            Your owner has added you. Use the code he gave you and choose a
            password. After this you sign in normally.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="join-code"
              className="mb-1 block text-xs font-semibold text-espresso/70"
            >
              The code your owner gave you
            </label>
            <input
              id="join-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-sage/30 bg-cream/40 px-3.5 py-2.5 font-mono text-sm text-espresso focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
              required
            />
          </div>

          <div>
            <label
              htmlFor="join-email"
              className="mb-1 block text-xs font-semibold text-espresso/70"
            >
              Your email
            </label>
            <input
              id="join-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-sage/30 bg-cream/40 px-3.5 py-2.5 text-sm text-espresso focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
            />
            <p className="mt-1 text-[11px] text-espresso/40">
              This is what you will sign in with. Leave it blank to use the one
              your owner already put in for you.
            </p>
          </div>

          <div>
            <label
              htmlFor="join-password"
              className="mb-1 block text-xs font-semibold text-espresso/70"
            >
              Choose a password
            </label>
            <input
              id="join-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-sage/30 bg-cream/40 px-3.5 py-2.5 text-sm text-espresso focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={working || !code.trim() || password.length < 8}
            className="w-full cursor-pointer rounded-xl bg-clay px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-espresso disabled:opacity-50"
          >
            {working ? "Setting up..." : "Set up my account"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-espresso/50">
          Already set this up?{" "}
          <Link to="/login" className="font-bold text-clay hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default JoinShop;
