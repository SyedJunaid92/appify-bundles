import { useNavigate } from "react-router";
import type { BundleTypeDefinition } from "../constants/bundle-types";

type Theme = { primary: string; badge: string };

type Props = {
  type: BundleTypeDefinition;
  theme: Theme;
};

function PreviewContent({ type, theme }: Props) {
  const border = `2px solid ${theme.primary}`;
  const selectedBg = "#fff";

  switch (type.id) {
    case "quantity_break":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ padding: 12, borderRadius: 8, background: "#f6f6f7" }}>
            <div style={{ fontWeight: 600 }}>Single</div>
            <div style={{ fontSize: 12, color: "#6d7175" }}>Standard price</div>
            <div style={{ fontWeight: 700, marginTop: 4 }}>$600.00</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, border, background: selectedBg, position: "relative" }}>
            <span style={{ position: "absolute", top: -10, right: 8, background: theme.badge, color: "#fff", fontSize: 10, padding: "2px 8px", borderRadius: 12 }}>
              Most Popular
            </span>
            <div style={{ fontWeight: 600 }}>Duo</div>
            <span style={{ background: "#e3e3e3", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>SAVE $180.00</span>
            <div style={{ fontWeight: 700, marginTop: 4 }}>$1,020.00 <s style={{ color: "#999", fontWeight: 400 }}>$1,200.00</s></div>
          </div>
        </div>
      );

    case "bogo":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Buy 1, get 1 free", price: "$600.00", was: "$1,200.00", save: "50%", selected: true },
            { label: "Buy 2, get 3 free", price: "$1,200.00", was: "$3,000.00", save: "60%", selected: false },
          ].map((tier) => (
            <div key={tier.label} style={{ padding: 12, borderRadius: 8, border: tier.selected ? border : "1px solid #e1e3e5", background: tier.selected ? selectedBg : "#f6f6f7" }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{tier.label}</div>
              <span style={{ background: theme.badge, color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 4 }}>SAVE {tier.save}</span>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{tier.price} <s style={{ color: "#999", fontWeight: 400 }}>{tier.was}</s></div>
            </div>
          ))}
          <div style={{ background: "#4a4a4a", color: "#fff", textAlign: "center", padding: 8, borderRadius: 6, fontSize: 12 }}>+ FREE special gift!</div>
        </div>
      );

    case "mix_match":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ padding: 12, borderRadius: 8, background: "#f6f6f7" }}>
            <div style={{ fontWeight: 600 }}>1 pack</div>
            <div style={{ fontWeight: 700 }}>$600.00</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, border, background: selectedBg }}>
            <div style={{ fontWeight: 600 }}>2 pack</div>
            <div style={{ fontWeight: 700 }}>$1,020.00 <s style={{ color: "#999" }}>$1,200.00</s></div>
            <div style={{ marginTop: 8, padding: 8, background: "#f6f6f7", borderRadius: 6, display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 32, height: 32, background: "#ddd", borderRadius: 4 }} />
              <div style={{ flex: 1, fontSize: 11 }}>The Collection Snowboard</div>
              <button type="button" style={{ background: theme.primary, color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10 }}>Choose</button>
            </div>
          </div>
        </div>
      );

    case "fixed_bundle":
      return (
        <div style={{ padding: 12, borderRadius: 8, border, background: selectedBg }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Complete the bundle</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, background: "#ddd", borderRadius: 4 }} />
            <span>+</span>
            <div style={{ width: 40, height: 40, background: "#ddd", borderRadius: 4 }} />
          </div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>$499.96 <s style={{ color: "#999" }}>$624.95</s></div>
        </div>
      );

    case "fbt_upsell":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ padding: 12, borderRadius: 8, border, background: selectedBg }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Frequently bought together</div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
              <input type="checkbox" defaultChecked readOnly /> Add-on · 10% off
            </label>
            <div style={{ fontWeight: 700, marginTop: 8 }}>$54.00 <s style={{ color: "#999" }}>$60.00</s></div>
          </div>
        </div>
      );

    case "gifts":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ padding: 12, borderRadius: 8, border, background: selectedBg }}>
            <div style={{ fontWeight: 600 }}>2 pack</div>
            <div style={{ fontWeight: 700 }}>$1,020.00</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>Unlock Free gifts</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["Free shipping", "Ski Wax", "Locked"].map((g, i) => (
              <div key={g} style={{ flex: 1, padding: 8, background: i === 2 ? "#f0f0f0" : "#fff", border: "1px solid #e1e3e5", borderRadius: 6, fontSize: 10, textAlign: "center", opacity: i === 2 ? 0.5 : 1 }}>
                {g}
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function BundleTypeCard({ type, theme }: Props) {
  const navigate = useNavigate();

  return (
    <div style={{ border: "1px solid #e1e3e5", borderRadius: 12, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 16, flex: 1, background: "#f6f6f7" }}>
        <PreviewContent type={type} theme={theme} />
      </div>
      <div style={{ padding: 16, borderTop: "1px solid #e1e3e5" }}>
        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>{type.title}</div>
        <s-button
          variant="primary"
          onClick={() => navigate(`/app/bundles/new/${type.id}`)}
        >
          Choose
        </s-button>
      </div>
    </div>
  );
}
