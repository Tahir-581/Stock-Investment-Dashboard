import '../lib/load-env'
import AdmZip from 'adm-zip'
import { fetchSecBuffer, getField, parseTsvHeader, parseTsvLine } from '../lib/ingest-utils'

const url =
  'https://www.sec.gov/files/structureddata/data/form-13f-data-sets/01dec2025-28feb2026_form13f.zip'

async function main() {
  const buf = await fetchSecBuffer(url)
  const zip = new AdmZip(Buffer.from(buf))
  const coverEntry = zip
    .getEntries()
    .find((e) => /COVERPAGE\.tsv$/i.test(e.entryName))
  const infoEntry = zip
    .getEntries()
    .find((e) => /INFOTABLE\.tsv$/i.test(e.entryName))
  if (!coverEntry || !infoEntry) throw new Error('missing tsv')

  const coverText = zip.readAsText(coverEntry)
  const infoText = zip.readAsText(infoEntry)
  const coverLines = coverText.split(/\r?\n/).filter(Boolean)
  const infoLines = infoText.split(/\r?\n/).filter(Boolean)
  const coverHeader = parseTsvHeader(coverLines[0])
  const infoHeader = parseTsvHeader(infoLines[0])

  console.log('Cover columns:', [...coverHeader.keys()].slice(0, 20))
  const coverRow = parseTsvLine(coverLines[1])
  console.log('Sample cover accession:', getField(coverRow, coverHeader, 'ACCESSION_NUMBER'))
  console.log('Sample cover CIK:', getField(coverRow, coverHeader, 'CIK'))
  console.log(
    'Sample cover period:',
    getField(coverRow, coverHeader, 'REPORTCALENDARORQUARTER'),
    getField(coverRow, coverHeader, 'REPORTCALENDARORQUARTERENDDATE')
  )

  const infoRow = parseTsvLine(infoLines[1])
  console.log('Sample info accession:', getField(infoRow, infoHeader, 'ACCESSION_NUMBER'))
  console.log('Info lines total:', infoLines.length - 1)

  let matched = 0
  let withPeriod = 0
  const coverMap = new Map<string, string>()
  for (let i = 1; i < Math.min(coverLines.length, 5000); i++) {
    const row = parseTsvLine(coverLines[i])
    const acc = getField(row, coverHeader, 'ACCESSION_NUMBER')
    const period =
      getField(row, coverHeader, 'REPORTCALENDARORQUARTER') ||
      getField(row, coverHeader, 'REPORTCALENDARORQUARTERENDDATE')
    if (period) withPeriod++
    if (acc) coverMap.set(acc, period)
  }
  for (let i = 1; i < Math.min(infoLines.length, 5000); i++) {
    const row = parseTsvLine(infoLines[i])
    const acc = getField(row, infoHeader, 'ACCESSION_NUMBER')
    if (coverMap.has(acc)) matched++
  }
  console.log('Covers with period (first 5k):', withPeriod)
  console.log('Info matched to cover (first 5k):', matched)
}

main().catch(console.error)
