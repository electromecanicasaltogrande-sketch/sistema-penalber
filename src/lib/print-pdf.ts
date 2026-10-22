"use client";

export async function descargarComoPDF(elemento: HTMLElement, nombreArchivo: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const paginas = Array.from(elemento.querySelectorAll<HTMLElement>("[data-pdf-page]"));
  const objetivos = paginas.length > 0 ? paginas : [elemento];

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (let i = 0; i < objetivos.length; i++) {
    const canvas = await html2canvas(objetivos[i], { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const margen = 8;
    let w = pageWidth - margen * 2;
    let h = (canvas.height * w) / canvas.width;
    if (h > pageHeight - margen * 2) {
      h = pageHeight - margen * 2;
      w = (canvas.width * h) / canvas.height;
    }
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", margen, margen, w, h);
  }

  pdf.save(nombreArchivo);
}
