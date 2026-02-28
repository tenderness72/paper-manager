import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id)
        await prisma.paper.delete({
            where: { id }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting paper:', error)
        return NextResponse.json({ error: 'Failed to delete paper' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const id = parseInt((await params).id)
        const body = await request.json()

        const paper = await prisma.paper.update({
            where: { id },
            data: {
                title: body.title,
                abstract: body.abstract,
                authors: body.authors,
                journal: body.journal,
                year: body.year,
                pdfPath: body.pdfPath,
            }
        })

        return NextResponse.json(paper)
    } catch (error) {
        console.error('Error updating paper:', error)
        return NextResponse.json({ error: 'Failed to update paper' }, { status: 500 })
    }
}
