import { TrendingUp } from "lucide-react";

export function SummaryCard({ label, value, tone = "blue", subtext }) {
  return (
    <section className={`summary-card tone-${tone}`}>
      <div className="summary-icon">
        <TrendingUp size={18} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      {subtext && <small>{subtext}</small>}
    </section>
  );
}
