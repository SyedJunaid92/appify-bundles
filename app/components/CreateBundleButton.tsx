import { useNavigate } from "react-router";

type Props = {
  slot?: string;
  variant?: "primary" | "secondary" | "tertiary";
  label?: string;
};

export function CreateBundleButton({
  slot,
  variant = "primary",
  label = "Create bundle",
}: Props) {
  const navigate = useNavigate();

  return (
    <s-button
      slot={slot as Lowercase<string> | undefined}
      variant={variant}
      onClick={() => navigate("/app/bundles/new")}
    >
      {label}
    </s-button>
  );
}
