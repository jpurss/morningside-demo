import { mkdir } from "node:fs/promises"
import path from "node:path"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

type Row = {
  shipmentId: string
  vendor: string
  amount: string
  expected: string
  received: string
  notes: string
}

const rows: Row[] = [
  {
    shipmentId: "SHP-00018",
    vendor: "VND-17",
    amount: "$1,200.00",
    expected: "12/01/2025",
    received: "01-13-2025",
    notes: "PO# 8821",
  },
  {
    shipmentId: "SHP-00019",
    vendor: "VND-04",
    amount: "€950",
    expected: "01/12/2025",
    received: "2025/12/02",
    notes: "REF 19-A",
  },
  {
    shipmentId: "SHP-00020",
    vendor: "VND-09",
    amount: "$780.50",
    expected: "11-28-2025",
    received: "28/11/2025",
    notes: "late fee?",
  },
  {
    shipmentId: "SHP-00021",
    vendor: "VND-12",
    amount: "USD 1,015",
    expected: "2025-12-05",
    received: "12/06/2025",
    notes: "dock 3",
  },
  {
    shipmentId: "SHP-00022",
    vendor: "VND-02",
    amount: "£640",
    expected: "06/12/2025",
    received: "2025.12.06",
    notes: "priority",
  },
  {
    shipmentId: "SHP-00023",
    vendor: "VND-21",
    amount: "$2,440.00",
    expected: "12/07/2025",
    received: "07/12/2025",
    notes: "INV-77",
  },
  {
    shipmentId: "SHP-00024",
    vendor: "VND-05",
    amount: "$99.99",
    expected: "12/08/2025",
    received: "2025/12/08",
    notes: "split",
  },
  {
    shipmentId: "SHP-00025",
    vendor: "VND-31",
    amount: "EUR 2.100,00",
    expected: "09-12-2025",
    received: "12/09/2025",
    notes: "???",
  },
]

async function main() {
  const outDir = path.resolve(import.meta.dir, "..", "demo")
  await mkdir(outDir, { recursive: true })

  const doc = await PDFDocument.create()
  const page = doc.addPage([980, 620])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const mono = await doc.embedFont(StandardFonts.Courier)

  const dark = rgb(0.06, 0.09, 0.07)
  const ink = rgb(0.07, 0.85, 0.55)
  const text = rgb(0.15, 0.15, 0.15)

  page.drawRectangle({ x: 0, y: 0, width: 980, height: 620, color: rgb(1, 1, 1) })

  page.drawText("messy_supply_chain.pdf (client-provided extract)", {
    x: 44,
    y: 582,
    size: 18,
    font,
    color: dark,
  })

  page.drawText("Supply Chain Ledger (partial) — scanned table + inconsistent formats", {
    x: 44,
    y: 560,
    size: 10,
    font,
    color: rgb(0.25, 0.25, 0.25),
  })

  // Table "scan" effect: small text + faint grid
  const tableX = 44
  const tableY = 520
  const rowH = 22
  const colW = [120, 80, 120, 120, 120, 240]
  const headers = ["Shipment", "Vendor", "Amount", "Expected", "Received", "Notes"]

  let x = tableX
  for (let i = 0; i < headers.length; i += 1) {
    page.drawRectangle({
      x,
      y: tableY,
      width: colW[i]!,
      height: rowH,
      color: rgb(0.96, 0.97, 0.96),
      borderColor: rgb(0.82, 0.82, 0.82),
      borderWidth: 1,
    })
    page.drawText(headers[i]!, {
      x: x + 6,
      y: tableY + 7,
      size: 7,
      font: mono,
      color: text,
    })
    x += colW[i]!
  }

  const allRows = Array.from({ length: 18 }).flatMap((_, i) => {
    const base = rows[i % rows.length]!
    return [
      {
        ...base,
        shipmentId: `SHP-${String(18 + i).padStart(5, "0")}`,
        notes: `${base.notes}  (${i % 2 ? "ok" : "recheck"})`,
      },
    ]
  })

  for (let r = 0; r < allRows.length; r += 1) {
    const row = allRows[r]!
    const y = tableY - (r + 1) * rowH
    let cx = tableX

    const cells = [
      row.shipmentId,
      row.vendor,
      row.amount,
      row.expected,
      row.received,
      row.notes,
    ]

    for (let c = 0; c < cells.length; c += 1) {
      page.drawRectangle({
        x: cx,
        y,
        width: colW[c]!,
        height: rowH,
        color: r % 2 === 0 ? rgb(0.99, 0.99, 0.99) : rgb(0.975, 0.985, 0.975),
        borderColor: rgb(0.84, 0.84, 0.84),
        borderWidth: 1,
      })
      page.drawText(cells[c]!, {
        x: cx + 6,
        y: y + 7,
        size: 6.5,
        font: mono,
        color: text,
      })
      cx += colW[c]!
    }
  }

  // PII & compliance "footnotes" (machine-readable)
  const footY = 78
  page.drawRectangle({
    x: 44,
    y: footY,
    width: 892,
    height: 98,
    color: rgb(0.985, 0.99, 0.985),
    borderColor: ink,
    borderWidth: 1,
  })

  const footLines = [
    "Billing contact: vendor.billing@example.com",
    "Corporate card used for expedited charges: 4242 4242 4242 4242",
    "Backup card: 4012-8888-8888-1881",
    "Driver SSN (old form): 123-45-6789",
    "NOTE: date formats mixed; vendor totals inconsistent.",
  ]

  for (let i = 0; i < footLines.length; i += 1) {
    page.drawText(footLines[i]!, {
      x: 58,
      y: footY + 78 - i * 14,
      size: 9,
      font,
      color: dark,
    })
  }

  // A tiny "scan artifact" marker.
  page.drawText("?? ?", {
    x: 920,
    y: 560,
    size: 10,
    font,
    color: rgb(0.65, 0.65, 0.65),
  })

  const pdfBytes = await doc.save()
  await Bun.write(path.join(outDir, "messy_supply_chain.pdf"), pdfBytes)
}

await main()
