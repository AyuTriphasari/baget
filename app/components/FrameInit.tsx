"use client";

import { useEffect } from "react";
import sdk from "@farcaster/miniapp-sdk";

export default function FrameInit() {
    useEffect(() => {
        // Call ready() immediately on mount to dismiss splash screen
        // Must be called synchronously, not after async operations
        sdk.actions.ready();
    }, []);

    return null;
}
