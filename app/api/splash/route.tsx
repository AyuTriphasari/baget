import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "200",
                    height: "200",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0B0C10",
                    fontFamily: "sans-serif",
                }}
            >
                <div
                    style={{
                        fontSize: "64px",
                        display: "flex",
                    }}
                >
                    🎁
                </div>
                <div
                    style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "#3B82F6",
                        marginTop: "8px",
                        display: "flex",
                    }}
                >
                    BK
                </div>
            </div>
        ),
        {
            width: 200,
            height: 200,
        }
    );
}
