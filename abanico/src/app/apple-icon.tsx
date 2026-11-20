import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const FAN =
  "M12 19 L1.66 15.24 A3 3 0 0 1 4.64 10.83 A3 3 0 0 1 9.34 8.33 A3 3 0 0 1 14.66 8.33 A3 3 0 0 1 19.36 10.83 A3 3 0 0 1 22.34 15.24 Z";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#bf4e2b" }}>
        <svg width="132" height="132" viewBox="0 0 24 24">
          <path d={FAN} fill="#fffbf5" />
          <path d="M12 19 L4.64 10.83 M12 19 L9.34 8.33 M12 19 L14.66 8.33 M12 19 L19.36 10.83" stroke="#bf4e2b" strokeWidth="0.9" strokeLinecap="round" />
          <circle cx="12" cy="19" r="1.7" fill="#fffbf5" />
          <path d="M12 19 L12 22.6" stroke="#fffbf5" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size
  );
}
