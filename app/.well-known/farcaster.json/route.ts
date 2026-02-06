import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        // Read the farcaster.json file
        const filePath = path.join(process.cwd(), 'public', '.well-known', 'farcaster.json');
        const fileContents = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContents);

        // Return with proper headers
        return new NextResponse(JSON.stringify(data, null, 2), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error) {
        console.error('Error serving farcaster.json:', error);
        return NextResponse.json(
            { error: 'Failed to load farcaster.json' },
            { status: 500 }
        );
    }
}
