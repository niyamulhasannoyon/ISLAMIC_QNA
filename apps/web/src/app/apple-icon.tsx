import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #18181b 0%, #09090b 100%)",
          borderRadius: 40,
          border: "4px solid #27272a",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: "#10b981",
          }}
        />
        <div
          style={{
            fontSize: 90,
            fontWeight: 700,
            color: "#f4f4f5",
            fontFamily: "serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: -6,
          }}
        >
          فت
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
