
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export default function VerificationRequired() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/discover", { replace: true });
  }, [navigate]);

  return (
    <main className="app-page verification-page">
      <section className="app-panel verification-card">
        <ShieldCheck size={34} />

        <h1>Welcome to FoodKindl</h1>

        <p>
          You can discover people, connect with members,
          and explore food experiences.
        </p>

        <p>Redirecting to Discover...</p>
      </section>
    </main>
  );
}
