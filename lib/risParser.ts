import { RISEntry } from '@/types'

export function parseRISFile(content: string): RISEntry[] {
    const entries: RISEntry[] = []
    const lines = content.split('\n')
    let currentEntry: RISEntry = {}

    for (const line of lines) {
        const trimmedLine = line.trim()

        // Empty line or end of record
        if (trimmedLine === '' || trimmedLine === 'ER  -') {
            if (Object.keys(currentEntry).length > 0) {
                entries.push(currentEntry)
                currentEntry = {}
            }
            continue
        }

        // Parse RIS tag
        const match = trimmedLine.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)$/)
        if (match) {
            const [, tag, value] = match

            // Handle multi-value fields (like authors)
            if (tag === 'AU' || tag === 'A1' || tag === 'A2') {
                if (!currentEntry.AU) {
                    currentEntry.AU = []
                }
                if (Array.isArray(currentEntry.AU)) {
                    currentEntry.AU.push(value)
                }
            } else {
                currentEntry[tag] = value
            }
        }
    }

    // Add last entry if exists
    if (Object.keys(currentEntry).length > 0) {
        entries.push(currentEntry)
    }

    return entries
}

export function risEntryToPaper(entry: RISEntry) {
    return {
        title: entry.TI || entry.T1 || 'Untitled',
        abstract: entry.AB || entry.N2 || null,
        authors: Array.isArray(entry.AU) ? entry.AU.join(', ') : entry.AU || null,
        journal: entry.JO || entry.JF || entry.T2 || null,
        year: entry.PY ? parseInt(entry.PY) : null,
    }
}
