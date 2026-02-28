export interface Paper {
    id: number
    title: string
    abstract: string | null
    authors: string | null
    journal: string | null
    year: number | null
    pdfPath: string | null
    createdAt: Date
    updatedAt: Date
}

export interface RISEntry {
    TI?: string  // Title
    AB?: string  // Abstract
    AU?: string[]  // Authors
    JO?: string  // Journal
    PY?: string  // Publication Year
    [key: string]: string | string[] | undefined
}
