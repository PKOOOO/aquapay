// POST /api/aquapay/lcd
// Expo app calls this to update the LCD display on the ESP32.
// Body: { dispenser_id, line1, line2 }

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { dispenser_id, line1, line2 } = await request.json();

        if (!dispenser_id || !line1) {
            return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
        }

        await sql`
            INSERT INTO aquapay_lcd (dispenser_id, line1, line2, updated_at)
            VALUES (${dispenser_id}, ${line1}, ${line2 || ''}, NOW())
            ON CONFLICT (dispenser_id)
            DO UPDATE SET line1=${line1}, line2=${line2 || ''}, updated_at=NOW()`;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[LCD]', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
