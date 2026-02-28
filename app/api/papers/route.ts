import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all papers
export async function GET() {
    try {
        const papers = await prisma.paper.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json(papers)
    } catch (error) {
        console.error('Error fetching papers:', error)
        return NextResponse.json({ error: 'Failed to fetch papers' }, { status: 500 })
    }
}

// POST create new paper(s)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Support batch creation from RIS import
        if (Array.isArray(body)) {
            const papers = await prisma.paper.createMany({
                data: body
            })
            return NextResponse.json(papers, { status: 201 })
        }

        // Single paper creation
        const paper = await prisma.paper.create({
            data: body
        })
        return NextResponse.json(paper, { status: 201 })
    } catch (error) {
        console.error('Error creating paper:', error)
        return NextResponse.json({ error: 'Failed to create paper' }, { status: 500 })
    }
}
