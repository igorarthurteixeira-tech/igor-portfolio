import { renderToBuffer } from "@react-pdf/renderer";
import { CurriculoDocument } from "@/lib/CurriculoDocument";

export const runtime = "nodejs";

export async function GET() {
  const buffer = await renderToBuffer(<CurriculoDocument />);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="curriculo-igor-arthur.pdf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
