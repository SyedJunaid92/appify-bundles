import type { CSSProperties } from "react";
import type { BadgePosition, DealBadge } from "../../types/bundle-editor";

type Props = {
  badge: DealBadge;
  text: string;
};

const ALL_SIDES = ["top", "right", "bottom", "left"] as const;

function sidesFor(position: BadgePosition) {
  if (position === "all") return ALL_SIDES;
  return [position] as const;
}

export function OverlayBadge({ badge, text }: Props) {
  const label = text || badge.text || "MOST POPULAR";

  if (badge.style === "custom") {
    return (
      <span
        className="be-overlay-badge be-overlay-badge--custom"
        style={{ width: badge.size, height: Math.round(badge.size * 0.55) }}
      >
        {badge.imageUrl ? (
          <img src={badge.imageUrl} alt={label} />
        ) : (
          <span className="be-overlay-badge__ph">Badge</span>
        )}
      </span>
    );
  }

  if (badge.style === "popular") {
    return (
      <span
        className="be-overlay-badge be-overlay-badge--popular"
        style={{
          width: badge.size,
          color: badge.textColor,
          background: badge.backgroundColor,
        }}
      >
        <span>★</span>
        <strong>Most Popular</strong>
        <span>★</span>
      </span>
    );
  }

  if (badge.style === "border") {
    const piece = badge.delimiterEnabled
      ? `${label} ${badge.delimiter} `
      : `${label}`;
    const copies = badge.repeatText ? 6 : 1;
    const track = Array.from({ length: copies }, () => piece);
    return (
      <span
        className="be-overlay-badge be-overlay-badge--border"
        style={
          {
            color: badge.textColor,
            "--be-badge-bg": badge.backgroundColor,
            "--be-badge-thickness": `${badge.thickness}px`,
            "--be-badge-distance": `${badge.distance}px`,
            "--be-badge-speed": `${Math.max(6, 80 - badge.speed)}s`,
            letterSpacing: `${badge.textSpacing}px`,
            fontSize: badge.textSize,
          } as CSSProperties
        }
      >
        {sidesFor(badge.position).map((side) => (
          <span
            key={side}
            className={`be-overlay-badge__side be-overlay-badge__side--${side}`}
          >
            <span
              className={
                "be-overlay-badge__marquee" +
                (badge.animate ? " is-animated" : "") +
                (badge.direction === "counterclockwise" ? " is-reverse" : "")
              }
            >
              {track.map((item, index) => (
                <span key={`${side}-${index}`}>{item}</span>
              ))}
              {badge.animate &&
                track.map((item, index) => (
                  <span key={`${side}-loop-${index}`}>{item}</span>
                ))}
            </span>
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      className="be-overlay-badge be-overlay-badge--simple"
      style={{
        color: badge.textColor,
        background: badge.backgroundColor,
        fontSize: badge.textSize,
      }}
    >
      {label}
    </span>
  );
}
