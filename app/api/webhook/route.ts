import { NextRequest, NextResponse } from "next/server";

// Webhook handler untuk Farcaster mini app events
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Log events (bisa save ke database nanti)
        console.log("Farcaster webhook event:", {
            type: body.type,
            timestamp: new Date().toISOString(),
            data: body
        });

        // Event types yang mungkin:
        // - miniapp.opened - User opens mini app
        // - miniapp.closed - User closes mini app
        // - notification.clicked - User clicks notification

        return NextResponse.json({
            success: true,
            received: true
        });
    } catch (e) {
        console.error("Webhook error:", e);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// GET untuk verification
export async function GET(req: NextRequest) {
    return NextResponse.json({
        status: "ok",
        app: "Base Kaget",
        version: "1.0.0"
    });
}
