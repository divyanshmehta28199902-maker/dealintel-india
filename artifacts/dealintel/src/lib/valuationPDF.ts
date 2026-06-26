import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ValuationInputs, BasicResult, ValuationInsights } from "./valuationInsights";
import { formatCr } from "./valuationInsights";

function fmtINR(lakhs: number): string {
  if (lakhs >= 10000) return `Rs ${(lakhs / 10000).toFixed(2)} Cr`;
  if (lakhs >= 100) return `Rs ${(lakhs / 100).toFixed(1)}L`;
  return `Rs ${Math.round(lakhs)}L`;
}

function addSectionHeader(
  doc: jsPDF,
  y: number,
  num: string,
  title: string
): number {
  doc.setFillColor(15, 23, 42);
  doc.rect(15, y, 180, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 160, 255);
  doc.text(num, 18, y + 4.8);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 30, y + 4.8);
  doc.setTextColor(30, 30, 30);
  return y + 11;
}

function addBodyText(doc: jsPDF, y: number, text: string, indent = 18): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  const lines = doc.splitTextToSize(text, 176 - (indent - 15));
  doc.text(lines, indent, y);
  return y + lines.length * 4.5;
}

function addBulletList(
  doc: jsPDF,
  y: number,
  items: string[],
  color: [number, number, number] = [55, 65, 81]
): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...color);
  for (const item of items) {
    const lines = doc.splitTextToSize(`• ${item}`, 168);
    doc.text(lines, 22, y);
    y += lines.length * 4.5 + 0.5;
  }
  return y;
}

function maybeAddPage(doc: jsPDF, y: number, needed = 20): number {
  if (y + needed > 272) {
    doc.addPage();
    return 18;
  }
  return y;
}

