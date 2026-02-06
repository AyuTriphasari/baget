import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "1200",
                    height: "630",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #0B0C10 0%, #1F2937 50%, #0B0C10 100%)",
                    fontFamily: "sans-serif",
                }}
            >
                {/* Blue glow circle */}
                <div
                    style={{
                        position: "absolute",
                        width: "400px",
                        height: "400px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                    }}
                />
                {/* Gift emoji */}
                <div
                    style={{
                        fontSize: "80px",
                        marginBottom: "20px",
                        display: "flex",
                    }}
                >
                    🎁
                </div>
                {/* Title */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "12px",
                    }}
                >
                    <span
                        style={{
                            fontSize: "64px",
                            fontWeight: 800,
                            color: "#FFFFFF",
                            letterSpacing: "-2px",
                        }}
                    >
                        Base
                    </span>
                    <span
                        style={{
                            fontSize: "64px",
                            fontWeight: 800,
                            color: "#3B82F6",
                            letterSpacing: "-2px",
                        }}
                    >
                        Kaget
                    </span>
                </div>
                {/* Subtitle */}
                <div
                    style={{
                        fontSize: "28px",
                        color: "#93C5FD",
                        marginTop: "16px",
                        letterSpacing: "4px",
                        textTransform: "uppercase",
                        display: "flex",
                    }}
                >
                    Instant Giveaways on Base
                </div>
                {/* Description */}
                <div
                    style={{
                        fontSize: "20px",
                        color: "#9CA3AF",
                        marginTop: "24px",
                        display: "flex",
                    }}
                >
                    Create &amp; claim rewards • Fast, fair, first-come-first-serve
                </div>
                {/* Bottom bar */}
                <div
                    style={{
                        position: "absolute",
                        bottom: "0",
                        left: "0",
                        right: "0",
                        height: "4px",
                        background: "linear-gradient(90deg, #3B82F6, #8B5CF6, #3B82F6)",
                        display: "flex",
                    }}
                />
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
