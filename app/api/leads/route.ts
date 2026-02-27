import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { email, source } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
        }

        const lead = await prisma.lead.upsert({
            where: { email },
            update: { source: source || 'dashboard' },
            create: { email, source: source || 'dashboard' },
        });

        return NextResponse.json({ success: true, lead: { id: lead.id } });
    } catch (error) {
        console.error('Lead capture error:', error);
        return NextResponse.json({ error: 'Failed to capture lead' }, { status: 500 });
    }
}
