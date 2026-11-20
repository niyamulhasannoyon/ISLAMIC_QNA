import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 70px",
          background: "radial-gradient(circle at 50% 0%, #18271e 0%, #09090b 70%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
          border: "8px solid #18181b",
        }}
      >
        {/* Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: "26px",
                fontWeight: "bold",
              }}
            >
              فت
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "22px", fontWeight: "bold", letterSpacing: "-0.5px" }}>
                Deen QnA | দ্বীন কিউএনএ
              </span>
              <span style={{ fontSize: "14px", color: "#a1a1aa" }}>
                আল-ইতিসাম &bull; আত-তাহরীক &bull; মাসিক আলকাউসার
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 18px",
              borderRadius: "9999px",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            ২০,০০০+ প্রামাণিক ফতোয়া
          </div>
        </div>

        {/* Middle Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <h1
            style={{
              fontSize: "52px",
              fontWeight: 800,
              lineHeight: 1.25,
              color: "#ffffff",
              margin: 0,
              maxWidth: "960px",
            }}
          >
            Deen QnA - ইসলামিক প্রশ্নোত্তর ও ফতোয়া ডিজিটাল আর্কাইভ
          </h1>
          <p
            style={{
              fontSize: "24px",
              color: "#d4d4d8",
              lineHeight: 1.4,
              margin: 0,
              maxWidth: "900px",
            }}
          >
            আল-ইতিসাম, আত-তাহরীক ও নির্ভরযোগ্য ইসলামিক স্কলারদের সমকালীন ফিকহ ও শরয়ী সমাধান অনুসন্ধান ইঞ্জিন।
          </p>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #27272a",
            paddingTop: "24px",
            fontSize: "16px",
            color: "#71717a",
          }}
        >
          <div style={{ display: "flex", gap: "24px" }}>
            <span>&bull; ফিকহুস সুন্নাহ</span>
            <span>&bull; সালাত ও সিয়াম</span>
            <span>&bull; ব্যবসা ও আধুনিক মাসআলা</span>
            <span>&bull; ক্রিপ্টোগ্রাফিক ভেরিফায়েড</span>
          </div>
          <span style={{ color: "#10b981", fontWeight: 600, fontSize: "18px" }}>deenqna.vercel.app</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