export function downloadValuationReport(
  inputs: ValuationInputs,
  result: BasicResult,
  insights: ValuationInsights
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const { revenue, ebitda, industry, growth, discount } = inputs;
  const growthPct = (growth * 100).toFixed(0);
  const discountPct = (discount * 100).toFixed(0);
  const ebitdaMarginPct =
    revenue > 0 ? ((ebitda / revenue) * 100).toFixed(0) : "N/A";

  // ── Cover Header ──────────────────────────────────────────────────
  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, 210, 32, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(80, 160, 255);
  doc.text("DEALINTEL", 15, 13);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text("India's M&A Intelligence Terminal", 15, 19);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("VALUATION REPORT", 195, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(160, 180, 210);
  doc.text(today, 195, 19, { align: "right" });
  doc.text("CONFIDENTIAL — FOR INTERNAL USE ONLY", 195, 25, { align: "right" });

  // Accent bar
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 32, 210, 1.5, "F");

  let y = 42;

  // ── 01 Executive Summary ──────────────────────────────────────────
  y = addSectionHeader(doc, y, "01", "EXECUTIVE SUMMARY");
  y = addBodyText(doc, y, insights.summary);
  y += 4;

  // Confidence badge row
  doc.setFillColor(245, 248, 255);
  doc.roundedRect(15, y, 85, 16, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(59, 130, 246);
  doc.text("CONFIDENCE", 18, y + 6);
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(`${insights.confidence}%`, 18, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${insights.confidenceLabel} — ${insights.confidenceReason}`,
    50,
    y + 13,
  );

  doc.setFillColor(245, 248, 255);
  doc.roundedRect(105, y, 90, 16, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(59, 130, 246);
  doc.text("FAIR VALUE RANGE", 108, y + 6);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  doc.text(`${fmtINR(result.bearCase)}  —  ${fmtINR(result.bullCase)}`, 108, y + 13);

  y += 24;

  // ── 02 Company Inputs ─────────────────────────────────────────────
  y = maybeAddPage(doc, y, 40);
  y = addSectionHeader(doc, y, "02", "COMPANY INPUTS");

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    head: [["Parameter", "Value"]],
    body: [
      ["Annual Revenue", fmtINR(revenue)],
      ["EBITDA", fmtINR(ebitda)],
      ["EBITDA Margin", `${ebitdaMarginPct}%`],
      ["Industry", industry],
      ["Revenue Growth Rate", `${growthPct}%/yr`],
      ["Discount Rate (WACC)", `${discountPct}%`],
      ["Valuation Method", insights.valuationMethod],
    ],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8.5, textColor: [55, 65, 81] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { fontStyle: "bold", textColor: [30, 41, 59] } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── 03 Valuation Results ──────────────────────────────────────────
  y = maybeAddPage(doc, y, 50);
  y = addSectionHeader(doc, y, "03", "VALUATION RESULTS");

  // Estimated EV highlight box
  doc.setFillColor(239, 246, 255);
  doc.rect(15, y, 180, 18, "F");
  doc.setFillColor(59, 130, 246);
  doc.rect(15, y, 3, 18, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("ESTIMATED ENTERPRISE VALUE (BLENDED)", 22, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text(fmtINR(result.blended), 22, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("60% DCF + 40% Comparable Multiples", 130, y + 11);
  y += 22;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    head: [["Metric", "Value", "Note"]],
    body: [
      ["DCF Value (5-yr + Terminal)", fmtINR(result.dcf), "60% weight in blended"],
      ["Comparable Market Value", fmtINR(result.comparable), "40% weight in blended"],
      ["EV / Revenue", `${result.evRevenue.toFixed(1)}x`, `${industry} rev benchmark: ${inputs.industryRev.toFixed(1)}x`],
      ["EV / EBITDA", `${result.evEbitda.toFixed(1)}x`, `${industry} EBITDA benchmark: ${inputs.industryEbitda.toFixed(1)}x`],
    ],
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: [55, 65, 81] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { fontStyle: "bold", textColor: [30, 41, 59] } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── 04 Scenario Analysis ──────────────────────────────────────────
  y = maybeAddPage(doc, y, 55);
  y = addSectionHeader(doc, y, "04", "SCENARIO ANALYSIS");

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    head: [["Scenario", "Enterprise Value", "vs Base", "Description"]],
    body: insights.scenarioDescriptions.map((s, i) => {
      const vals = [result.bearCase, result.blended, result.bullCase];
      const pcts = ["−25%", "—", "+30%"];
      return [s.label, fmtINR(vals[i]), pcts[i], s.reason];
    }),
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [55, 65, 81] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 20 },
      1: { fontStyle: "bold", textColor: [30, 41, 59], cellWidth: 28 },
      2: { cellWidth: 18 },
      3: { cellWidth: 114 },
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── 05 Sensitivity Analysis ───────────────────────────────────────
  y = maybeAddPage(doc, y, 45);
  y = addSectionHeader(doc, y, "05", "VALUATION SENSITIVITY ANALYSIS");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 130, 150);
  doc.text(
    "Illustrative sensitivity based on comparable market multiples. Not a prediction of actual transaction values.",
    18,
    y,
  );
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    head: [["Scenario", "Comparable EV", "Assumption"]],
    body: insights.sensitivity.map((row) => [row.label, fmtINR(row.value), row.delta]),
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: [55, 65, 81] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { fontStyle: "bold", textColor: [30, 41, 59] } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ── 06 Key Drivers ────────────────────────────────────────────────
  y = maybeAddPage(doc, y, 50);
  y = addSectionHeader(doc, y, "06", "KEY VALUATION DRIVERS");

  if (insights.positiveDrivers.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(22, 163, 74);
    doc.text("▲ Positive Drivers", 18, y);
    y += 5;
    y = addBulletList(doc, y, insights.positiveDrivers, [22, 101, 52]);
    y += 2;
  }

  if (insights.negativeDrivers.length > 0) {
    y = maybeAddPage(doc, y, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38);
    doc.text("▼ Negative Drivers", 18, y);
    y += 5;
    y = addBulletList(doc, y, insights.negativeDrivers, [153, 27, 27]);
    y += 2;
  }

  // ── 07 Investor Perspective ───────────────────────────────────────
  y = maybeAddPage(doc, y, 50);
  y = addSectionHeader(doc, y, "07", "HOW BUYERS MAY VIEW THIS BUSINESS");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(22, 163, 74);
  doc.text("Positive Considerations", 18, y);
  y += 5;
  y = addBulletList(doc, y, insights.investorPositives, [22, 101, 52]);
  y += 2;

  y = maybeAddPage(doc, y, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(202, 138, 4);
  doc.text("Potential Concerns", 18, y);
  y += 5;
  y = addBulletList(doc, y, insights.investorConcerns, [120, 80, 0]);
  y += 2;

  // ── 08 Recommendations ───────────────────────────────────────────
  y = maybeAddPage(doc, y, 50);
  y = addSectionHeader(doc, y, "08", "RECOMMENDED ACTIONS");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  insights.recommendations.forEach((rec, i) => {
    y = maybeAddPage(doc, y, 10);
    const lines = doc.splitTextToSize(`${i + 1}.  ${rec}`, 168);
    doc.text(lines, 22, y);
    y += lines.length * 4.5 + 1.5;
  });
  y += 2;

  // ── Disclaimer ───────────────────────────────────────────────────
  y = maybeAddPage(doc, y, 28);
  doc.setFillColor(248, 250, 252);
  doc.rect(15, y, 180, 24, "F");
  doc.setFillColor(220, 38, 38);
  doc.rect(15, y, 2, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DISCLAIMER", 20, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const disc = doc.splitTextToSize(
    "This valuation report has been prepared for informational purposes only and does not constitute financial advice, investment advice, or a formal valuation. The estimates are based solely on the financial parameters entered by the user and publicly available Indian SME benchmark multiples. Actual transaction values may differ materially based on due diligence findings, market conditions, negotiation outcomes, legal and tax considerations, and other factors not captured in this model. DealIntel India makes no representations or warranties as to the accuracy or completeness of this report. This document should not be shared with third parties without appropriate professional guidance.",
    172,
  );
  doc.text(disc, 20, y + 10);

  // ── Footer on all pages ──────────────────────────────────────────
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 287, 210, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(160, 180, 210);
    doc.text("DealIntel India — Confidential", 15, 293);
    doc.text(`Page ${p} of ${totalPages}`, 195, 293, { align: "right" });
    doc.text("dealintel.in", 105, 293, { align: "center" });
  }

  doc.save(`DealIntel-Valuation-Report-${Date.now()}.pdf`);
}
