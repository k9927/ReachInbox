import { AlertCircle, ArrowUpRight, Mail, Send, ShieldCheck } from "lucide-react";
import { getGoogleLoginUrl } from "../../api/auth";

export interface LoginViewProps {
  error: string;
}

export function LoginView({ error }: LoginViewProps) {
  return (
    <div className="login-screen">
      <div className="login-brand">
        <span className="brand-mark">
          <Send size={18} />
        </span>
        <span>
          reach<span className="brand-accent">inbox</span>
        </span>
      </div>

      <div className="login-card">
        <div className="login-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-envelope">
            <Mail size={33} />
          </div>
          <span className="art-spark spark-one">✳</span>
          <span className="art-spark spark-two">✦</span>
          <span className="art-spark spark-three">✧</span>
        </div>

        <div className="login-copy">
          <span className="eyebrow">A LITTLE MORE REACH</span>
          <h1>
            Make outreach
            <br />
            feel effortless.
          </h1>
          <p>
            Schedule thoughtful emails, keep every sender organized, and let your follow-ups run on
            time.
          </p>
        </div>

        {error && (
          <div className="inline-error login-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <a className="google-button" href={getGoogleLoginUrl()}>
          <GoogleMark />
          <span>Continue with Google</span>
          <ArrowUpRight size={16} />
        </a>

        <div className="login-privacy">
          <ShieldCheck size={14} />
          <span>Secure sign-in powered by Google</span>
        </div>
      </div>

      <p className="login-footer">
        By continuing, you agree to ReachInbox's <a href="#terms">Terms</a> and{" "}
        <a href="#privacy">Privacy Policy</a>.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.64 5.93c4.46-4.12 7.03-10.2 7.03-17.58z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.9-5.87l-7.64-5.93c-2.13 1.44-4.87 2.3-8.26 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

