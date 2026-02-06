import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "1024",
                    height: "1024",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #0B0C10 0%, #1a1f2e 50%, #0B0C10 100%)",
                    fontFamily: "sans-serif",
                }}
            >
                {/* Blue glow */}
                <div
                    style={{
                        position: "absolute",
                        width: "600px",
                        height: "600px",
                        borderRadius: "50%",
                        background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        display: "flex",
                    }}
                />
                {/* Gift box icon */}
                <div
                    style={{
                        fontSize: "200px",
                        marginBottom: "40px",
                        display: "flex",
                    }}
                >
                    🎁
                </div>
                {/* App name */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "16px",
                    }}
                >
                    <span
                        style={{
                            fontSize: "96px",
                            fontWeight: 800,
                            color: "#FFFFFF",
                            letterSpacing: "-3px",
                        }}
                    >
                        Base
                    </span>
                    <span
                        style={{
                            fontSize: "96px",
                            fontWeight: 800,
                            color: "#3B82F6",
                            letterSpacing: "-3px",
                        }}
                    >
                        Kaget
                    </span>
                </div>
                {/* Tagline */}
                <div
                    style={{
                        fontSize: "36px",
                        color: "#93C5FD",
                        marginTop: "20px",
                        letterSpacing: "6px",
                        textTransform: "uppercase",
                        display: "flex",
                    }}
                >
                    Giveaways on Base
                </div>
            </div>
        ),
        {
            width: 1024,
            height: 1024,
        }
    );
}
